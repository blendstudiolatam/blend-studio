import assert from "node:assert/strict";
import { test } from "node:test";
import { crearSucursal, escenario, withTx } from "./helpers.ts";

test("el equipo ve los datos del negocio; un visitante no", async () => {
  await withTx(async (db) => {
    const { recepA, sinAcceso } = await escenario(db);
    await db.as(recepA);
    assert.equal((await db.query("select id from public.negocio")).rowCount, 1);
    await db.as(sinAcceso);
    assert.equal((await db.query("select id from public.negocio")).rowCount, 0);
    await db.asAnon();
    assert.match((await db.error("select * from public.negocio")) ?? "", /permission denied/);
  });
});

test("la marca pública la puede leer cualquiera y no incluye datos legales", async () => {
  await withTx(async (db) => {
    await db.asAnon();
    const { rows, fields } = await db.query("select * from public.marca_publica()");
    assert.equal(rows.length, 1);
    const columnas = fields.map((f) => f.name);
    assert.ok(columnas.includes("color_primario"));
    assert.ok(!columnas.includes("ruc") && !columnas.includes("nombre_legal") && !columnas.includes("email_respaldo"));
  });
});

test("solo un administrador (con 2 pasos) edita los datos del negocio", async () => {
  await withTx(async (db) => {
    const { adminA, recepA, dueno } = await escenario(db);
    const editar = () => db.query("update public.negocio set nombre_comercial = 'Prueba' returning id");

    await db.as(recepA);
    assert.equal((await editar()).rowCount, 0, "recepción editó el negocio");
    await db.as(adminA, "aal1");
    assert.equal((await editar()).rowCount, 0, "un admin sin 2 pasos editó el negocio");
    await db.as(adminA);
    assert.equal((await editar()).rowCount, 1);
    await db.as(dueno);
    assert.equal((await editar()).rowCount, 1);
  });
});

test("no se pueden cambiar columnas protegidas ni guardar colores inválidos", async () => {
  await withTx(async (db) => {
    const { adminA } = await escenario(db);
    await db.as(adminA);
    assert.match((await db.error("update public.negocio set moneda = 'EUR'")) ?? "", /permission denied/);
    assert.match((await db.error("update public.negocio set unico = false")) ?? "", /permission denied/);
    assert.match(
      (await db.error("update public.negocio set color_primario = 'red;}body{display:none'")) ?? "",
      /check constraint/,
    );
    assert.match((await db.error("update public.negocio set itbms_pct = 150")) ?? "", /check constraint/);
  });
});

test("cada sucursal nueva recibe su horario semanal (domingo cerrado)", async () => {
  await withTx(async (db) => {
    await db.asSystem();
    const suc = await crearSucursal(db, "Sucursal Horario");
    const { rows } = await db.query<{ dia_semana: number; abierto: boolean }>(
      "select dia_semana, abierto from public.horarios_sucursal where sucursal_id = $1 order by dia_semana",
      [suc],
    );
    assert.equal(rows.length, 7);
    assert.equal(rows[0].abierto, false);
    assert.ok(rows.slice(1).every((r) => r.abierto));
  });
});

test("el horario lo edita quien configura la sucursal, solo en la suya", async () => {
  await withTx(async (db) => {
    const { sucA, sucB, adminA, recepA, estilistaA } = await escenario(db);
    const editar = (suc: string) =>
      db.query(
        "update public.horarios_sucursal set cierre = '20:00' where sucursal_id = $1 and dia_semana = 1 returning id",
        [suc],
      );

    await db.as(estilistaA);
    assert.equal((await db.query("select id from public.horarios_sucursal where sucursal_id = $1", [sucA])).rowCount, 7);
    assert.equal((await editar(sucA)).rowCount, 0, "el profesional editó el horario");

    await db.as(recepA);
    assert.equal((await editar(sucA)).rowCount, 0, "recepción sin permiso editó el horario");

    await db.as(adminA);
    assert.equal((await editar(sucA)).rowCount, 1);
    assert.equal((await editar(sucB)).rowCount, 0, "el admin de A editó el horario de B");

    assert.match(
      (await db.error(
        "update public.horarios_sucursal set apertura = '20:00', cierre = '08:00' where sucursal_id = $1 and dia_semana = 2",
        [sucA],
      )) ?? "",
      /check constraint/,
      "se guardó un horario con cierre antes de la apertura",
    );
  });
});

test("con Configuración en acceso total, recepción puede editar su sucursal", async () => {
  await withTx(async (db) => {
    const { sucA, recepA } = await escenario(db);
    await db.query(
      "insert into public.permisos_usuario (usuario_id, sucursal_id, modulo, nivel) values ($1, $2, 'configuracion', 'total')",
      [recepA, sucA],
    );
    await db.as(recepA);
    const { rowCount } = await db.query(
      "update public.sucursales set telefono = '+507 6000-0000' where id = $1 returning id",
      [sucA],
    );
    assert.equal(rowCount, 1);
  });
});

test("solo administradores pueden subir archivos al almacenamiento de la marca", async () => {
  await withTx(async (db) => {
    const { recepA, adminA } = await escenario(db);
    const subir = () =>
      db.error("insert into storage.objects (bucket_id, name) values ('marca', 'logo/prueba.webp')");

    await db.as(recepA);
    assert.match((await subir()) ?? "", /row-level security/);
    await db.as(adminA);
    assert.equal(await subir(), null);
  });
});
