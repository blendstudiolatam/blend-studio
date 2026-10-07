"use client";

import { CalendarOff, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { Boton } from "@/components/ui/boton";
import { IndicadorGuardado } from "@/components/ui/indicador-guardado";
import { MensajeError } from "@/components/ui/mensaje-error";
import { DIAS } from "@/lib/empleados";
import { useAutoguardado } from "@/lib/use-autoguardado";
import { agregarBloqueo, guardarHorarioEmpleado, quitarBloqueo, type Resultado } from "../actions";

type Dia = { dia_semana: number; trabaja: boolean; entrada: string; salida: string };
type Bloqueo = { id: string; desde: string; hasta: string; motivo: string };

const fecha = (iso: string) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString("es-PA", { day: "numeric", month: "short", year: "numeric" });

export function HorarioEmpleado({
  id,
  dias: diasIniciales,
  bloqueos,
  editable,
}: {
  id: string;
  dias: Dia[];
  bloqueos: Bloqueo[];
  editable: boolean;
}) {
  const [dias, setDias] = useState(diasIniciales);
  const valido = dias.every((d) => !d.trabaja || d.salida > d.entrada);
  const { estado, error } = useAutoguardado(dias, async (d) =>
    valido ? guardarHorarioEmpleado(id, d) : { error: "La salida debe ser después de la entrada." },
  );
  const [resultado, setResultado] = useState<Resultado>();
  const [pendiente, iniciar] = useTransition();
  const cambiar = (i: number, c: Partial<Dia>) => setDias((ds) => ds.map((d, j) => (j === i ? { ...d, ...c } : d)));
  const hoy = new Date().toISOString().slice(0, 10);

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <section className="rounded-xl border border-line bg-surface p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-xl">Horario semanal</h2>
          {editable && <IndicadorGuardado estado={estado} error={error} />}
        </div>
        <p className="mt-1 text-xs text-muted">Solo se le podrán agendar citas en estos horarios.</p>
        <div className="mt-4 divide-y divide-line rounded-lg border border-line">
          {dias.map((d, i) => (
            <div key={d.dia_semana} className="flex flex-wrap items-center gap-3 px-4 py-2.5">
              <span className="w-24 text-sm">{DIAS[d.dia_semana]}</span>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={d.trabaja}
                  disabled={!editable}
                  onChange={(e) => cambiar(i, { trabaja: e.target.checked })}
                  className="h-4 w-4 accent-[var(--brand-gold)]"
                />
                {d.trabaja ? "Trabaja" : "Libre"}
              </label>
              {d.trabaja && (
                <div className="flex items-center gap-2 text-sm">
                  <input
                    type="time"
                    value={d.entrada}
                    disabled={!editable}
                    onChange={(e) => cambiar(i, { entrada: e.target.value })}
                    aria-label={`Entrada ${DIAS[d.dia_semana]}`}
                    className="rounded-lg border border-line bg-surface px-2 py-1.5"
                  />
                  <span className="text-muted">a</span>
                  <input
                    type="time"
                    value={d.salida}
                    disabled={!editable}
                    onChange={(e) => cambiar(i, { salida: e.target.value })}
                    aria-label={`Salida ${DIAS[d.dia_semana]}`}
                    className={`rounded-lg border bg-surface px-2 py-1.5 ${d.salida > d.entrada ? "border-line" : "border-red-400"}`}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-line bg-surface p-5 sm:p-6">
        <h2 className="flex items-center gap-2 font-display text-xl">
          <CalendarOff className="h-5 w-5 text-gold-strong" /> Vacaciones y días libres
        </h2>
        <p className="mt-1 text-xs text-muted">En estas fechas no se le podrán agendar citas.</p>

        <ul className="mt-4 space-y-2">
          {bloqueos.map((b) => (
            <li key={b.id} className="flex items-center justify-between gap-3 rounded-lg border border-line px-4 py-2.5 text-sm">
              <span>
                <strong className="font-medium">{b.motivo}</strong>
                <span className="text-muted">
                  {" "}
                  · {fecha(b.desde)}
                  {b.hasta !== b.desde && ` al ${fecha(b.hasta)}`}
                </span>
                {b.hasta < hoy && <span className="ml-2 text-xs text-muted">(pasado)</span>}
              </span>
              {editable && (
                <button
                  type="button"
                  disabled={pendiente}
                  onClick={() => iniciar(async () => setResultado(await quitarBloqueo(b.id)))}
                  aria-label="Quitar"
                  className="rounded-md p-1 text-muted hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </li>
          ))}
          {bloqueos.length === 0 && <li className="text-sm text-muted">Sin días libres registrados.</li>}
        </ul>

        {editable && (
          <form
            className="mt-5 grid gap-3 sm:grid-cols-[1fr_1fr]"
            action={(fd) =>
              iniciar(async () =>
                setResultado(
                  await agregarBloqueo(id, {
                    desde: String(fd.get("desde")),
                    hasta: String(fd.get("hasta")),
                    motivo: String(fd.get("motivo")),
                  }),
                ),
              )
            }
          >
            <label className="block text-xs text-muted">
              Desde
              <input name="desde" type="date" required min={hoy} className="mt-1 block w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm" />
            </label>
            <label className="block text-xs text-muted">
              Hasta
              <input name="hasta" type="date" required min={hoy} className="mt-1 block w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm" />
            </label>
            <label className="block text-xs text-muted sm:col-span-2">
              Motivo
              <select name="motivo" className="mt-1 block w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm">
                {["Vacaciones", "Día libre", "Incapacidad", "Capacitación", "Personal"].map((m) => (
                  <option key={m}>{m}</option>
                ))}
              </select>
            </label>
            <div className="sm:col-span-2">
              <MensajeError>{resultado?.error}</MensajeError>
              <Boton type="submit" variante="secundario" cargando={pendiente}>
                Agregar
              </Boton>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}
