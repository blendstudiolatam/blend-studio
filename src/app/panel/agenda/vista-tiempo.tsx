"use client";

import { useEffect, useState } from "react";
import { Avatar } from "@/components/ui/avatar";
import { carriles, COLOR_ESTADO_CITA, diaSemana, enPanama, horaDe, inicioSemana, sumarDias } from "@/lib/agenda";
import { urlFotoEmpleado } from "@/lib/empleados";
import type { Prefill } from "./formulario-cita";
import type { CitaAgenda, ProfesionalAgenda } from "./tipos";

const PX = 1.2; // píxeles por minuto (72 px por hora)
const DIAS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

type Columna = {
  clave: string;
  fecha: string;
  profesional: ProfesionalAgenda | null;
  /** Tramos no disponibles (minutos) y motivo si el día completo está bloqueado. */
  bloqueado: { desde: number; hasta: number }[];
  motivo: string | null;
  citas: CitaAgenda[];
};

/** Tramos no disponibles de un profesional (o del salón) en una fecha. */
function disponibilidad(
  fecha: string,
  salon: { apertura: number; cierre: number } | null,
  p: ProfesionalAgenda | null,
): { bloqueado: { desde: number; hasta: number }[]; motivo: string | null } {
  if (!salon) return { bloqueado: [], motivo: "Cerrado" };
  if (p) {
    const b = p.bloqueos.find((x) => fecha >= x.desde && fecha <= x.hasta);
    if (b) return { bloqueado: [], motivo: b.motivo };
    const h = p.horario[diaSemana(fecha)];
    if (!h) return { bloqueado: [], motivo: "No trabaja" };
    return {
      bloqueado: [
        { desde: 0, hasta: Math.max(salon.apertura, h.entrada) },
        { desde: Math.min(salon.cierre, h.salida), hasta: 24 * 60 },
      ],
      motivo: null,
    };
  }
  return { bloqueado: [{ desde: 0, hasta: salon.apertura }, { desde: salon.cierre, hasta: 24 * 60 }], motivo: null };
}

