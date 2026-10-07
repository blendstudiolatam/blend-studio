"use client";

import { Search, UserPlus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Boton } from "@/components/ui/boton";
import { MensajeError } from "@/components/ui/mensaje-error";
import { fechaLarga } from "@/lib/agenda";
import { codigoCliente } from "@/lib/clientes";
import { dinero, duracion as textoDuracion } from "@/lib/formato";
import {
  buscarClientes,
  crearCita,
  crearClienteRapido,
  guardarCita,
  sesionesPendientes,
  type ClienteEncontrado,
  type SesionPendiente,
} from "./actions";
import type { CitaAgenda, ProfesionalAgenda, ServicioAgenda } from "./tipos";

export type Prefill = { fecha?: string; hora?: string; empleadoId?: string };

const entrada = "block w-full rounded-lg border border-line bg-surface px-3.5 py-2.5 text-sm outline-none focus:border-gold";
const etiqueta = "mb-1.5 block text-[11px] font-medium uppercase tracking-[0.16em] text-muted";

export function FormularioCita({
  cita,
  prefill,
  profesionales,
  servicios,
  creaClientes,
  onListo,
}: {
  cita: CitaAgenda | null;
  prefill: Prefill;
  profesionales: ProfesionalAgenda[];
  servicios: ServicioAgenda[];
  creaClientes: boolean;
  onListo: () => void;
}) {
  const router = useRouter();
  const [error, setError] = useState<string>();
  const [pendiente, iniciar] = useTransition();

  const [cliente, setCliente] = useState<ClienteEncontrado | null>(
    cita ? { id: cita.cliente.id, nombre: cita.cliente.nombre, telefono: cita.cliente.telefono, codigo: cita.cliente.codigo } : null,
  );
  const [sesiones, setSesiones] = useState<SesionPendiente[]>([]);
  const [v, setV] = useState({
    empleado_id: cita?.empleadoId ?? prefill.empleadoId ?? (profesionales.length === 1 ? profesionales[0].id : ""),
    servicio_id: cita?.servicio?.id ?? "",
    sesion_id: cita?.sesion?.id ?? "",
    fecha: cita?.fecha ?? prefill.fecha ?? "",
    hora: cita?.hora ?? prefill.hora ?? "",
    duracion: cita?.duracion ?? 60,
    precio: cita?.precio === null || cita?.precio === undefined ? "" : String(cita.precio),
    estado: "confirmada" as "pendiente" | "confirmada",
    notas: cita?.notas ?? "",
  });
  const set = <K extends keyof typeof v>(k: K, valor: (typeof v)[K]) => setV((x) => ({ ...x, [k]: valor }));

  // Sesiones de tratamiento pendientes del cliente elegido.
  useEffect(() => {
    if (!cliente) return;
    let vigente = true;
    sesionesPendientes(cliente.id).then((s) => vigente && setSesiones(s));
    return () => {
      vigente = false;
    };
  }, [cliente]);

  const elegirServicio = (id: string) => {
    const s = servicios.find((x) => x.id === id);
    setV((x) => ({ ...x, servicio_id: id, ...(s ? { duracion: s.duracion, precio: String(s.precio) } : {}) }));
  };

  const elegirSesion = (id: string) => {
    const s = sesiones.find((x) => x.id === id);
    if (!s) return set("sesion_id", "");
    const serv = servicios.find((x) => x.id === s.servicioId);
    setV((x) => ({
      ...x,
      sesion_id: s.id,
      servicio_id: s.servicioId ?? x.servicio_id,
      duracion: serv?.duracion ?? x.duracion,
      precio: String(s.valor),
      empleado_id: x.empleado_id || s.profesionalId || "",
      fecha: x.fecha || s.fecha || "",
    }));
  };

  const pro = profesionales.find((p) => p.id === v.empleado_id);
  const noRealiza = pro && v.servicio_id && !pro.servicios.includes(v.servicio_id);
  const categorias = [...new Set(servicios.map((s) => s.categoria))];
  const sesionesVisibles = cita?.sesion && !sesiones.some((s) => s.id === cita.sesion?.id)
    ? [{ id: cita.sesion.id, numero: cita.sesion.numero, total: cita.sesion.total, procedimiento: cita.sesion.procedimiento, servicioId: null, profesionalId: null, valor: cita.precio ?? 0, fecha: cita.fecha }, ...sesiones]
    : sesiones;

  return (
    <form
      className="space-y-5"
      action={() =>
        iniciar(async () => {
          if (!cliente) return setError("Elige el cliente.");
          const datos = { ...v, cliente_id: cliente.id };
          const r = cita ? await guardarCita(cita.id, datos) : await crearCita(datos);
          if (r?.error) return setError(r.error);
          router.refresh();
          onListo();
        })
      }
    >
      <SelectorCliente cliente={cliente} onCambiar={(c) => (setCliente(c), setSesiones([]), set("sesion_id", ""))} creaClientes={creaClientes} />

      {sesionesVisibles.length > 0 && (
        <label className="block rounded-xl border border-gold/40 bg-gold/5 p-3">
          <span className={etiqueta}>¿Es una sesión de su plan de tratamiento?</span>
          <select value={v.sesion_id} onChange={(e) => elegirSesion(e.target.value)} className={entrada}>
            <option value="">No, es una cita normal</option>
            {sesionesVisibles.map((s) => (
              <option key={s.id} value={s.id}>
                {s.procedimiento} — sesión {s.numero} de {s.total}
                {s.fecha ? ` (sugerida ${fechaLarga(s.fecha)})` : ""}
              </option>
            ))}
          </select>
        </label>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block sm:col-span-2">
          <span className={etiqueta}>Servicio</span>
          <select value={v.servicio_id} onChange={(e) => elegirServicio(e.target.value)} className={entrada}>
            <option value="">Sin servicio específico</option>
            {categorias.map((cat) => (
              <optgroup key={cat} label={cat}>
                {servicios
                  .filter((s) => s.categoria === cat)
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nombre} · {textoDuracion(s.duracion)} · {dinero(s.precio)}
                    </option>
                  ))}
              </optgroup>
            ))}
          </select>
        </label>
        <label className="block sm:col-span-2">
          <span className={etiqueta}>Profesional</span>
          <select required value={v.empleado_id} onChange={(e) => set("empleado_id", e.target.value)} className={entrada}>
            <option value="">Elegir…</option>
            {profesionales.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre}
                {v.servicio_id && !p.servicios.includes(v.servicio_id) ? " (no tiene este servicio)" : ""}
              </option>
            ))}
          </select>
          {noRealiza && <span className="mt-1 block text-xs text-amber-700">{pro.nombre} no tiene asignado este servicio en su ficha. Puedes agendarlo igual.</span>}
        </label>
        <label className="block">
          <span className={etiqueta}>Fecha</span>
          <input type="date" required value={v.fecha} onChange={(e) => set("fecha", e.target.value)} className={entrada} />
        </label>
        <label className="block">
          <span className={etiqueta}>Hora</span>
          <input type="time" required step={300} value={v.hora} onChange={(e) => set("hora", e.target.value)} className={entrada} />
        </label>
        <label className="block">
          <span className={etiqueta}>Duración (minutos)</span>
          <input type="number" min={5} max={720} step={5} value={v.duracion} onChange={(e) => set("duracion", Number(e.target.value))} className={entrada} />
        </label>
        <label className="block">
          <span className={etiqueta}>Precio (B/.)</span>
          <input type="number" min={0} step={0.01} value={v.precio} onChange={(e) => set("precio", e.target.value)} className={entrada} />
        </label>
        {!cita && (
          <label className="block">
            <span className={etiqueta}>Estado</span>
            <select value={v.estado} onChange={(e) => set("estado", e.target.value as "pendiente" | "confirmada")} className={entrada}>
              <option value="confirmada">Confirmada</option>
              <option value="pendiente">Pendiente de confirmar</option>
            </select>
          </label>
        )}
        <label className="block sm:col-span-2">
          <span className={etiqueta}>Notas</span>
          <textarea rows={2} maxLength={500} value={v.notas} onChange={(e) => set("notas", e.target.value)} className={entrada} />
        </label>
      </div>

      <MensajeError>{error}</MensajeError>
      <Boton type="submit" cargando={pendiente}>
        {cita ? "Guardar cambios" : "Agendar cita"}
      </Boton>
      <p className="text-xs text-muted">El sistema no deja agendar fuera del horario del salón o del profesional, en sus días libres, ni encima de otra cita.</p>
    </form>
  );
}

