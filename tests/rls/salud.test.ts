import assert from "node:assert/strict";
import { test } from "node:test";
import { escenario, withTx, type Db } from "./helpers.ts";

async function cliente(db: Db): Promise<string> {
  const { rows } = await db.query<{ id: string }>("insert into public.clientes (nombre) values ('Paciente') returning id");
  return rows[0].id;
}

const guardar = (db: Db, id: string, datos: object, meds: object[] = []) =>
  db.error("select public.guardar_historial_medico($1, $2, $3)", [id, JSON.stringify(datos), JSON.stringify(meds)]);

const consultas = async (db: Db, id: string) => {
  await db.asSystem();
  const { rows } = await db.query<{ accion: string; usuario_id: string }>(
    "select accion, usuario_id from public.consultas_salud where cliente_id = $1 order by created_at, accion",
    [id],
  );
  return rows;
};

test("recepción registra el historial con consentimiento y queda constancia", async () => {
  await withTx(async (db) => {
    const { recepA } = await escenario(db);
    const id = await cliente(db);
    await db.as(recepA, "aal1");
    assert.equal(
      await guardar(db, id, { consentimiento: true, alergias: "Penicilina", tipo_sangre: "O+", presion: "120/80" }, [
        { medicamento: "Isotretinoína", dosis: "20 mg", desde: "2026-08-01" },
      ]),
      null,
    );
    const { rows } = await db.query<{ h: { historial: { alergias: string; consentimiento_por: string }; medicamentos: unknown[] } }>(
      "select public.ver_historial_medico($1) as h",
      [id],
    );
    assert.equal(rows[0].h.historial.alergias, "Penicilina");
    assert.equal(rows[0].h.historial.consentimiento_por, recepA);
    assert.equal(rows[0].h.medicamentos.length, 1);
    const log = await consultas(db, id);
    assert.deepEqual(log.map((l) => l.accion), ["editar_historial", "ver_historial"]);
    assert.ok(log.every((l) => l.usuario_id === recepA));
  });
});

test("sin consentimiento no se guardan datos de salud", async () => {
  await withTx(async (db) => {
    const { recepA } = await escenario(db);
    const id = await cliente(db);
    await db.as(recepA, "aal1");
    assert.ok(await guardar(db, id, { consentimiento: false, alergias: "Látex" }), "guardó alergias sin consentimiento");
    assert.ok(await guardar(db, id, { consentimiento: false }, [{ medicamento: "X" }]), "guardó medicación sin consentimiento");
    assert.equal(await guardar(db, id, { consentimiento: false }), null, "no permitió dejar constancia de que no autorizó");
  });
});

test("el profesional, el asistente y quien no tiene acceso no ven la salud del cliente", async () => {
  await withTx(async (db) => {
    const { estilistaA, sinAcceso, sucA } = await escenario(db);
    const asistente = (await db.query<{ id: string }>("select gen_random_uuid() as id")).rows[0].id;
    await db.query(
      "insert into auth.users (id, email, aud, role) values ($1, $2, 'authenticated', 'authenticated')",
      [asistente, `${asistente}@prueba.test`],
    );
    await db.query("insert into public.accesos (usuario_id, sucursal_id, rol) values ($1, $2, 'asistente')", [asistente, sucA]);
    const id = await cliente(db);
    for (const u of [estilistaA, asistente, sinAcceso]) {
      await db.as(u, "aal1");
      assert.ok(await db.error("select public.ver_historial_medico($1)", [id]), "pudo ver el historial");
      assert.ok(await db.error("select * from public.documentos_de_cliente($1)", [id]), "pudo listar documentos");
      assert.ok(await guardar(db, id, { consentimiento: true, alergias: "X" }), "pudo editar el historial");
    }
  });
});

test("las tablas de salud no se pueden leer directo, ni siquiera un admin", async () => {
  await withTx(async (db) => {
    const { adminA } = await escenario(db);
    await db.as(adminA);
    for (const t of ["historial_medico", "medicamentos_cliente", "documentos_cliente"]) {
      assert.ok(await db.error(`select * from public.${t}`), `se pudo leer ${t} sin registro`);
    }
    await db.asAnon();
    assert.ok(await db.error("select public.ver_historial_medico(gen_random_uuid())"), "un visitante llamó la función");
  });
});

test("un admin necesita la verificación en dos pasos para ver la salud", async () => {
  await withTx(async (db) => {
    const { adminA } = await escenario(db);
    const id = await cliente(db);
    await db.as(adminA, "aal1");
    assert.ok(await db.error("select public.ver_historial_medico($1)", [id]));
    await db.as(adminA);
    assert.equal(await db.error("select public.ver_historial_medico($1)", [id]), null);
  });
});

test("documentos: registrar, abrir y eliminar quedan en el registro; solo el admin ve el registro", async () => {
  await withTx(async (db) => {
    const { recepA, adminA } = await escenario(db);
    const id = await cliente(db);
    await db.as(recepA, "aal1");
    const { rows } = await db.query<{ id: string; path: string }>(
      "select * from public.registrar_documento($1, 'antes_despues', 'Foto antes', 'image/webp', 1000)",
      [id],
    );
    assert.match(rows[0].path, new RegExp(`^${id}/`));
    assert.equal((await db.query("select * from public.documentos_de_cliente($1)", [id])).rowCount, 1);
    assert.equal((await db.query("select * from public.abrir_documento($1)", [rows[0].id])).rowCount, 1);
    assert.equal((await db.query("select id from public.consultas_salud")).rowCount, 0, "recepción ve el registro de consultas");
    await db.query("select public.eliminar_documento($1)", [rows[0].id]);
    await db.as(adminA);
    const log = (await db.query<{ accion: string }>("select accion from public.consultas_salud where cliente_id = $1", [id])).rows;
    assert.deepEqual(log.map((l) => l.accion).sort(), ["eliminar_documento", "subir_documento", "ver_documento"]);
  });
});

test("un tipo de archivo no permitido no se registra", async () => {
  await withTx(async (db) => {
    const { recepA } = await escenario(db);
    const id = await cliente(db);
    await db.as(recepA, "aal1");
    assert.ok(await db.error("select * from public.registrar_documento($1, 'otro', 'x', 'text/html', 10)", [id]));
  });
});
