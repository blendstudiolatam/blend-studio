import assert from "node:assert/strict";
import { test } from "node:test";
import { crearUsuario, escenario, withTx } from "./helpers.ts";

const idsDe = (rows: { id: string }[]) => rows.map((r) => r.id).sort();

test("todas las tablas de public tienen RLS activado y al menos una política", async () => {
  await withTx(async (db) => {
    const { rows } = await db.query<{ tabla: string; rls: boolean; politicas: number }>(`
      select c.relname as tabla,
             c.relrowsecurity as rls,
             (select count(*)::int from pg_policies p
               where p.schemaname = 'public' and p.tablename = c.relname) as politicas
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relkind in ('r', 'p')
    `);
    assert.ok(rows.length > 0);
    for (const r of rows) {
      assert.ok(r.rls, `La tabla ${r.tabla} no tiene RLS activado`);
      assert.ok(r.politicas > 0, `La tabla ${r.tabla} no tiene políticas`);
    }
  });
});

test("un visitante sin sesión no puede leer ni escribir nada", async () => {
  await withTx(async (db) => {
    const { sucA } = await escenario(db);
    await db.asAnon();
    for (const tabla of ["sucursales", "perfiles", "accesos", "auditoria"]) {
      assert.match(
        (await db.error(`select * from public.${tabla}`)) ?? "",
        /permission denied/,
        `anon pudo leer ${tabla}`,
      );
    }
    assert.match(
      (await db.error(
        `insert into public.accesos (usuario_id, sucursal_id, rol)
         values (gen_random_uuid(), $1, 'admin')`,
        [sucA],
      )) ?? "",
      /permission denied/,
    );
  });
});

test("un usuario sin accesos no ve ninguna sucursal", async () => {
  await withTx(async (db) => {
    const { sinAcceso } = await escenario(db);
    await db.as(sinAcceso);
    const { rows } = await db.query("select id from public.sucursales");
    assert.equal(rows.length, 0);
  });
});

test("estilista: ve solo su sucursal y su propio acceso, sin auditoría", async () => {
  await withTx(async (db) => {
    const { sucA, estilistaA, adminA } = await escenario(db);
    await db.as(estilistaA);

    const suc = await db.query<{ id: string }>("select id from public.sucursales");
    assert.deepEqual(idsDe(suc.rows), [sucA]);

    const acc = await db.query<{ usuario_id: string }>("select usuario_id from public.accesos");
    assert.deepEqual(acc.rows.map((r) => r.usuario_id), [estilistaA]);

    const perfiles = await db.query<{ id: string }>("select id from public.perfiles");
    assert.deepEqual(idsDe(perfiles.rows), [estilistaA], "el estilista vio perfiles ajenos");

    const aud = await db.query("select * from public.auditoria");
    assert.equal(aud.rows.length, 0);

    // No puede darse más permisos ni dárselos a otros.
    const err = await db.error(
      "insert into public.accesos (usuario_id, sucursal_id, rol) values ($1, $2, 'admin')",
      [adminA, sucA],
    );
    assert.match(err ?? "", /row-level security/);
    const upd = await db.query(
      "update public.accesos set rol = 'admin' where usuario_id = $1 returning id",
      [estilistaA],
    );
    assert.equal(upd.rowCount, 0, "el estilista se subió de rol");
  });
});

test("recepción: ve los perfiles del equipo de su sucursal pero no asigna roles", async () => {
  await withTx(async (db) => {
    const { sucA, recepA, estilistaA, adminA, adminB } = await escenario(db);
    await db.as(recepA);

    const perfiles = await db.query<{ id: string }>("select id from public.perfiles");
    const ids = idsDe(perfiles.rows);
    assert.ok(ids.includes(estilistaA) && ids.includes(adminA));
    assert.ok(!ids.includes(adminB), "recepción vio perfiles de otra sucursal");

    const err = await db.error(
      "insert into public.accesos (usuario_id, sucursal_id, rol) values ($1, $2, 'recepcion')",
      [adminB, sucA],
    );
    assert.match(err ?? "", /row-level security/);

    const aud = await db.query("select * from public.auditoria");
    assert.equal(aud.rows.length, 0, "recepción vio la auditoría");
  });
});

test("admin: gestiona accesos solo en su sucursal", async () => {
  await withTx(async (db) => {
    const { sucA, sucB, adminA, sinAcceso, estilistaA } = await escenario(db);
    await db.as(adminA);

    const suc = await db.query<{ id: string }>("select id from public.sucursales");
    assert.deepEqual(idsDe(suc.rows), [sucA]);

    assert.equal(
      await db.error(
        "insert into public.accesos (usuario_id, sucursal_id, rol) values ($1, $2, 'recepcion')",
        [sinAcceso, sucA],
      ),
      null,
    );
    assert.match(
      (await db.error(
        "insert into public.accesos (usuario_id, sucursal_id, rol) values ($1, $2, 'admin')",
        [sinAcceso, sucB],
      )) ?? "",
      /row-level security/,
      "el admin de A asignó un rol en B",
    );

    // No puede mover un acceso de A a B cambiando la sucursal.
    assert.match(
      (await db.error("update public.accesos set sucursal_id = $1 where usuario_id = $2", [
        sucB,
        estilistaA,
      ])) ?? "",
      /permission denied/,
    );

    // No puede crear sucursales (solo el dueño).
    assert.match(
      (await db.error("insert into public.sucursales (nombre, slug) values ('Nueva', 'nueva-x')")) ??
        "",
      /row-level security/,
    );
  });
});

