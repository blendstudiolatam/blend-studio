"use client";

import { CalendarDays, House, RotateCcw, Users } from "lucide-react";
import { useState, type CSSProperties } from "react";
import { IndicadorGuardado } from "@/components/ui/indicador-guardado";
import {
  TIPOGRAFIAS_TEXTO,
  TIPOGRAFIAS_TITULOS,
  type TipografiaTexto,
  type TipografiaTitulos,
} from "@/lib/tipografias";
import { useAutoguardado } from "@/lib/use-autoguardado";
import { guardarNegocio } from "../actions";

type Valores = {
  itbms_pct: number;
  color_primario: string;
  color_acento: string;
  color_fondo: string;
  tipografia_titulos: TipografiaTitulos;
  tipografia_texto: TipografiaTexto;
};

const MARCA_PROVISIONAL: Omit<Valores, "itbms_pct"> = {
  color_primario: "#0b0b0b",
  color_acento: "#c9a15b",
  color_fondo: "#f6f1e9",
  tipografia_titulos: "bodoni",
  tipografia_texto: "jost",
};

// Combinaciones sugeridas, inspiradas en el ambiente del salón (nogal, travertino, latón, verde).
const PALETAS = [
  { nombre: "Blend provisional", primario: "#0b0b0b", acento: "#c9a15b", fondo: "#f6f1e9" },
  { nombre: "Nogal y latón", primario: "#2f2119", acento: "#c49a5a", fondo: "#f5efe6" },
  { nombre: "Verde barbería", primario: "#14302a", acento: "#c9a15b", fondo: "#f3efe7" },
  { nombre: "Travertino", primario: "#3a3530", acento: "#b8956a", fondo: "#f8f4ee" },
];

const HEX = /^#[0-9a-fA-F]{6}$/;

