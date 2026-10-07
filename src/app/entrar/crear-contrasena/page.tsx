import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PantallaAcceso } from "@/components/auth/pantalla-acceso";
import { getCuenta } from "@/lib/auth/sesion";
import { FormularioContrasena } from "./formulario";

export const metadata: Metadata = { title: "Crear contraseña" };

export default async function CrearContrasenaPage() {
  const cuenta = await getCuenta();
  if (!cuenta) redirect("/entrar");

  return (
    <PantallaAcceso
      titulo="Crea tu contraseña"
      subtitulo={`Hola ${cuenta.nombre.split(" ")[0]}. Usa al menos 10 caracteres y no la compartas.`}
    >
      <FormularioContrasena />
    </PantallaAcceso>
  );
}
