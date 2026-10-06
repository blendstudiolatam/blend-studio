import assert from "node:assert/strict";
import { test } from "node:test";
import { escenario, withTx, type Db } from "./helpers.ts";

test("admin solo con contraseña (sin 2 pasos) no tiene acceso a nada", async () => {
  await withTx(async (db) => {
    const { sucA, adminA, sinAcceso } = await escenario(db);
    await db.as(adminA, "aal1");
    const { rows } = await db.query("select id from public.sucursales");
    assert.equal(rows.length, 0, "el admin sin 2FA vio sucursales");
    assert.match(
      (await db.error(
        "insert into public.accesos (usuario_id, sucursal_id, rol) values ($1, $2, 'estilista')",
        [sinAcceso, sucA],
      )) ?? "",
      /row-level security/,
    );
    const aud = await db.query("select * from public.auditoria");
    assert.equal(aud.rows.length, 0);
  });
});

test("dueño solo con contraseña no ve sucursales ni puede crearlas", async () => {
  await withTx(async (db) => {
    const { dueno } = await escenario(db);
    await db.as(dueno, "aal1");
    const { rows } = await db.query("select id from public.sucursales");
    assert.equal(rows.length, 0);
    assert.match(
      (await db.error(
        "insert into public.sucursales (nombre, slug) values ('X', 'prueba-x-aal1')",
      )) ?? "",
      /row-level security/,
    );
  });
});

test("con solo contraseña, el usuario aún ve su propio perfil y accesos (para saber que debe verificar)", async () => {
  await withTx(async (db) => {
    const { adminA, dueno } = await escenario(db);
    await db.as(adminA, "aal1");
    const acc = await db.query<{ rol: string }>("select rol from public.accesos");
    assert.deepEqual(acc.rows.map((r) => r.rol), ["admin"]);

    await db.as(dueno, "aal1");
    const p = await db.query<{ es_dueno: boolean }>(
      "select es_dueno from public.perfiles where id = $1",
      [dueno],
    );
    assert.equal(p.rows[0]?.es_dueno, true);
  });
});

test("estilista y recepción no necesitan 2 pasos", async () => {
  await withTx(async (db) => {
    const { sucA, estilistaA, recepA } = await escenario(db);
    for (const u of [estilistaA, recepA]) {
      await db.as(u, "aal1");
      const { rows } = await db.query<{ id: string }>("select id from public.sucursales");
      assert.deepEqual(rows.map((r) => r.id), [sucA]);
    }
  });
});

test("visitantes y usuarios no pueden consultar ni registrar intentos de inicio de sesión", async () => {
  await withTx(async (db) => {
    const { adminA } = await escenario(db);
    for (const entrar of [() => db.asAnon(), () => db.as(adminA)]) {
      await entrar();
      assert.match(
        (await db.error("select public.login_espera_segundos('x', '1.1.1.1')")) ?? "",
        /permission denied/,
      );
      assert.match(
        (await db.error("select public.login_registrar_intento('x', '1.1.1.1', true)")) ?? "",
        /permission denied/,
      );
      assert.match(
        (await db.error("select * from privado.intentos_login")) ?? "",
        /permission denied/,
      );
    }
  });
});

async function fallar(db: Db, email: string, ip: string, veces: number) {
  for (let i = 0; i < veces; i++) {
    await db.query("select public.login_registrar_intento($1, $2, false)", [email, ip]);
  }
}

async function espera(db: Db, email: string, ip: string): Promise<number> {
  const { rows } = await db.query<{ s: number }>(
    "select public.login_espera_segundos($1, $2) as s",
    [email, ip],
  );
  return rows[0].s;
}

test("5 fallos del mismo correo e IP bloquean unos 15 minutos", async () => {
  await withTx(async (db) => {
    await db.asService();
    await fallar(db, "hash-a", "10.0.0.1", 4);
    assert.equal(await espera(db, "hash-a", "10.0.0.1"), 0, "bloqueó antes de tiempo");
    await fallar(db, "hash-a", "10.0.0.1", 1);
    const s = await espera(db, "hash-a", "10.0.0.1");
    // ~15 minutos (+1 s de redondeo hacia arriba).
    assert.ok(s > 800 && s <= 901, `espera inesperada: ${s}`);
    // Otro correo desde la misma IP no queda bloqueado.
    assert.equal(await espera(db, "hash-b", "10.0.0.1"), 0);
  });
});

test("10 fallos del mismo correo desde distintas IP bloquean el correo", async () => {
  await withTx(async (db) => {
    await db.asService();
    for (let i = 0; i < 10; i++) await fallar(db, "hash-a", `10.0.1.${i}`, 1);
    assert.ok((await espera(db, "hash-a", "10.0.9.9")) > 0);
  });
});

test("30 fallos desde una IP con distintos correos bloquean la IP", async () => {
  await withTx(async (db) => {
    await db.asService();
    for (let i = 0; i < 30; i++) await fallar(db, `hash-${i}`, "10.0.2.1", 1);
    assert.ok((await espera(db, "hash-nuevo", "10.0.2.1")) > 0);
    assert.equal(await espera(db, "hash-nuevo", "10.0.2.2"), 0);
  });
});

test("un inicio de sesión correcto reinicia el conteo de fallos del correo", async () => {
  await withTx(async (db) => {
    await db.asService();
    await fallar(db, "hash-a", "10.0.3.1", 4);
    await db.query("select public.login_registrar_intento('hash-a', '10.0.3.1', true)");
    await fallar(db, "hash-a", "10.0.3.1", 4);
    assert.equal(await espera(db, "hash-a", "10.0.3.1"), 0);
  });
});
