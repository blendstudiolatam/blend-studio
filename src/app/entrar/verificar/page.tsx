import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PantallaAcceso } from "@/components/auth/pantalla-acceso";
import { getUsuario, tieneFactorVerificado } from "@/lib/auth/sesion";
import { FormularioCodigo } from "../formulario-codigo";

export const metadata: Metadata = { title: "Verificación" };

export default async function VerificarPage() {
  const usuario = await getUsuario();
  if (!usuario) redirect("/entrar");
  if (usuario.aal === "aal2") redirect("/panel");
  if (!(await tieneFactorVerificado())) redirect("/entrar/configurar-2fa");

  return (
    <PantallaAcceso
      titulo="Verificación en dos pasos"
      subtitulo="Abre tu app de autenticación y escribe el código de Blend Studio."
    >
      <FormularioCodigo />
    </PantallaAcceso>
  );
}
