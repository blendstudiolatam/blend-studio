import assert from "node:assert/strict";
import { test } from "node:test";
import { escenario, withTx, type Db } from "./helpers.ts";

async function categoria(db: Db, sucursal: string, nombre = "Barbería"): Promise<string> {
  const { rows } = await db.query<{ id: string }>(
    "insert into public.categorias_servicio (sucursal_id, nombre) values ($1, $2) returning id",
    [sucursal, nombre],
  );
  return rows[0].id;
}

async function servicio(db: Db, sucursal: string, cat: string, precio = 15): Promise<string> {
  const { rows } = await db.query<{ id: string }>(
    `insert into public.servicios (sucursal_id, categoria_id, nombre, duracion_min, precio)
     values ($1, $2, 'Corte', 30, $3) returning id`,
    [sucursal, cat, precio],
  );
  return rows[0].id;
}

test("todo el equipo de la sucursal ve el catálogo; otras sucursales no", async () => {
  await withTx(async (db) => {
    const { sucA, sucB, estilistaA, adminB } = await escenario(db);
    const cat = await categoria(db, sucA);
    await servicio(db, sucA, cat);

    await db.as(estilistaA, "aal1");
    assert.equal((await db.query("select id from public.servicios")).rowCount, 1);
    await db.as(adminB);
    assert.equal(
      (await db.query("select id from public.servicios where sucursal_id = $1", [sucA])).rowCount,
      0,
      "otra sucursal vio el catálogo",
    );
    void sucB;
  });
});

test("recepción (Servicios en solo lectura) no puede crear ni cambiar precios", async () => {
  await withTx(async (db) => {
    const { sucA, recepA } = await escenario(db);
    const cat = await categoria(db, sucA);
    const serv = await servicio(db, sucA, cat);

    await db.as(recepA);
    assert.match(
      (await db.error("insert into public.categorias_servicio (sucursal_id, nombre) values ($1, 'Uñas')", [sucA])) ?? "",
      /row-level security/,
    );
    const upd = await db.query("update public.servicios set precio = 1 where id = $1 returning id", [serv]);
    assert.equal(upd.rowCount, 0, "recepción cambió un precio");
  });
});

test("el admin gestiona el catálogo de su sucursal y no el de otra", async () => {
  await withTx(async (db) => {
    const { sucA, sucB, adminA } = await escenario(db);
    await db.as(adminA);
    const cat = await categoria(db, sucA);
    await servicio(db, sucA, cat);
    assert.match(
      (await db.error("insert into public.categorias_servicio (sucursal_id, nombre) values ($1, 'X')", [sucB])) ?? "",
      /row-level security/,
    );
  });
});

test("con Servicios en acceso total, recepción sí puede editar", async () => {
  await withTx(async (db) => {
    const { sucA, recepA } = await escenario(db);
    const cat = await categoria(db, sucA);
    const serv = await servicio(db, sucA, cat);
    await db.query(
      "insert into public.permisos_usuario (usuario_id, sucursal_id, modulo, nivel) values ($1, $2, 'servicios', 'total')",
      [recepA, sucA],
    );
    await db.as(recepA);
    const upd = await db.query("update public.servicios set precio = 18 where id = $1 returning id", [serv]);
    assert.equal(upd.rowCount, 1);
  });
});

test("reglas de datos: descuento menor al precio, duración válida, categoría de la misma sucursal", async () => {
  await withTx(async (db) => {
    const { sucA, sucB } = await escenario(db);
    const catA = await categoria(db, sucA);
    const catB = await categoria(db, sucB);
    const serv = await servicio(db, sucA, catA);

    assert.match(
      (await db.error("update public.servicios set precio_descuento = 20 where id = $1", [serv])) ?? "",
      /check constraint/,
    );
    assert.match((await db.error("update public.servicios set duracion_min = 0 where id = $1", [serv])) ?? "", /check constraint/);
    assert.match(
      (await db.error("update public.servicios set categoria_id = $1 where id = $2", [catB, serv])) ?? "",
      /no pertenece a la sucursal/,
    );
    assert.match(
      (await db.error("update public.categorias_servicio set imagen = '../../etc' where id = $1", [catA])) ?? "",
      /check constraint/,
    );
  });
});

test("no se puede borrar una categoría con servicios y los cambios de precio se auditan", async () => {
  await withTx(async (db) => {
    const { sucA, adminA } = await escenario(db);
    await db.as(adminA);
    const cat = await categoria(db, sucA);
    const serv = await servicio(db, sucA, cat);
    assert.match((await db.error("delete from public.categorias_servicio where id = $1", [cat])) ?? "", /foreign key/);

    await db.query("update public.servicios set precio = 20 where id = $1", [serv]);
    const { rows } = await db.query<{ accion: string; usuario_id: string }>(
      "select accion, usuario_id from public.auditoria where tabla = 'servicios' and registro_id = $1 order by id",
      [serv],
    );
    assert.deepEqual(rows.map((r) => r.accion), ["crear", "editar"]);
    assert.ok(rows.every((r) => r.usuario_id === adminA));
  });
});
