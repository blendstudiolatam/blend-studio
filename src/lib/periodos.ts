import { hoyEnPanama, inicioSemana, sumarDias } from "./agenda";

export type Periodo = "semana" | "quincena" | "mes" | "mes_pasado";

export const PERIODOS: { id: Periodo; nombre: string }[] = [
  { id: "semana", nombre: "Esta semana" },
  { id: "quincena", nombre: "Esta quincena" },
  { id: "mes", nombre: "Este mes" },
  { id: "mes_pasado", nombre: "Mes pasado" },
];

const ultimoDia = (a: number, m: number) => new Date(Date.UTC(a, m, 0)).getUTCDate();

/** Rango de fechas (YYYY-MM-DD, ambos incluidos) de un periodo, en hora de Panamá. */
export function rangoPeriodo(p: Periodo, hoy = hoyEnPanama()): { desde: string; hasta: string } {
  const [a, m, d] = hoy.split("-").map(Number);
  const mes = (y: number, mm: number) => `${y}-${String(mm).padStart(2, "0")}`;
  switch (p) {
    case "semana":
      return { desde: inicioSemana(hoy), hasta: sumarDias(inicioSemana(hoy), 6) };
    case "quincena":
      return d <= 15
        ? { desde: `${mes(a, m)}-01`, hasta: `${mes(a, m)}-15` }
        : { desde: `${mes(a, m)}-16`, hasta: `${mes(a, m)}-${ultimoDia(a, m)}` };
    case "mes":
      return { desde: `${mes(a, m)}-01`, hasta: `${mes(a, m)}-${ultimoDia(a, m)}` };
    case "mes_pasado": {
      const [pa, pm] = m === 1 ? [a - 1, 12] : [a, m - 1];
      return { desde: `${mes(pa, pm)}-01`, hasta: `${mes(pa, pm)}-${ultimoDia(pa, pm)}` };
    }
  }
}

export const periodoValido = (v: unknown): Periodo => PERIODOS.find((p) => p.id === v)?.id ?? "mes";
