"use client";

import { Pencil, Plus, Scissors, Trash2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState, useTransition } from "react";
import { Encabezado, Indicador } from "@/components/panel/encabezado";
import { Boton } from "@/components/ui/boton";
import { Dialogo } from "@/components/ui/dialogo";
import { MensajeError } from "@/components/ui/mensaje-error";
import { FOTOS_AMBIENTE, urlAmbiente } from "@/lib/ambiente";
import { eliminarCategoria, guardarCategoria, type Resultado } from "../actions";

export type Categoria = {
  id: string;
  nombre: string;
  descripcion: string | null;
  imagen: string | null;
  activa: boolean;
  servicios: number;
};

export function GestorCategorias({ categorias, editable }: { categorias: Categoria[]; editable: boolean }) {
  const [editando, setEditando] = useState<Categoria | "nueva" | null>(null);
  const [resultado, setResultado] = useState<Resultado>();
  const [pendiente, iniciar] = useTransition();

  const accion = (fn: () => Promise<Resultado>) => iniciar(async () => setResultado(await fn()));

  return (
    <div className="space-y-8">
      <Encabezado
        icono={Scissors}
        titulo="Categorías"
        subtitulo="Agrupa los servicios del salón. Cada categoría puede tener su foto."
        accion={
          editable && (
            <button
              type="button"
              onClick={() => setEditando("nueva")}
              className="inline-flex items-center gap-2 rounded-lg bg-ink px-4 py-2.5 text-xs uppercase tracking-[0.16em] text-ivory hover:bg-ink/85"
            >
              <Plus className="h-4 w-4" /> Nueva categoría
            </button>
          )
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Indicador etiqueta="Categorías" valor={String(categorias.length)} />
        <Indicador etiqueta="Servicios en catálogo" valor={String(categorias.reduce((s, c) => s + c.servicios, 0))} />
        <Indicador etiqueta="Categorías activas" valor={String(categorias.filter((c) => c.activa).length)} />
        <Indicador etiqueta="Sin servicios" valor={String(categorias.filter((c) => c.servicios === 0).length)} />
      </div>

      {resultado?.ok && <p className="text-sm text-emerald-700" role="status">{resultado.ok}</p>}
      <MensajeError>{resultado?.error}</MensajeError>

      <ul className={`grid gap-5 sm:grid-cols-2 xl:grid-cols-3 ${pendiente ? "opacity-60" : ""}`}>
        {categorias.map((c) => (
          <li key={c.id} className="group overflow-hidden rounded-xl border border-line bg-surface">
            <div className="relative aspect-[16/9] overflow-hidden bg-ink">
              <Image
                src={urlAmbiente(c.imagen)}
                alt=""
                fill
                sizes="(min-width: 1280px) 33vw, (min-width: 640px) 50vw, 100vw"
                className={`object-cover transition duration-500 group-hover:scale-105 ${c.activa ? "" : "grayscale"}`}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-ink/80 via-ink/10 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 flex items-end justify-between p-4 text-ivory">
                <h2 className="font-display text-2xl leading-none">{c.nombre}</h2>
                <span className="text-xs text-ivory/80">
                  {c.servicios} {c.servicios === 1 ? "servicio" : "servicios"}
                </span>
              </div>
              {!c.activa && (
                <span className="absolute left-3 top-3 rounded-full bg-ivory/90 px-2.5 py-0.5 text-[10px] uppercase tracking-[0.15em] text-ink">
                  Inactiva
                </span>
              )}
            </div>
            <div className="flex items-start justify-between gap-3 p-4">
              <p className="text-sm text-muted">{c.descripcion || "Sin descripción."}</p>
              <div className="flex shrink-0 gap-1">
                <Link
                  href={`/panel/servicios/catalogo?categoria=${c.id}`}
                  className="rounded-lg px-2.5 py-1.5 text-xs text-muted hover:bg-background hover:text-foreground"
                >
                  Ver servicios
                </Link>
                {editable && (
                  <>
                    <button
                      type="button"
                      onClick={() => setEditando(c)}
                      aria-label={`Editar ${c.nombre}`}
                      className="rounded-lg p-1.5 text-muted hover:bg-background hover:text-foreground"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    {c.servicios === 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`¿Eliminar la categoría "${c.nombre}"?`)) accion(() => eliminarCategoria(c.id));
                        }}
                        aria-label={`Eliminar ${c.nombre}`}
                        className="rounded-lg p-1.5 text-muted hover:bg-background hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>

      <Dialogo
        abierto={editando !== null}
        onCerrar={() => setEditando(null)}
        titulo={editando === "nueva" ? "Nueva categoría" : "Editar categoría"}
      >
        {editando !== null && (
          <FormularioCategoria
            categoria={editando === "nueva" ? null : editando}
            alGuardar={(r) => {
              setResultado(r);
              if (r?.ok) setEditando(null);
            }}
          />
        )}
      </Dialogo>
    </div>
  );
}

function FormularioCategoria({
  categoria,
  alGuardar,
}: {
  categoria: Categoria | null;
  alGuardar: (r: Resultado) => void;
}) {
  const [nombre, setNombre] = useState(categoria?.nombre ?? "");
  const [descripcion, setDescripcion] = useState(categoria?.descripcion ?? "");
  const [imagen, setImagen] = useState<string | null>(categoria?.imagen ?? null);
  const [activa, setActiva] = useState(categoria?.activa ?? true);
  const [error, setError] = useState<string>();
  const [pendiente, iniciar] = useTransition();

  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        iniciar(async () => {
          const r = await guardarCategoria(categoria?.id ?? null, { nombre, descripcion, imagen, activa });
          setError(r?.error);
          alGuardar(r);
        });
      }}
    >
      <label className="block">
        <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.16em] text-muted">Nombre</span>
        <input
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          required
          maxLength={60}
          className="block w-full rounded-lg border border-line bg-surface px-3.5 py-2.5 text-sm outline-none focus:border-gold"
        />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.16em] text-muted">Descripción</span>
        <textarea
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          maxLength={300}
          rows={2}
          className="block w-full rounded-lg border border-line bg-surface px-3.5 py-2.5 text-sm outline-none focus:border-gold"
        />
      </label>
      <fieldset>
        <legend className="mb-2 text-[11px] font-medium uppercase tracking-[0.16em] text-muted">Foto</legend>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {FOTOS_AMBIENTE.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setImagen(f.id)}
              aria-pressed={imagen === f.id}
              title={f.nombre}
              className={`relative aspect-[4/3] overflow-hidden rounded-lg ring-2 transition ${
                imagen === f.id ? "ring-gold" : "ring-transparent hover:ring-gold/40"
              }`}
            >
              <Image src={`/ambiente/${f.id}.webp`} alt={f.nombre} fill sizes="120px" className="object-cover" />
            </button>
          ))}
        </div>
      </fieldset>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={activa}
          onChange={(e) => setActiva(e.target.checked)}
          className="h-4 w-4 accent-[var(--brand-gold)]"
        />
        Categoría activa (visible en la agenda y en las reservas web)
      </label>
      <MensajeError>{error}</MensajeError>
      <Boton type="submit" cargando={pendiente}>
        Guardar
      </Boton>
    </form>
  );
}
