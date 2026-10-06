import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PantallaAcceso } from "@/components/auth/pantalla-acceso";
import { destinoTrasContrasena, getUsuario } from "@/lib/auth/sesion";
import { FormularioEntrar } from "./formulario-entrar";

export const metadata: Metadata = { title: "Entrar" };

export default async function EntrarPage() {
  // Si ya tiene sesión, llevarlo al paso que le corresponde.
  if (await getUsuario()) redirect(await destinoTrasContrasena());

  return (
    <PantallaAcceso titulo="Bienvenido" subtitulo="Entra con tu cuenta del salón.">
      <FormularioEntrar />
      <p className="mt-8 text-xs leading-relaxed text-muted">
        ¿Olvidaste tu contraseña o no tienes cuenta? Pide ayuda al administrador del salón.
      </p>
    </PantallaAcceso>
  );
}
