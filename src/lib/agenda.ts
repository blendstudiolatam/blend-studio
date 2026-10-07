// Utilidades de la agenda compartidas entre servidor y navegador.
// Panamá es UTC-5 todo el año (sin horario de verano), así que la conversión es fija.
export type EstadoCita = "pendiente" | "confirmada" | "completada" | "cancelada" | "no_asistio";
export type Vista = "dia" | "semana" | "mes" | "resumen";

export const ETIQUETA_ESTADO_CITA: Record<EstadoCita, string> = {
  pendiente: "Pendiente",
  confirmada: "Confirmada",
  completada: "Completada",
  cancelada: "Cancelada",
  no_asistio: "No asistió",
};

export const CLASE_ESTADO_CITA: Record<EstadoCita, string> = {
  pendiente: "bg-amber-50 text-amber-800",
  confirmada: "bg-emerald-50 text-emerald-800",
  completada: "bg-sky-50 text-sky-800",
  cancelada: "bg-stone-100 text-stone-500",
  no_asistio: "bg-red-50 text-red-700",
};

/** Color del bloque cuando se colorea por estado. */
export const COLOR_ESTADO_CITA: Record<EstadoCita, string> = {
  pendiente: "#d97706",
  confirmada: "#059669",
  completada: "#0284c7",
  cancelada: "#a8a29e",
  no_asistio: "#dc2626",
};

const OFFSET = "-05:00";

/** "2026-10-13" + "10:30" → instante ISO en hora de Panamá. */
export const instante = (fecha: string, hora: string) => `${fecha}T${hora.slice(0, 5)}:00${OFFSET}`;

/** Instante ISO → fecha y hora locales de Panamá. */
export function enPanama(iso: string): { fecha: string; hora: string; minutos: number } {
  const d = new Date(new Date(iso).getTime() - 5 * 3_600_000);
  const fecha = d.toISOString().slice(0, 10);
  const hora = d.toISOString().slice(11, 16);
  return { fecha, hora, minutos: d.getUTCHours() * 60 + d.getUTCMinutes() };
}

export const hoyEnPanama = () => enPanama(new Date().toISOString()).fecha;

export function sumarDias(fecha: string, dias: number): string {
  const [a, m, d] = fecha.split("-").map(Number);
  return new Date(Date.UTC(a, m - 1, d + dias)).toISOString().slice(0, 10);
}

/** 0 = domingo … 6 = sábado */
export function diaSemana(fecha: string): number {
  const [a, m, d] = fecha.split("-").map(Number);
  return new Date(Date.UTC(a, m - 1, d)).getUTCDay();
}

/** Lunes de la semana de esa fecha. */
export const inicioSemana = (fecha: string) => sumarDias(fecha, -((diaSemana(fecha) + 6) % 7));

/** Primer y último día de la cuadrícula del mes (semanas completas de lunes a domingo). */
export function cuadriculaMes(fecha: string): { desde: string; hasta: string; mes: string } {
  const primero = `${fecha.slice(0, 7)}-01`;
  const [a, m] = fecha.split("-").map(Number);
  const ultimo = new Date(Date.UTC(a, m, 0)).toISOString().slice(0, 10);
  const desde = inicioSemana(primero);
  const hasta = sumarDias(inicioSemana(ultimo), 6);
  return { desde, hasta, mes: fecha.slice(0, 7) };
}

export const minutosDe = (hora: string) => {
  const [h, m] = hora.split(":").map(Number);
  return h * 60 + m;
};
export const horaDe = (min: number) => `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;

/** "10:30" → "10:30 a. m." */
export function hora12(hora: string): string {
  const [h, m] = hora.split(":").map(Number);
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${h < 12 ? "a. m." : "p. m."}`;
}

const DIAS_LARGOS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
export const DIAS_INICIALES = ["L", "M", "M", "J", "V", "S", "D"];

/** "2026-10-13" → "martes 13 de octubre" */
export function fechaLarga(fecha: string, conAnio = false): string {
  const [a, m, d] = fecha.split("-").map(Number);
  return `${DIAS_LARGOS[diaSemana(fecha)]} ${d} de ${MESES[m - 1]}${conAnio ? ` de ${a}` : ""}`;
}
export const nombreMes = (fecha: string) => {
  const [a, m] = fecha.split("-").map(Number);
  return `${MESES[m - 1]} ${a}`;
};
export const diaCorto = (fecha: string) => {
  const [, m, d] = fecha.split("-").map(Number);
  return `${DIAS_LARGOS[diaSemana(fecha)].slice(0, 3)} ${d}/${m}`;
};

/** Mensaje de WhatsApp para confirmar una cita. */
export function mensajeConfirmacion(nombre: string, servicio: string | null, fecha: string, hora: string, lugar: string): string {
  return (
    `Hola ${nombre.split(" ")[0]}, te escribimos de ${lugar} para confirmar tu cita` +
    `${servicio ? ` de ${servicio}` : ""} el ${fechaLarga(fecha)} a las ${hora12(hora)}. ` +
    "¿Nos confirmas tu asistencia? ¡Gracias!"
  );
}

/**
 * Reparte bloques que se cruzan en carriles (lado a lado).
 * Devuelve, para cada id, su carril y cuántos carriles tiene su grupo.
 */
export function carriles<T extends { id: string; ini: number; fin: number }>(items: T[]): Map<string, { carril: number; total: number }> {
  const orden = [...items].sort((a, b) => a.ini - b.ini || b.fin - a.fin);
  const resultado = new Map<string, { carril: number; total: number }>();
  let grupo: T[] = [];
  let finGrupo = -1;
  let fines: number[] = [];
  const cerrar = () => {
    for (const g of grupo) resultado.set(g.id, { carril: resultado.get(g.id)!.carril, total: fines.length });
    grupo = [];
    fines = [];
  };
  for (const it of orden) {
    if (it.ini >= finGrupo && grupo.length) cerrar();
    let carril = fines.findIndex((f) => f <= it.ini);
    if (carril === -1) carril = fines.push(it.fin) - 1;
    else fines[carril] = it.fin;
    resultado.set(it.id, { carril, total: 0 });
    grupo.push(it);
    finGrupo = Math.max(finGrupo, it.fin);
  }
  if (grupo.length) cerrar();
  return resultado;
}
