"use client";

import { useActionState } from "react";
import { Boton } from "@/components/ui/boton";
import { Campo } from "@/components/ui/campo";
import { MensajeError } from "@/components/ui/mensaje-error";
import { iniciarSesion } from "./actions";

export function FormularioEntrar() {
  const [estado, accion, pendiente] = useActionState(iniciarSesion, undefined);

  return (
    <form action={accion} className="space-y-5">
      <Campo
        etiqueta="Correo"
        name="email"
        type="email"
        autoComplete="email"
        inputMode="email"
        required
        maxLength={254}
      />
      <Campo
        etiqueta="Contraseña"
        name="password"
        type="password"
        autoComplete="current-password"
        required
        maxLength={200}
      />
      <MensajeError>{estado?.error}</MensajeError>
      <Boton type="submit" cargando={pendiente}>
        Entrar
      </Boton>
    </form>
  );
}
