// Carga los 20 clientes de prueba (solo proyecto de desarrollo) con sus fotos en el
// almacenamiento privado "clientes". Fechas de registro variadas para probar los estados.
// Uso: npm run seed:clientes   (se puede repetir: actualiza por teléfono)
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secreta = process.env.SUPABASE_SECRET_KEY;
if (!url || !secreta) {
  console.error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SECRET_KEY en .env.local");
  process.exit(1);
}
const sb = createClient(url, secreta, { auth: { persistSession: false, autoRefreshToken: false } });
const { clientes } = JSON.parse(readFileSync("supabase/seed-demo/personas.json", "utf8"));

const sinAcentos = (s) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z]/g, "");
const haceDias = (d) => new Date(Date.now() - d * 86_400_000).toISOString();

// Días desde que se registró cada cliente (los de 3 a 25 días cuentan como "nuevos").
const ANTIGUEDAD = [320, 410, 280, 365, 150, 95, 600, 210, 25, 720, 180, 60, 240, 130, 75, 12, 500, 45, 3, 8];
const INACTIVOS = new Set(["c07", "c10"]);
const NOTAS = {
  c01: "Piel sensible. Prefiere citas en la mañana.",
  c02: "Tratamiento capilar en curso. Pregunta siempre por Ricardo.",
  c04: "Alisado cada 4 meses. Alérgica al formol: usar línea sin formol.",
  c07: "No viene desde hace más de un año.",
  c11: "Corte clásico y afeitado con toalla caliente.",
  c14: "Le gusta el café sin azúcar mientras espera.",
};

const { data: sucursal, error: errSuc } = await sb.from("sucursales").select("id").eq("slug", "blend-studio-1").single();
if (errSuc) throw errSuc;

for (const [i, c] of clientes.entries()) {
  const foto_path = `fotos/${c.id}.webp`;
  const { error: errFoto } = await sb.storage
    .from("clientes")
    .upload(foto_path, readFileSync(`supabase/seed-demo/fotos/clientes/${c.id}.webp`), {
      contentType: "image/webp",
      upsert: true,
      cacheControl: "3600",
    });
  if (errFoto) throw errFoto;

  const datos = {
    nombre: c.nombre,
    apellido: c.apellido,
    telefono: c.telefono,
    email: `${sinAcentos(c.nombre.split(" ")[0])}.${sinAcentos(c.apellido)}@ejemplo.test`,
    fecha_nacimiento: c.nacimiento,
    genero: c.genero,
    documento: `8-${String(700 + i * 13)}-${String(1000 + i * 457).slice(-4)}`,
    notas: NOTAS[c.id] ?? null,
    recordatorios_whatsapp: c.id !== "c17",
    permitir_fotos: Boolean(c.tratamiento) || i % 3 === 0,
    foto_path,
    activo: !INACTIVOS.has(c.id),
    origen: "panel",
    sucursal_origen_id: sucursal.id,
    created_at: haceDias(ANTIGUEDAD[i] ?? 100),
  };

  const { data: existente } = await sb.from("clientes").select("id").eq("telefono", c.telefono).maybeSingle();
  const { error } = existente
    ? await sb.from("clientes").update(datos).eq("id", existente.id)
    : await sb.from("clientes").insert(datos);
  if (error) throw error;
  console.log(`ok: ${c.nombre} ${c.apellido}${datos.activo ? "" : " (inactivo)"}`);
}
