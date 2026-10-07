import assert from "node:assert/strict";
import { test } from "node:test";
import { escenario, withTx, type Db } from "./helpers.ts";

// Martes 13 de octubre de 2026, hora de Panamá (UTC-5). El salón abre 9:00–19:00 de lunes a sábado.
const h = (hora: string, dia = "2026-10-13") => `${dia}T${hora}:00-05:00`;

async function base(db: Db) {
  const e = await escenario(db);
  const cli = (await db.query<{ id: string }>("insert into public.clientes (nombre) values ('Cliente agenda') returning id")).rows[0].id;
  const emp = async (nombre: string, usuario: string | null = null) =>
    (
      await db.query<{ id: string }>(
        usuario
          ? "insert into public.empleados (sucursal_id, nombre, usuario_id) values ($1, $2, $3) returning id"
          : "insert into public.empleados (sucursal_id, nombre) values ($1, $2) returning id",
        usuario ? [e.sucA, nombre, usuario] : [e.sucA, nombre],
      )
    ).rows[0].id;
  const propio = await emp("Propio", e.estilistaA);
  const otro = await emp("Otro");
  return { ...e, cli, propio, otro };
}

const cita = (db: Db, suc: string, cli: string, emp: string, ini: string, fin: string) =>
  db.error("insert into public.citas (sucursal_id, cliente_id, empleado_id, inicio, fin) values ($1, $2, $3, $4, $5)", [suc, cli, emp, ini, fin]);

test("recepción agenda dentro del horario y no puede cruzar dos citas del mismo profesional", async () => {
  await withTx(async (db) => {
    const { sucA, recepA, cli, otro } = await base(db);
    await db.as(recepA, "aal1");
    assert.equal(await cita(db, sucA, cli, otro, h("10:00"), h("11:00")), null);
    assert.match((await cita(db, sucA, cli, otro, h("10:30"), h("11:30"))) ?? "", /citas_sin_cruce/);
    assert.equal(await cita(db, sucA, cli, otro, h("11:00"), h("12:00")), null, "una cita justo después debería poder agendarse");
  });
});

test("no se agenda fuera del horario del salón ni el día que cierra", async () => {
  await withTx(async (db) => {
    const { sucA, recepA, cli, otro } = await base(db);
    await db.as(recepA, "aal1");
    assert.match((await cita(db, sucA, cli, otro, h("07:00"), h("08:00"))) ?? "", /Fuera del horario del salón/);
    assert.match((await cita(db, sucA, cli, otro, h("18:30"), h("19:30"))) ?? "", /Fuera del horario del salón/);
    assert.match((await cita(db, sucA, cli, otro, h("10:00", "2026-10-11"), h("11:00", "2026-10-11"))) ?? "", /cerrado/);
  });
});

test("no se agenda en el día libre ni en las vacaciones del profesional", async () => {
  await withTx(async (db) => {
    const { sucA, recepA, cli, otro } = await base(db);
    await db.query("update public.horarios_empleado set trabaja = false where empleado_id = $1 and dia_semana = 3", [otro]);
    await db.query("insert into public.bloqueos_empleado (empleado_id, sucursal_id, desde, hasta, motivo) values ($1, $2, '2026-10-15', '2026-10-16', 'Vacaciones')", [otro, sucA]);
    await db.as(recepA, "aal1");
    assert.match((await cita(db, sucA, cli, otro, h("10:00", "2026-10-14"), h("11:00", "2026-10-14"))) ?? "", /no trabaja/);
    assert.match((await cita(db, sucA, cli, otro, h("10:00", "2026-10-15"), h("11:00", "2026-10-15"))) ?? "", /vacaciones/);
  });
});

test("una cita cancelada libera el espacio", async () => {
  await withTx(async (db) => {
    const { sucA, recepA, cli, otro } = await base(db);
    await db.as(recepA, "aal1");
    await cita(db, sucA, cli, otro, h("10:00"), h("11:00"));
    await db.query("update public.citas set estado = 'cancelada' where empleado_id = $1", [otro]);
    assert.equal(await cita(db, sucA, cli, otro, h("10:00"), h("11:00")), null);
  });
});

