"use client";

import { BellRing, CalendarDays, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Encabezado, Indicador } from "@/components/panel/encabezado";
import { Avatar } from "@/components/ui/avatar";
import { Dialogo } from "@/components/ui/dialogo";
import {
  cuadriculaMes,
  DIAS_INICIALES,
  diaCorto,
  fechaLarga,
  inicioSemana,
  nombreMes,
  sumarDias,
  type Vista,
} from "@/lib/agenda";
import { urlFotoEmpleado } from "@/lib/empleados";
import { DetalleCita } from "./detalle-cita";
import { FormularioCita, type Prefill } from "./formulario-cita";
import { ListaCitas } from "./lista-citas";
import { PanelRecordatorios } from "./panel-recordatorios";
import type { CitaAgenda, ConfigRecordatorios, FiltroAgenda, ProfesionalAgenda, ServicioAgenda } from "./tipos";
import { VistaMes } from "./vista-mes";
import { VistaTiempo } from "./vista-tiempo";

const VISTAS: { id: Vista; nombre: string }[] = [
  { id: "dia", nombre: "Día" },
  { id: "semana", nombre: "Semana" },
  { id: "mes", nombre: "Mes" },
  { id: "resumen", nombre: "Resumen del día" },
];

export function Agenda(props: {
  filtro: FiltroAgenda;
  hoy: string;
  citas: CitaAgenda[];
  pendientes: CitaAgenda[];
  conteoDias: Record<string, number>;
  profesionales: ProfesionalAgenda[];
  horarioSalon: ({ apertura: number; cierre: number } | null)[];
  servicios: ServicioAgenda[];
  indicadores: { hoy: number; semana: number; confirmadas: number; pendientes: number };
  recordatorios: ConfigRecordatorios;
  sucursal: string;
  editable: boolean;
  esAdmin: boolean;
  creaClientes: boolean;
  esProfesional: boolean;
}) {
  const { filtro, hoy, profesionales, editable } = props;
  const router = useRouter();
  const pathname = usePathname();
  const [cargando, iniciar] = useTransition();
  const [nueva, setNueva] = useState<Prefill | null>(null);
  const [editando, setEditando] = useState<CitaAgenda | null>(null);
  const [viendo, setViendo] = useState<CitaAgenda | null>(null);
  const [recordatorios, setRecordatorios] = useState(false);

  const ir = (cambios: Partial<FiltroAgenda>) => {
    const f = { ...filtro, ...cambios };
    const p = new URLSearchParams();
    if (f.fecha !== hoy) p.set("fecha", f.fecha);
    if (f.vista !== "dia") p.set("vista", f.vista);
    if (f.profesional) p.set("pro", f.profesional);
    if (f.pestana !== "agenda") p.set("tab", f.pestana);
    if (f.color !== "empleado") p.set("color", f.color);
    iniciar(() => router.push(p.size ? `${pathname}?${p}` : pathname, { scroll: false }));
  };

  const mover = (dir: 1 | -1) => {
    const paso = filtro.vista === "semana" ? 7 : filtro.vista === "mes" ? 0 : 1;
    if (filtro.vista === "mes") {
      const [a, m] = filtro.fecha.split("-").map(Number);
      const d = new Date(Date.UTC(a, m - 1 + dir, 1)).toISOString().slice(0, 10);
      return ir({ fecha: d });
    }
    ir({ fecha: sumarDias(filtro.fecha, paso * dir) });
  };

  const visibles = filtro.profesional ? profesionales.filter((p) => p.id === filtro.profesional) : profesionales;
  const citasVisibles = filtro.profesional ? props.citas.filter((c) => c.empleadoId === filtro.profesional) : props.citas;

  const titulo =
    filtro.vista === "semana"
      ? `Semana del ${diaCorto(inicioSemana(filtro.fecha))} al ${diaCorto(sumarDias(inicioSemana(filtro.fecha), 6))}`
      : filtro.vista === "mes"
        ? nombreMes(filtro.fecha)
        : fechaLarga(filtro.fecha, true);

  const nuevaCita = (prefill: Prefill = {}) => editable && setNueva({ fecha: filtro.fecha, ...prefill });

  return (
    <div className="space-y-6">
      <Encabezado
        icono={CalendarDays}
        titulo="Agenda"
        subtitulo={props.esProfesional ? "Tus citas." : "Citas de todo el equipo. Cada profesional ve solo la suya."}
        accion={
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setRecordatorios(true)}
              className="inline-flex items-center gap-2 rounded-lg border border-line bg-surface px-3.5 py-2.5 text-xs uppercase tracking-[0.14em] hover:border-gold"
            >
              <BellRing className="h-4 w-4" /> Recordatorios
              <span className={`h-2 w-2 rounded-full ${props.recordatorios.activo ? "bg-emerald-500" : "bg-stone-300"}`} />
            </button>
            {editable && (
              <button
                type="button"
                onClick={() => nuevaCita()}
                className="inline-flex items-center gap-2 rounded-lg bg-ink px-4 py-2.5 text-xs uppercase tracking-[0.16em] text-ivory hover:bg-ink/85"
              >
                <Plus className="h-4 w-4" /> Agendar cita
              </button>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Indicador etiqueta="Citas de hoy" valor={String(props.indicadores.hoy)} />
        <Indicador etiqueta="Esta semana" valor={String(props.indicadores.semana)} />
        <Indicador etiqueta="Confirmadas" valor={String(props.indicadores.confirmadas)} detalle="Esta semana" />
        <Indicador etiqueta="Por confirmar" valor={String(props.indicadores.pendientes)} detalle="De hoy en adelante" />
      </div>

      <nav className="flex gap-1 border-b border-line" aria-label="Secciones de la agenda">
        {(
          [
            ["agenda", "Agenda"],
            ["pendientes", `Por confirmar · reservas web (${props.pendientes.length})`],
          ] as const
        ).map(([id, nombre]) => (
          <button
            key={id}
            type="button"
            onClick={() => ir({ pestana: id })}
            className={`-mb-px border-b-2 px-4 py-2.5 text-sm transition ${
              filtro.pestana === id ? "border-gold text-foreground" : "border-transparent text-muted hover:text-foreground"
            }`}
          >
            {nombre}
          </button>
        ))}
      </nav>

      {filtro.pestana === "pendientes" ? (
        <ListaCitas
          citas={props.pendientes}
          profesionales={profesionales}
          sucursal={props.sucursal}
          editable={editable}
          vacio="No hay citas por confirmar. Las reservas de la página web llegarán aquí."
          conFecha
          onVer={setViendo}
        />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
          <aside className="space-y-5">
            <MiniCalendario fecha={filtro.fecha} hoy={hoy} conteo={props.conteoDias} onElegir={(f) => ir({ fecha: f, vista: filtro.vista === "mes" ? "dia" : filtro.vista })} />

            {!props.esProfesional && (
              <div className="rounded-xl border border-line bg-surface p-3">
                <p className="px-1 pb-2 text-[11px] font-medium uppercase tracking-[0.16em] text-muted">Profesionales</p>
                <button
                  type="button"
                  onClick={() => ir({ profesional: "" })}
                  className={`w-full rounded-lg px-2 py-1.5 text-left text-sm ${!filtro.profesional ? "bg-background font-medium" : "hover:bg-background"}`}
                >
                  Todo el equipo
                </button>
                {profesionales.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => ir({ profesional: p.id })}
                    className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm ${filtro.profesional === p.id ? "bg-background font-medium" : "hover:bg-background"}`}
                  >
                    <Avatar nombre={p.nombre} foto={urlFotoEmpleado(p.fotoPath)} tamano={24} color={p.color} />
                    <span className="truncate">{p.nombre}</span>
                  </button>
                ))}
              </div>
            )}

            <div className="rounded-xl border border-line bg-surface p-3 text-sm">
              <p className="px-1 pb-2 text-[11px] font-medium uppercase tracking-[0.16em] text-muted">Colores</p>
              {(
                [
                  ["empleado", "Por profesional"],
                  ["estado", "Por estado"],
                ] as const
              ).map(([id, nombre]) => (
                <label key={id} className="flex items-center gap-2 px-1 py-1">
                  <input type="radio" name="color" checked={filtro.color === id} onChange={() => ir({ color: id })} className="accent-[var(--brand-gold)]" />
                  {nombre}
                </label>
              ))}
            </div>
          </aside>

          <div className="min-w-0 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => mover(-1)} className="rounded-lg border border-line bg-surface p-2 hover:border-gold" aria-label="Anterior">
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button type="button" onClick={() => ir({ fecha: hoy })} className="rounded-lg border border-line bg-surface px-3 py-1.5 text-sm hover:border-gold">
                  Hoy
                </button>
                <button type="button" onClick={() => mover(1)} className="rounded-lg border border-line bg-surface p-2 hover:border-gold" aria-label="Siguiente">
                  <ChevronRight className="h-4 w-4" />
                </button>
                <h2 className="ml-2 font-display text-xl first-letter:uppercase sm:text-2xl">{titulo}</h2>
              </div>
              <div className="flex overflow-hidden rounded-lg border border-line text-sm" role="group" aria-label="Vista">
                {VISTAS.map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => ir({ vista: v.id })}
                    aria-pressed={filtro.vista === v.id}
                    className={`px-3 py-1.5 ${filtro.vista === v.id ? "bg-ink text-ivory" : "bg-surface text-muted hover:text-foreground"}`}
                  >
                    {v.nombre}
                  </button>
                ))}
              </div>
            </div>

            <div className={`transition-opacity ${cargando ? "opacity-50" : ""}`}>
              {(filtro.vista === "dia" || filtro.vista === "semana") && (
                <VistaTiempo
                  modo={filtro.vista}
                  fecha={filtro.fecha}
                  hoy={hoy}
                  citas={citasVisibles}
                  profesionales={visibles}
                  todos={profesionales}
                  horarioSalon={props.horarioSalon}
                  color={filtro.color}
                  editable={editable}
                  onVer={setViendo}
                  onNueva={nuevaCita}
                />
              )}
              {filtro.vista === "mes" && (
                <VistaMes
                  fecha={filtro.fecha}
                  hoy={hoy}
                  citas={citasVisibles}
                  profesionales={profesionales}
                  color={filtro.color}
                  onDia={(f) => ir({ fecha: f, vista: "dia" })}
                  onVer={setViendo}
                />
              )}
              {filtro.vista === "resumen" && (
                <ListaCitas
                  citas={citasVisibles}
                  profesionales={profesionales}
                  sucursal={props.sucursal}
                  editable={editable}
                  vacio="No hay citas este día."
                  onVer={setViendo}
                />
              )}
            </div>
          </div>
        </div>
      )}

      <Dialogo abierto={nueva !== null || editando !== null} onCerrar={() => (setNueva(null), setEditando(null))} titulo={editando ? "Editar cita" : "Agendar cita"} ancho="max-w-2xl">
        {(nueva || editando) && (
          <FormularioCita
            key={editando?.id ?? "nueva"}
            cita={editando}
            prefill={nueva ?? {}}
            profesionales={profesionales}
            servicios={props.servicios}
            creaClientes={props.creaClientes}
            onListo={() => (setNueva(null), setEditando(null))}
          />
        )}
      </Dialogo>

      <Dialogo abierto={viendo !== null} onCerrar={() => setViendo(null)} titulo={viendo?.cliente.nombre ?? ""} subtitulo={viendo?.servicio?.nombre ?? "Cita"} ancho="max-w-lg">
        {viendo && (
          <DetalleCita
            cita={viendo}
            profesional={profesionales.find((p) => p.id === viendo.empleadoId) ?? null}
            sucursal={props.sucursal}
            editable={editable}
            onEditar={() => (setEditando(viendo), setViendo(null))}
            onListo={() => setViendo(null)}
          />
        )}
      </Dialogo>

      <Dialogo abierto={recordatorios} onCerrar={() => setRecordatorios(false)} titulo="Recordatorios automáticos" subtitulo="Avisos a los clientes antes de su cita." ancho="max-w-lg">
        {recordatorios && <PanelRecordatorios inicial={props.recordatorios} editable={props.esAdmin} onListo={() => setRecordatorios(false)} />}
      </Dialogo>
    </div>
  );
}

function MiniCalendario({
  fecha,
  hoy,
  conteo,
  onElegir,
}: {
  fecha: string;
  hoy: string;
  conteo: Record<string, number>;
  onElegir: (f: string) => void;
}) {
  const { desde, hasta, mes } = cuadriculaMes(fecha);
  const dias: string[] = [];
  for (let d = desde; d <= hasta; d = sumarDias(d, 1)) dias.push(d);
  return (
    <div className="rounded-xl border border-line bg-surface p-3">
      <p className="pb-2 text-center text-sm font-medium first-letter:uppercase">{nombreMes(fecha)}</p>
      <div className="grid grid-cols-7 gap-0.5 text-center text-[11px]">
        {DIAS_INICIALES.map((d, i) => (
          <span key={i} className="py-1 text-muted">
            {d}
          </span>
        ))}
        {dias.map((d) => {
          const fuera = !d.startsWith(mes);
          const elegido = d === fecha;
          return (
            <button
              key={d}
              type="button"
              onClick={() => onElegir(d)}
              aria-label={fechaLarga(d)}
              aria-current={elegido ? "date" : undefined}
              className={`relative rounded-md py-1.5 text-xs transition ${
                elegido ? "bg-ink text-ivory" : d === hoy ? "border border-gold text-foreground" : fuera ? "text-muted/50" : "hover:bg-background"
              }`}
            >
              {Number(d.slice(8))}
              {conteo[d] > 0 && (
                <span className={`absolute bottom-0.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full ${elegido ? "bg-gold" : "bg-gold-strong"}`} />
              )}
            </button>
          );
        })}
      </div>
      <div className="mt-2 flex flex-wrap justify-center gap-3 text-[10px] text-muted">
        <span className="inline-flex items-center gap-1">
          <span className="h-2 w-2 rounded-sm bg-ink" /> Elegido
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-2 w-2 rounded-sm border border-gold" /> Hoy
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-gold-strong" /> Con citas
        </span>
      </div>
    </div>
  );
}
