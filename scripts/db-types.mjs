// Genera src/lib/supabase/database.types.ts a partir de la base de datos de SUPABASE_DB_URL.
// Uso: npm run db:types  (después de cada migración)
import { writeFileSync } from "node:fs";
import { requireDbUrl, supabase } from "./supabase-cli.mjs";

const url = requireDbUrl();
const result = supabase(
  ["gen", "types", "typescript", "--db-url", url, "--schema", "public"],
  { encoding: "utf8", maxBuffer: 10 * 1024 * 1024 },
);
if (result.status !== 0 || !result.stdout.includes("export type Database")) {
  console.error(result.stderr || "No se pudieron generar los tipos.");
  process.exit(1);
}
writeFileSync("src/lib/supabase/database.types.ts", result.stdout);
console.log("Tipos generados en src/lib/supabase/database.types.ts");
