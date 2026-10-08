import assert from "node:assert/strict";
import { test } from "node:test";
import { escenario, withTx, type Db } from "./helpers.ts";

const h = (hora: string) => `2026-10-13T${hora}:00-05:00`;

async function preparar(db: Db) {
  const e = await escenario(db);
  const cli = (await db.query<{ id: string }>("insert into public.clientes (nombre, fecha_nacimiento) values ('Cumple', '1990-01-02') returning id")).rows[0].id;
  const cat = (await db.query<{ id: string }>("insert into public.categorias_servicio (sucursal_id, nombre) values ($1, 'Cabello') returning id", [e.sucA])).rows[0].id;
  const srv = (
    await db.query<{ id: string }>("insert into public.servicios (sucursal_id, categoria_id, nombre, duracion_min, precio) values ($1, $2, 'Color', 60, 100) returning id", [e.sucA, cat])
  ).rows[0].id;
  const propio = (
    await db.query<{ id: string }>("insert into public.empleados (sucursal_id, nombre, comision_pct, usuario_id) values ($1, 'Propio', 30, $2) returning id", [e.sucA, e.estilistaA])
  ).rows[0].id;
  const otro = (await db.query<{ id: string }>("insert into public.empleados (sucursal_id, nombre, comision_pct) values ($1, 'Otro', 40) returning id", [e.sucA])).rows[0].id;
  await db.query("insert into public.empleado_servicios (empleado_id, servicio_id, sucursal_id, comision_pct) values ($1, $2, $3, 50)", [propio, srv, e.sucA]);
  const cita = async (emp: string, hora: string) =>
    (
      await db.query<{ id: string }>(
        "insert into public.citas (sucursal_id, cliente_id, empleado_id, servicio_id, inicio, fin, precio) values ($1, $2, $3, $4, $5, $6, 100) returning id",
        [e.sucA, cli, emp, srv, h(hora), h(`${String(Number(hora.slice(0, 2)) + 1).padStart(2, "0")}:00`)],
      )
    ).rows[0].id;
  return { ...e, cli, srv, propio, otro, cita };
}

test("al completar la cita se guarda la comisión (la del servicio o la general) y no cambia después", async () => {
  await withTx(async (db) => {
    const { propio, otro, cita } = await preparar(db);
    const c1 = await cita(propio, "10:00");
    const c2 = await cita(otro, "10:00");
    await db.query("update public.citas set estado = 'completada' where id in ($1, $2)", [c1, c2]);
    const pct = async (id: string) => (await db.query<{ p: string }>("select comision_pct as p from public.citas where id = $1", [id])).rows[0].p;
    assert.equal(Number(await pct(c1)), 50, "no usó la comisión especial del servicio");
    assert.equal(Number(await pct(c2)), 40);
    await db.query("update public.empleados set comision_pct = 10 where id = $1", [otro]);
    await db.query("update public.citas set notas = 'x' where id = $1", [c2]);
    assert.equal(Number(await pct(c2)), 40, "la comisión ya ganada cambió");
  });
});

test("el profesional ve solo sus comisiones; recepción no las ve; el admin ve todas", async () => {
  await withTx(async (db) => {
    const { sucA, propio, otro, cita, estilistaA, recepA, adminA } = await preparar(db);
    await db.query("update public.citas set estado = 'completada' where id in ($1, $2)", [await cita(propio, "10:00"), await cita(otro, "10:00")]);
    const consulta = "select * from public.comisiones($1, '2026-10-01', '2026-10-31', $2)";

    await db.as(estilistaA, "aal1");
    const mias = await db.query<{ comision: string }>(consulta, [sucA, propio]);
    assert.deepEqual(mias.rows.map((r) => Number(r.comision)), [50]);
    assert.ok(await db.error(consulta, [sucA, otro]), "vio las comisiones de otro profesional");
    assert.ok(await db.error("select comision_pct from public.citas"), "leyó el porcentaje directo de la tabla");

    await db.as(recepA, "aal1");
    assert.ok(await db.error(consulta, [sucA, null]), "recepción vio comisiones");

    await db.as(adminA);
    assert.equal((await db.query(consulta, [sucA, null])).rowCount, 2);
  });
});

test("los cumpleaños cruzan el fin de año y calculan la edad que cumple", async () => {
  await withTx(async (db) => {
    const { recepA, cli } = await preparar(db);
    await db.as(recepA, "aal1");
    const { rows } = await db.query<{ id: string; cumple: string; edad: number }>(
      "select id, to_char(cumple, 'YYYY-MM-DD') as cumple, edad from public.cumpleanos('2026-12-28', '2027-01-05') where id = $1",
      [cli],
    );
    assert.deepEqual(rows.map(({ cumple, edad }) => ({ cumple, edad })), [{ cumple: "2027-01-02", edad: 37 }]);
    await db.asAnon();
    assert.ok(await db.error("select * from public.cumpleanos(current_date, current_date + 7)"));
  });
});
