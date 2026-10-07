"use client";

import { MapPin } from "lucide-react";
import { useState } from "react";
import { IndicadorGuardado } from "@/components/ui/indicador-guardado";
import { useAutoguardado } from "@/lib/use-autoguardado";
import { guardarHorario, guardarSucursal } from "../actions";

export type DiaHorario = { dia_semana: number; abierto: boolean; apertura: string; cierre: string };

const DIAS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

export function TarjetaSucursal({
  sucursal,
  horario,
  editable,
  actual,
}: {
  sucursal: { id: string; nombre: string; direccion: string; telefono: string };
  horario: DiaHorario[];
  editable: boolean;
  actual: boolean;
}) {
  const [datos, setDatos] = useState({
    nombre: sucursal.nombre,
    direccion: sucursal.direccion,
    telefono: sucursal.telefono,
  });
  const [dias, setDias] = useState(horario);

  const guardadoDatos = useAutoguardado(datos, (d) => guardarSucursal(sucursal.id, d));
  const horarioValido = dias.every((d) => !d.abierto || d.cierre > d.apertura);
  const guardadoHorario = useAutoguardado(dias, async (d) =>
    horarioValido ? guardarHorario(sucursal.id, d) : { error: "El cierre debe ser después de la apertura." },
  );

  const cambiarDia = (i: number, cambio: Partial<DiaHorario>) =>
    setDias((ds) => ds.map((d, j) => (j === i ? { ...d, ...cambio } : d)));

  const entrada =
    "block w-full rounded-lg border border-line bg-surface px-3.5 py-2.5 text-sm outline-none transition focus:border-gold focus:ring-2 focus:ring-gold/20 disabled:bg-background disabled:text-muted";

  return (
    <section className="rounded-xl border border-line bg-surface p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <MapPin className="h-5 w-5 text-gold-strong" />
          <h2 className="font-display text-2xl">{datos.nombre || "Sucursal"}</h2>
          {actual && (
            <span className="rounded-full bg-gold/15 px-2.5 py-0.5 text-[10px] uppercase tracking-[0.15em] text-gold-strong">
              Sucursal actual
            </span>
          )}
        </div>
        {editable ? (
          <IndicadorGuardado
            estado={guardadoDatos.estado === "sin-cambios" ? guardadoHorario.estado : guardadoDatos.estado}
            error={guardadoDatos.error ?? guardadoHorario.error}
          />
        ) : (
          <p className="text-xs text-muted">Solo lectura</p>
        )}
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        {(
          [
            ["nombre", "Nombre", 120],
            ["direccion", "Dirección", 300],
            ["telefono", "Teléfono", 30],
          ] as const
        ).map(([k, etiqueta, max]) => (
          <label key={k} className="block">
            <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.16em] text-muted">
              {etiqueta}
            </span>
            <input
              value={datos[k]}
              maxLength={max}
              disabled={!editable}
              onChange={(e) => setDatos((d) => ({ ...d, [k]: e.target.value }))}
              className={entrada}
            />
          </label>
        ))}
      </div>

      <h3 className="mt-6 text-[11px] font-medium uppercase tracking-[0.16em] text-muted">Horario de atención</h3>
      <div className="mt-2 divide-y divide-line rounded-lg border border-line">
        {dias.map((d, i) => (
          <div key={d.dia_semana} className="flex flex-wrap items-center gap-3 px-4 py-2.5">
            <span className="w-24 text-sm">{DIAS[d.dia_semana]}</span>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={d.abierto}
                disabled={!editable}
                onChange={(e) => cambiarDia(i, { abierto: e.target.checked })}
                className="h-4 w-4 accent-[var(--brand-gold)]"
              />
              {d.abierto ? "Abierto" : "Cerrado"}
            </label>
            {d.abierto && (
              <div className="flex items-center gap-2 text-sm">
                <input
                  type="time"
                  value={d.apertura}
                  disabled={!editable}
                  onChange={(e) => cambiarDia(i, { apertura: e.target.value })}
                  className="rounded-lg border border-line bg-surface px-2 py-1.5 disabled:bg-background"
                  aria-label={`Apertura ${DIAS[d.dia_semana]}`}
                />
                <span className="text-muted">a</span>
                <input
                  type="time"
                  value={d.cierre}
                  disabled={!editable}
                  onChange={(e) => cambiarDia(i, { cierre: e.target.value })}
                  className={`rounded-lg border bg-surface px-2 py-1.5 disabled:bg-background ${
                    d.cierre > d.apertura ? "border-line" : "border-red-400"
                  }`}
                  aria-label={`Cierre ${DIAS[d.dia_semana]}`}
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
