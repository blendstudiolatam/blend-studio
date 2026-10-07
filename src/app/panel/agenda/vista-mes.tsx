"use client";

import { COLOR_ESTADO_CITA, cuadriculaMes, DIAS_INICIALES, sumarDias } from "@/lib/agenda";
import type { CitaAgenda, ProfesionalAgenda } from "./tipos";

export function VistaMes({
  fecha,
  hoy,
  citas,
  profesionales,
  color,
  onDia,
  onVer,
}: {
  fecha: string;
  hoy: string;
  citas: CitaAgenda[];
  profesionales: ProfesionalAgenda[];
  color: "empleado" | "estado";
  onDia: (f: string) => void;
  onVer: (c: CitaAgenda) => void;
}) {
  const { desde, hasta, mes } = cuadriculaMes(fecha);
  const dias: string[] = [];
  for (let d = desde; d <= hasta; d = sumarDias(d, 1)) dias.push(d);

  return (
    <div className="overflow-x-auto rounded-xl border border-line bg-surface">
      <div className="grid min-w-[700px] grid-cols-7">
        {DIAS_INICIALES.map((d, i) => (
          <div key={i} className="border-b border-line py-2 text-center text-[11px] uppercase tracking-wider text-muted">
            {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"][i] ?? d}
          </div>
        ))}
        {dias.map((d) => {
          const delDia = citas.filter((c) => c.fecha === d && c.estado !== "cancelada");
          return (
            <div key={d} className={`min-h-28 border-b border-r border-line p-1.5 ${d.startsWith(mes) ? "" : "bg-background/50"}`}>
              <button
                type="button"
                onClick={() => onDia(d)}
                className={`mb-1 flex h-6 w-6 items-center justify-center rounded-full text-xs hover:bg-background ${d === hoy ? "bg-ink text-ivory hover:bg-ink" : d.startsWith(mes) ? "" : "text-muted"}`}
              >
                {Number(d.slice(8))}
              </button>
              <div className="space-y-0.5">
                {delDia.slice(0, 3).map((c) => {
                  const tono = color === "estado" ? COLOR_ESTADO_CITA[c.estado] : (profesionales.find((p) => p.id === c.empleadoId)?.color ?? "#c9a15b");
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => onVer(c)}
                      className="flex w-full items-center gap-1 truncate rounded px-1 text-left text-[11px] hover:bg-background"
                    >
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: tono }} />
                      <span className="text-muted">{c.hora}</span>
                      <span className="truncate">{c.cliente.nombre.split(" ")[0]}</span>
                    </button>
                  );
                })}
                {delDia.length > 3 && (
                  <button type="button" onClick={() => onDia(d)} className="px-1 text-[11px] text-gold-strong hover:underline">
                    +{delDia.length - 3} más
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
