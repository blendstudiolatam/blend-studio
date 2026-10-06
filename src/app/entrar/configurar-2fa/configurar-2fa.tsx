"use client";

import { useActionState, useTransition, useState } from "react";
import { Boton } from "@/components/ui/boton";
import { Campo } from "@/components/ui/campo";
import { MensajeError } from "@/components/ui/mensaje-error";
import { cerrarSesion, confirmarQr, generarQr, type EstadoConfiguracion } from "../actions";

export function Configurar2fa() {
  const [qr, setQr] = useState<EstadoConfiguracion>();
  const [generando, iniciar] = useTransition();
  const [estado, accion, confirmando] = useActionState(confirmarQr, undefined);
  const [verSecreto, setVerSecreto] = useState(false);

  const datos = estado?.factorId ? estado : qr;

  if (!datos?.factorId) {
    return (
      <div className="space-y-5">
        <ol className="space-y-3 text-sm text-foreground/80">
          <li>
            <strong className="font-medium">1.</strong> Instala en tu celular Google
            Authenticator o Microsoft Authenticator.
          </li>
          <li>
            <strong className="font-medium">2.</strong> Pulsa el botón para generar tu código
            QR personal.
          </li>
        </ol>
        <MensajeError>{qr?.error}</MensajeError>
        <Boton
          type="button"
          cargando={generando}
          onClick={() => iniciar(async () => setQr(await generarQr()))}
        >
          Generar código QR
        </Boton>
        <form action={cerrarSesion}>
          <Boton type="submit" variante="secundario">
            Cancelar
          </Boton>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-line bg-surface p-5">
        <p className="text-sm text-foreground/80">
          En la app, pulsa <strong className="font-medium">+</strong> y escanea este código:
        </p>
        {/* El QR llega como imagen SVG en formato data: desde Supabase. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={datos.qr}
          alt="Código QR para la app de autenticación"
          width={200}
          height={200}
          className="mx-auto mt-4 h-48 w-48 rounded-md bg-white p-2"
        />
        <button
          type="button"
          onClick={() => setVerSecreto((v) => !v)}
          className="mt-4 w-full text-center text-xs text-muted underline underline-offset-4"
        >
          {verSecreto ? "Ocultar clave" : "¿No puedes escanear? Ver clave para escribirla"}
        </button>
        {verSecreto && (
          <p className="mt-2 break-all rounded-md bg-background p-3 text-center font-mono text-sm">
            {datos.secreto}
          </p>
        )}
      </div>

      <form action={accion} className="space-y-5">
        <input type="hidden" name="factorId" value={datos.factorId} />
        <Campo
          etiqueta="Escribe el código que muestra la app"
          name="codigo"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="\d{6}"
          maxLength={6}
          required
          className="text-center font-mono text-2xl tracking-[0.5em]"
        />
        <MensajeError>{estado?.error}</MensajeError>
        <Boton type="submit" cargando={confirmando}>
          Activar y entrar
        </Boton>
      </form>
    </div>
  );
}
