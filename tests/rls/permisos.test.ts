import assert from "node:assert/strict";
import { test } from "node:test";
import { crearUsuario, darAcceso, escenario, withTx, type Db } from "./helpers.ts";

async function niveles(db: Db, sucursal: string): Promise<Record<string, string>> {
  const { rows } = await db.query<{ modulo: string; nivel: string }>(
    "select modulo, nivel from public.mis_permisos($1)",
    [sucursal],
  );
  return Object.fromEntries(rows.map((r) => [r.modulo, r.nivel]));
}

async function fijarMatriz(db: Db, rol: string, modulo: string, nivel: string) {
  await db.asSystem();
  await db.query("update public.permisos_rol set nivel = $3 where rol = $1 and modulo = $2", [
    rol,
    modulo,
    nivel,
  ]);
}

async function ajustePersonal(db: Db, usuario: string, sucursal: string, modulo: string, nivel: string) {
  await db.asSystem();
  await db.query(
    `insert into public.permisos_usuario (usuario_id, sucursal_id, modulo, nivel) values ($1, $2, $3, $4)
     on conflict (usuario_id, sucursal_id, modulo) do update set nivel = excluded.nivel`,
    [usuario, sucursal, modulo, nivel],
  );
}

test("mis_permisos devuelve los 10 módulos", async () => {
  await withTx(async (db) => {
    const { sucA, recepA } = await escenario(db);
    await db.as(recepA);
    assert.equal(Object.keys(await niveles(db, sucA)).length, 10);
  });
});

test("admin tiene acceso total a todo, incluida caja y finanzas", async () => {
  await withTx(async (db) => {
    const { sucA, adminA } = await escenario(db);
    await db.as(adminA);
    const n = await niveles(db, sucA);
    assert.ok(Object.values(n).every((v) => v === "total"), JSON.stringify(n));
  });
});

test("admin sin 2 pasos no tiene ningún permiso", async () => {
  await withTx(async (db) => {
    const { sucA, adminA } = await escenario(db);
    await db.as(adminA, "aal1");
    const n = await niveles(db, sucA);
    assert.ok(Object.values(n).every((v) => v === "ninguno"));
  });
});

test("recepción usa la matriz de su rol", async () => {
  await withTx(async (db) => {
    const { sucA, recepA } = await escenario(db);
    await db.as(recepA);
    const n = await niveles(db, sucA);
    assert.equal(n.agenda, "total");
    assert.equal(n.servicios, "lectura");
    assert.equal(n.configuracion, "ninguno");
  });
});

test("límite fijo: caja y finanzas siguen cerradas aunque la matriz o un ajuste las abran", async () => {
  await withTx(async (db) => {
    const { sucA, recepA } = await escenario(db);
    await fijarMatriz(db, "recepcion", "caja", "total");
    await ajustePersonal(db, recepA, sucA, "finanzas", "total");
    await db.as(recepA);
    const n = await niveles(db, sucA);
    assert.equal(n.caja, "ninguno");
    assert.equal(n.finanzas, "ninguno");
  });
});

test("límite fijo: el profesional solo agenda y, en clientes, como máximo lectura", async () => {
  await withTx(async (db) => {
    const { sucA, estilistaA } = await escenario(db);
    await fijarMatriz(db, "estilista", "servicios", "total");
    await ajustePersonal(db, estilistaA, sucA, "clientes", "total");
    await ajustePersonal(db, estilistaA, sucA, "reportes", "total");
    await db.as(estilistaA);
    const n = await niveles(db, sucA);
    assert.equal(n.agenda, "total");
    assert.equal(n.clientes, "lectura");
    assert.equal(n.servicios, "ninguno");
    assert.equal(n.reportes, "ninguno");
  });
});

test("un ajuste personal cambia el permiso solo de esa persona y sucursal", async () => {
  await withTx(async (db) => {
    const { sucA, sucB, recepA } = await escenario(db);
    await darAcceso(db, recepA, sucB, "recepcion");
    await ajustePersonal(db, recepA, sucA, "configuracion", "lectura");
    await db.as(recepA);
    assert.equal((await niveles(db, sucA)).configuracion, "lectura");
    assert.equal((await niveles(db, sucB)).configuracion, "ninguno");
  });
});

