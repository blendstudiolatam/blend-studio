// Aplica las migraciones de supabase/migrations a la base de datos de SUPABASE_DB_URL.
// Uso: npm run db:push            (aplica)
//      npm run db:push -- --dry-run (solo muestra qué aplicaría)
import { requireDbUrl, supabase } from "./supabase-cli.mjs";

const url = requireDbUrl();
const result = supabase(["db", "push", "--db-url", url, ...process.argv.slice(2)], {
  stdio: "inherit",
});
process.exit(result.status ?? 1);
