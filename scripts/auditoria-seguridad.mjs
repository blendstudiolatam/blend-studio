// Revisión automática de seguridad de la base de datos (solo lectura).
// Uso: npm run auditoria   (usa SUPABASE_DB_URL de .env.local)
// Revisa: tablas sin RLS o sin políticas, permisos del público (anon),
// funciones SECURITY DEFINER sin search_path fijo y buckets públicos.
import pg from "pg";

const url = process.env.SUPABASE_DB_URL;
if (!url) {
  console.error("Falta SUPABASE_DB_URL en .env.local");
  process.exit(1);
}
const db = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
await db.connect();

let problemas = 0;
async function revisar(titulo, sql, permitidos = []) {
  const { rows } = await db.query(sql);
  const malos = rows.filter((r) => !permitidos.includes(Object.values(r)[0]));
  console.log(`\n${malos.length ? "✖" : "✔"} ${titulo}`);
  for (const r of malos) console.log("   -", Object.values(r).join(" · "));
  problemas += malos.length;
}

await revisar(
  "Tablas sin seguridad por filas (RLS)",
  `select n.nspname || '.' || c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where c.relkind = 'r' and n.nspname in ('public', 'privado') and not c.relrowsecurity`,
);

await revisar(
  "Tablas con RLS pero sin ninguna política (nadie las puede leer, salvo el servidor)",
  `select n.nspname || '.' || c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where c.relkind = 'r' and n.nspname = 'public' and c.relrowsecurity
     and not exists (select 1 from pg_policy p where p.polrelid = c.oid)`,
);

await revisar(
  "Tablas a las que el público (anon) tiene algún permiso",
  `select table_schema || '.' || table_name || ' (' || string_agg(privilege_type, ', ') || ')'
   from information_schema.role_table_grants
   where grantee = 'anon' and table_schema in ('public', 'privado')
   group by table_schema, table_name`,
);

// El público solo puede ejecutar funciones pensadas para él.
await revisar(
  "Funciones que el público (anon) puede ejecutar",
  `select n.nspname || '.' || p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname in ('public', 'privado') and has_function_privilege('anon', p.oid, 'execute')
   order by 1`,
  ["public.marca_publica", "public.datos_privacidad"],
);

await revisar(
  "Funciones SECURITY DEFINER sin search_path fijo",
  `select n.nspname || '.' || p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname in ('public', 'privado') and p.prosecdef
     and not exists (select 1 from unnest(coalesce(p.proconfig, '{}')) c where c like 'search_path=%')`,
);

await revisar(
  "Buckets de archivos públicos",
  `select id from storage.buckets where public order by id`,
  ["marca", "equipo"],
);

await revisar(
  "Buckets privados con archivos de clientes",
  `select id || ' (privado)' from storage.buckets where not public and id not in ('clientes', 'documentos')`,
);

await db.end();
console.log(problemas ? `\n${problemas} puntos para revisar.` : "\nTodo en orden.");
process.exit(problemas ? 1 : 0);