test("el rol asistente existe y usa su matriz", async () => {
  await withTx(async (db) => {
    const { sucA } = await escenario(db);
    const asistente = await crearUsuario(db, "Asistente");
    await darAcceso(db, asistente, sucA, "asistente");
    await db.as(asistente, "aal1");
    const n = await niveles(db, sucA);
    assert.equal(n.agenda, "lectura");
    assert.equal(n.ventas, "ninguno");
    assert.equal(n.caja, "ninguno");
  });
});

test("sin acceso a la sucursal, ningún permiso", async () => {
  await withTx(async (db) => {
    const { sucB, recepA } = await escenario(db);
    await db.as(recepA);
    const n = await niveles(db, sucB);
    assert.ok(Object.values(n).every((v) => v === "ninguno"));
  });
});

test("solo el dueño puede editar la matriz de roles", async () => {
  await withTx(async (db) => {
    const { adminA, dueno } = await escenario(db);
    await db.as(adminA);
    const r1 = await db.query(
      "update public.permisos_rol set nivel = 'total' where rol = 'recepcion' and modulo = 'reportes' returning rol",
    );
    assert.equal(r1.rowCount, 0, "un admin que no es dueño cambió la matriz");

    await db.as(dueno);
    const r2 = await db.query(
      "update public.permisos_rol set nivel = 'lectura' where rol = 'recepcion' and modulo = 'reportes' returning rol",
    );
    assert.equal(r2.rowCount, 1);

    // Nadie puede agregar ni borrar filas de la matriz desde la app.
    assert.match(
      (await db.error("delete from public.permisos_rol where rol = 'recepcion'")) ?? "",
      /permission denied/,
    );
    assert.match(
      (await db.error("insert into public.permisos_rol (rol, modulo, nivel) values ('admin', 'caja', 'ninguno')")) ?? "",
      /permission denied/,
    );
  });
});

test("admin hace ajustes personales solo en su sucursal; el resto no puede", async () => {
  await withTx(async (db) => {
    const { sucA, sucB, adminA, recepA, estilistaA } = await escenario(db);
    await db.as(adminA);
    assert.equal(
      await db.error(
        "insert into public.permisos_usuario (usuario_id, sucursal_id, modulo, nivel) values ($1, $2, 'reportes', 'lectura')",
        [recepA, sucA],
      ),
      null,
    );
    assert.match(
      (await db.error(
        "insert into public.permisos_usuario (usuario_id, sucursal_id, modulo, nivel) values ($1, $2, 'reportes', 'lectura')",
        [recepA, sucB],
      )) ?? "",
      /row-level security/,
    );

    await db.as(estilistaA);
    assert.match(
      (await db.error(
        "insert into public.permisos_usuario (usuario_id, sucursal_id, modulo, nivel) values ($1, $2, 'agenda', 'total')",
        [estilistaA, sucA],
      )) ?? "",
      /row-level security/,
      "el profesional se dio permisos a sí mismo",
    );

    await db.as(recepA);
    assert.match(
      (await db.error(
        "insert into public.permisos_usuario (usuario_id, sucursal_id, modulo, nivel) values ($1, $2, 'configuracion', 'total')",
        [recepA, sucA],
      )) ?? "",
      /row-level security/,
    );
  });
});

test("los cambios de permisos quedan en la auditoría", async () => {
  await withTx(async (db) => {
    const { sucA, adminA, recepA } = await escenario(db);
    await db.as(adminA);
    await db.query(
      "insert into public.permisos_usuario (usuario_id, sucursal_id, modulo, nivel) values ($1, $2, 'reportes', 'lectura')",
      [recepA, sucA],
    );
    const { rows } = await db.query<{ usuario_id: string }>(
      "select usuario_id from public.auditoria where tabla = 'permisos_usuario' and accion = 'crear'",
    );
    assert.equal(rows.length, 1);
    assert.equal(rows[0].usuario_id, adminA);
  });
});

test("visitantes sin sesión no ven la matriz ni sus permisos", async () => {
  await withTx(async (db) => {
    const { sucA } = await escenario(db);
    await db.asAnon();
    assert.match((await db.error("select * from public.permisos_rol")) ?? "", /permission denied/);
    assert.match((await db.error("select * from public.mis_permisos($1)", [sucA])) ?? "", /permission denied/);
  });
});