function SelectorCliente({
  cliente,
  onCambiar,
  creaClientes,
}: {
  cliente: ClienteEncontrado | null;
  onCambiar: (c: ClienteEncontrado | null) => void;
  creaClientes: boolean;
}) {
  const [texto, setTexto] = useState("");
  const [resultados, setResultados] = useState<ClienteEncontrado[]>([]);
  const [nuevo, setNuevo] = useState(false);
  const [telefono, setTelefono] = useState("");
  const [error, setError] = useState<string>();
  const [pendiente, iniciar] = useTransition();

  useEffect(() => {
    if (texto.trim().length < 2) return;
    let vigente = true;
    const t = setTimeout(() => buscarClientes(texto).then((r) => vigente && setResultados(r)), 250);
    return () => {
      vigente = false;
      clearTimeout(t);
    };
  }, [texto]);

  if (cliente) {
    return (
      <div>
        <span className={etiqueta}>Cliente</span>
        <div className="flex items-center justify-between rounded-lg border border-line bg-surface px-3.5 py-2.5">
          <span>
            <strong className="font-medium">{cliente.nombre}</strong>
            <span className="ml-2 text-xs text-muted">
              {codigoCliente(cliente.codigo)}
              {cliente.telefono && ` · ${cliente.telefono}`}
            </span>
          </span>
          <button type="button" onClick={() => onCambiar(null)} className="rounded p-1 text-muted hover:text-foreground" aria-label="Cambiar cliente">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  if (nuevo) {
    return (
      <div className="space-y-3 rounded-xl border border-line bg-surface p-4">
        <p className="text-sm font-medium">Cliente nuevo</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <input value={texto} onChange={(e) => setTexto(e.target.value)} maxLength={120} placeholder="Nombre y apellido" className={entrada} />
          <input value={telefono} onChange={(e) => setTelefono(e.target.value)} type="tel" maxLength={30} placeholder="Teléfono / WhatsApp" className={entrada} />
        </div>
        <MensajeError>{error}</MensajeError>
        <div className="flex gap-3">
          <button
            type="button"
            disabled={pendiente}
            onClick={() =>
              iniciar(async () => {
                const r = await crearClienteRapido(texto, telefono);
                if (r.error || !r.cliente) return setError(r.error);
                onCambiar(r.cliente);
              })
            }
            className="rounded-lg bg-ink px-3 py-2 text-xs uppercase tracking-[0.14em] text-ivory"
          >
            Crear cliente
          </button>
          <button type="button" onClick={() => setNuevo(false)} className="text-xs text-muted hover:underline">
            Volver a buscar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <span className={etiqueta}>Cliente</span>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <input
          type="search"
          value={texto}
          onChange={(e) => {
            setTexto(e.target.value);
            if (e.target.value.trim().length < 2) setResultados([]);
          }}
          placeholder="Buscar por nombre o teléfono"
          className={`${entrada} pl-9`}
          autoFocus
        />
      </div>
      {resultados.length > 0 && (
        <ul className="mt-1 divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface">
          {resultados.map((r) => (
            <li key={r.id}>
              <button type="button" onClick={() => onCambiar(r)} className="w-full px-3.5 py-2 text-left text-sm hover:bg-background">
                {r.nombre}
                <span className="ml-2 text-xs text-muted">
                  {codigoCliente(r.codigo)}
                  {r.telefono && ` · ${r.telefono}`}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {texto.trim().length >= 2 && resultados.length === 0 && <p className="mt-1 text-xs text-muted">Sin resultados.</p>}
      {creaClientes && (
        <button type="button" onClick={() => setNuevo(true)} className="mt-2 inline-flex items-center gap-1.5 text-xs text-gold-strong hover:underline">
          <UserPlus className="h-3.5 w-3.5" /> Cliente nuevo
        </button>
      )}
    </div>
  );
}
