// Carga los 8 empleados de prueba en la sucursal de desarrollo: fotos, servicios que
// realizan, enlace con su usuario (si tiene acceso) y unas vacaciones de ejemplo.
// Uso: npm run seed:empleados   (requiere antes seed:usuarios y seed:servicios; se puede repetir)
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secreta = process.env.SUPABASE_SECRET_KEY;
if (!url || !secreta) {
  console.error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SECRET_KEY en .env.local");
  process.exit(1);
}
const sb = createClient(url, secreta, { auth: { persistSession: false, autoRefreshToken: false } });
const { empleados } = JSON.parse(readFileSync("supabase/seed-demo/personas.json", "utf8"));
const { categorias } = JSON.parse(readFileSync("supabase/seed-demo/servicios.json", "utf8"));

const sinAcentos = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z]/g, "");
const telefono = (i) => `+507 6${(510 + i * 37) % 900 + 100}-${String(4000 + i * 811).slice(-4)}`;

const { data: sucursal, error: errSuc } = await sb.from("sucursales").select("id").eq("slug", "blend-studio-1").single();
if (errSuc) throw errSuc;

const { data: servicios } = await sb
  .from("servicios")
  .select("id, categoria:categorias_servicio!inner(nombre)")
  .eq("sucursal_id", sucursal.id);

for (const [i, e] of empleados.entries()) {
  const email = `${sinAcentos(e.nombre.split(" ")[0])}.${sinAcentos(e.apellido)}@prueba.blendstudio.test`;
  const { data: perfil } = e.acceso
    ? await sb.from("perfiles").select("id").eq("email", email).maybeSingle()
    : { data: null };

  // Foto al almacenamiento público "equipo".
  const foto_path = `fotos/${e.id}.webp`;
  const archivo = readFileSync(`supabase/seed-demo/fotos/empleados/${e.id}.webp`);
  const { error: errFoto } = await sb.storage
    .from("equipo")
    .upload(foto_path, archivo, { contentType: "image/webp", upsert: true, cacheControl: "3600" });
  if (errFoto) throw errFoto;

  const datos = {
    sucursal_id: sucursal.id,
    usuario_id: perfil?.id ?? null,
    nombre: e.nombre,
    apellido: e.apellido,
    email,
    telefono: telefono(i),
    rol: e.rol,
    especialidad: e.especialidad,
    comision_pct: e.comision,
    estado: e.id === "e05" ? "vacaciones" : "activo",
    reserva_web: e.reserva_web,
    color: e.color,
    foto_path,
    orden: i,
  };

  const { data: existente } = await sb
    .from("empleados")
    .select("id")
    .eq("sucursal_id", sucursal.id)
    .eq("email", email)
    .maybeSingle();
  const { data: emp, error } = existente
    ? await sb.from("empleados").update(datos).eq("id", existente.id).select("id").single()
    : await sb.from("empleados").insert(datos).select("id").single();
  if (error) throw error;

  // Servicios que realiza, según las categorías del tarifario.
  const cats = categorias.filter((c) => c.profesionales.includes(e.id)).map((c) => c.nombre);
  const filas = (servicios ?? [])
    .filter((s) => cats.includes(s.categoria.nombre))
    .map((s) => ({ empleado_id: emp.id, servicio_id: s.id, sucursal_id: sucursal.id }));
  if (filas.length) {
    const { error: errS } = await sb
      .from("empleado_servicios")
      .upsert(filas, { onConflict: "empleado_id,servicio_id", ignoreDuplicates: true });
    if (errS) throw errS;
  }

  // Ricardo está de vacaciones esta semana y la próxima.
  if (e.id === "e05") {
    await sb.from("bloqueos_empleado").delete().eq("empleado_id", emp.id);
    await sb.from("bloqueos_empleado").insert({
      empleado_id: emp.id,
      sucursal_id: sucursal.id,
      desde: "2026-10-05",
      hasta: "2026-10-18",
      motivo: "Vacaciones",
    });
  }
  console.log(`ok: ${e.nombre} ${e.apellido} — ${filas.length} servicios${perfil ? " (con usuario)" : ""}`);
}
