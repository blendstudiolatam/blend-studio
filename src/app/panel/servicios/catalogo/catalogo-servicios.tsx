"use client";

import { Globe, Pencil, Plus, Scissors, Search, Trash2 } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { Encabezado, Indicador } from "@/components/panel/encabezado";
import { Boton } from "@/components/ui/boton";
import { Dialogo } from "@/components/ui/dialogo";
import { MensajeError } from "@/components/ui/mensaje-error";
import { Avatar } from "@/components/ui/avatar";
import { urlFotoEmpleado } from "@/lib/empleados";
import { ahorro, dinero, duracion } from "@/lib/formato";
import { cambiarEstadoServicio, eliminarServicio, guardarServicio, type Resultado } from "../actions";

export type Servicio = {
  id: string;
  categoria_id: string;
  nombre: string;
  descripcion: string | null;
  duracion_min: number;
  precio: number;
  precio_descuento: number | null;
  reserva_web: boolean;
  activo: boolean;
};
type Categoria = { id: string; nombre: string; activa: boolean };

type Profesional = { id: string; nombre: string; fotoPath: string | null; color: string };

export function CatalogoServicios({
  categorias,
  servicios,
  profesionales,
  categoriaInicial,
  editable,
}: {
  categorias: Categoria[];
  servicios: Servicio[];
  profesionales: Record<string, Profesional[]>;
  categoriaInicial: string | null;
  editable: boolean;
}) {
  const [busqueda, setBusqueda] = useState("");
  const [filtro, setFiltro] = useState<string | null>(
    categoriaInicial && categorias.some((c) => c.id === categoriaInicial) ? categoriaInicial : null,
  );
  const [soloActivos, setSoloActivos] = useState(false);
  const [editando, setEditando] = useState<Servicio | "nuevo" | null>(null);
  const [resultado, setResultado] = useState<Resultado>();
  const [pendiente, iniciar] = useTransition();

  const visibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return servicios.filter(
      (s) =>
        (!filtro || s.categoria_id === filtro) &&
        (!soloActivos || s.activo) &&
        (!q || s.nombre.toLowerCase().includes(q)),
    );
  }, [servicios, busqueda, filtro, soloActivos]);

  const conDescuento = servicios.filter((s) => s.precio_descuento !== null).length;
  const promedio = servicios.length ? servicios.reduce((s, x) => s + (x.precio_descuento ?? x.precio), 0) / servicios.length : 0;
  const accion = (fn: () => Promise<Resultado>) => iniciar(async () => setResultado(await fn()));

  return (
    <div className="space-y-8">
      <Encabezado
        icono={Scissors}
        titulo="Catálogo de servicios"
        subtitulo="Duración y precios de cada servicio. Precios en dólares (B/.), sin ITBMS."
        accion={
          editable && (
            <button
              type="button"
              onClick={() => setEditando("nuevo")}
              disabled={categorias.length === 0}
              className="inline-flex items-center gap-2 rounded-lg bg-ink px-4 py-2.5 text-xs uppercase tracking-[0.16em] text-ivory hover:bg-ink/85 disabled:opacity-50"
            >
              <Plus className="h-4 w-4" /> Nuevo servicio
            </button>
          )
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Indicador etiqueta="Servicios" valor={String(servicios.length)} />
        <Indicador etiqueta="Activos" valor={String(servicios.filter((s) => s.activo).length)} />
        <Indicador etiqueta="Con descuento" valor={String(conDescuento)} />
        <Indicador etiqueta="Precio promedio" valor={dinero(promedio)} />
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <label className="relative w-full max-w-xs">
            <span className="sr-only">Buscar servicio</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              type="search"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar servicio"
              className="w-full rounded-full border border-line bg-surface py-2 pl-9 pr-4 text-sm outline-none focus:border-gold"
            />
          </label>
          <label className="flex items-center gap-2 text-sm text-muted">
            <input
              type="checkbox"
              checked={soloActivos}
              onChange={(e) => setSoloActivos(e.target.checked)}
              className="h-4 w-4 accent-[var(--brand-gold)]"
            />
            Solo activos
          </label>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {[{ id: null, nombre: "Todas" }, ...categorias].map((c) => (
            <button
              key={c.id ?? "todas"}
              type="button"
              onClick={() => setFiltro(c.id)}
              className={`rounded-full border px-3 py-1 text-xs transition ${
                filtro === c.id ? "border-ink bg-ink text-ivory" : "border-line bg-surface text-muted hover:text-foreground"
              }`}
            >
              {c.nombre}
            </button>
          ))}
        </div>
      </div>

      {resultado?.ok && <p className="text-sm text-emerald-700" role="status">{resultado.ok}</p>}
      <MensajeError>{resultado?.error}</MensajeError>
      <p className="text-xs text-muted">Quién realiza cada servicio se asigna en Personal → Empleados.</p>

      <div className={`space-y-6 ${pendiente ? "opacity-60" : ""}`}>
        {categorias
          .filter((c) => !filtro || c.id === filtro)
          .map((c) => {
            const lista = visibles.filter((s) => s.categoria_id === c.id);
            if (lista.length === 0 && (busqueda || soloActivos)) return null;
            return (
              <section key={c.id} className="overflow-hidden rounded-xl border border-line bg-surface">
                <h2 className="flex items-baseline justify-between border-b border-line px-5 py-3">
                  <span className="font-display text-xl">{c.nombre}</span>
                  <span className="text-xs text-muted">{lista.length} servicios</span>
                </h2>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[820px] text-left text-sm">
                    <thead className="text-[11px] uppercase tracking-[0.12em] text-muted">
                      <tr>
                        <th className="px-5 py-2.5 font-medium">Servicio</th>
                        <th className="px-3 py-2.5 font-medium">Duración</th>
                        <th className="px-3 py-2.5 text-right font-medium">Precio de lista</th>
                        <th className="px-3 py-2.5 text-right font-medium">Con descuento</th>
                        <th className="px-3 py-2.5 text-right font-medium">Ahorro</th>
                        <th className="px-3 py-2.5 font-medium">Lo realiza</th>
                        <th className="px-3 py-2.5 font-medium">Reserva web</th>
                        <th className="px-3 py-2.5 font-medium">Estado</th>
                        {editable && <th className="px-5 py-2.5" />}
                      </tr>
                    </thead>
                    <tbody>
                      {lista.map((s) => {
                        const pct = ahorro(s.precio, s.precio_descuento);
                        return (
                          <tr key={s.id} className={`border-t border-line ${s.activo ? "" : "text-muted"}`}>
                            <td className="px-5 py-2.5">
                              <p className="font-medium">{s.nombre}</p>
                              {s.descripcion && <p className="text-xs text-muted">{s.descripcion}</p>}
                            </td>
                            <td className="px-3 py-2.5 whitespace-nowrap">{duracion(s.duracion_min)}</td>
                            <td className={`px-3 py-2.5 text-right whitespace-nowrap ${pct ? "text-muted line-through" : ""}`}>
                              {dinero(s.precio)}
                            </td>
                            <td className="px-3 py-2.5 text-right whitespace-nowrap">
                              {s.precio_descuento !== null ? dinero(s.precio_descuento) : "—"}
                            </td>
                            <td className="px-3 py-2.5 text-right">
                              {pct ? (
                                <span className="rounded-full bg-gold/15 px-2 py-0.5 text-xs text-gold-strong">−{pct}%</span>
                              ) : (
                                "—"
                              )}
                            </td>
                            <td className="px-3 py-2.5">
                              <div className="flex -space-x-2" title={(profesionales[s.id] ?? []).map((p) => p.nombre).join(", ")}>
                                {(profesionales[s.id] ?? []).slice(0, 4).map((p) => (
                                  <Avatar key={p.id} nombre={p.nombre} foto={urlFotoEmpleado(p.fotoPath)} tamano={26} className="ring-2 ring-surface" />
                                ))}
                                {!profesionales[s.id]?.length && <span className="text-xs text-muted">Sin asignar</span>}
                              </div>
                            </td>
                            <td className="px-3 py-2.5">
                              <button
                                type="button"
                                disabled={!editable || pendiente}
                                onClick={() => accion(() => cambiarEstadoServicio(s.id, "reserva_web", !s.reserva_web))}
                                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs disabled:cursor-default ${
                                  s.reserva_web ? "bg-emerald-50 text-emerald-800" : "bg-stone-100 text-stone-500"
                                }`}
                                title="Se puede reservar desde la página web"
                              >
                                <Globe className="h-3 w-3" /> {s.reserva_web ? "Sí" : "No"}
                              </button>
                            </td>
                            <td className="px-3 py-2.5">
                              <button
                                type="button"
                                disabled={!editable || pendiente}
                                onClick={() => accion(() => cambiarEstadoServicio(s.id, "activo", !s.activo))}
                                className={`rounded-full px-2 py-0.5 text-xs disabled:cursor-default ${
                                  s.activo ? "bg-emerald-50 text-emerald-800" : "bg-stone-100 text-stone-500"
                                }`}
                              >
                                {s.activo ? "Activo" : "Inactivo"}
                              </button>
                            </td>
                            {editable && (
                              <td className="px-5 py-2.5">
                                <div className="flex justify-end gap-1">
                                  <button
                                    type="button"
                                    onClick={() => setEditando(s)}
                                    aria-label={`Editar ${s.nombre}`}
                                    className="rounded-lg p-1.5 text-muted hover:bg-background hover:text-foreground"
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (confirm(`¿Eliminar "${s.nombre}"? Si ya tiene citas, mejor desactívalo.`))
                                        accion(() => eliminarServicio(s.id));
                                    }}
                                    aria-label={`Eliminar ${s.nombre}`}
                                    className="rounded-lg p-1.5 text-muted hover:bg-background hover:text-red-700"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                              </td>
                            )}
                          </tr>
                        );
                      })}
                      {lista.length === 0 && (
                        <tr>
                          <td colSpan={9} className="px-5 py-6 text-center text-sm text-muted">
                            Sin servicios en esta categoría.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            );
          })}
      </div>

      <Dialogo
        abierto={editando !== null}
        onCerrar={() => setEditando(null)}
        titulo={editando === "nuevo" ? "Nuevo servicio" : "Editar servicio"}
      >
        {editando !== null && (
          <FormularioServicio
            servicio={editando === "nuevo" ? null : editando}
            categorias={categorias}
            categoriaPorDefecto={filtro ?? categorias[0]?.id ?? ""}
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

const DURACIONES = [10, 15, 20, 30, 40, 45, 50, 60, 75, 90, 120, 150, 180, 240];

function FormularioServicio({
  servicio,
  categorias,
  categoriaPorDefecto,
  alGuardar,
}: {
  servicio: Servicio | null;
  categorias: Categoria[];
  categoriaPorDefecto: string;
  alGuardar: (r: Resultado) => void;
}) {
  const [v, setV] = useState({
    categoria_id: servicio?.categoria_id ?? categoriaPorDefecto,
    nombre: servicio?.nombre ?? "",
    descripcion: servicio?.descripcion ?? "",
    duracion_min: servicio?.duracion_min ?? 30,
    precio: servicio ? String(servicio.precio) : "",
    precio_descuento: servicio?.precio_descuento != null ? String(servicio.precio_descuento) : "",
    reserva_web: servicio?.reserva_web ?? true,
    activo: servicio?.activo ?? true,
  });
  const [error, setError] = useState<string>();
  const [pendiente, iniciar] = useTransition();
  const pct = ahorro(Number(v.precio), v.precio_descuento === "" ? null : Number(v.precio_descuento));
  const set = <K extends keyof typeof v>(k: K, valor: (typeof v)[K]) => setV((x) => ({ ...x, [k]: valor }));
  const entrada =
    "block w-full rounded-lg border border-line bg-surface px-3.5 py-2.5 text-sm outline-none focus:border-gold";
  const etiqueta = "mb-1.5 block text-[11px] font-medium uppercase tracking-[0.16em] text-muted";

  return (
    <form
      className="grid gap-4 sm:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        iniciar(async () => {
          const r = await guardarServicio(servicio?.id ?? null, v);
          setError(r?.error);
          alGuardar(r);
        });
      }}
    >
      <label className="block sm:col-span-2">
        <span className={etiqueta}>Nombre</span>
        <input value={v.nombre} onChange={(e) => set("nombre", e.target.value)} required maxLength={120} className={entrada} />
      </label>
      <label className="block">
        <span className={etiqueta}>Categoría</span>
        <select value={v.categoria_id} onChange={(e) => set("categoria_id", e.target.value)} className={entrada}>
          {categorias.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nombre}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className={etiqueta}>Duración</span>
        <select value={v.duracion_min} onChange={(e) => set("duracion_min", Number(e.target.value))} className={entrada}>
          {[...new Set([...DURACIONES, v.duracion_min])]
            .sort((a, b) => a - b)
            .map((d) => (
              <option key={d} value={d}>
                {duracion(d)}
              </option>
            ))}
        </select>
      </label>
      <label className="block">
        <span className={etiqueta}>Precio de lista (B/.)</span>
        <input
          type="number"
          min={0}
          step={0.01}
          value={v.precio}
          onChange={(e) => set("precio", e.target.value)}
          required
          className={entrada}
        />
      </label>
      <label className="block">
        <span className={etiqueta}>Precio con descuento (opcional)</span>
        <input
          type="number"
          min={0}
          step={0.01}
          value={v.precio_descuento}
          onChange={(e) => set("precio_descuento", e.target.value)}
          className={entrada}
        />
        {pct && <span className="mt-1 block text-xs text-gold-strong">Ahorro del {pct}%</span>}
      </label>
      <label className="block sm:col-span-2">
        <span className={etiqueta}>Descripción (opcional)</span>
        <textarea
          value={v.descripcion}
          onChange={(e) => set("descripcion", e.target.value)}
          maxLength={500}
          rows={2}
          className={entrada}
        />
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={v.reserva_web}
          onChange={(e) => set("reserva_web", e.target.checked)}
          className="h-4 w-4 accent-[var(--brand-gold)]"
        />
        Se puede reservar en la web
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={v.activo}
          onChange={(e) => set("activo", e.target.checked)}
          className="h-4 w-4 accent-[var(--brand-gold)]"
        />
        Activo
      </label>
      <div className="sm:col-span-2">
        <MensajeError>{error}</MensajeError>
      </div>
      <div className="sm:col-span-2">
        <Boton type="submit" cargando={pendiente}>
          Guardar
        </Boton>
      </div>
    </form>
  );
}
