import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

/** Patrón de cada pantalla: título con ícono, subtítulo y acción principal a la derecha. */
export function Encabezado({
  icono: Icono,
  titulo,
  subtitulo,
  accion,
}: {
  icono: LucideIcon;
  titulo: string;
  subtitulo?: string;
  accion?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="flex items-start gap-3">
        <span className="mt-1 rounded-lg bg-ink p-2 text-gold">
          <Icono className="h-5 w-5" />
        </span>
        <div>
          <h1 className="font-display text-3xl leading-tight sm:text-4xl">{titulo}</h1>
          {subtitulo && <p className="mt-1 text-sm text-muted">{subtitulo}</p>}
        </div>
      </div>
      {accion}
    </div>
  );
}

/** Tarjeta de indicador (KPI). */
export function Indicador({
  etiqueta,
  valor,
  detalle,
}: {
  etiqueta: string;
  valor: string;
  detalle?: string;
}) {
  return (
    <div className="rounded-xl border border-line bg-surface p-5">
      <p className="text-[11px] uppercase tracking-[0.16em] text-muted">{etiqueta}</p>
      <p className="mt-2 font-display text-3xl">{valor}</p>
      {detalle && <p className="mt-1 text-xs text-muted">{detalle}</p>}
    </div>
  );
}
