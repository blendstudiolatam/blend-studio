// Carga el tarifario de prueba (supabase/seed-demo/servicios.json) en la sucursal de desarrollo.
// Uso: npm run seed:servicios   (se puede repetir: actualiza en lugar de duplicar)
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secreta = process.env.SUPABASE_SECRET_KEY;
if (!url || !secreta) {
  console.error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SECRET_KEY en .env.local");
  process.exit(1);
}
const sb = createClient(url, secreta, { auth: { persistSession: false, autoRefreshToken: false } });
const { categorias } = JSON.parse(readFileSync("supabase/seed-demo/servicios.json", "utf8"));

const { data: sucursal, error: errSuc } = await sb.from("sucursales").select("id").eq("slug", "blend-studio-1").single();
if (errSuc) throw errSuc;

let total = 0;
for (const [i, c] of categorias.entries()) {
  const { data: cat, error } = await sb
    .from("categorias_servicio")
    .upsert(
      { sucursal_id: sucursal.id, nombre: c.nombre, descripcion: c.descripcion, imagen: c.imagen, orden: i },
      { onConflict: "sucursal_id,nombre" },
    )
    .select("id")
    .single();
  if (error) throw error;

  const filas = c.servicios.map((s, j) => ({
    sucursal_id: sucursal.id,
    categoria_id: cat.id,
    nombre: s.nombre,
    duracion_min: s.duracion,
    precio: s.precio,
    precio_descuento: s.descuento ?? null,
    orden: j,
  }));
  const { error: errS } = await sb.from("servicios").upsert(filas, { onConflict: "sucursal_id,categoria_id,nombre" });
  if (errS) throw errS;
  total += filas.length;
  console.log(`ok: ${c.nombre} (${filas.length})`);
}
console.log(`Listo: ${categorias.length} categorías y ${total} servicios.`);
