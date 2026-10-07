"use client";

import { Check, MessageCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Avatar } from "@/components/ui/avatar";
import { MensajeError } from "@/components/ui/mensaje-error";
import { CLASE_ESTADO_CITA, ETIQUETA_ESTADO_CITA, fechaLarga, hora12, horaDe, mensajeConfirmacion } from "@/lib/agenda";
import { enlaceWhatsApp } from "@/lib/clientes";
import { urlFotoEmpleado } from "@/lib/empleados";
import { dinero } from "@/lib/formato";
import { cambiarEstadoCita } from "./actions";
import type { CitaAgenda, ProfesionalAgenda } from "./tipos";

/** Lista de citas: "Resumen del día" y "Por confirmar". */
export function ListaCitas({
  citas,
  profesionales,
  sucursal,
  editable,
  vacio,
  conFecha = false,
  onVer,
}: {
  citas: CitaAgenda[];
  profesionales: ProfesionalAgenda[];
  sucursal: string;
  editable: boolean;
  vacio: string;
  conFecha?: boolean;
  onVer: (c: CitaAgenda) => void;
}) {
  const router = useRouter();
  const [error, setError] = useState<string>();
  const [pendiente, iniciar] = useTransition();

  if (citas.length === 0) {
    return <p className="rounded-xl border border-dashed border-line py-14 text-center text-sm text-muted">{vacio}</p>;
  }

  const activas = citas.filter((c) => c.estado !== "cancelada" && c.estado !== "no_asistio");
  const total = activas.reduce((s, c) => s + (c.precio ?? 0), 0);

  return (
    <div className="space-y-3">
      {!conFecha && (
        <p className="text-sm text-muted">
          {activas.length} citas · {dinero(total)} en servicios
        </p>
      )}
      <MensajeError>{error}</MensajeError>
      <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
        {citas.map((c) => {
          const pro = profesionales.find((p) => p.id === c.empleadoId);
          const wa = enlaceWhatsApp(c.cliente.telefono);
          return (
            <li key={c.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
              <button type="button" onClick={() => onVer(c)} className="w-28 shrink-0 text-left">
                {conFecha && <p className="text-xs text-muted first-letter:uppercase">{fechaLarga(c.fecha)}</p>}
                <p className="font-medium">{hora12(c.hora)}</p>
                <p className="text-xs text-muted">hasta {hora12(horaDe(c.fin))}</p>
              </button>
              <div className="min-w-0 flex-1">
                <Link href={`/panel/clientes/lista/${c.cliente.id}`} className="font-medium hover:underline">
                  {c.cliente.nombre}
                </Link>
                <p className="truncate text-sm text-muted">
                  {c.sesion ? `${c.sesion.procedimiento} · sesión ${c.sesion.numero} de ${c.sesion.total}` : (c.servicio?.nombre ?? "Sin servicio")}
                  {c.precio !== null && ` · ${dinero(c.precio)}`}
                </p>
              </div>
              {pro && (
                <span className="inline-flex items-center gap-2 text-sm">
                  <Avatar nombre={pro.nombre} foto={urlFotoEmpleado(pro.fotoPath)} tamano={24} color={pro.color} />
                  <span className="hidden sm:inline">{pro.nombre}</span>
                </span>
              )}
              <span className={`rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wider ${CLASE_ESTADO_CITA[c.estado]}`}>
                {ETIQUETA_ESTADO_CITA[c.estado]}
                {c.origen === "web" && " · web"}
              </span>
              <div className="flex items-center gap-1">
                {wa && c.estado === "pendiente" && (
                  <a
                    href={`${wa}?text=${encodeURIComponent(mensajeConfirmacion(c.cliente.nombre, c.servicio?.nombre ?? c.sesion?.procedimiento ?? null, c.fecha, c.hora, sucursal))}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-md p-1.5 text-muted hover:bg-background hover:text-emerald-700"
                    title="Pedir confirmación por WhatsApp"
                  >
                    <MessageCircle className="h-4 w-4" />
                  </a>
                )}
                {editable && c.estado === "pendiente" && (
                  <button
                    type="button"
                    disabled={pendiente}
                    onClick={() =>
                      iniciar(async () => {
                        const r = await cambiarEstadoCita(c.id, "confirmada");
                        setError(r?.error);
                        if (r?.ok) router.refresh();
                      })
                    }
                    className="inline-flex items-center gap-1 rounded-md bg-emerald-700 px-2.5 py-1 text-xs text-white hover:bg-emerald-800"
                  >
                    <Check className="h-3.5 w-3.5" /> Confirmar
                  </button>
                )}
                <button type="button" onClick={() => onVer(c)} className="rounded-md px-2 py-1 text-xs text-gold-strong hover:underline">
                  Ver
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
