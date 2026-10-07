import assert from "node:assert/strict";
import { test } from "node:test";
import { crearUsuario, escenario, withTx } from "./helpers.ts";

test("el correo del perfil se copia al crear el usuario y nadie lo puede editar desde la app", async () => {
  await withTx(async (db) => {
    await db.asSystem();
    const id = await crearUsuario(db, "Prueba Correo");
    const { rows } = await db.query<{ email: string }>("select email from public.perfiles where id = $1", [id]);
    assert.equal(rows[0]?.email, `${id}@prueba.test`);

    await db.as(id, "aal1");
    assert.match(
      (await db.error("update public.perfiles set email = 'otro@x.com' where id = $1", [id])) ?? "",
      /permission denied/,
    );
  });
});

test("el correo se actualiza si cambia en la cuenta", async () => {
  await withTx(async (db) => {
    await db.asSystem();
    const id = await crearUsuario(db, "Cambio Correo");
    await db.query("update auth.users set email = 'nuevo@prueba.test' where id = $1", [id]);
    const { rows } = await db.query<{ email: string }>("select email from public.perfiles where id = $1", [id]);
    assert.equal(rows[0]?.email, "nuevo@prueba.test");
  });
});

test("el profesional no ve los correos del resto del equipo", async () => {
  await withTx(async (db) => {
    const { estilistaA } = await escenario(db);
    await db.as(estilistaA);
    const { rows } = await db.query<{ id: string }>("select id from public.perfiles where email is not null");
    assert.deepEqual(rows.map((r) => r.id), [estilistaA]);
  });
});

test("un admin no puede cambiar, quitar ni ajustar su propio acceso", async () => {
  await withTx(async (db) => {
    const { sucA, adminA, recepA } = await escenario(db);
    await db.as(adminA);

    const upd = await db.query("update public.accesos set activo = false where usuario_id = $1 returning id", [adminA]);
    assert.equal(upd.rowCount, 0, "el admin se desactivó a sí mismo");
    const del = await db.query("delete from public.accesos where usuario_id = $1 returning id", [adminA]);
    assert.equal(del.rowCount, 0, "el admin se quitó su acceso");
    assert.match(
      (await db.error(
        "insert into public.permisos_usuario (usuario_id, sucursal_id, modulo, nivel) values ($1, $2, 'agenda', 'lectura')",
        [adminA, sucA],
      )) ?? "",
      /row-level security/,
    );

    // A otra persona sí la puede gestionar.
    const otro = await db.query("update public.accesos set activo = false where usuario_id = $1 returning id", [recepA]);
    assert.equal(otro.rowCount, 1);
  });
});