export function FormularioPreferencias({
  inicial,
  nombre,
  editable,
}: {
  inicial: Valores;
  nombre: string;
  editable: boolean;
}) {
  const [valores, setValores] = useState(inicial);
  const valido = [valores.color_primario, valores.color_acento, valores.color_fondo].every((c) => HEX.test(c));
  const { estado, error, valoresIniciales } = useAutoguardado(valores, async (v) =>
    valido ? guardarNegocio(v) : { error: "Revisa los colores (formato #RRGGBB)." },
  );

  const set = <K extends keyof Valores>(k: K, v: Valores[K]) => setValores((x) => ({ ...x, [k]: v }));

  const vistaPrevia = {
    "--brand-ink": valores.color_primario,
    "--brand-gold": valores.color_acento,
    "--brand-ivory": valores.color_fondo,
    "--font-titulos": `var(--font-${valores.tipografia_titulos})`,
    "--font-texto": `var(--font-${valores.tipografia_texto})`,
  } as CSSProperties;

  return (
    <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_380px]">
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {editable ? (
            <IndicadorGuardado estado={estado} error={error} />
          ) : (
            <p className="text-sm text-muted">Solo un administrador puede cambiar las preferencias.</p>
          )}
          {editable && (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setValores(valoresIniciales)}
                disabled={JSON.stringify(valores) === JSON.stringify(valoresIniciales)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-1.5 text-xs text-muted transition hover:border-gold hover:text-foreground disabled:opacity-40"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Restablecer
              </button>
              <button
                type="button"
                onClick={() => setValores((v) => ({ ...v, ...MARCA_PROVISIONAL }))}
                className="rounded-lg border border-line bg-surface px-3 py-1.5 text-xs text-muted transition hover:border-gold hover:text-foreground"
              >
                Volver a la marca provisional
              </button>
            </div>
          )}
        </div>

        <Seccion titulo="Moneda e impuesto">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted">Moneda</p>
            <p className="mt-2 text-sm">Dólar (USD), se muestra como <strong className="font-medium">B/.</strong></p>
          </div>
          <label className="block">
            <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted">ITBMS (%)</span>
            <input
              type="number"
              min={0}
              max={100}
              step={0.01}
              value={valores.itbms_pct}
              disabled={!editable}
              onChange={(e) => set("itbms_pct", Math.min(100, Math.max(0, Number(e.target.value) || 0)))}
              className="mt-1.5 block w-32 rounded-lg border border-line bg-surface px-3.5 py-2.5 text-sm outline-none focus:border-gold disabled:bg-background"
            />
            <span className="mt-1 block text-xs text-muted">En Panamá es 7%. Se usará en ventas y facturas.</span>
          </label>
        </Seccion>

        <Seccion titulo="Colores del panel">
          <div className="space-y-3 sm:col-span-2">
            <p className="text-xs text-muted">Combinaciones sugeridas</p>
            <div className="flex flex-wrap gap-2">
              {PALETAS.map((p) => (
                <button
                  key={p.nombre}
                  type="button"
                  disabled={!editable}
                  onClick={() =>
                    setValores((v) => ({ ...v, color_primario: p.primario, color_acento: p.acento, color_fondo: p.fondo }))
                  }
                  className="flex items-center gap-2 rounded-full border border-line bg-surface py-1.5 pl-1.5 pr-3 text-xs hover:border-gold disabled:opacity-50"
                >
                  <span className="flex overflow-hidden rounded-full">
                    {[p.primario, p.acento, p.fondo].map((c) => (
                      <span key={c} className="h-5 w-5" style={{ background: c }} />
                    ))}
                  </span>
                  {p.nombre}
                </button>
              ))}
            </div>
          </div>
          {(
            [
              ["color_primario", "Principal (menú y botones)"],
              ["color_acento", "Acento (detalles)"],
              ["color_fondo", "Fondo"],
            ] as const
          ).map(([k, etiqueta]) => (
            <label key={k} className="block">
              <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted">{etiqueta}</span>
              <div className="mt-1.5 flex items-center gap-2">
                <input
                  type="color"
                  value={HEX.test(valores[k]) ? valores[k] : "#000000"}
                  disabled={!editable}
                  onChange={(e) => set(k, e.target.value)}
                  className="h-10 w-12 cursor-pointer rounded-md border border-line bg-surface p-1 disabled:cursor-default"
                  aria-label={etiqueta}
                />
                <input
                  type="text"
                  value={valores[k]}
                  maxLength={7}
                  disabled={!editable}
                  onChange={(e) => set(k, e.target.value.trim())}
                  className="w-28 rounded-lg border border-line bg-surface px-3 py-2 font-mono text-sm uppercase outline-none focus:border-gold disabled:bg-background"
                />
              </div>
            </label>
          ))}
        </Seccion>

        <Seccion titulo="Tipografía">
          <Opciones
            titulo="Títulos"
            opciones={TIPOGRAFIAS_TITULOS}
            valor={valores.tipografia_titulos}
            editable={editable}
            muestra={nombre}
            onCambio={(v) => set("tipografia_titulos", v as TipografiaTitulos)}
          />
          <Opciones
            titulo="Textos"
            opciones={TIPOGRAFIAS_TEXTO}
            valor={valores.tipografia_texto}
            editable={editable}
            muestra="Agenda de hoy · 12 citas"
            onCambio={(v) => set("tipografia_texto", v as TipografiaTexto)}
          />
        </Seccion>
      </div>

      <aside className="xl:sticky xl:top-20 xl:self-start">
        <p className="mb-3 text-[11px] uppercase tracking-[0.16em] text-muted">Vista previa</p>
        <div style={vistaPrevia} className="overflow-hidden rounded-xl border border-line font-sans shadow-sm">
          <div className="flex h-72">
            <div className="flex w-28 flex-col gap-1 bg-ink p-3 text-[10px] text-ivory/80">
              <p className="mb-2 font-display text-sm text-ivory">{nombre}</p>
              {[
                [House, "Inicio"],
                [CalendarDays, "Agenda"],
                [Users, "Clientes"],
              ].map(([Icono, t], i) => {
                const I = Icono as typeof House;
                return (
                  <span key={t as string} className={`flex items-center gap-1.5 rounded px-1.5 py-1 ${i === 1 ? "bg-ivory/10 text-ivory" : ""}`}>
                    <I className={`h-3 w-3 ${i === 1 ? "text-gold" : ""}`} /> {t as string}
                  </span>
                );
              })}
            </div>
            <div className="flex-1 bg-ivory p-4 text-stone-800">
              <p className="text-[9px] uppercase tracking-[0.25em] text-gold">Blend Studio 1</p>
              <p className="mt-1 font-display text-2xl leading-tight">¡Buen día!</p>
              <div className="mt-3 rounded-lg bg-white p-3 shadow-sm">
                <p className="text-[9px] uppercase tracking-[0.15em] text-stone-500">Citas de hoy</p>
                <p className="font-display text-2xl">12</p>
              </div>
              <span className="mt-3 inline-block rounded-md bg-ink px-3 py-1.5 text-[9px] uppercase tracking-[0.15em] text-ivory">
                Agendar cita
              </span>
            </div>
          </div>
        </div>
        <p className="mt-3 text-xs text-muted">Al guardar, los colores y la tipografía se aplican en toda la app.</p>
      </aside>
    </div>
  );
}

function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-line bg-surface p-5 sm:p-6">
      <h2 className="font-display text-xl">{titulo}</h2>
      <div className="mt-4 grid gap-5 sm:grid-cols-2">{children}</div>
    </section>
  );
}

function Opciones({
  titulo,
  opciones,
  valor,
  editable,
  muestra,
  onCambio,
}: {
  titulo: string;
  opciones: readonly { id: string; nombre: string; descripcion: string }[];
  valor: string;
  editable: boolean;
  muestra: string;
  onCambio: (v: string) => void;
}) {
  return (
    <fieldset className="space-y-2">
      <legend className="mb-1 text-[11px] font-medium uppercase tracking-[0.16em] text-muted">{titulo}</legend>
      {opciones.map((o) => (
        <label
          key={o.id}
          className={`flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2.5 transition ${
            valor === o.id ? "border-gold bg-gold/5" : "border-line hover:border-gold/60"
          }`}
        >
          <input
            type="radio"
            name={titulo}
            checked={valor === o.id}
            disabled={!editable}
            onChange={() => onCambio(o.id)}
            className="mt-1 accent-[var(--brand-gold)]"
          />
          <span>
            <span className="block text-lg leading-tight" style={{ fontFamily: `var(--font-${o.id})` }}>
              {muestra}
            </span>
            <span className="text-xs text-muted">
              {o.nombre} · {o.descripcion}
            </span>
          </span>
        </label>
      ))}
    </fieldset>
  );
}
