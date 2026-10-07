"use client";

import { FileText, Image as ImageIcon, Lock, Trash2, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { Boton } from "@/components/ui/boton";
import { MensajeError } from "@/components/ui/mensaje-error";
import { abrirDocumento, eliminarDocumento, subirDocumento } from "../../salud-actions";

type Categoria = "consentimiento" | "estudio" | "antes_despues" | "receta" | "identificacion" | "otro";

export type Documento = {
  id: string;
  categoria: Categoria;
  nombre: string;
  tipo: string;
  tamano: number;
  subidoPor: string | null;
  fecha: string;
};

const CATEGORIAS: { id: Categoria; nombre: string }[] = [
  { id: "consentimiento", nombre: "Consentimientos" },
  { id: "antes_despues", nombre: "Fotos antes / después" },
  { id: "estudio", nombre: "Estudios" },
  { id: "receta", nombre: "Recetas" },
  { id: "identificacion", nombre: "Identificación" },
  { id: "otro", nombre: "Otros" },
];

const peso = (b: number) => (b < 1024 * 1024 ? `${Math.max(1, Math.round(b / 1024))} KB` : `${(b / 1024 / 1024).toFixed(1)} MB`);
const entrada = "block w-full rounded-lg border border-line bg-surface px-3.5 py-2.5 text-sm outline-none focus:border-gold";
const etiqueta = "mb-1.5 block text-[11px] font-medium uppercase tracking-[0.16em] text-muted";

export function DocumentosCliente({
  clienteId,
  documentos,
  editable,
  planes,
}: {
  clienteId: string;
  documentos: Documento[];
  editable: boolean;
  planes: { id: string; procedimiento: string }[];
}) {
  const [categoria, setCategoria] = useState<Categoria>("consentimiento");
  const router = useRouter();
  const [error, setError] = useState<string>();
  const [ok, setOk] = useState<string>();
  const [borrando, setBorrando] = useState<string | null>(null);
  const [pendiente, iniciar] = useTransition();
  const formulario = useRef<HTMLFormElement>(null);

  const abrir = (d: Documento) => {
    // Se abre la pestaña antes de esperar al servidor para que el navegador no la bloquee.
    const ventana = window.open("", "_blank");
    iniciar(async () => {
      const r = await abrirDocumento(d.id);
      if (r?.url && ventana) ventana.location.href = r.url;
      else {
        ventana?.close();
        setError(r?.error ?? "No se pudo abrir el documento.");
      }
    });
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
      <div className="space-y-6">
        <MensajeError>{error}</MensajeError>
        {documentos.length === 0 && (
          <p className="rounded-xl border border-dashed border-line py-14 text-center text-sm text-muted">Este cliente aún no tiene documentos.</p>
        )}
        {CATEGORIAS.map((c) => {
          const lista = documentos.filter((d) => d.categoria === c.id);
          if (!lista.length) return null;
          return (
            <section key={c.id} className="overflow-hidden rounded-xl border border-line bg-surface">
              <h3 className="border-b border-line px-5 py-3 font-display text-lg">
                {c.nombre} <span className="text-sm text-muted">({lista.length})</span>
              </h3>
              <ul className="divide-y divide-line">
                {lista.map((d) => {
                  const Icono = d.tipo === "application/pdf" ? FileText : ImageIcon;
                  return (
                    <li key={d.id} className="flex flex-wrap items-center gap-3 px-5 py-3 text-sm">
                      <Icono className="h-5 w-5 shrink-0 text-gold-strong" />
                      <button type="button" onClick={() => abrir(d)} disabled={pendiente} className="min-w-0 flex-1 text-left hover:underline">
                        <span className="block truncate">{d.nombre}</span>
                        <span className="block text-xs text-muted">
                          {d.tipo === "application/pdf" ? "PDF" : "Imagen"} · {peso(d.tamano)} ·{" "}
                          {new Date(d.fecha).toLocaleDateString("es-PA", { timeZone: "America/Panama" })}
                          {d.subidoPor && ` · ${d.subidoPor}`}
                        </span>
                      </button>
                      {editable &&
                        (borrando === d.id ? (
                          <span className="flex items-center gap-2 text-xs">
                            <button
                              type="button"
                              disabled={pendiente}
                              onClick={() =>
                                iniciar(async () => {
                                  const r = await eliminarDocumento(clienteId, d.id);
                                  setError(r?.error);
                                  setBorrando(null);
                                  if (r?.ok) router.refresh();
                                })
                              }
                              className="rounded-md bg-red-700 px-2.5 py-1 text-white"
                            >
                              Borrar
                            </button>
                            <button type="button" onClick={() => setBorrando(null)} className="text-muted hover:underline">
                              No
                            </button>
                          </span>
                        ) : (
                          <button type="button" onClick={() => setBorrando(d.id)} className="rounded-md p-1.5 text-muted hover:text-red-700" aria-label={`Eliminar ${d.nombre}`}>
                            <Trash2 className="h-4 w-4" />
                          </button>
                        ))}
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>

      <aside className="space-y-4">
        {editable && (
          <form
            ref={formulario}
            className="space-y-4 rounded-xl border border-line bg-surface p-5"
            action={(fd) =>
              iniciar(async () => {
                const r = await subirDocumento(clienteId, fd);
                setError(r?.error);
                setOk(r?.ok);
                if (r?.ok) {
                  formulario.current?.reset();
                  setCategoria("consentimiento");
                  router.refresh();
                }
              })
            }
          >
            <h3 className="font-display text-xl">Subir documento</h3>
            <label className="block">
              <span className={etiqueta}>Categoría</span>
              <select name="categoria" value={categoria} onChange={(e) => setCategoria(e.target.value as Categoria)} className={entrada}>
                {CATEGORIAS.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
              </select>
            </label>
            {categoria === "antes_despues" && planes.length > 0 && (
              <label className="block">
                <span className={etiqueta}>Plan de tratamiento</span>
                <select name="plan_id" defaultValue={planes[0].id} className={entrada}>
                  <option value="">Ninguno</option>
                  {planes.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.procedimiento}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label className="block">
              <span className={etiqueta}>Nombre</span>
              <input name="nombre" required maxLength={120} placeholder="Ej.: Consentimiento facial" className={entrada} />
            </label>
            <label className="block">
              <span className={etiqueta}>Archivo (PDF o foto, máx. 8 MB)</span>
              <input
                name="archivo"
                type="file"
                required
                accept="application/pdf,image/png,image/jpeg,image/webp"
                className="block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-ink file:px-3 file:py-1.5 file:text-xs file:text-ivory"
              />
            </label>
            {ok && <p className="text-sm text-emerald-700">{ok}</p>}
            <Boton type="submit" cargando={pendiente}>
              <Upload className="h-4 w-4" /> Subir
            </Boton>
          </form>
        )}
        <div className="flex items-start gap-2 rounded-xl border border-line bg-surface p-4 text-xs text-muted">
          <Lock className="h-4 w-4 shrink-0 text-gold-strong" />
          <p>
            Los archivos se guardan en un almacenamiento privado. Cada vez que alguien abre uno se genera un enlace que vence en 5
            minutos y queda registrado quién lo vio.
          </p>
        </div>
      </aside>
    </div>
  );
}
