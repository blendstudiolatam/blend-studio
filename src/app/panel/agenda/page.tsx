import type { Metadata } from "next";
import {
  cuadriculaMes,
  enPanama,
  hoyEnPanama,
  inicioSemana,
  instante,
  minutosDe,
  sumarDias,
  type EstadoCita,
  type Vista,
} from "@/lib/agenda";
import { requireModulo } from "@/lib/auth/sesion";
import { createClient } from "@/lib/supabase/server";
import { Agenda } from "./agenda";
import type { CitaAgenda, ConfigRecordatorios, FiltroAgenda, ProfesionalAgenda, ServicioAgenda } from "./tipos";

export const metadata: Metadata = { title: "Agenda" };

const VISTAS: Vista[] = ["dia", "semana", "mes", "resumen"];
const SELECT_CITA =
  "id, inicio, fin, estado, origen, precio, notas, motivo_cancelacion, empleado_id, servicio:servicios(id, nombre), cliente:clientes(id, codigo, nombre, apellido, telefono), sesion:sesiones_tratamiento(id, numero, plan:planes_tratamiento(procedimiento, sesiones_total))";

type FilaCita = {
  id: string;
  inicio: string;
  fin: string;
  estado: string;
  origen: string;
  precio: number | null;
  notas: string | null;
  motivo_cancelacion: string | null;
  empleado_id: string;
  servicio: { id: string; nombre: string } | null;
  cliente: { id: string; codigo: number; nombre: string; apellido: string; telefono: string | null } | null;
  sesion: { id: string; numero: number; plan: { procedimiento: string; sesiones_total: number } | null } | null;
};

function aCita(c: FilaCita): CitaAgenda {
  const a = enPanama(c.inicio);
  const duracion = Math.round((new Date(c.fin).getTime() - new Date(c.inicio).getTime()) / 60_000);
  return {
    id: c.id,
    fecha: a.fecha,
    hora: a.hora,
    ini: a.minutos,
    fin: a.minutos + duracion,
    duracion,
    estado: c.estado as EstadoCita,
    origen: c.origen as "panel" | "web",
    precio: c.precio === null ? null : Number(c.precio),
    notas: c.notas,
    motivoCancelacion: c.motivo_cancelacion,
    empleadoId: c.empleado_id,
    servicio: c.servicio,
    cliente: {
      id: c.cliente?.id ?? "",
      codigo: c.cliente?.codigo ?? 0,
      nombre: `${c.cliente?.nombre ?? ""} ${c.cliente?.apellido ?? ""}`.trim(),
      telefono: c.cliente?.telefono ?? null,
    },
    sesion: c.sesion?.plan
      ? { id: c.sesion.id, numero: c.sesion.numero, total: c.sesion.plan.sesiones_total, procedimiento: c.sesion.plan.procedimiento }
      : null,
  };
}

