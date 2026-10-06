// Ejecuta el CLI de Supabase del proyecto sin pasar por la consola del sistema
// (así la contraseña de la URL nunca se interpreta como comando).
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const cli = require.resolve("supabase/dist/supabase.js");

export function requireDbUrl() {
  const url = process.env.SUPABASE_DB_URL;
  if (!url) {
    console.error("Falta SUPABASE_DB_URL en .env.local (ver .env.example).");
    process.exit(1);
  }
  return url;
}

export function supabase(args, options = {}) {
  return spawnSync(process.execPath, [cli, ...args], options);
}
