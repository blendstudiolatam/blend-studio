"use client";

import { BellRing, Camera, Pencil, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Boton } from "@/components/ui/boton";
import { Dialogo } from "@/components/ui/dialogo";
import { MensajeError } from "@/components/ui/mensaje-error";
import { enlaceWhatsApp, hoyPanama } from "@/lib/clientes";
import { urlFotoEmpleado } from "@/lib/empleados";
import { dinero } from "@/lib/formato";
import {
  CLASE_ESTADO_PLAN,
  ETIQUETA_ESTADO_PLAN,
  ETIQUETA_ESTADO_SESION,
  fechaCorta,
  frecuencia,
  horaCorta,
  type EstadoPlan,
  type EstadoSesion,
} from "@/lib/tratamientos";
import { abrirDocumento } from "../../salud-actions";
import { crearPlan, eliminarPlan, guardarPlan, guardarSesion } from "../../tratamientos-actions";

export type Sesion = { id: string; numero: number; fecha: string | null; hora: string | null; estado: EstadoSesion; pagada: boolean };
export type Profesional = { id: string; nombre: string; color: string; fotoPath: string | null };
export type PaqueteOpcion = {
  id: string;
  servicio_id: string | null;
  nombre: string;
  sesiones: number;
  frecuencia_dias: number;
  precio_sesion: number;
  precio_total: number;
};
export type Plan = {
  id: string;
  procedimiento: string;
  paquete_id: string | null;
  servicio_id: string | null;
  profesional_id: string | null;
  sesiones_total: number;
  frecuencia_dias: number;
  fecha_inicio: string;
  precio_sesion: number;
  precio_total: number;
  estado: EstadoPlan;
  notas: string | null;
  sucursal: string;
  editable: boolean;
  sesiones: Sesion[];
};
export type FotoPlan = { id: string; nombre: string; fecha: string };

const entrada = "block w-full rounded-lg border border-line bg-surface px-3.5 py-2.5 text-sm outline-none focus:border-gold";
const etiqueta = "mb-1.5 block text-[11px] font-medium uppercase tracking-[0.16em] text-muted";

export function PlanesCliente({
  clienteId,
  clienteNombre,
  telefono,
  planes,
  paquetes,
  profesionales,
  fotos,
  puedeCrear,
}: {
  clienteId: string;
  clienteNombre: string;
  telefono: string | null;
  planes: Plan[];
  paquetes: PaqueteOpcion[];
  profesionales: Profesional[];
  /** Fotos de avance por plan (solo si el usuario puede ver datos de salud). */
  fotos: Record<string, FotoPlan[]> | null;
  puedeCrear: boolean;
}) {
  const [editando, setEditando] = useState<Plan | "nuevo" | null>(null);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">
          {planes.length === 0
            ? "Este cliente no tiene planes de tratamiento."
            : `${planes.filter((p) => p.estado === "activo").length} activos de ${planes.length}`}
        </p>
        {puedeCrear && (
          <button
            type="button"
            onClick={() => setEditando("nuevo")}
            className="inline-flex items-center gap-2 rounded-lg bg-ink px-4 py-2.5 text-xs uppercase tracking-[0.16em] text-ivory hover:bg-ink/85"
          >
            <Plus className="h-4 w-4" /> Nuevo plan de tratamiento
          </button>
        )}
      </div>

      {planes.map((p) => (
        <TarjetaPlan
          key={p.id}
          plan={p}
          clienteNombre={clienteNombre}
          telefono={telefono}
          profesional={profesionales.find((x) => x.id === p.profesional_id) ?? null}
          fotos={fotos ? (fotos[p.id] ?? []) : null}
          onEditar={() => setEditando(p)}
        />
      ))}

      <Dialogo
        abierto={editando !== null}
        onCerrar={() => setEditando(null)}
        titulo={editando === "nuevo" ? "Nuevo plan de tratamiento" : "Editar plan"}
        subtitulo={editando === "nuevo" ? "Las sesiones se crean solas según la frecuencia." : undefined}
        ancho="max-w-2xl"
      >
        {editando && (
          <FormularioPlan
            key={editando === "nuevo" ? "nuevo" : editando.id}
            clienteId={clienteId}
            plan={editando === "nuevo" ? null : editando}
            paquetes={paquetes}
            profesionales={profesionales}
            onListo={() => setEditando(null)}
          />
        )}
      </Dialogo>
    </div>
  );
}