export default async function AgendaPage({ searchParams }: PageProps<"/panel/agenda">) {
  const ctx = await requireModulo("agenda");
  const sp = await searchParams;
  const hoy = hoyEnPanama();
  const fecha = typeof sp.fecha === "string" && /^\d{4}-\d{2}-\d{2}$/.test(sp.fecha) ? sp.fecha : hoy;
  const filtro: FiltroAgenda = {
    fecha,
    vista: VISTAS.find((v) => v === sp.vista) ?? "dia",
    profesional: typeof sp.pro === "string" ? sp.pro : "",
    pestana: sp.tab === "pendientes" ? "pendientes" : "agenda",
    color: sp.color === "estado" ? "estado" : "empleado",
  };

  // Rango de fechas que se muestra
  const mes = cuadriculaMes(fecha);
  const [desde, hasta] =
    filtro.vista === "semana"
      ? [inicioSemana(fecha), sumarDias(inicioSemana(fecha), 6)]
      : filtro.vista === "mes"
        ? [mes.desde, mes.hasta]
        : [fecha, fecha];
  const semana = [inicioSemana(hoy), sumarDias(inicioSemana(hoy), 7)];

  const supabase = await createClient();
  const contar = () => supabase.from("citas").select("id", { count: "exact", head: true }).eq("sucursal_id", ctx.sucursal.id);
  const activas = ["pendiente", "confirmada", "completada"] as const;

  const [
    { data: citas },
    { data: pendientes },
    { data: diasMes },
    { data: empleados },
    { data: horariosSuc },
    { data: horariosEmp },
    { data: bloqueos },
    { data: servicios },
    { data: asignaciones },
    { data: recordatorios },
    kHoy,
    kSemana,
    kConfirmadas,
    kPendientes,
  ] = await Promise.all([
    supabase
      .from("citas")
      .select(SELECT_CITA)
      .eq("sucursal_id", ctx.sucursal.id)
      .gte("inicio", instante(desde, "00:00"))
      .lt("inicio", instante(sumarDias(hasta, 1), "00:00"))
      .order("inicio")
      .limit(2000),
    supabase
      .from("citas")
      .select(SELECT_CITA)
      .eq("sucursal_id", ctx.sucursal.id)
      .eq("estado", "pendiente")
      .gte("inicio", instante(hoy, "00:00"))
      .order("inicio")
      .limit(200),
    // Días con citas para el mini calendario
    supabase
      .from("citas")
      .select("inicio")
      .eq("sucursal_id", ctx.sucursal.id)
      .in("estado", [...activas])
      .gte("inicio", instante(mes.desde, "00:00"))
      .lt("inicio", instante(sumarDias(mes.hasta, 1), "00:00"))
      .limit(5000),
    supabase
      .from("empleados")
      .select("id, nombre, apellido, color, foto_path, especialidad, rol, estado")
      .eq("sucursal_id", ctx.sucursal.id)
      .neq("estado", "inactivo")
      .order("orden"),
    supabase.from("horarios_sucursal").select("dia_semana, abierto, apertura, cierre").eq("sucursal_id", ctx.sucursal.id),
    supabase.from("horarios_empleado").select("empleado_id, dia_semana, trabaja, entrada, salida").eq("sucursal_id", ctx.sucursal.id),
    supabase
      .from("bloqueos_empleado")
      .select("empleado_id, desde, hasta, motivo")
      .eq("sucursal_id", ctx.sucursal.id)
      .lte("desde", hasta)
      .gte("hasta", desde),
    supabase
      .from("servicios")
      .select("id, nombre, duracion_min, precio, precio_descuento, categoria:categorias_servicio(nombre, orden)")
      .eq("sucursal_id", ctx.sucursal.id)
      .eq("activo", true)
      .order("orden"),
    supabase.from("empleado_servicios").select("empleado_id, servicio_id").eq("sucursal_id", ctx.sucursal.id),
    supabase.from("config_recordatorios").select("*").eq("sucursal_id", ctx.sucursal.id).maybeSingle(),
    contar().in("estado", [...activas]).gte("inicio", instante(hoy, "00:00")).lt("inicio", instante(sumarDias(hoy, 1), "00:00")),
    contar().in("estado", [...activas]).gte("inicio", instante(semana[0], "00:00")).lt("inicio", instante(semana[1], "00:00")),
    contar().eq("estado", "confirmada").gte("inicio", instante(semana[0], "00:00")).lt("inicio", instante(semana[1], "00:00")),
    contar().eq("estado", "pendiente").gte("inicio", instante(hoy, "00:00")),
  ]);

  // Profesionales: quienes realizan servicios (o tienen rol de profesional)
  const conServicios = new Set((asignaciones ?? []).map((a) => a.empleado_id));
  const profesionales: ProfesionalAgenda[] = (empleados ?? [])
    .filter((e) => e.rol === "estilista" || conServicios.has(e.id))
    .map((e) => ({
      id: e.id,
      nombre: `${e.nombre} ${e.apellido}`.trim(),
      color: e.color,
      fotoPath: e.foto_path,
      especialidad: e.especialidad,
      horario: Array.from({ length: 7 }, (_, d) => {
        const h = (horariosEmp ?? []).find((x) => x.empleado_id === e.id && x.dia_semana === d);
        if (!h) return { entrada: 9 * 60, salida: 19 * 60 };
        return h.trabaja ? { entrada: minutosDe(h.entrada), salida: minutosDe(h.salida) } : null;
      }),
      bloqueos: (bloqueos ?? []).filter((b) => b.empleado_id === e.id).map(({ desde, hasta, motivo }) => ({ desde, hasta, motivo })),
      servicios: (asignaciones ?? []).filter((a) => a.empleado_id === e.id).map((a) => a.servicio_id),
    }));

  const horarioSalon = Array.from({ length: 7 }, (_, d) => {
    const h = (horariosSuc ?? []).find((x) => x.dia_semana === d);
    if (!h) return d === 0 ? null : { apertura: 9 * 60, cierre: 19 * 60 };
    return h.abierto ? { apertura: minutosDe(h.apertura), cierre: minutosDe(h.cierre) } : null;
  });

  const listaServicios: ServicioAgenda[] = (servicios ?? [])
    .map((s) => ({
      id: s.id,
      nombre: s.nombre,
      categoria: s.categoria?.nombre ?? "Otros",
      orden: s.categoria?.orden ?? 0,
      duracion: s.duracion_min,
      precio: Number(s.precio_descuento ?? s.precio),
    }))
    .sort((a, b) => a.orden - b.orden)
    .map((s) => ({ id: s.id, nombre: s.nombre, categoria: s.categoria, duracion: s.duracion, precio: s.precio }));

  const conteoDias: Record<string, number> = {};
  for (const c of diasMes ?? []) {
    const f = enPanama(c.inicio).fecha;
    conteoDias[f] = (conteoDias[f] ?? 0) + 1;
  }

  const config: ConfigRecordatorios = recordatorios ?? {
    activo: false,
    por_whatsapp: true,
    por_correo: false,
    aviso_horas: 24,
    seguimiento_activo: true,
    seguimiento_horas: 2,
  };

  return (
    <Agenda
      filtro={filtro}
      hoy={hoy}
      citas={(citas ?? []).map((c) => aCita(c as FilaCita))}
      pendientes={(pendientes ?? []).map((c) => aCita(c as FilaCita))}
      conteoDias={conteoDias}
      profesionales={profesionales}
      horarioSalon={horarioSalon}
      servicios={listaServicios}
      indicadores={{
        hoy: kHoy.count ?? 0,
        semana: kSemana.count ?? 0,
        confirmadas: kConfirmadas.count ?? 0,
        pendientes: kPendientes.count ?? 0,
      }}
      recordatorios={config}
      sucursal={ctx.sucursal.nombre}
      editable={ctx.permisos.agenda === "total"}
      esAdmin={ctx.rol === "admin"}
      creaClientes={ctx.permisos.clientes === "total"}
      esProfesional={ctx.rol === "estilista"}
    />
  );
}
