// Citas de prueba (solo proyecto de desarrollo): la semana pasada (completadas y algunas
// "no asistió"), hoy y los próximos 10 días (confirmadas y pendientes), unas reservas web
// por confirmar y las próximas sesiones de los planes de tratamiento.
// Respeta los horarios: si una cita choca con una regla, se salta.
// Uso: npm run seed:citas   (requiere seed:empleados, seed:clientes y seed:tratamientos)
// Al repetirlo borra solo las citas creadas por este script (sin autor).
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secreta = process.env.SUPABASE_SECRET_KEY;
if (!url || !secreta) {
  console.error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SECRET_KEY en .env.local");
  process.exit(1);
}
const sb = createClient(url, secreta, { auth: { persistSession: false, autoRefreshToken: false } });
const { clientes: personas } = JSON.parse(readFileSync("supabase/seed-demo/personas.json", "utf8"));

// Números pseudoaleatorios repetibles
let semilla = 20261007;
const azar = () => ((semilla = (semilla * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);
const elegir = (lista) => lista[Math.floor(azar() * lista.length)];

const hoy = new Date().toLocaleDateString("en-CA", { timeZone: "America/Panama" });
const sumarDias = (iso, n) => {
  const [a, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(a, m - 1, d + n)).toISOString().slice(0, 10);
};
const dow = (iso) => new Date(`${iso}T12:00:00Z`).getUTCDay();
const minutos = (h) => Number(h.slice(0, 2)) * 60 + Number(h.slice(3, 5));
const hhmm = (m) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
const instante = (fecha, min) => `${fecha}T${hhmm(min)}:00-05:00`;

const { data: sucursal } = await sb.from("sucursales").select("id").eq("slug", "blend-studio-1").single();
const S = sucursal.id;

await sb.from("citas").delete().eq("sucursal_id", S).is("creado_por", null);

const telefonos = personas.map((p) => p.telefono);
const { data: clientes } = await sb.from("clientes").select("id, telefono, activo").in("telefono", telefonos);
const activos = clientes.filter((c) => c.activo);
const { data: empleados } = await sb.from("empleados").select("id, nombre, rol, estado").eq("sucursal_id", S);
const { data: asignados } = await sb
  .from("empleado_servicios")
  .select("empleado_id, servicio:servicios!inner(id, nombre, duracion_min, precio, precio_descuento)")
  .eq("sucursal_id", S);
const { data: horarios } = await sb.from("horarios_empleado").select("empleado_id, dia_semana, trabaja, entrada, salida").eq("sucursal_id", S);
const { data: horSuc } = await sb.from("horarios_sucursal").select("dia_semana, abierto, apertura, cierre").eq("sucursal_id", S);

let creadas = 0;
let saltadas = 0;
async function cita(fila) {
  const { error } = await sb.from("citas").insert({ sucursal_id: S, ...fila });
  if (error) {
    saltadas++;
    return false;
  }
  creadas++;
  return true;
}

// 1) Próximas sesiones de los planes de tratamiento (en su fecha sugerida, a la hora del plan)
const { data: sesiones } = await sb
  .from("sesiones_tratamiento")
  .select("id, fecha, hora, plan:planes_tratamiento!inner(cliente_id, profesional_id, servicio_id, sesiones_total, precio_total, estado)")
  .eq("sucursal_id", S)
  .eq("estado", "pendiente")
  .gte("fecha", hoy)
  .lte("fecha", sumarDias(hoy, 21));
const ocupado = new Map(); // empleado|fecha → [ini, fin][]
const marcar = (emp, fecha, ini, fin) => ocupado.set(`${emp}|${fecha}`, [...(ocupado.get(`${emp}|${fecha}`) ?? []), [ini, fin]]);
for (const s of sesiones ?? []) {
  if (s.plan.estado !== "activo" || !s.plan.profesional_id) continue;
  const ini = s.hora ? minutos(s.hora) : 10 * 60;
  const ok = await cita({
    cliente_id: s.plan.cliente_id,
    empleado_id: s.plan.profesional_id,
    servicio_id: s.plan.servicio_id,
    sesion_id: s.id,
    inicio: instante(s.fecha, ini),
    fin: instante(s.fecha, ini + 60),
    estado: s.fecha === hoy ? "confirmada" : "pendiente",
    precio: Math.round((s.plan.precio_total / s.plan.sesiones_total) * 100) / 100,
  });
  if (ok) marcar(s.plan.profesional_id, s.fecha, ini, ini + 60);
}

// 2) Agenda del equipo: de 7 días atrás a 10 días adelante
const profesionales = empleados.filter((e) => e.rol === "estilista" && e.estado !== "inactivo");
for (let d = -7; d <= 10; d++) {
  const fecha = sumarDias(hoy, d);
  const suc = horSuc.find((h) => h.dia_semana === dow(fecha));
  if (!suc?.abierto) continue;
  for (const p of profesionales) {
    const h = horarios.find((x) => x.empleado_id === p.id && x.dia_semana === dow(fecha));
    if (!h?.trabaja) continue;
    const servicios = asignados.filter((a) => a.empleado_id === p.id).map((a) => a.servicio);
    if (!servicios.length) continue;
    const desde = Math.max(minutos(h.entrada), minutos(suc.apertura));
    const hasta = Math.min(minutos(h.salida), minutos(suc.cierre));
    let t = desde + elegir([0, 30, 60]);
    const cuantas = 2 + Math.floor(azar() * 4);
    for (let i = 0; i < cuantas; i++) {
      const sv = elegir(servicios);
      const dur = Math.min(sv.duracion_min, 180);
      if (t + dur > hasta) break;
      const choca = (ocupado.get(`${p.id}|${fecha}`) ?? []).some(([a, b]) => t < b && t + dur > a);
      if (!choca) {
        const r = azar();
        const estado = d < 0 ? (r < 0.88 ? "completada" : r < 0.95 ? "no_asistio" : "cancelada") : d === 0 ? (r < 0.8 ? "confirmada" : "pendiente") : r < 0.7 ? "confirmada" : "pendiente";
        const ok = await cita({
          cliente_id: elegir(activos).id,
          empleado_id: p.id,
          servicio_id: sv.id,
          inicio: instante(fecha, t),
          fin: instante(fecha, t + dur),
          estado,
          precio: Number(sv.precio_descuento ?? sv.precio),
          motivo_cancelacion: estado === "cancelada" ? "El cliente reprogramará" : null,
        });
        if (ok) marcar(p.id, fecha, t, t + dur);
      }
      t += dur + elegir([0, 0, 15, 30, 60]);
    }
  }
}

// 3) Reservas web por confirmar (sin cruzarse)
let web = 0;
for (let d = 1; d <= 6 && web < 4; d++) {
  const fecha = sumarDias(hoy, d);
  const p = elegir(profesionales);
  const sv = elegir(asignados.filter((a) => a.empleado_id === p.id).map((a) => a.servicio));
  if (!sv) continue;
  const ini = 16 * 60;
  const choca = (ocupado.get(`${p.id}|${fecha}`) ?? []).some(([a, b]) => ini < b && ini + sv.duracion_min > a);
  if (choca) continue;
  const ok = await cita({
    cliente_id: elegir(activos).id,
    empleado_id: p.id,
    servicio_id: sv.id,
    inicio: instante(fecha, ini),
    fin: instante(fecha, ini + sv.duracion_min),
    estado: "pendiente",
    origen: "web",
    precio: Number(sv.precio_descuento ?? sv.precio),
  });
  if (ok) {
    web++;
    marcar(p.id, fecha, ini, ini + sv.duracion_min);
  }
}

console.log(`citas creadas: ${creadas} (${web} reservas web) · saltadas por reglas de horario: ${saltadas}`);
