import assert from "node:assert/strict";
import { test } from "node:test";
import { escenario, withTx, type Db } from "./helpers.ts";

async function cliente(db: Db, nombre = "Cliente prueba"): Promise<string> {
  const { rows } = await db.query<{ id: string }>(
    "insert into public.clientes (nombre, telefono) values ($1, '+507 6000-0000') returning id",
    [nombre],
  );
  return rows[0].id;
}

const ve = async (db: Db, id: string) =>
  (await db.query("select id from public.clientes where id = $1", [id])).rowCount === 1;

test("recepción crea y edita clientes; la ficha es la misma en todas las sucursales", async () => {
  await withTx(async (db) => {
    const { recepA, adminB } = await escenario(db);
    await db.as(recepA, "aal1");
    const id = await cliente(db);
    const upd = await db.query("update public.clientes set notas = 'Prefiere la mañana' where id = $1 returning id", [id]);
    assert.equal(upd.rowCount, 1);
    await db.as(adminB);
    assert.ok(await ve(db, id), "el admin de otra sucursal no ve al cliente compartido");
  });
});

test("el profesional ve clientes pero no los crea ni edita", async () => {
  await withTx(async (db) => {
    const { estilistaA } = await escenario(db);
    const id = await cliente(db);
    await db.as(estilistaA, "aal1");
    assert.ok(await ve(db, id));
    const upd = await db.query("update public.clientes set nombre = 'X' where id = $1 returning id", [id]);
    assert.equal(upd.rowCount, 0, "el profesional editó un cliente");
    assert.ok(await db.error("insert into public.clientes (nombre) values ('Nuevo')"), "el profesional creó un cliente");
  });
});

test("sin acceso a ninguna sucursal o sin sesión no se ven clientes", async () => {
  await withTx(async (db) => {
    const { sinAcceso } = await escenario(db);
    const id = await cliente(db);
    await db.as(sinAcceso);
    assert.equal(await ve(db, id), false);
    await db.asAnon();
    assert.ok(await db.error("select id from public.clientes"), "un visitante pudo leer clientes");
  });
});

test("solo un administrador borra fichas de clientes", async () => {
  await withTx(async (db) => {
    const { recepA, adminA } = await escenario(db);
    const id = await cliente(db);
    await db.as(recepA, "aal1");
    assert.equal((await db.query("delete from public.clientes where id = $1 returning id", [id])).rowCount, 0);
    await db.as(adminA, "aal1");
    assert.equal(
      (await db.query("delete from public.clientes where id = $1 returning id", [id])).rowCount,
      0,
      "un admin sin verificación en dos pasos borró un cliente",
    );
    await db.as(adminA);
    assert.equal((await db.query("delete from public.clientes where id = $1 returning id", [id])).rowCount, 1);
  });
});

test("el código, el autor y el origen no se pueden falsificar al editar", async () => {
  await withTx(async (db) => {
    const { recepA, adminA } = await escenario(db);
    const id = await cliente(db);
    await db.as(recepA, "aal1");
    assert.ok(await db.error("update public.clientes set codigo = 1 where id = $1", [id]));
    assert.ok(await db.error("update public.clientes set creado_por = $2 where id = $1", [id, adminA]));
    assert.ok(await db.error("update public.clientes set origen = 'web' where id = $1", [id]));
  });
});

test("al crear, el autor queda registrado y la búsqueda ignora tildes", async () => {
  await withTx(async (db) => {
    const { recepA, sucA, sucB } = await escenario(db);
    await db.as(recepA, "aal1");
    const { rows } = await db.query<{ creado_por: string; busqueda: string; telefono_digitos: string }>(
      `insert into public.clientes (nombre, apellido, telefono, sucursal_origen_id)
       values ('José', 'Sánchez', '+507 6612-4580', $1) returning creado_por, busqueda, telefono_digitos`,
      [sucA],
    );
    assert.equal(rows[0].creado_por, recepA);
    assert.match(rows[0].busqueda, /jose sanchez/);
    assert.equal(rows[0].telefono_digitos, "50766124580");
    assert.ok(
      await db.error("insert into public.clientes (nombre, sucursal_origen_id) values ('Otro', $1)", [sucB]),
      "registró un cliente en una sucursal donde no trabaja",
    );
  });
});

test("cada cambio en la ficha queda en la auditoría", async () => {
  await withTx(async (db) => {
    const { recepA } = await escenario(db);
    await db.as(recepA, "aal1");
    const id = await cliente(db);
    await db.query("update public.clientes set telefono = '+507 6111-1111' where id = $1", [id]);
    await db.asSystem();
    const { rows } = await db.query<{ accion: string; usuario_id: string }>(
      "select accion, usuario_id from public.auditoria where tabla = 'clientes' and registro_id = $1 order by created_at",
      [id],
    );
    assert.deepEqual(rows.map((r) => r.accion), ["crear", "editar"]);
    assert.ok(rows.every((r) => r.usuario_id === recepA));
  });
});