test("el profesional ve y agenda solo su propia agenda", async () => {
  await withTx(async (db) => {
    const { sucA, recepA, estilistaA, cli, propio, otro } = await base(db);
    await db.as(recepA, "aal1");
    await cita(db, sucA, cli, propio, h("10:00"), h("11:00"));
    await cita(db, sucA, cli, otro, h("10:00"), h("11:00"));
    await db.as(estilistaA, "aal1");
    const { rows } = await db.query<{ empleado_id: string }>("select empleado_id from public.citas");
    assert.deepEqual(rows.map((r) => r.empleado_id), [propio]);
    assert.ok(await cita(db, sucA, cli, otro, h("12:00"), h("13:00")), "agendó en la agenda de otro");
    assert.equal(await cita(db, sucA, cli, propio, h("12:00"), h("13:00")), null);
    assert.ok(
      await db.error("update public.citas set empleado_id = $1 where empleado_id = $2", [otro, propio]),
      "pudo pasarle su cita a otro profesional",
    );
  });
});

test("el profesional con cita ve el historial médico de ese cliente; sin cita, no", async () => {
  await withTx(async (db) => {
    const { sucA, recepA, estilistaA, cli, propio } = await base(db);
    await db.as(estilistaA, "aal1");
    assert.ok(await db.error("select public.ver_historial_medico($1)", [cli]));
    await db.as(recepA, "aal1");
    await cita(db, sucA, cli, propio, h("10:00"), h("11:00"));
    await db.as(estilistaA, "aal1");
    assert.equal(await db.error("select public.ver_historial_medico($1)", [cli]), null);
  });
});

test("las citas no se borran y un visitante no las ve", async () => {
  await withTx(async (db) => {
    const { sucA, adminA, cli, otro } = await base(db);
    await db.as(adminA);
    await cita(db, sucA, cli, otro, h("10:00"), h("11:00"));
    assert.ok(await db.error("delete from public.citas"));
    assert.ok(await db.error("insert into public.citas (sucursal_id, cliente_id, empleado_id, inicio, fin, origen) values ($1, $2, $3, $4, $5, 'web')", [sucA, cli, otro, h("12:00"), h("13:00")]));
    await db.asAnon();
    assert.ok(await db.error("select id from public.citas"));
  });
});

test("una cita ligada a una sesión de tratamiento actualiza la sesión", async () => {
  await withTx(async (db) => {
    const { sucA, recepA, cli, otro } = await base(db);
    await db.as(recepA, "aal1");
    const plan = (
      await db.query<{ id: string }>(
        `insert into public.planes_tratamiento (sucursal_id, cliente_id, procedimiento, sesiones_total, fecha_inicio, precio_sesion, precio_total)
         values ($1, $2, 'Facial', 2, '2026-10-01', 40, 80) returning id`,
        [sucA, cli],
      )
    ).rows[0].id;
    const ses = (await db.query<{ id: string }>("select id from public.sesiones_tratamiento where plan_id = $1 and numero = 1", [plan])).rows[0].id;
    const { rows } = await db.query<{ id: string }>(
      "insert into public.citas (sucursal_id, cliente_id, empleado_id, sesion_id, inicio, fin) values ($1, $2, $3, $4, $5, $6) returning id",
      [sucA, cli, otro, ses, h("15:00"), h("16:00")],
    );
    await db.query("update public.citas set estado = 'completada' where id = $1", [rows[0].id]);
    const s = (
      await db.query<{ fecha: string; hora: string; estado: string }>(
        "select to_char(fecha, 'YYYY-MM-DD') as fecha, to_char(hora, 'HH24:MI') as hora, estado from public.sesiones_tratamiento where id = $1",
        [ses],
      )
    ).rows[0];
    assert.deepEqual(s, { fecha: "2026-10-13", hora: "15:00", estado: "completada" });
  });
});

test("solo un admin cambia la configuración de recordatorios", async () => {
  await withTx(async (db) => {
    const { sucA, recepA, adminA } = await base(db);
    await db.as(recepA, "aal1");
    assert.ok(await db.error("insert into public.config_recordatorios (sucursal_id, activo) values ($1, true)", [sucA]));
    await db.as(adminA);
    assert.equal(await db.error("insert into public.config_recordatorios (sucursal_id, activo) values ($1, true)", [sucA]), null);
  });
});
