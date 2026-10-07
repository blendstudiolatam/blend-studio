import assert from "node:assert/strict";
import { test } from "node:test";
import { escenario, withTx, type Db } from "./helpers.ts";

async function empleado(db: Db, sucursal: string, nombre = "Ana", usuario: string | null = null): Promise<string> {
  // usuario_id solo lo puede escribir el servidor: se incluye solo al preparar datos como sistema.
  const { rows } = usuario
    ? await db.query<{ id: string }>(
        "insert into public.empleados (sucursal_id, nombre, comision_pct, usuario_id) values ($1, $2, 30, $3) returning id",
        [sucursal, nombre, usuario],
      )
    : await db.query<{ id: string }>(
        "insert into public.empleados (sucursal_id, nombre, comision_pct) values ($1, $2, 30) returning id",
        [sucursal, nombre],
      );
  return rows[0].id;
}

test("un empleado nuevo recibe el horario de la sucursal", async () => {
  await withTx(async (db) => {
    const { sucA } = await escenario(db);
    const emp = await empleado(db, sucA);
    const { rows } = await db.query<{ dia_semana: number; trabaja: boolean }>(
      "select dia_semana, trabaja from public.horarios_empleado where empleado_id = $1 order by dia_semana",
      [emp],
    );
    assert.equal(rows.length, 7);
    assert.equal(rows[0].trabaja, false, "el domingo (cerrado) quedó como día laboral");
  });
});

test("recepción (Personal en lectura) ve al equipo pero no lo edita", async () => {
  await withTx(async (db) => {
    const { sucA, recepA } = await escenario(db);
    const emp = await empleado(db, sucA);
    await db.as(recepA);
    assert.equal((await db.query("select id from public.empleados")).rowCount, 1);
    const upd = await db.query("update public.empleados set comision_pct = 90 where id = $1 returning id", [emp]);
    assert.equal(upd.rowCount, 0, "recepción cambió una comisión");
  });
});

test("el profesional solo ve su propia ficha y su horario", async () => {
  await withTx(async (db) => {
    const { sucA, estilistaA } = await escenario(db);
    const propio = await empleado(db, sucA, "Propio", estilistaA);
    await empleado(db, sucA, "Otro");
    await db.as(estilistaA, "aal1");
    const { rows } = await db.query<{ id: string }>("select id from public.empleados");
    assert.deepEqual(rows.map((r) => r.id), [propio]);
    const h = await db.query<{ empleado_id: string }>("select distinct empleado_id from public.horarios_empleado");
    assert.deepEqual(h.rows.map((r) => r.empleado_id), [propio]);
    const upd = await db.query("update public.empleados set comision_pct = 99 where id = $1 returning id", [propio]);
    assert.equal(upd.rowCount, 0, "el profesional se subió la comisión");
  });
});

test("el admin gestiona empleados de su sucursal y no de otra", async () => {
  await withTx(async (db) => {
    const { sucA, sucB, adminA } = await escenario(db);
    await db.as(adminA);
    const emp = await empleado(db, sucA);
    assert.match(
      (await db.error("insert into public.empleados (sucursal_id, nombre) values ($1, 'X')", [sucB])) ?? "",
      /row-level security/,
    );
    const upd = await db.query("update public.horarios_empleado set salida = '18:00' where empleado_id = $1 and dia_semana = 1 returning id", [emp]);
    assert.equal(upd.rowCount, 1);
  });
});

test("nadie enlaza un usuario a un empleado desde la app (lo hace el servidor)", async () => {
  await withTx(async (db) => {
    const { sucA, adminA, estilistaA } = await escenario(db);
    const emp = await empleado(db, sucA);
    await db.as(adminA);
    assert.match(
      (await db.error("update public.empleados set usuario_id = $1 where id = $2", [estilistaA, emp])) ?? "",
      /permission denied/,
    );
  });
});

test("servicios y bloqueos deben ser de la misma sucursal; reglas de datos", async () => {
  await withTx(async (db) => {
    const { sucA, sucB } = await escenario(db);
    const emp = await empleado(db, sucA);
    const { rows: c } = await db.query<{ id: string }>(
      "insert into public.categorias_servicio (sucursal_id, nombre) values ($1, 'Cat B') returning id",
      [sucB],
    );
    const { rows: s } = await db.query<{ id: string }>(
      "insert into public.servicios (sucursal_id, categoria_id, nombre, duracion_min, precio) values ($1, $2, 'Corte', 30, 10) returning id",
      [sucB, c[0].id],
    );
    assert.match(
      (await db.error("insert into public.empleado_servicios (empleado_id, servicio_id, sucursal_id) values ($1, $2, $3)", [emp, s[0].id, sucA])) ?? "",
      /no pertenece a la sucursal/,
    );
    assert.match(
      (await db.error("insert into public.bloqueos_empleado (empleado_id, sucursal_id, desde, hasta) values ($1, $2, '2026-10-10', '2026-10-01')", [emp, sucA])) ?? "",
      /check constraint/,
    );
    assert.match((await db.error("update public.empleados set comision_pct = 120 where id = $1", [emp])) ?? "", /check constraint/);
    assert.match((await db.error("update public.empleados set color = 'red' where id = $1", [emp])) ?? "", /check constraint/);
  });
});

test("los cambios de comisión quedan en la auditoría", async () => {
  await withTx(async (db) => {
    const { sucA, adminA } = await escenario(db);
    await db.as(adminA);
    const emp = await empleado(db, sucA);
    await db.query("update public.empleados set comision_pct = 40 where id = $1", [emp]);
    const { rows } = await db.query<{ accion: string }>(
      "select accion from public.auditoria where tabla = 'empleados' and registro_id = $1 order by id",
      [emp],
    );
    assert.deepEqual(rows.map((r) => r.accion), ["crear", "editar"]);
  });
});

test("solo quien gestiona Personal sube fotos del equipo", async () => {
  await withTx(async (db) => {
    const { recepA, adminA } = await escenario(db);
    const subir = () => db.error("insert into storage.objects (bucket_id, name) values ('equipo', 'fotos/prueba.webp')");
    await db.as(recepA);
    assert.match((await subir()) ?? "", /row-level security/);
    await db.as(adminA);
    assert.equal(await subir(), null);
  });
});
