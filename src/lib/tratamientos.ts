// Utilidades de planes de tratamiento compartidas entre servidor y navegador.
export type EstadoPlan = "activo" | "pausado" | "completado" | "cancelado";
export type EstadoSesion = "pendiente" | "completada" | "cancelada";

export const ETIQUETA_ESTADO_PLAN: Record<EstadoPlan, string> = {
  activo: "Activo",
  pausado: "Pausado",
  completado: "Completado",
  cancelado: "Cancelado",
};

export const CLASE_ESTADO_PLAN: Record<EstadoPlan, string> = {
  activo: "bg-emerald-50 text-emerald-800",
  pausado: "bg-amber-50 text-amber-800",
  completado: "bg-sky-50 text-sky-800",
  cancelado: "bg-stone-100 text-stone-500",
};

export const ETIQUETA_ESTADO_SESION: Record<EstadoSesion, string> = {
  pendiente: "Pendiente",
  completada: "Completada",
  cancelada: "Cancelada",
};

/** 14 → "Cada 2 semanas" */
export function frecuencia(dias: number): string {
  if (dias === 1) return "Diaria";
  if (dias % 30 === 0) return dias === 30 ? "Cada mes" : `Cada ${dias / 30} meses`;
  if (dias % 7 === 0) return dias === 7 ? "Cada semana" : `Cada ${dias / 7} semanas`;
  return `Cada ${dias} días`;
}

/** "2026-10-21" → "mié 21 oct 2026" */
export function fechaCorta(iso: string | null): string {
  if (!iso) return "Sin fecha";
  const [a, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(a, m - 1, d, 12)).toLocaleDateString("es-PA", {
    timeZone: "UTC",
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** "14:30:00" → "2:30 p. m." */
export function horaCorta(hora: string | null): string {
  if (!hora) return "";
  const [h, m] = hora.split(":").map(Number);
  return new Date(Date.UTC(2000, 0, 1, h, m)).toLocaleTimeString("es-PA", { timeZone: "UTC", hour: "numeric", minute: "2-digit" });
}
