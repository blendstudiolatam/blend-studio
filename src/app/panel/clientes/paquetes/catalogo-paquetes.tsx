"use client";

import { Layers, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Encabezado, Indicador } from "@/components/panel/encabezado";
import { Boton } from "@/components/ui/boton";
import { Dialogo } from "@/components/ui/dialogo";
import { MensajeError } from "@/components/ui/mensaje-error";
import { ahorro, dinero } from "@/lib/formato";
import { frecuencia } from "@/lib/tratamientos";
import { eliminarPaquete, guardarPaquete } from "../tratamientos-actions";

export type Paquete = {
  id: string;
  servicio_id: string | null;
  nombre: string;
  descripcion: string | null;
  sesiones: number;
  frecuencia_dias: number;
  precio_sesion: number;
  precio_total: number;
  activo: boolean;
  planesActivos: number;
};

const entrada = "block w-full rounded-lg border border-line bg-surface px-3.5 py-2.5 text-sm outline-none focus:border-gold";
const etiqueta = "mb-1.5 block text-[11px] font-medium uppercase tracking-[0.16em] text-muted";

export function CatalogoPaquetes({
  paquetes,
  servicios,
  editable,
}: {
  paquetes: Paquete[];
  servicios: { id: string; nombre: string }[];
  editable: boolean;
}) {
  const [editando, setEditando] = useState<Paquete | "nuevo" | null>(null);
  const activos = paquetes.filter((p) => p.activo);
  const enUso = paquetes.reduce((s, p) => s + p.planesActivos, 0);
  const ahorros = activos.map((p) => ahorro(p.sesiones * p.precio_sesion, p.precio_total)).filter((a): a is number => a !== null);

  return (
    <div className="space-y-8">
      <Encabezado
        icono={Layers}
        titulo="Catálogo de paquetes"
        subtitulo="Paquetes de varias sesiones para vender como plan de tratamiento."
        accion={
          editable && (
            <button
              type="button"
              onClick={() => setEditando("nuevo")}
              className="inline-flex items-center gap-2 rounded-lg bg-ink px-4 py-2.5 text-xs uppercase tracking-[0.16em] text-ivory hover:bg-ink/85"
            >
              <Plus className="h-4 w-4" /> Nuevo paquete
            </button>
          )
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Indicador etiqueta="Paquetes" valor={String(paquetes.length)} />
        <Indicador etiqueta="Activos" valor={String(activos.length)} />
        <Indicador etiqueta="Planes activos" valor={String(enUso)} detalle="Clientes usando un paquete" />
        <Indicador
          etiqueta="Ahorro promedio"
          valor={ahorros.length ? `${Math.round(ahorros.reduce((a, b) => a + b, 0) / ahorros.length)}%` : "—"}
          detalle="Frente a pagar sesión por sesión"
        />
      </div>

      {paquetes.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line py-14 text-center text-sm text-muted">Aún no hay paquetes.</p>
      ) : (
        <ul className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {paquetes.map((p) => {
            const lista = p.sesiones * p.precio_sesion;
            const pct = ahorro(lista, p.precio_total);
            return (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => editable && setEditando(p)}
                  className={`block h-full w-full rounded-xl border border-line bg-surface p-5 text-left transition ${editable ? "hover:border-gold" : "cursor-default"} ${p.activo ? "" : "opacity-60"}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-display text-xl leading-tight">{p.nombre}</p>
                    {!p.activo && <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[10px] uppercase text-stone-500">Inactivo</span>}
                  </div>
                  {p.descripcion && <p className="mt-1 line-clamp-2 text-sm text-muted">{p.descripcion}</p>}
                  <p className="mt-3 text-sm">
                    {p.sesiones} sesiones · {frecuencia(p.frecuencia_dias).toLowerCase()}
                  </p>
                  <div className="mt-3 flex items-end justify-between gap-2">
                    <div>
                      <p className="text-xs text-muted">{dinero(p.precio_sesion)} por sesión</p>
                      <p className="font-display text-2xl">{dinero(p.precio_total)}</p>
                      {pct !== null && (
                        <p className="text-xs text-emerald-700">
                          Ahorra {pct}% <span className="text-muted line-through">{dinero(lista)}</span>
                        </p>
                      )}
                    </div>
                    {p.planesActivos > 0 && (
                      <span className="rounded-full bg-background px-2 py-0.5 text-[11px] text-muted">
                        {p.planesActivos} {p.planesActivos === 1 ? "plan activo" : "planes activos"}
                      </span>
                    )}
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <Dialogo
        abierto={editando !== null}
        onCerrar={() => setEditando(null)}
        titulo={editando === "nuevo" ? "Nuevo paquete" : "Editar paquete"}
        ancho="max-w-xl"
      >
        {editando && (
          <FormularioPaquete
            key={editando === "nuevo" ? "nuevo" : editando.id}
            paquete={editando === "nuevo" ? null : editando}
            servicios={servicios}
            onListo={() => setEditando(null)}
          />
        )}
      </Dialogo>
    </div>
  );
}

function FormularioPaquete({
  paquete,
  servicios,
  onListo,
}: {
  paquete: Paquete | null;
  servicios: { id: string; nombre: string }[];
  onListo: () => void;
}) {
  const router = useRouter();
  const [error, setError] = useState<string>();
  const [pendiente, iniciar] = useTransition();
  const [sesiones, setSesiones] = useState(paquete?.sesiones ?? 6);
  const [precioSesion, setPrecioSesion] = useState(paquete?.precio_sesion ?? 0);
  const [total, setTotal] = useState(paquete?.precio_total ?? 0);
  const lista = sesiones * precioSesion;
  const pct = ahorro(lista, total);

  return (
    <form
      className="grid gap-4 sm:grid-cols-2"
      action={(fd) =>
        iniciar(async () => {
          const r = await guardarPaquete(paquete?.id ?? null, {
            nombre: String(fd.get("nombre") ?? ""),
            descripcion: String(fd.get("descripcion") ?? ""),
            servicio_id: String(fd.get("servicio_id") ?? ""),
            sesiones,
            frecuencia_dias: Number(fd.get("frecuencia_dias")),
            precio_sesion: precioSesion,
            precio_total: total,
            activo: fd.get("activo") === "on",
          });
          if (r?.error) return setError(r.error);
          router.refresh();
          onListo();
        })
      }
    >
      <label className="block sm:col-span-2">
        <span className={etiqueta}>Nombre</span>
        <input name="nombre" required maxLength={100} defaultValue={paquete?.nombre} placeholder="Ej.: Plan facial para acné" className={entrada} />
      </label>
      <label className="block sm:col-span-2">
        <span className={etiqueta}>Descripción</span>
        <textarea name="descripcion" rows={2} maxLength={500} defaultValue={paquete?.descripcion ?? ""} className={entrada} />
      </label>
      <label className="block sm:col-span-2">
        <span className={etiqueta}>Servicio de cada sesión (para la agenda)</span>
        <select name="servicio_id" defaultValue={paquete?.servicio_id ?? ""} className={entrada}>
          <option value="">Sin servicio</option>
          {servicios.map((s) => (
            <option key={s.id} value={s.id}>
              {s.nombre}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className={etiqueta}>Sesiones</span>
        <input type="number" min={1} max={100} value={sesiones} onChange={(e) => setSesiones(Number(e.target.value))} className={entrada} />
      </label>
      <label className="block">
        <span className={etiqueta}>Frecuencia (días)</span>
        <input name="frecuencia_dias" type="number" min={1} max={365} defaultValue={paquete?.frecuencia_dias ?? 7} className={entrada} />
      </label>
      <label className="block">
        <span className={etiqueta}>Precio por sesión (B/.)</span>
        <input type="number" min={0} step={0.01} value={precioSesion} onChange={(e) => setPrecioSesion(Number(e.target.value))} className={entrada} />
      </label>
      <label className="block">
        <span className={etiqueta}>Precio del paquete (B/.)</span>
        <input type="number" min={0} step={0.01} value={total} onChange={(e) => setTotal(Number(e.target.value))} className={entrada} />
      </label>
      <p className="text-xs text-muted sm:col-span-2">
        Sesión por sesión serían {dinero(lista)}.{" "}
        {pct !== null ? <span className="text-emerald-700">El paquete ahorra {pct}%.</span> : "El paquete no tiene descuento."}{" "}
        <button type="button" onClick={() => setTotal(lista)} className="text-gold-strong hover:underline">
          Usar {dinero(lista)}
        </button>
      </p>
      <label className="flex items-center gap-2 text-sm sm:col-span-2">
        <input name="activo" type="checkbox" defaultChecked={paquete?.activo ?? true} className="h-4 w-4 accent-[var(--brand-gold)]" />
        Disponible para vender
      </label>
      <div className="sm:col-span-2">
        <MensajeError>{error}</MensajeError>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 sm:col-span-2">
        <Boton type="submit" cargando={pendiente} className="sm:w-auto">
          Guardar paquete
        </Boton>
        {paquete && (
          <button
            type="button"
            disabled={pendiente}
            onClick={() => {
              if (!confirm(`¿Eliminar el paquete «${paquete.nombre}»?`)) return;
              iniciar(async () => {
                const r = await eliminarPaquete(paquete.id);
                if (r?.error) return setError(r.error);
                router.refresh();
                onListo();
              });
            }}
            className="inline-flex items-center gap-1.5 text-xs text-red-700 hover:underline"
          >
            <Trash2 className="h-3.5 w-3.5" /> Eliminar
          </button>
        )}
      </div>
    </form>
  );
}
