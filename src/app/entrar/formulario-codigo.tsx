"use client";

import { useActionState } from "react";
import { Boton } from "@/components/ui/boton";
import { Campo } from "@/components/ui/campo";
import { MensajeError } from "@/components/ui/mensaje-error";
import { cerrarSesion, verificarCodigo } from "./actions";

export function FormularioCodigo() {
  const [estado, accion, pendiente] = useActionState(verificarCodigo, undefined);

  return (
    <div className="space-y-6">
      <form action={accion} className="space-y-5">
        <Campo
          etiqueta="Código de 6 números"
          name="codigo"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="\d{6}"
          maxLength={6}
          required
          autoFocus
          className="text-center font-mono text-2xl tracking-[0.5em]"
        />
        <MensajeError>{estado?.error}</MensajeError>
        <Boton type="submit" cargando={pendiente}>
          Verificar
        </Boton>
      </form>
      <form action={cerrarSesion}>
        <Boton type="submit" variante="secundario">
          Usar otra cuenta
        </Boton>
      </form>
    </div>
  );
}
