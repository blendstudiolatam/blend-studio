// Catálogo de paquetes y los 4 planes de tratamiento de prueba (solo proyecto de desarrollo),
// con sesiones completadas, pagos y las fotos de avance ligadas a cada plan.
// Uso: npm run seed:tratamientos   (requiere seed:servicios, seed:empleados, seed:clientes y seed:salud)
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secreta = process.env.SUPABASE_SECRET_KEY;
if (!url || !secreta) {
  console.error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SECRET_KEY en .env.local");
  process.exit(1);
}
const sb = createClient(url, secreta, { auth: { persistSession: false, autoRefreshToken: false } });
const { clientes, empleados, tratamientos } = JSON.parse(readFileSync("supabase/seed-demo/personas.json", "utf8"));

const PAQUETES = [
  { clave: "acne", nombre: "Plan facial para acné", servicio: "Tratamiento facial para acné (sesión)", sesiones: 6, frecuencia_dias: 14, precio_sesion: 45, precio_total: 240, descripcion: "Limpieza, extracción y activos para piel con acné. Incluye seguimiento con fotos." },
  { clave: "capilar", nombre: "Plan capilar anticaída", servicio: "Tratamiento capilar anticaída (sesión)", sesiones: 8, frecuencia_dias: 14, precio_sesion: 55, precio_total: 390, descripcion: "Ampollas, masaje y fotobiomodulación para frenar la caída." },
  { clave: "manchas", nombre: "Plan despigmentación de manchas", servicio: "Despigmentación de manchas (sesión)", sesiones: 6, frecuencia_dias: 21, precio_sesion: 60, precio_total: 320, descripcion: "Peeling suave y despigmentantes para melasma y manchas solares." },
  { clave: "keratina", nombre: "Plan reconstrucción con keratina", servicio: "Keratina / alisado", sesiones: 4, frecuencia_dias: 30, precio_sesion: 85, precio_total: 300, descripcion: "Reconstrucción y alisado progresivo, una sesión al mes." },
  { nombre: "Plan reductivo corporal", servicio: "Envoltura corporal reductiva", sesiones: 10, frecuencia_dias: 7, precio_sesion: 60, precio_total: 500, descripcion: "Envolturas y masaje reductor semanal." },
  { nombre: "Drenaje linfático postoperatorio", servicio: "Drenaje linfático", sesiones: 10, frecuencia_dias: 3, precio_sesion: 60, precio_total: 520 },
  { nombre: "Hidratación capilar intensiva", servicio: "Hidratación profunda", sesiones: 4, frecuencia_dias: 14, precio_sesion: 30, precio_total: 100 },
  { nombre: "Plan barba impecable", servicio: "Perfilado de barba", sesiones: 4, frecuencia_dias: 7, precio_sesion: 10, precio_total: 35 },
];

// Sesiones ya realizadas por plan (c04 terminó su plan).
const COMPLETADAS = { acne: 4, capilar: 3, manchas: 2, keratina: 4 };
const HORAS = ["10:00", "15:30", "11:00", "16:00"];

const hoy = new Date().toLocaleDateString("en-CA", { timeZone: "America/Panama" });
const restarDias = (iso, dias) => {
  const [a, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(a, m - 1, d - dias)).toISOString().slice(0, 10);
};

const { data: sucursal, error: errSuc } = await sb.from("sucursales").select("id").eq("slug", "blend-studio-1").single();
if (errSuc) throw errSuc;
const { data: servicios } = await sb.from("servicios").select("id, nombre").eq("sucursal_id", sucursal.id);
const { data: equipo } = await sb.from("empleados").select("id, nombre, apellido").eq("sucursal_id", sucursal.id);

// Paquetes
const idsPaquete = {};
for (const [i, p] of PAQUETES.entries()) {
  const { clave, servicio, ...datos } = p;
  const fila = { ...datos, sucursal_id: sucursal.id, servicio_id: servicios.find((s) => s.nombre === servicio)?.id ?? null, orden: i };
  const { data: existente } = await sb.from("paquetes").select("id").eq("sucursal_id", sucursal.id).eq("nombre", p.nombre).maybeSingle();
  const { data, error } = existente
    ? await sb.from("paquetes").update(fila).eq("id", existente.id).select("id").single()
    : await sb.from("paquetes").insert(fila).select("id, servicio_id").single();
  if (error) throw error;
  if (clave) idsPaquete[clave] = { id: data.id, ...fila };
  console.log(`paquete: ${p.nombre}`);
}

// Planes
for (const [i, t] of tratamientos.entries()) {
  const c = clientes.find((x) => x.id === t.cliente);
  const e = empleados.find((x) => x.id === t.profesional);
  const { data: cli } = await sb.from("clientes").select("id").eq("telefono", c.telefono).single();
  const prof = equipo.find((x) => x.nombre === e.nombre && x.apellido === e.apellido);
  const paq = idsPaquete[t.clave];
  const hechas = COMPLETADAS[t.clave];

  await sb.from("planes_tratamiento").delete().eq("cliente_id", cli.id);
  const { data: plan, error } = await sb
    .from("planes_tratamiento")
    .insert({
      sucursal_id: sucursal.id,
      cliente_id: cli.id,
      paquete_id: paq.id,
      servicio_id: paq.servicio_id,
      profesional_id: prof?.id ?? null,
      procedimiento: t.procedimiento,
      sesiones_total: t.sesiones,
      frecuencia_dias: t.frecuencia_dias,
      // Empieza lo bastante atrás para que las sesiones hechas queden en el pasado.
      fecha_inicio: restarDias(hoy, t.frecuencia_dias * hechas - 2),
      precio_sesion: t.precio_sesion,
      precio_total: paq.precio_total,
      notas: i === 0 ? "Pagó las primeras sesiones en efectivo." : null,
    })
    .select("id")
    .single();
  if (error) throw error;

  const { data: sesiones } = await sb.from("sesiones_tratamiento").select("id, numero").eq("plan_id", plan.id).order("numero");
  for (const s of sesiones) {
    const hecha = s.numero <= hechas;
    const { error: e2 } = await sb
      .from("sesiones_tratamiento")
      .update({
        estado: hecha ? "completada" : "pendiente",
        // Luis tiene su última sesión hecha sin pagar.
        pagada: hecha && !(t.clave === "capilar" && s.numero === hechas),
        hora: HORAS[i % HORAS.length],
      })
      .eq("id", s.id);
    if (e2) throw e2;
  }

  // Fotos de avance: los documentos "antes / después" del cliente pasan a este plan.
  await sb.from("documentos_cliente").update({ plan_id: plan.id }).eq("cliente_id", cli.id).eq("categoria", "antes_despues");
  console.log(`plan: ${c.nombre} ${c.apellido} — ${t.procedimiento} (${hechas}/${t.sesiones})`);
}
