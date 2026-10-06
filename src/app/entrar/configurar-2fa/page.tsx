import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PantallaAcceso } from "@/components/auth/pantalla-acceso";
import { getUsuario, tieneFactorVerificado } from "@/lib/auth/sesion";
import { Configurar2fa } from "./configurar-2fa";

export const metadata: Metadata = { title: "Activar verificación" };

export default async function Configurar2faPage() {
  const usuario = await getUsuario();
  if (!usuario) redirect("/entrar");
  if (await tieneFactorVerificado()) redirect("/entrar/verificar");

  return (
    <PantallaAcceso
      titulo="Protege tu cuenta"
      subtitulo="Como administrador, necesitas la verificación en dos pasos. Solo se configura una vez."
    >
      <Configurar2fa />
    </PantallaAcceso>
  );
}
