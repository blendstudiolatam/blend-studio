"use client";

import { useState, useTransition } from "react";
import { MensajeError } from "@/components/ui/mensaje-error";
import { dinero } from "@/lib/formato";
import { cambiarServicioEmpleado, comisionServicioEmpleado, type Resultado } from "../actions";

type Servicio = { id: string; categoria_id: string; nombre: string; precio: number; activo: boolean };

export function ServiciosEmpleado({
  empleadoId,
  categorias,
  servicios,
  asignados: asignadosIniciales,
  comisionGeneral,
  editable,
}: {
  empleadoId: string;
  categorias: { id: string; nombre: string }[];
  servicios: Servicio[];
  asignados: Record<string, number | null>;
  comisionGeneral: number;
  editable: boolean;
}) {
  const [asignados, setAsignados] = useState(asignadosIniciales);
  const [resultado, setResultado] = useState<Resultado>();
  const [pendiente, iniciar] = useTransition();

  const alternar = (s: Servicio, realiza: boolean) => {
    setAsignados((a) => {
      const copia = { ...a };
      if (realiza) copia[s.id] = null;
      else delete copia[s.id];
      return copia;
    });
    iniciar(async () => {
      const r = await cambiarServicioEmpleado(empleadoId, s.id, realiza);
      if (r?.error) {
        setResultado(r);
        setAsignados(asignadosIniciales);
      }
    });
  };

  const total = Object.keys(asignados).length;

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted">
        Marca los servicios que realiza ({total} seleccionados). Su comisión general es {comisionGeneral}%; si en algún servicio
        gana distinto, escríbelo en la columna de comisión.
      </p>
      <MensajeError>{resultado?.error}</MensajeError>

      {categorias.map((c) => {
        const lista = servicios.filter((s) => s.categoria_id === c.id);
        if (lista.length === 0) return null;
        const todos = lista.every((s) => s.id in asignados);
        return (
          <section key={c.id} className="overflow-hidden rounded-xl border border-line bg-surface">
            <div className="flex items-center justify-between border-b border-line px-5 py-3">
              <h2 className="font-display text-lg">{c.nombre}</h2>
              {editable && (
                <button
                  type="button"
                  disabled={pendiente}
                  onClick={() => lista.filter((s) => (s.id in asignados) === todos).forEach((s) => alternar(s, !todos))}
                  className="text-xs text-gold-strong hover:underline"
                >
                  {todos ? "Quitar todos" : "Marcar todos"}
                </button>
              )}
            </div>
            <ul className="divide-y divide-line">
              {lista.map((s) => {
                const realiza = s.id in asignados;
                return (
                  <li key={s.id} className="flex flex-wrap items-center gap-3 px-5 py-2.5 text-sm">
                    <label className="flex flex-1 items-center gap-3">
                      <input
                        type="checkbox"
                        checked={realiza}
                        disabled={!editable || pendiente}
                        onChange={(e) => alternar(s, e.target.checked)}
                        className="h-4 w-4 accent-[var(--brand-gold)]"
                      />
                      <span className={s.activo ? "" : "text-muted line-through"}>{s.nombre}</span>
                      <span className="text-xs text-muted">{dinero(s.precio)}</span>
                    </label>
                    {realiza && (
                      <label className="flex items-center gap-1.5 text-xs text-muted">
                        Comisión
                        <input
                          type="number"
                          min={0}
                          max={100}
                          step={0.5}
                          placeholder={String(comisionGeneral)}
                          defaultValue={asignados[s.id] ?? ""}
                          disabled={!editable}
                          onBlur={(e) => {
                            const valor = e.target.value === "" ? null : Number(e.target.value);
                            if (valor === (asignados[s.id] ?? null)) return;
                            iniciar(async () => {
                              const r = await comisionServicioEmpleado(empleadoId, s.id, valor);
                              setResultado(r?.error ? r : undefined);
                              if (!r?.error) setAsignados((a) => ({ ...a, [s.id]: valor }));
                            });
                          }}
                          className="w-16 rounded-md border border-line bg-background px-2 py-1 text-right text-sm text-foreground"
                        />
                        %
                      </label>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