export function VistaTiempo({
  modo,
  fecha,
  hoy,
  citas,
  profesionales,
  todos,
  horarioSalon,
  color,
  editable,
  onVer,
  onNueva,
}: {
  modo: "dia" | "semana";
  fecha: string;
  hoy: string;
  citas: CitaAgenda[];
  profesionales: ProfesionalAgenda[];
  todos: ProfesionalAgenda[];
  horarioSalon: ({ apertura: number; cierre: number } | null)[];
  color: "empleado" | "estado";
  editable: boolean;
  onVer: (c: CitaAgenda) => void;
  onNueva: (p: Prefill) => void;
}) {
  const ahora = useAhora();
  const unico = profesionales.length === 1 ? profesionales[0] : null;

  const columnas: Columna[] =
    modo === "dia"
      ? profesionales.map((p) => ({
          clave: p.id,
          fecha,
          profesional: p,
          ...disponibilidad(fecha, horarioSalon[diaSemana(fecha)], p),
          citas: citas.filter((c) => c.fecha === fecha && c.empleadoId === p.id),
        }))
      : Array.from({ length: 7 }, (_, i) => {
          const f = sumarDias(inicioSemana(fecha), i);
          return {
            clave: f,
            fecha: f,
            profesional: unico,
            ...disponibilidad(f, horarioSalon[diaSemana(f)], unico),
            citas: citas.filter((c) => c.fecha === f),
          };
        });

  // Rango de horas: el horario del salón en los días visibles (y cualquier cita fuera de él).
  const dias = [...new Set(columnas.map((c) => diaSemana(c.fecha)))];
  const abiertos = dias.map((d) => horarioSalon[d]).filter((h): h is { apertura: number; cierre: number } => Boolean(h));
  let inicio = abiertos.length ? Math.min(...abiertos.map((h) => h.apertura)) : 8 * 60;
  let fin = abiertos.length ? Math.max(...abiertos.map((h) => h.cierre)) : 20 * 60;
  for (const c of columnas.flatMap((x) => x.citas)) {
    inicio = Math.min(inicio, c.ini);
    fin = Math.max(fin, c.fin);
  }
  inicio = Math.floor(inicio / 60) * 60;
  fin = Math.ceil(fin / 60) * 60;
  const alto = (fin - inicio) * PX;
  const horas = Array.from({ length: (fin - inicio) / 60 }, (_, i) => inicio + i * 60);

  if (columnas.length === 0) {
    return <p className="rounded-xl border border-dashed border-line py-14 text-center text-sm text-muted">No hay profesionales para mostrar.</p>;
  }

  const anchoMin = modo === "dia" ? 170 : 120;

  return (
    <div className="overflow-x-auto rounded-xl border border-line bg-surface">
      <div style={{ minWidth: 56 + columnas.length * anchoMin }}>
        {/* Encabezados */}
        <div className="sticky top-0 z-10 flex border-b border-line bg-surface">
          <div className="w-14 shrink-0" />
          {columnas.map((col) => (
            <div key={col.clave} className="flex-1 border-l border-line px-2 py-2" style={{ minWidth: anchoMin }}>
              {modo === "dia" && col.profesional ? (
                <div className="flex items-center gap-2">
                  <Avatar nombre={col.profesional.nombre} foto={urlFotoEmpleado(col.profesional.fotoPath)} tamano={32} color={col.profesional.color} />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{col.profesional.nombre}</p>
                    <p className="truncate text-[11px] text-muted">{col.citas.filter((c) => c.estado !== "cancelada").length} citas</p>
                  </div>
                </div>
              ) : (
                <div className={`text-center ${col.fecha === hoy ? "text-gold-strong" : ""}`}>
                  <p className="text-[11px] uppercase tracking-wider text-muted">{DIAS[diaSemana(col.fecha)]}</p>
                  <p className={`mx-auto mt-0.5 flex h-7 w-7 items-center justify-center rounded-full text-sm ${col.fecha === hoy ? "bg-ink text-ivory" : ""}`}>
                    {Number(col.fecha.slice(8))}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Cuadrícula */}
        <div className="relative flex">
          <div className="w-14 shrink-0">
            {horas.map((h) => (
              <div key={h} className="relative text-right text-[10px] text-muted" style={{ height: 60 * PX }}>
                <span className="absolute -top-1.5 right-2">{horaDe(h)}</span>
              </div>
            ))}
          </div>

          {columnas.map((col) => {
            const lanes = carriles(col.citas.map((c) => ({ id: c.id, ini: c.ini, fin: c.fin })));
            const clicable = editable && !col.motivo;
            return (
              <div
                key={col.clave}
                className={`relative flex-1 border-l border-line ${clicable ? "cursor-pointer" : ""}`}
                style={{ minWidth: anchoMin, height: alto }}
                onClick={(e) => {
                  if (!clicable || e.target !== e.currentTarget) return;
                  const y = e.nativeEvent.offsetY;
                  const min = Math.floor((inicio + y / PX) / 15) * 15;
                  if (col.bloqueado.some((b) => min >= b.desde && min < b.hasta)) return;
                  onNueva({ fecha: col.fecha, hora: horaDe(min), empleadoId: col.profesional?.id });
                }}
              >
                {horas.map((h) => (
                  <div key={h} className="pointer-events-none absolute inset-x-0 border-t border-line/70" style={{ top: (h - inicio) * PX }}>
                    <div className="border-t border-dashed border-line/40" style={{ marginTop: 30 * PX }} />
                  </div>
                ))}

                {col.motivo ? (
                  <div className="pointer-events-none absolute inset-0 flex items-start justify-center bg-[repeating-linear-gradient(135deg,transparent,transparent_6px,rgb(0_0_0/0.035)_6px,rgb(0_0_0/0.035)_12px)] pt-4">
                    <span className="rounded-full bg-background px-2 py-0.5 text-[11px] text-muted">{col.motivo}</span>
                  </div>
                ) : (
                  col.bloqueado.map((b, i) => {
                    const top = Math.max(b.desde, inicio);
                    const bottom = Math.min(b.hasta, fin);
                    if (bottom <= top) return null;
                    return (
                      <div
                        key={i}
                        className="pointer-events-none absolute inset-x-0 bg-[repeating-linear-gradient(135deg,transparent,transparent_6px,rgb(0_0_0/0.035)_6px,rgb(0_0_0/0.035)_12px)]"
                        style={{ top: (top - inicio) * PX, height: (bottom - top) * PX }}
                      />
                    );
                  })
                )}

                {col.fecha === hoy && ahora !== null && ahora >= inicio && ahora <= fin && (
                  <div className="pointer-events-none absolute inset-x-0 z-[5] border-t-2 border-red-500" style={{ top: (ahora - inicio) * PX }}>
                    <span className="absolute -left-1 -top-[5px] h-2 w-2 rounded-full bg-red-500" />
                  </div>
                )}

                {col.citas.map((c) => {
                  const l = lanes.get(c.id) ?? { carril: 0, total: 1 };
                  const pro = todos.find((p) => p.id === c.empleadoId);
                  const tono = color === "estado" ? COLOR_ESTADO_CITA[c.estado] : (pro?.color ?? "#c9a15b");
                  const apagada = c.estado === "cancelada" || c.estado === "no_asistio";
                  const altoCita = Math.max(c.duracion * PX - 2, 18);
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => onVer(c)}
                      title={`${c.hora} · ${c.cliente.nombre}${c.servicio ? ` · ${c.servicio.nombre}` : ""}`}
                      className={`absolute z-[6] overflow-hidden rounded-md border-l-4 px-1.5 py-1 text-left text-[11px] leading-tight shadow-sm transition hover:z-20 hover:shadow-md ${apagada ? "opacity-50" : ""}`}
                      style={{
                        top: (c.ini - inicio) * PX + 1,
                        height: altoCita,
                        left: `calc(${(l.carril / l.total) * 100}% + 2px)`,
                        width: `calc(${100 / l.total}% - 4px)`,
                        background: `color-mix(in srgb, ${tono} 16%, var(--surface))`,
                        borderLeftColor: tono,
                      }}
                    >
                      <p className={`truncate font-medium ${apagada ? "line-through" : ""}`}>
                        {c.hora} {c.cliente.nombre}
                      </p>
                      {altoCita > 30 && <p className="truncate text-muted">{c.sesion ? `${c.sesion.procedimiento} (${c.sesion.numero}/${c.sesion.total})` : (c.servicio?.nombre ?? "")}</p>}
                      {modo === "semana" && !unico && altoCita > 44 && pro && <p className="truncate text-muted">{pro.nombre}</p>}
                      {c.origen === "web" && <span className="absolute right-1 top-1 rounded bg-ink px-1 text-[9px] text-ivory">WEB</span>}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/** Minuto actual en Panamá; se actualiza cada minuto (solo en el navegador). */
function useAhora(): number | null {
  const [ahora, setAhora] = useState<number | null>(null);
  useEffect(() => {
    const leer = () => setAhora(enPanama(new Date().toISOString()).minutos);
    const t0 = setTimeout(leer, 0);
    const t = setInterval(leer, 60_000);
    return () => (clearTimeout(t0), clearInterval(t));
  }, []);
  return ahora;
}
