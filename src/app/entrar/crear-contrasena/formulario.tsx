"use client";

import { useActionState } from "react";
import { Boton } from "@/components/ui/boton";
import { Campo } from "@/components/ui/campo";
import { MensajeError } from "@/components/ui/mensaje-error";
import { guardarContrasena } from "../actions";

export function FormularioContrasena() {
  const [estado, accion, pendiente] = useActionState(guardarContrasena, undefined);

  return (
    <form action={accion} className="space-y-5">
      <Campo
        etiqueta="Nueva contraseña"
        name="password"
        type="password"
        autoComplete="new-password"
        minLength={10}
        maxLength={200}
        required
      />
      <Campo
        etiqueta="Repite la contraseña"
        name="confirmacion"
        type="password"
        autoComplete="new-password"
        minLength={10}
        maxLength={200}
        required
      />
      <MensajeError>{estado?.error}</MensajeError>
      <Boton type="submit" cargando={pendiente}>
        Guardar y entrar
      </Boton>
    </form>
  );
}
