/** B/. 1,234.50 */
export function dinero(n: number | string | null | undefined): string {
  const v = Number(n ?? 0);
  return `B/. ${v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** 90 → "1 h 30 min" */
export function duracion(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (!h) return `${m} min`;
  return m ? `${h} h ${m} min` : `${h} h`;
}

/** Porcentaje de ahorro entre precio de lista y con descuento (0–100), o null. */
export function ahorro(precio: number, descuento: number | null): number | null {
  if (descuento == null || precio <= 0 || descuento >= precio) return null;
  return Math.round((1 - descuento / precio) * 100);
}
