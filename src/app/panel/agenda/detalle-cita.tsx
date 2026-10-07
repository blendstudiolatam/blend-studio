"use client";

import { CalendarClock, ClipboardList, MessageCircle, Pencil, StickyNote, User } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Avatar } from "@/components/ui/avatar";
import { MensajeError } from "@/components/ui/mensaje-error";
import {
  CLASE_ESTADO_CITA,
  ETIQUETA_ESTADO_CITA,
  fechaLarga,
  hora12,
  horaDe,
  mensajeConfirmacion,
  type EstadoCita,
} from "@/lib/agenda";
import { codigoCliente, enlaceWhatsApp } from "@/lib/clientes";
import { urlFotoEmpleado } from "@/lib/empleados";
import { dinero, duracion } from "@/lib/formato";
import { cambiarEstadoCita } from "./actions";
import type { CitaAgenda, ProfesionalAgenda } from "./tipos";

const ACCIONES: { estado: EstadoCita; nombre: string; clase: string }[] = [
  { estado: "confirmada", nombre: "Confirmar", clase: "bg-emerald-700 text-white hover:bg-emerald-800" },
  { estado: "completada", nombre: "Completada", clase: "bg-sky-700 text-white hover:bg-sky-800" },
  { estado: "no_asistio", nombre: "No asistió", clase: "border border-line hover:border-red-400 hover:text-red-700" },
  { estado: "pendiente", nombre: "Volver a pendiente", clase: "border border-line hover:border-gold" },
];

export function DetalleCita({
  cita,
  profesional,
  sucursal,
  editable,
  onEditar,
  onListo,
}: {
  cita: CitaAgenda;
  profesional: ProfesionalAgenda | null;
  sucursal: string;
  editable: boolean;
  onEditar: () => void;
  onListo: () => void;
}) {
  const router = useRouter();
  const [error, setError] = useState<string>();
  const [cancelando, setCancelando] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [pendiente, iniciar] = useTransition();
  const wa = enlaceWhatsApp(cita.cliente.telefono);
  const servicio = cita.servicio?.nombre ?? cita.sesion?.procedimiento ?? null;

  const cambiar = (estado: EstadoCita, m?: string) =>
    iniciar(async () => {
      const r = await cambiarEstadoCita(cita.id, estado, m);
      if (r?.error) return setError(r.error);
      router.refresh();
      onListo();
    });

  return (
    <div className="space-y-5 text-sm">
      <span className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] uppercase tracking-wider ${CLASE_ESTADO_CITA[cita.estado]}`}>
        {ETIQUETA_ESTADO_CITA[cita.estado]}
        {cita.origen === "web" && " · reserva web"}
      </span>

      <dl className="space-y-3">
        <Fila icono={CalendarClock}>
          <span className="first-letter:uppercase">{fechaLarga(cita.fecha, true)}</span>
          <span className="block text-muted">
            {hora12(cita.hora)} a {hora12(horaDe(cita.fin))} · {duracion(cita.duracion)}
            {cita.precio !== null && ` · ${dinero(cita.precio)}`}
          </span>
        </Fila>
        <Fila icono={User}>
          <Link href={`/panel/clientes/lista/${cita.cliente.id}`} className="font-medium hover:underline">
            {cita.cliente.nombre}
          </Link>
          <span className="block text-muted">
            {codigoCliente(cita.cliente.codigo)}
            {cita.cliente.telefono && ` · ${cita.cliente.telefono}`}
          </span>
        </Fila>
        {profesional && (
          <div className="flex items-center gap-3">
            <Avatar nombre={profesional.nombre} foto={urlFotoEmpleado(profesional.fotoPath)} tamano={28} color={profesional.color} />
            <span>{profesional.nombre}</span>
          </div>
        )}
        {cita.sesion && (
          <Fila icono={ClipboardList}>
            {cita.sesion.procedimiento}
            <span className="block text-muted">
              Sesión {cita.sesion.numero} de {cita.sesion.total} del plan de tratamiento
            </span>
          </Fila>
        )}
        {cita.notas && <Fila icono={StickyNote}>{cita.notas}</Fila>}
        {cita.motivoCancelacion && <p className="rounded-lg bg-background px-3 py-2 text-muted">Motivo: {cita.motivoCancelacion}</p>}
      </dl>

      {wa && (cita.estado === "pendiente" || cita.estado === "confirmada") && (
        <a
          href={`${wa}?text=${encodeURIComponent(mensajeConfirmacion(cita.cliente.nombre, servicio, cita.fecha, cita.hora, sucursal))}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-emerald-700 hover:underline"
        >
          <MessageCircle className="h-4 w-4" /> Escribir por WhatsApp para confirmar
        </a>
      )}

      <MensajeError>{error}</MensajeError>

      {editable && (
        <div className="space-y-3 border-t border-line pt-4">
          <div className="flex flex-wrap gap-2">
            {ACCIONES.filter((a) => a.estado !== cita.estado && !(a.estado === "pendiente" && cita.estado === "cancelada")).map((a) => (
              <button key={a.estado} type="button" disabled={pendiente} onClick={() => cambiar(a.estado)} className={`rounded-lg px-3 py-1.5 text-xs ${a.clase}`}>
                {a.nombre}
              </button>
            ))}
            {cita.estado === "cancelada" && (
              <button type="button" disabled={pendiente} onClick={() => cambiar("confirmada")} className="rounded-lg border border-line px-3 py-1.5 text-xs hover:border-gold">
                Reactivar
              </button>
            )}
            {cita.estado !== "completada" && cita.estado !== "cancelada" && (
              <button type="button" onClick={onEditar} className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-xs hover:border-gold">
                <Pencil className="h-3.5 w-3.5" /> Editar o mover
              </button>
            )}
          </div>
          {cita.estado !== "cancelada" &&
            (cancelando ? (
              <div className="flex flex-wrap items-center gap-2">
                <input
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  maxLength={200}
                  placeholder="Motivo (opcional)"
                  className="min-w-0 flex-1 rounded-lg border border-line bg-surface px-3 py-1.5 text-sm outline-none focus:border-gold"
                />
                <button type="button" disabled={pendiente} onClick={() => cambiar("cancelada", motivo)} className="rounded-lg bg-red-700 px-3 py-1.5 text-xs text-white hover:bg-red-800">
                  Cancelar cita
                </button>
                <button type="button" onClick={() => setCancelando(false)} className="text-xs text-muted hover:underline">
                  No
                </button>
              </div>
            ) : (
              <button type="button" onClick={() => setCancelando(true)} className="text-xs text-red-700 hover:underline">
                Cancelar cita…
              </button>
            ))}
        </div>
      )}
    </div>
  );
}

function Fila({ icono: Icono, children }: { icono: typeof User; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <Icono className="mt-0.5 h-4 w-4 shrink-0 text-muted" />
      <div>{children}</div>
    </div>
  );
}
