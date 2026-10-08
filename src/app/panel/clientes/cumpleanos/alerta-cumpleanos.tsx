"use client";

import { CakeSlice, Download, MessageCircle } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Encabezado, Indicador } from "@/components/panel/encabezado";
import { Avatar } from "@/components/ui/avatar";
import { fechaLarga } from "@/lib/agenda";
import { codigoCliente, enlaceWhatsApp } from "@/lib/clientes";

export type FiltroCumple = "hoy" | "semana" | "mes" | "personalizado";
export type Cumpleanero = {
  id: string;
  codigo: number;
  nombre: string;
  telefono: string | null;
  email: string | null;
  cumple: string;
  edad: number;
  foto: string | null;
  aceptaMensajes: boolean;
};

const FILTROS: { id: FiltroCumple; nombre: string }[] = [
  { id: "hoy", nombre: "Hoy" },
  { id: "semana", nombre: "Esta semana" },
  { id: "mes", nombre: "Este mes" },
  { id: "personalizado", nombre: "Personalizado" },
];

const PLANTILLA =
  "¡Feliz cumpleaños, {nombre}! 🎉 Todo el equipo de {salon} te desea un día increíble. Como regalo, tienes {regalo} en tu próxima visita este mes. ¡Te esperamos!";

export function AlertaCumpleanos({
  lista,
  filtro,
  desde,
  hasta,
  hoy,
  salon,
  puedeExportar,
}: {
  lista: Cumpleanero[];
  filtro: FiltroCumple;
  desde: string;
  hasta: string;
  hoy: string;
  salon: string;
  puedeExportar: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [plantilla, setPlantilla] = useState(PLANTILLA);
  const [regalo, setRegalo] = useState("10% de descuento");
  const [rango, setRango] = useState({ desde, hasta });

  const ir = (f: FiltroCumple, r = rango) => {
    const p = new URLSearchParams({ filtro: f });
    if (f === "personalizado") {
      p.set("desde", r.desde);
      p.set("hasta", r.hasta);
    }
    router.push(`${pathname}?${p}`);
  };

  const mensaje = (c: Cumpleanero) =>
    plantilla.replaceAll("{nombre}", c.nombre.split(" ")[0]).replaceAll("{salon}", salon).replaceAll("{regalo}", regalo || "una sorpresa");

  const exportar = () => {
    const filas = [["Código", "Cliente", "Cumpleaños", "Edad que cumple", "Teléfono", "Correo"]];
    for (const c of lista) filas.push([codigoCliente(c.codigo), c.nombre, c.cumple, String(c.edad), c.telefono ?? "", c.email ?? ""]);
    const seguro = (v: string) => {
      const t = /^[=@\t\r]/.test(v) || (/^[+-]/.test(v) && !/^[+-][\d\s()-]+$/.test(v)) ? `'${v}` : v;
      return /[",;\n\r]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
    };
    const csv = "\uFEFF" + filas.map((f) => f.map(seguro).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `cumpleanos-${desde}-a-${hasta}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const deHoy = lista.filter((c) => c.cumple === hoy).length;

  return (
    <div className="space-y-8">
      <Encabezado
        icono={CakeSlice}
        titulo="Alerta de cumpleaños"
        subtitulo="Saluda a tus clientes en su día y regálales un detalle."
        accion={
          puedeExportar &&
          lista.length > 0 && (
            <button
              type="button"
              onClick={exportar}
              className="inline-flex items-center gap-2 rounded-lg border border-line bg-surface px-3.5 py-2.5 text-xs uppercase tracking-[0.14em] hover:border-gold"
            >
              <Download className="h-4 w-4" /> Exportar
            </button>
          )
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <Indicador etiqueta="Cumplen hoy" valor={String(deHoy)} />
        <Indicador etiqueta="En el periodo" valor={String(lista.length)} detalle={`${fechaLarga(desde)} al ${fechaLarga(hasta)}`} />
        <Indicador etiqueta="Aceptan mensajes" valor={String(lista.filter((c) => c.aceptaMensajes).length)} detalle="Recordatorios por WhatsApp activos" />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-1.5">
          {FILTROS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => ir(f.id)}
              className={`rounded-full border px-3 py-1 text-xs transition ${
                filtro === f.id ? "border-ink bg-ink text-ivory" : "border-line bg-surface text-muted hover:text-foreground"
              }`}
            >
              {f.nombre}
            </button>
          ))}
        </div>
        {filtro === "personalizado" && (
          <form
            className="flex flex-wrap items-center gap-2 text-sm"
            onSubmit={(e) => {
              e.preventDefault();
              ir("personalizado");
            }}
          >
            <input type="date" value={rango.desde} onChange={(e) => setRango((r) => ({ ...r, desde: e.target.value }))} className="rounded-lg border border-line bg-surface px-2 py-1" />
            <span className="text-muted">al</span>
            <input type="date" value={rango.hasta} onChange={(e) => setRango((r) => ({ ...r, hasta: e.target.value }))} className="rounded-lg border border-line bg-surface px-2 py-1" />
            <button type="submit" className="rounded-lg bg-ink px-3 py-1 text-xs text-ivory">
              Ver
            </button>
          </form>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div>
          {lista.length === 0 ? (
            <p className="rounded-xl border border-dashed border-line py-14 text-center text-sm text-muted">Nadie cumple años en este periodo.</p>
          ) : (
            <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
              {lista.map((c) => {
                const wa = c.aceptaMensajes ? enlaceWhatsApp(c.telefono) : null;
                return (
                  <li key={`${c.id}-${c.cumple}`} className="flex flex-wrap items-center gap-4 px-4 py-3">
                    <Avatar nombre={c.nombre} foto={c.foto} tamano={44} privada />
                    <div className="min-w-0 flex-1">
                      <Link href={`/panel/clientes/lista/${c.id}`} className="font-medium hover:underline">
                        {c.nombre}
                      </Link>
                      <p className="text-xs text-muted">
                        {codigoCliente(c.codigo)} · cumple {c.edad} años
                      </p>
                    </div>
                    <span className={`text-sm first-letter:uppercase ${c.cumple === hoy ? "font-medium text-gold-strong" : "text-muted"}`}>
                      {c.cumple === hoy ? "¡Hoy!" : fechaLarga(c.cumple)}
                    </span>
                    {wa ? (
                      <a
                        href={`${wa}?text=${encodeURIComponent(mensaje(c))}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-3 py-1.5 text-xs text-white hover:bg-emerald-800"
                      >
                        <MessageCircle className="h-3.5 w-3.5" /> Felicitar
                      </a>
                    ) : (
                      <span className="text-xs text-muted">{c.aceptaMensajes ? "Sin teléfono" : "No desea mensajes"}</span>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <aside className="h-fit space-y-4 rounded-xl border border-line bg-surface p-5">
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted">Mensaje sugerido</p>
          <textarea
            value={plantilla}
            onChange={(e) => setPlantilla(e.target.value)}
            rows={6}
            maxLength={600}
            className="block w-full rounded-lg border border-line bg-background px-3 py-2 text-sm outline-none focus:border-gold"
          />
          <label className="block text-sm">
            <span className="mb-1 block text-xs text-muted">Regalo o cupón ({"{regalo}"})</span>
            <input
              value={regalo}
              onChange={(e) => setRegalo(e.target.value)}
              maxLength={80}
              placeholder="Ej.: 10% de descuento, código CUMPLE10"
              className="block w-full rounded-lg border border-line bg-background px-3 py-2 outline-none focus:border-gold"
            />
          </label>
          <p className="text-xs text-muted">
            Usa {"{nombre}"}, {"{salon}"} y {"{regalo}"}; se reemplazan solos. El botón «Felicitar» abre WhatsApp con el mensaje listo. El envío
            automático y los cupones del sistema llegan en la Fase 3.
          </p>
          <button type="button" onClick={() => (setPlantilla(PLANTILLA), setRegalo("10% de descuento"))} className="text-xs text-gold-strong hover:underline">
            Restablecer mensaje
          </button>
        </aside>
      </div>
    </div>
  );
}
