import assert from "node:assert/strict";
import { test } from "node:test";
import { escenario, withTx, type Db } from "./helpers.ts";

/** Un martes entre 7 y 13 días a partir de hoy (dentro del máximo de 60 días). */
function proximoMartes(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + 7);
  while (d.getUTCDay() !== 2) d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

async function preparar(db: Db) {
  const e = await escenario(db);
  const slug = (await db.query<{ slug: string }>("select slug from public.sucursales where id = $1", [e.sucA])).rows[0].slug;
  const cat = (
    await db.query<{ id: string }>("insert into public.categorias_servicio (sucursal_id, nombre) values ($1, 'Cabello') returning id", [e.sucA])
  ).rows[0].id;
  const srv = (
    await db.query<{ id: string }>(
      "insert into public.servicios (sucursal_id, categoria_id, nombre, duracion_min, precio) values ($1, $2, 'Corte', 60, 25) returning id",
      [e.sucA, cat],
    )
  ).rows[0].id;
  const emp = (await db.query<{ id: string }>("insert into public.empleados (sucursal_id, nombre, apellido) values ($1, 'Ana', 'Ríos') returning id", [e.sucA])).rows[0].id;
  await db.query("insert into public.empleado_servicios (empleado_id, servicio_id, sucursal_id) values ($1, $2, $3)", [emp, srv, e.sucA]);
  return { ...e, slug, srv, emp, fecha: proximoMartes() };
}

const reservar = (db: Db, slug: string, srv: string, emp: string | null, fecha: string, hora: string, telefono = "+507 6555-1234") =>
  db.query<{ r: Record<string, string> }>(
    "select public.crear_reserva_web($1, $2, $3, $4, $5, 'Laura', 'Gómez', $6, 'laura@ejemplo.test', null) as r",
    [slug, srv, emp, fecha, hora, telefono],
  );

test("el público y los usuarios no pueden llamar las funciones de reserva directamente", async () => {
  await withTx(async (db) => {
    const { slug, recepA } = await preparar(db);
    for (const rol of ["anon", "user"] as const) {
      if (rol === "anon") await db.asAnon();
      else await db.as(recepA, "aal1");
      assert.ok(await db.error("select public.reserva_catalogo($1)", [slug]));
      assert.ok(await db.error("select * from public.reserva_horarios($1, gen_random_uuid(), null, current_date)", [slug]));
      assert.ok(await db.error("select public.reserva_permitida('reserva', 'x')"));
    }
  });
});

test("el catálogo muestra servicios y profesionales sin datos privados", async () => {
  await withTx(async (db) => {
    const { slug } = await preparar(db);
    await db.asService();
    const { rows } = await db.query<{ c: { servicios: unknown[]; profesionales: Record<string, unknown>[] } }>(
      "select public.reserva_catalogo($1) as c",
      [slug],
    );
    assert.equal(rows[0].c.servicios.length, 1);
    const pro = rows[0].c.profesionales[0];
    assert.equal(pro.nombre, "Ana");
    assert.ok(!("email" in pro) && !("telefono" in pro) && !("comision_pct" in pro), "el catálogo expone datos del empleado");
  });
});

test("la reserva entra pendiente, crea el cliente y ese horario deja de ofrecerse", async () => {
  await withTx(async (db) => {
    const { slug, srv, emp, fecha } = await preparar(db);
    await db.asService();
    const libres = async () =>
      (await db.query<{ hora: string }>("select hora from public.reserva_horarios($1, $2, null, $3)", [slug, srv, fecha])).rows.map((r) => r.hora);
    assert.ok((await libres()).includes("10:00"));
    const { rows } = await reservar(db, slug, srv, null, fecha, "10:00");
    assert.equal(rows[0].r.profesional, "Ana");
    assert.ok(!(await libres()).includes("10:00"));
    assert.ok(!(await libres()).includes("10:30"), "ofrece un horario que se cruza con la reserva");
    const cita = (
      await db.query<{ estado: string; origen: string; cliente: string; consentimiento: string | null }>(
        `select c.estado, c.origen, cl.origen as cliente, cl.consentimiento_datos_at as consentimiento
         from public.citas c join public.clientes cl on cl.id = c.cliente_id where c.id = $1`,
        [rows[0].r.id],
      )
    ).rows[0];
    assert.deepEqual({ ...cita, consentimiento: Boolean(cita.consentimiento) }, { estado: "pendiente", origen: "web", cliente: "web", consentimiento: true });
    // Mismo horario otra vez: rechazado
    await db.query("savepoint s");
    await assert.rejects(reservar(db, slug, srv, emp, fecha, "10:00", "+507 6000-9999"), /ya no está disponible/);
    await db.query("rollback to savepoint s");
  });
});

test("un cliente que ya existe se reconoce por el teléfono y no se cambian sus datos", async () => {
  await withTx(async (db) => {
    const { slug, srv, fecha } = await preparar(db);
    const existente = (
      await db.query<{ id: string }>("insert into public.clientes (nombre, apellido, telefono) values ('Laura', 'Original', '6555-1234') returning id")
    ).rows[0].id;
    await db.asService();
    const { rows } = await reservar(db, slug, srv, null, fecha, "11:00", "+507 6555-1234");
    const c = (await db.query<{ cliente_id: string }>("select cliente_id from public.citas where id = $1", [rows[0].r.id])).rows[0];
    assert.equal(c.cliente_id, existente);
    const cl = (await db.query<{ apellido: string }>("select apellido from public.clientes where id = $1", [existente])).rows[0];
    assert.equal(cl.apellido, "Original");
  });
});

test("no se reserva fuera de horario, en el pasado ni más allá de 60 días", async () => {
  await withTx(async (db) => {
    const { slug, srv } = await preparar(db);
    await db.asService();
    const intento = async (fecha: string, hora: string) => {
      await db.query("savepoint s");
      try {
        await reservar(db, slug, srv, null, fecha, hora);
        return null;
      } catch (e) {
        return (e as Error).message;
      } finally {
        await db.query("rollback to savepoint s");
      }
    };
    assert.ok(await intento(proximoMartes(), "07:00"));
    assert.ok(await intento("2020-01-07", "10:00"));
    const lejos = new Date(Date.now() + 90 * 86_400_000).toISOString().slice(0, 10);
    assert.ok(await intento(lejos, "10:00"));
  });
});

test("el límite de solicitudes frena el abuso", async () => {
  await withTx(async (db) => {
    await db.asService();
    const ip = `ip-prueba-${Date.now()}`;
    const resultados: boolean[] = [];
    for (let i = 0; i < 6; i++) {
      const { rows } = await db.query<{ ok: boolean }>("select public.reserva_permitida('reserva', $1, $2) as ok", [ip, `tel-${i}`]);
      resultados.push(rows[0].ok);
    }
    assert.deepEqual(resultados, [true, true, true, true, true, false]);
    const tel = `tel-fijo-${Date.now()}`;
    const porTel: boolean[] = [];
    for (let i = 0; i < 4; i++) {
      const { rows } = await db.query<{ ok: boolean }>("select public.reserva_permitida('reserva', $1, $2) as ok", [`otra-ip-${i}-${Date.now()}`, tel]);
      porTel.push(rows[0].ok);
    }
    assert.deepEqual(porTel, [true, true, true, false]);
  });
});
