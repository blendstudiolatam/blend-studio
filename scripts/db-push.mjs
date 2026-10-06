// Aplica las migraciones de supabase/migrations a la base de datos de SUPABASE_DB_URL.
// Uso: npm run db:push            (aplica)
//      npm run db:push -- --dry-run (solo muestra qué aplicaría)
import { spawnSync } from "node:child_process";

const url = process.env.SUPABASE_DB_URL;
if (!url) {
  console.error("Falta SUPABASE_DB_URL en .env.local (ver .env.example).");
  process.exit(1);
}

const extra = process.argv.slice(2);
const result = spawnSync("npx", ["supabase", "db", "push", "--db-url", url, ...extra], {
  stdio: "inherit",
  shell: process.platform === "win32",
});
process.exit(result.status ?? 1);
