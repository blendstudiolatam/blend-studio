import assert from "node:assert/strict";
import { test } from "node:test";
import { escenario, withTx, type Db } from "./helpers.ts";

async function cliente(db: Db): Promise<string> {
  const { rows } = await db.query<{ id: string }>("insert into public.clientes (nombre) values ('Cliente plan') returning id");
  return rows[0].id;
}

async function plan(db: Db, sucursal: string, clienteId: string, sesiones = 4): Promise<string> {
  const { rows } = await db.query<{ id: string }>(
    `insert into public.planes_tratamiento
       (sucursal_id, cliente_id, procedimiento, sesiones_total, frecuencia_dias, fecha_inicio, precio_sesion, precio_total)
     values ($1, $2, 'Facial acné', $3, 14, '2026-10-01', 45, 160) returning id`,
    [sucursal, clienteId, sesiones],
  );
  return rows[0].id;
}

const sesiones = async (db: Db, planId: string) =>
  (
    await db.query<{ numero: number; fecha: string }>(
      "select numero, to_char(fecha, 'YYYY-MM-DD') as fecha from public.sesiones_tratamiento where plan_id = $1 order by numero",
      [planId],
    )
  ).rows;

test("al crear un plan se generan sus sesiones con fechas según la frecuencia", async () => {
  await withTx(async (db) => {
    const { sucA, recepA } = await escenario(db);
    const c = await cliente(db);
    await db.as(recepA, "aal1");
    const p = await plan(db, sucA, c, 3);
    assert.deepEqual(await sesiones(db, p), [
      { numero: 1, fecha: "2026-10-01" },
      { numero: 2, fecha: "2026-10-15" },
      { numero: 3, fecha: "2026-10-29" },
    ]);
    await db.query("update public.planes_tratamiento set sesiones_total = 4 where id = $1", [p]);
    assert.equal((await sesiones(db, p)).at(-1)?.fecha, "2026-11-12");
    await db.query("update public.planes_tratamiento set sesiones_total = 2 where id = $1", [p]);
    assert.equal((await sesiones(db, p)).length, 2);
  });
});

test("no se pueden quitar sesiones ya realizadas o pagadas", async () => {
  await withTx(async (db) => {
    const { sucA, recepA } = await escenario(db);
    const c = await cliente(db);
    await db.as(recepA, "aal1");
    const p = await plan(db, sucA, c, 3);
    await db.query("update public.sesiones_tratamiento set pagada = true where plan_id = $1 and numero = 3", [p]);
    assert.ok(await db.error("update public.planes_tratamiento set sesiones_total = 2 where id = $1", [p]));
  });
});

test("al completar todas las sesiones el plan queda completado, y vuelve a activo si se deshace", async () => {
  await withTx(async (db) => {
    const { sucA, recepA } = await escenario(db);
    const c = await cliente(db);
    await db.as(recepA, "aal1");
    const p = await plan(db, sucA, c, 2);
    const estado = async () =>
      (await db.query<{ estado: string }>("select estado from public.planes_tratamiento where id = $1", [p])).rows[0].estado;
    await db.query("update public.sesiones_tratamiento set estado = 'completada' where plan_id = $1", [p]);
    assert.equal(await estado(), "completado");
    await db.query("update public.sesiones_tratamiento set estado = 'pendiente' where plan_id = $1 and numero = 2", [p]);
    assert.equal(await estado(), "activo");
  });
});

test("el profesional ve los planes pero no los cambia ni marca sesiones pagadas", async () => {
  await withTx(async (db) => {
    const { sucA, estilistaA } = await escenario(db);
    const c = await cliente(db);
    const p = await plan(db, sucA, c);
    await db.as(estilistaA, "aal1");
    assert.equal((await db.query("select id from public.planes_tratamiento where id = $1", [p])).rowCount, 1);
    const upd = await db.query("update public.sesiones_tratamiento set pagada = true where plan_id = $1 returning id", [p]);
    assert.equal(upd.rowCount, 0, "el profesional marcó una sesión como pagada");
    assert.ok(await db.error("insert into public.sesiones_tratamiento (plan_id, sucursal_id, numero) values ($1, $2, 9)", [p, sucA]));
  });
});

test("los planes de una sucursal no los ve ni toca otra sucursal", async () => {
  await withTx(async (db) => {
    const { sucA, adminB } = await escenario(db);
    const c = await cliente(db);
    const p = await plan(db, sucA, c);
    await db.as(adminB);
    assert.equal((await db.query("select id from public.planes_tratamiento where id = $1", [p])).rowCount, 0);
    assert.equal((await db.query("delete from public.planes_tratamiento where id = $1 returning id", [p])).rowCount, 0);
  });
});

test("paquetes: recepción los ve pero solo quien gestiona Servicios cambia precios", async () => {
  await withTx(async (db) => {
    const { sucA, recepA, adminA } = await escenario(db);
    await db.as(adminA);
    const { rows } = await db.query<{ id: string }>(
      "insert into public.paquetes (sucursal_id, nombre, sesiones, precio_sesion, precio_total) values ($1, 'Pack', 6, 45, 240) returning id",
      [sucA],
    );
    await db.as(recepA, "aal1");
    assert.equal((await db.query("select id from public.paquetes where id = $1", [rows[0].id])).rowCount, 1);
    const upd = await db.query("update public.paquetes set precio_total = 1 where id = $1 returning id", [rows[0].id]);
    assert.equal(upd.rowCount, 0, "recepción cambió el precio de un paquete");
  });
});

test("un plan no puede usar un profesional de otra sucursal", async () => {
  await withTx(async (db) => {
    const { sucA, sucB, adminA } = await escenario(db);
    const c = await cliente(db);
    const { rows } = await db.query<{ id: string }>(
      "insert into public.empleados (sucursal_id, nombre) values ($1, 'Ajeno') returning id",
      [sucB],
    );
    await db.as(adminA);
    assert.ok(
      await db.error(
        `insert into public.planes_tratamiento (sucursal_id, cliente_id, profesional_id, procedimiento, sesiones_total, fecha_inicio, precio_sesion, precio_total)
         values ($1, $2, $3, 'X', 2, '2026-10-01', 10, 20)`,
        [sucA, c, rows[0].id],
      ),
    );
  });
});