test("admin: ve la auditoría de su sucursal y no la de otras", async () => {
  await withTx(async (db) => {
    const { sucA, sucB, adminA, sinAcceso } = await escenario(db);
    await db.as(adminA);
    await db.query(
      "insert into public.accesos (usuario_id, sucursal_id, rol) values ($1, $2, 'estilista')",
      [sinAcceso, sucA],
    );

    const { rows } = await db.query<{
      sucursal_id: string;
      accion: string;
      usuario_id: string | null;
      tabla: string;
    }>("select sucursal_id, accion, usuario_id, tabla from public.auditoria order by id");

    assert.ok(rows.every((r) => r.sucursal_id === sucA), "el admin de A vio auditoría de otra sucursal");
    assert.ok(!rows.some((r) => r.sucursal_id === sucB));
    const ultima = rows.at(-1);
    assert.equal(ultima?.accion, "crear");
    assert.equal(ultima?.tabla, "accesos");
    assert.equal(ultima?.usuario_id, adminA, "la auditoría no registró quién hizo el cambio");
  });
});

test("la auditoría no se puede alterar ni insertar a mano", async () => {
  await withTx(async (db) => {
    const { sucA, adminA } = await escenario(db);
    await db.as(adminA);
    assert.match(
      (await db.error(
        "insert into public.auditoria (sucursal_id, tabla, accion) values ($1, 'x', 'crear')",
        [sucA],
      )) ?? "",
      /permission denied/,
    );
    assert.match((await db.error("delete from public.auditoria")) ?? "", /permission denied/);
    assert.match(
      (await db.error("update public.auditoria set accion = 'editar'")) ?? "",
      /permission denied/,
    );
  });
});

test("nadie puede hacerse dueño a sí mismo; sí puede editar su nombre", async () => {
  await withTx(async (db) => {
    const { adminA } = await escenario(db);
    await db.as(adminA);
    assert.match(
      (await db.error("update public.perfiles set es_dueno = true where id = $1", [adminA])) ?? "",
      /permission denied/,
    );
    const upd = await db.query(
      "update public.perfiles set nombre_completo = 'Nuevo nombre' where id = $1 returning id",
      [adminA],
    );
    assert.equal(upd.rowCount, 1);
  });
});

test("un usuario no puede editar el perfil de otro", async () => {
  await withTx(async (db) => {
    const { adminA, estilistaA } = await escenario(db);
    await db.as(adminA);
    const upd = await db.query(
      "update public.perfiles set nombre_completo = 'Hackeado' where id = $1 returning id",
      [estilistaA],
    );
    assert.equal(upd.rowCount, 0);
  });
});

test("un acceso desactivado ya no da permisos", async () => {
  await withTx(async (db) => {
    const { estilistaA } = await escenario(db);
    await db.query("update public.accesos set activo = false where usuario_id = $1", [estilistaA]);
    await db.as(estilistaA);
    const { rows } = await db.query("select id from public.sucursales");
    assert.equal(rows.length, 0);
  });
});

test("dueño: ve todas las sucursales, incluidas las nuevas, sin asignarse acceso", async () => {
  await withTx(async (db) => {
    const { sucA, sucB, dueno } = await escenario(db);
    await db.as(dueno);
    const { rows } = await db.query<{ id: string }>(
      "insert into public.sucursales (nombre, slug) values ('Sucursal C', 'prueba-sucursal-c') returning id",
    );
    const sucC = rows[0].id;

    const suc = await db.query<{ id: string }>(
      "select id from public.sucursales where id = any($1)",
      [[sucA, sucB, sucC]],
    );
    assert.deepEqual(idsDe(suc.rows), [sucA, sucB, sucC].sort());

    const aud = await db.query("select * from public.auditoria where registro_id = $1", [sucC]);
    assert.equal(aud.rowCount, 1, "no se auditó la creación de la sucursal");
  });
});

test("crear un usuario genera su perfil automáticamente", async () => {
  await withTx(async (db) => {
    await db.asSystem();
    const id = await crearUsuario(db, "María Pérez");
    const { rows } = await db.query<{ nombre_completo: string; es_dueno: boolean }>(
      "select nombre_completo, es_dueno from public.perfiles where id = $1",
      [id],
    );
    assert.equal(rows[0]?.nombre_completo, "María Pérez");
    assert.equal(rows[0]?.es_dueno, false, "un usuario nuevo no debe ser dueño");
  });
});
