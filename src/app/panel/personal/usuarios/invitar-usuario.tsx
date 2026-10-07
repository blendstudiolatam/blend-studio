"use client";

import { UserPlus, X } from "lucide-react";
import { useActionState, useRef, useState } from "react";
import { Boton } from "@/components/ui/boton";
import { Campo } from "@/components/ui/campo";
import { EnlaceCompartir } from "@/components/ui/enlace-compartir";
import { MensajeError } from "@/components/ui/mensaje-error";
import { ETIQUETA_ROL, type Rol } from "@/lib/auth/permisos";
import { invitarUsuario } from "./actions";

const ROLES: Rol[] = ["recepcion", "estilista", "asistente", "admin"];

export function InvitarUsuario({ sucursal }: { sucursal: string }) {
  const dialogo = useRef<HTMLDialogElement>(null);
  // Cambiar la "key" reinicia el formulario para invitar a otra persona.
  const [intento, setIntento] = useState(0);

  return (
    <>
      <button
        type="button"
        onClick={() => dialogo.current?.showModal()}
        className="inline-flex items-center gap-2 rounded-lg bg-ink px-4 py-2.5 text-xs uppercase tracking-[0.16em] text-ivory hover:bg-ink/85"
      >
        <UserPlus className="h-4 w-4" /> Invitar usuario
      </button>

      <dialog
        ref={dialogo}
        className="m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl bg-background p-0 backdrop:bg-ink/60"
      >
        <div className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="font-display text-2xl">Invitar usuario</h2>
              <p className="mt-1 text-sm text-muted">Tendrá acceso a {sucursal}.</p>
            </div>
            <button
              type="button"
              onClick={() => dialogo.current?.close()}
              aria-label="Cerrar"
              className="rounded-md p-1 text-muted hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <Formulario key={intento} otraVez={() => setIntento((n) => n + 1)} />
        </div>
      </dialog>
    </>
  );
}

function Formulario({ otraVez }: { otraVez: () => void }) {
  const [estado, accion, pendiente] = useActionState(invitarUsuario, undefined);

  if (estado?.enlace) {
    return (
      <div className="mt-6 space-y-4">
        <p className="text-sm text-emerald-700">{estado.ok}</p>
        <EnlaceCompartir enlace={estado.enlace} nombre={estado.nombre} />
        <Boton type="button" variante="secundario" onClick={otraVez}>
          Invitar a otra persona
        </Boton>
      </div>
    );
  }

  return (
    <form action={accion} className="mt-6 space-y-4">
      <Campo etiqueta="Nombre completo" name="nombre" required maxLength={120} />
      <Campo etiqueta="Correo" name="email" type="email" required maxLength={254} />
      <label className="block">
        <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.18em] text-muted">
          Rol
        </span>
        <select
          name="rol"
          defaultValue="recepcion"
          className="block w-full rounded-lg border border-line bg-surface px-4 py-3 text-base outline-none focus:border-gold"
        >
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {ETIQUETA_ROL[r]}
            </option>
          ))}
        </select>
      </label>
      {estado?.ok && <p className="text-sm text-emerald-700">{estado.ok}</p>}
      <MensajeError>{estado?.error}</MensajeError>
      <Boton type="submit" cargando={pendiente}>
        Crear invitación
      </Boton>
      <p className="text-xs text-muted">
        Se genera un enlace para que la persona cree su contraseña. Tú se lo envías por WhatsApp o
        como prefieras.
      </p>
    </form>
  );
}