function TarjetaPlan({
  plan,
  clienteNombre,
  telefono,
  profesional,
  fotos,
  onEditar,
}: {
  plan: Plan;
  clienteNombre: string;
  telefono: string | null;
  profesional: Profesional | null;
  fotos: FotoPlan[] | null;
  onEditar: () => void;
}) {
  const [error, setError] = useState<string>();
  const [abriendo, iniciar] = useTransition();
  const hechas = plan.sesiones.filter((s) => s.estado === "completada").length;
  const validas = plan.sesiones.filter((s) => s.estado !== "cancelada").length || 1;
  const pagadas = plan.sesiones.filter((s) => s.pagada).length;
  const valorSesion = plan.precio_total / plan.sesiones_total;
  const hoy = hoyPanama();
  const proxima =
    plan.estado === "activo"
      ? (plan.sesiones.find((s) => s.estado === "pendiente" && s.fecha && s.fecha >= hoy) ??
        plan.sesiones.find((s) => s.estado === "pendiente"))
      : undefined;

  const mensaje =
    proxima &&
    `Hola ${clienteNombre.split(" ")[0]}, te recordamos tu sesión ${proxima.numero} de ${plan.sesiones_total} de ${plan.procedimiento}` +
      (proxima.fecha ? ` el ${fechaCorta(proxima.fecha)}` : "") +
      (proxima.hora ? ` a las ${horaCorta(proxima.hora)}` : "") +
      ` en ${plan.sucursal}. ¡Te esperamos!`;
  const whatsapp = enlaceWhatsApp(telefono);

  return (
    <section className="overflow-hidden rounded-xl border border-line bg-surface">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-line p-5">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-display text-2xl leading-tight">{plan.procedimiento}</h3>
            <span className={`rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wider ${CLASE_ESTADO_PLAN[plan.estado]}`}>
              {ETIQUETA_ESTADO_PLAN[plan.estado]}
            </span>
          </div>
          <p className="mt-1 text-sm text-muted">
            Desde {fechaCorta(plan.fecha_inicio)} · {frecuencia(plan.frecuencia_dias)} · {plan.sucursal}
          </p>
          {profesional && (
            <p className="mt-2 inline-flex items-center gap-2 text-sm">
              <Avatar nombre={profesional.nombre} foto={urlFotoEmpleado(profesional.fotoPath)} tamano={24} color={profesional.color} />
              {profesional.nombre}
            </p>
          )}
        </div>
        {plan.editable && (
          <button type="button" onClick={onEditar} className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-xs hover:border-gold">
            <Pencil className="h-3.5 w-3.5" /> Editar
          </button>
        )}
      </div>

      <div className="grid gap-5 p-5 lg:grid-cols-[1fr_280px]">
        <div className="space-y-5">
          <div>
            <div className="flex items-baseline justify-between text-sm">
              <span>
                <strong>{hechas}</strong> de {validas} sesiones completadas
              </span>
              <span className="text-muted">{Math.round((hechas / validas) * 100)}%</span>
            </div>
            <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-background" role="progressbar" aria-valuenow={hechas} aria-valuemax={validas}>
              <div className="h-full rounded-full bg-gold transition-all" style={{ width: `${(hechas / validas) * 100}%` }} />
            </div>
          </div>

          <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            <Dato titulo="Precio por sesión" valor={dinero(plan.precio_sesion)} />
            <Dato titulo="Total del plan" valor={dinero(plan.precio_total)} />
            <Dato titulo="Pagado" valor={dinero(pagadas * valorSesion)} />
            <Dato titulo="Pendiente de pago" valor={dinero(plan.precio_total - pagadas * valorSesion)} />
          </dl>

          <TablaSesiones key={plan.sesiones.map((s) => [s.id, s.fecha, s.hora, s.estado, s.pagada].join()).join("|")} plan={plan} />
          {plan.notas && <p className="rounded-lg bg-background px-4 py-3 text-sm text-muted">{plan.notas}</p>}
        </div>

        <aside className="space-y-4">
          <div className="rounded-xl border border-line p-4">
            <p className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.16em] text-muted">
              <BellRing className="h-3.5 w-3.5 text-gold-strong" /> Recordatorio próximo
            </p>
            {proxima ? (
              <>
                <p className="mt-2 font-display text-xl">Sesión {proxima.numero}</p>
                <p className="text-sm">
                  {fechaCorta(proxima.fecha)}
                  {proxima.hora && ` · ${horaCorta(proxima.hora)}`}
                </p>
                {whatsapp && mensaje ? (
                  <a
                    href={`${whatsapp}?text=${encodeURIComponent(mensaje)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-700 px-3 py-2 text-xs uppercase tracking-[0.14em] text-white hover:bg-emerald-800"
                  >
                    Enviar recordatorio
                  </a>
                ) : (
                  <p className="mt-2 text-xs text-muted">El cliente no tiene teléfono.</p>
                )}
                <p className="mt-2 text-[11px] text-muted">Abre WhatsApp con el mensaje listo. El envío automático llega en la Fase 3.</p>
              </>
            ) : (
              <p className="mt-2 text-sm text-muted">No hay sesiones pendientes.</p>
            )}
          </div>

          {fotos && (
            <div className="rounded-xl border border-line p-4">
              <p className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.16em] text-muted">
                <Camera className="h-3.5 w-3.5 text-gold-strong" /> Fotos de avance
              </p>
              {fotos.length === 0 ? (
                <p className="mt-2 text-sm text-muted">Súbelas en Documentos, categoría «Fotos antes / después», eligiendo este plan.</p>
              ) : (
                <ul className="mt-2 space-y-1 text-sm">
                  {fotos.map((f) => (
                    <li key={f.id}>
                      <button
                        type="button"
                        disabled={abriendo}
                        onClick={() => {
                          const ventana = window.open("", "_blank");
                          iniciar(async () => {
                            const r = await abrirDocumento(f.id);
                            if (r?.url && ventana) ventana.location.href = r.url;
                            else {
                              ventana?.close();
                              setError(r?.error ?? "No se pudo abrir la foto.");
                            }
                          });
                        }}
                        className="text-left hover:underline"
                      >
                        {f.nombre}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <MensajeError>{error}</MensajeError>
            </div>
          )}
        </aside>
      </div>
    </section>
  );
}

function Dato({ titulo, valor }: { titulo: string; valor: string }) {
  return (
    <div className="rounded-lg bg-background px-3 py-2">
      <dt className="text-[11px] text-muted">{titulo}</dt>
      <dd className="font-medium">{valor}</dd>
    </div>
  );
}

function TablaSesiones({ plan }: { plan: Plan }) {
  const router = useRouter();
  const [sesiones, setSesiones] = useState(plan.sesiones);
  const [error, setError] = useState<string>();
  const [, iniciar] = useTransition();
  const th = "px-3 py-2 text-left text-[11px] font-medium uppercase tracking-[0.12em] text-muted";

  const cambiar = (s: Sesion, cambios: Partial<Sesion>) => {
    const nueva = { ...s, ...cambios };
    setSesiones((l) => l.map((x) => (x.id === s.id ? nueva : x)));
    iniciar(async () => {
      const r = await guardarSesion(s.id, {
        fecha: nueva.fecha ?? "",
        hora: nueva.hora?.slice(0, 5) ?? "",
        estado: nueva.estado,
        pagada: nueva.pagada,
      });
      if (r?.error) {
        setError(r.error);
        setSesiones((l) => l.map((x) => (x.id === s.id ? s : x)));
      } else {
        setError(undefined);
        router.refresh();
      }
    });
  };

  const control = "rounded-md border border-line bg-background px-2 py-1 text-sm disabled:border-transparent disabled:bg-transparent";

  return (
    <div className="space-y-2">
      <div className="overflow-x-auto rounded-lg border border-line">
        <table className="w-full min-w-[560px] text-sm">
          <thead className="border-b border-line bg-background/60">
            <tr>
              <th className={th}>#</th>
              <th className={th}>Fecha</th>
              <th className={th}>Hora</th>
              <th className={th}>Estado</th>
              <th className={th}>Pago</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {sesiones.map((s) => (
              <tr key={s.id} className={s.estado === "cancelada" ? "text-muted line-through" : ""}>
                <td className="px-3 py-2 font-medium">{s.numero}</td>
                <td className="px-3 py-2">
                  <input
                    type="date"
                    aria-label={`Fecha de la sesión ${s.numero}`}
                    value={s.fecha ?? ""}
                    disabled={!plan.editable}
                    onChange={(e) => cambiar(s, { fecha: e.target.value || null })}
                    className={control}
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    type="time"
                    aria-label={`Hora de la sesión ${s.numero}`}
                    value={s.hora?.slice(0, 5) ?? ""}
                    disabled={!plan.editable}
                    onChange={(e) => cambiar(s, { hora: e.target.value || null })}
                    className={control}
                  />
                </td>
                <td className="px-3 py-2">
                  <select
                    aria-label={`Estado de la sesión ${s.numero}`}
                    value={s.estado}
                    disabled={!plan.editable}
                    onChange={(e) => cambiar(s, { estado: e.target.value as EstadoSesion })}
                    className={`${control} ${s.estado === "completada" ? "text-emerald-800" : ""}`}
                  >
                    {(Object.keys(ETIQUETA_ESTADO_SESION) as EstadoSesion[]).map((e) => (
                      <option key={e} value={e}>
                        {ETIQUETA_ESTADO_SESION[e]}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-3 py-2">
                  <label className="inline-flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={s.pagada}
                      disabled={!plan.editable}
                      onChange={(e) => cambiar(s, { pagada: e.target.checked })}
                      className="h-4 w-4 accent-[var(--brand-gold)]"
                    />
                    <span className={s.pagada ? "text-emerald-800" : "text-muted"}>{s.pagada ? "Pagada" : "No pagada"}</span>
                  </label>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <MensajeError>{error}</MensajeError>
      <p className="text-[11px] text-muted">
        Al construir la Agenda, cada sesión se convertirá en una cita (eventos en agenda). El pago se marcará solo desde el punto de venta
        (Fase 2).
      </p>
    </div>
  );
}

function FormularioPlan({
  clienteId,
  plan,
  paquetes,
  profesionales,
  onListo,
}: {
  clienteId: string;
  plan: Plan | null;
  paquetes: PaqueteOpcion[];
  profesionales: Profesional[];
  onListo: () => void;
}) {
  const router = useRouter();
  const [error, setError] = useState<string>();
  const [pendiente, iniciar] = useTransition();
  const [v, setV] = useState({
    paquete_id: plan?.paquete_id ?? "",
    servicio_id: plan?.servicio_id ?? "",
    procedimiento: plan?.procedimiento ?? "",
    profesional_id: plan?.profesional_id ?? "",
    sesiones_total: plan?.sesiones_total ?? 4,
    frecuencia_dias: plan?.frecuencia_dias ?? 7,
    fecha_inicio: plan?.fecha_inicio ?? hoyPanama(),
    precio_sesion: plan?.precio_sesion ?? 0,
    precio_total: plan?.precio_total ?? 0,
    estado: plan?.estado ?? ("activo" as EstadoPlan),
    notas: plan?.notas ?? "",
  });
  const set = <K extends keyof typeof v>(k: K, valor: (typeof v)[K]) => setV((x) => ({ ...x, [k]: valor }));

  const elegirPaquete = (id: string) => {
    const p = paquetes.find((x) => x.id === id);
    if (!p) return set("paquete_id", "");
    setV((x) => ({
      ...x,
      paquete_id: p.id,
      servicio_id: p.servicio_id ?? "",
      procedimiento: p.nombre,
      sesiones_total: p.sesiones,
      frecuencia_dias: p.frecuencia_dias,
      precio_sesion: p.precio_sesion,
      precio_total: p.precio_total,
    }));
  };

  return (
    <form
      className="grid gap-4 sm:grid-cols-2"
      action={() =>
        iniciar(async () => {
          const r = plan ? await guardarPlan(plan.id, v) : await crearPlan(clienteId, v);
          if (r?.error) return setError(r.error);
          router.refresh();
          onListo();
        })
      }
    >
      {!plan && (
        <label className="block sm:col-span-2">
          <span className={etiqueta}>Paquete del catálogo</span>
          <select value={v.paquete_id} onChange={(e) => elegirPaquete(e.target.value)} className={entrada}>
            <option value="">Plan personalizado (sin paquete)</option>
            {paquetes.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre} — {p.sesiones} sesiones · {dinero(p.precio_total)}
              </option>
            ))}
          </select>
        </label>
      )}
      <label className="block sm:col-span-2">
        <span className={etiqueta}>Procedimiento</span>
        <input required maxLength={100} value={v.procedimiento} onChange={(e) => set("procedimiento", e.target.value)} className={entrada} />
      </label>
      <label className="block">
        <span className={etiqueta}>Profesional</span>
        <select value={v.profesional_id} onChange={(e) => set("profesional_id", e.target.value)} className={entrada}>
          <option value="">Sin asignar</option>
          {profesionales.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nombre}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className={etiqueta}>Fecha de inicio</span>
        <input type="date" required value={v.fecha_inicio} onChange={(e) => set("fecha_inicio", e.target.value)} className={entrada} />
      </label>
      <label className="block">
        <span className={etiqueta}>Cantidad de sesiones</span>
        <input type="number" min={1} max={100} value={v.sesiones_total} onChange={(e) => set("sesiones_total", Number(e.target.value))} className={entrada} />
      </label>
      <label className="block">
        <span className={etiqueta}>Frecuencia (días entre sesiones)</span>
        <input type="number" min={1} max={365} value={v.frecuencia_dias} onChange={(e) => set("frecuencia_dias", Number(e.target.value))} className={entrada} />
        <span className="mt-1 block text-xs text-muted">{frecuencia(v.frecuencia_dias || 1)}</span>
      </label>
      <label className="block">
        <span className={etiqueta}>Precio por sesión (B/.)</span>
        <input type="number" min={0} step={0.01} value={v.precio_sesion} onChange={(e) => set("precio_sesion", Number(e.target.value))} className={entrada} />
      </label>
      <label className="block">
        <span className={etiqueta}>Total del plan (B/.)</span>
        <input type="number" min={0} step={0.01} value={v.precio_total} onChange={(e) => set("precio_total", Number(e.target.value))} className={entrada} />
        <button type="button" onClick={() => set("precio_total", Math.round(v.sesiones_total * v.precio_sesion * 100) / 100)} className="mt-1 text-xs text-gold-strong hover:underline">
          Calcular: {v.sesiones_total} × {dinero(v.precio_sesion)}
        </button>
      </label>
      {plan && (
        <label className="block">
          <span className={etiqueta}>Estado</span>
          <select value={v.estado} onChange={(e) => set("estado", e.target.value as EstadoPlan)} className={entrada}>
            {(Object.keys(ETIQUETA_ESTADO_PLAN) as EstadoPlan[]).map((e) => (
              <option key={e} value={e}>
                {ETIQUETA_ESTADO_PLAN[e]}
              </option>
            ))}
          </select>
        </label>
      )}
      <label className="block sm:col-span-2">
        <span className={etiqueta}>Notas</span>
        <textarea rows={2} maxLength={1000} value={v.notas} onChange={(e) => set("notas", e.target.value)} className={entrada} />
      </label>
      {plan && (
        <p className="text-xs text-muted sm:col-span-2">
          Si cambias la cantidad de sesiones, se agregan al final o se quitan las pendientes del final. Las fechas ya puestas no cambian.
        </p>
      )}
      <div className="sm:col-span-2">
        <MensajeError>{error}</MensajeError>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 sm:col-span-2">
        <Boton type="submit" cargando={pendiente} className="sm:w-auto">
          {plan ? "Guardar plan" : "Crear plan"}
        </Boton>
        {plan && (
          <button
            type="button"
            disabled={pendiente}
            onClick={() => {
              if (!confirm(`¿Eliminar el plan «${plan.procedimiento}» con todas sus sesiones?`)) return;
              iniciar(async () => {
                const r = await eliminarPlan(plan.id);
                if (r?.error) return setError(r.error);
                router.refresh();
                onListo();
              });
            }}
            className="inline-flex items-center gap-1.5 text-xs text-red-700 hover:underline"
          >
            <Trash2 className="h-3.5 w-3.5" /> Eliminar tratamiento
          </button>
        )}
      </div>
    </form>
  );
}
