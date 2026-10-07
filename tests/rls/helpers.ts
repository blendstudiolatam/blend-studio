// Utilidades para probar las reglas RLS contra la base de datos de Supabase.
// Cada prueba corre dentro de una transacción que se deshace al final:
// no queda ningún dato de prueba guardado.
import { randomUUID } from "node:crypto";
import pg from "pg";

const url = process.env.SUPABASE_DB_URL;
if (!url) {
  throw new Error("Falta SUPABASE_DB_URL en .env.local (ver .env.example).");
}

export type Db = {
  /** Ejecuta SQL como el usuario actualmente simulado. */
  query: <T extends pg.QueryResultRow = pg.QueryResultRow>(
    sql: string,
    params?: unknown[],
  ) => Promise<pg.QueryResult<T>>;
  /** Ejecuta SQL y devuelve el mensaje de error, o null si no falló. */
  error: (sql: string, params?: unknown[]) => Promise<string | null>;
  /**
   * Simula a un usuario con sesión iniciada. Por defecto con verificación en
   * dos pasos completada (aal2); usa "aal1" para simular solo contraseña.
   */
  as: (userId: string, aal?: "aal1" | "aal2") => Promise<void>;
  /** Simula al servidor usando la clave secreta (service_role). */
  asService: () => Promise<void>;
  /** Simula a un visitante sin sesión. */
  asAnon: () => Promise<void>;
  /** Vuelve al rol administrador de la base de datos (para preparar datos). */
  asSystem: () => Promise<void>;
};

export async function withTx(fn: (db: Db) => Promise<void>): Promise<void> {
  const client = new pg.Client({
    connectionString: url,
    // Solo para pruebas en desarrollo contra el pooler de Supabase.
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();
  await client.query("begin");

  const db: Db = {
    query: (sql, params) => client.query(sql, params),
    error: async (sql, params) => {
      await client.query("savepoint intento");
      try {
        await client.query(sql, params);
        await client.query("release savepoint intento");
        return null;
      } catch (e) {
        await client.query("rollback to savepoint intento");
        return (e as Error).message;
      }
    },
    as: async (userId, aal = "aal2") => {
      await client.query("reset role");
      await client.query("select set_config('request.jwt.claims', $1, true)", [
        JSON.stringify({ sub: userId, role: "authenticated", aal }),
      ]);
      await client.query("set local role authenticated");
    },
    asService: async () => {
      await client.query("reset role");
      await client.query("select set_config('request.jwt.claims', $1, true)", [
        JSON.stringify({ role: "service_role" }),
      ]);
      await client.query("set local role service_role");
    },
    asAnon: async () => {
      await client.query("reset role");
      await client.query("select set_config('request.jwt.claims', $1, true)", [
        JSON.stringify({ role: "anon" }),
      ]);
      await client.query("set local role anon");
    },
    asSystem: async () => {
      await client.query("reset role");
      await client.query("select set_config('request.jwt.claims', '', true)");
    },
  };

  try {
    await fn(db);
  } finally {
    await client.query("rollback");
    await client.end();
  }
}

export async function crearUsuario(db: Db, nombre: string): Promise<string> {
  const id = randomUUID();
  await db.query(
    `insert into auth.users (id, email, raw_user_meta_data, aud, role)
     values ($1, $2, $3, 'authenticated', 'authenticated')`,
    [id, `${id}@prueba.test`, JSON.stringify({ nombre_completo: nombre })],
  );
  return id;
}

export async function crearSucursal(db: Db, nombre: string): Promise<string> {
  const { rows } = await db.query<{ id: string }>(
    `insert into public.sucursales (nombre, slug) values ($1, $2) returning id`,
    [nombre, `prueba-${randomUUID().slice(0, 8)}`],
  );
  return rows[0].id;
}

export async function darAcceso(
  db: Db,
  usuarioId: string,
  sucursalId: string,
  rol: "admin" | "recepcion" | "estilista" | "asistente",
): Promise<void> {
  await db.query(
    `insert into public.accesos (usuario_id, sucursal_id, rol) values ($1, $2, $3)`,
    [usuarioId, sucursalId, rol],
  );
}

/**
 * Escenario estándar: dos sucursales (A y B) y un usuario de cada rol.
 * Los datos se crean como sistema; al terminar, la sesión queda como sistema.
 */
export async function escenario(db: Db) {
  await db.asSystem();
  const sucA = await crearSucursal(db, "Sucursal A");
  const sucB = await crearSucursal(db, "Sucursal B");

  const dueno = await crearUsuario(db, "Dueño");
  await db.query("update public.perfiles set es_dueno = true where id = $1", [dueno]);

  const adminA = await crearUsuario(db, "Admin A");
  const recepA = await crearUsuario(db, "Recepción A");
  const estilistaA = await crearUsuario(db, "Estilista A");
  const adminB = await crearUsuario(db, "Admin B");
  const sinAcceso = await crearUsuario(db, "Sin acceso");

  await darAcceso(db, adminA, sucA, "admin");
  await darAcceso(db, recepA, sucA, "recepcion");
  await darAcceso(db, estilistaA, sucA, "estilista");
  await darAcceso(db, adminB, sucB, "admin");

  return { sucA, sucB, dueno, adminA, recepA, estilistaA, adminB, sinAcceso };
}
