// Utilidades de empleados compartidas entre servidor y navegador.
export type EstadoEmpleado = "activo" | "vacaciones" | "inactivo";

export const ETIQUETA_ESTADO: Record<EstadoEmpleado, string> = {
  activo: "Activo",
  vacaciones: "Vacaciones",
  inactivo: "Inactivo",
};

export const CLASE_ESTADO: Record<EstadoEmpleado, string> = {
  activo: "bg-emerald-50 text-emerald-800",
  vacaciones: "bg-amber-50 text-amber-800",
  inactivo: "bg-stone-100 text-stone-500",
};

export const DIAS_CORTOS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
export const DIAS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

export const urlFotoEmpleado = (path: string | null) =>
  path ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/equipo/${path}` : null;

export const iniciales = (nombre: string) =>
  nombre
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");

type Dia = { dia_semana: number; trabaja: boolean; entrada: string; salida: string };

/** "Lun–Sáb 9:00–19:00" o, si varía, "Lun, Mar, Jue…" */
export function resumenHorario(dias: Dia[]): string {
  const laborales = [...dias].filter((d) => d.trabaja).sort((a, b) => ((a.dia_semana + 6) % 7) - ((b.dia_semana + 6) % 7));
  if (laborales.length === 0) return "Sin horario";
  const h = (t: string) => t.slice(0, 5).replace(/^0/, "");
  const mismoHorario = laborales.every((d) => d.entrada === laborales[0].entrada && d.salida === laborales[0].salida);
  const indices = laborales.map((d) => (d.dia_semana + 6) % 7);
  const seguidos = indices.every((v, i) => i === 0 || v === indices[i - 1] + 1);
  const diasTexto =
    seguidos && laborales.length > 2
      ? `${DIAS_CORTOS[laborales[0].dia_semana]}–${DIAS_CORTOS[laborales.at(-1)!.dia_semana]}`
      : laborales.map((d) => DIAS_CORTOS[d.dia_semana]).join(", ");
  return mismoHorario ? `${diasTexto} ${h(laborales[0].entrada)}–${h(laborales[0].salida)}` : `${diasTexto} (horario variable)`;
}
