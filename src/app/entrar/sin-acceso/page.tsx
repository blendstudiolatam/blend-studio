import type { Metadata } from "next";
import { PantallaAcceso } from "@/components/auth/pantalla-acceso";
import { Boton } from "@/components/ui/boton";
import { cerrarSesion } from "../actions";

export const metadata: Metadata = { title: "Sin acceso" };

export default function SinAccesoPage() {
  return (
    <PantallaAcceso
      titulo="Aún no tienes acceso"
      subtitulo="Tu cuenta no está asignada a ninguna sucursal. Pide al administrador que te dé acceso."
    >
      <form action={cerrarSesion}>
        <Boton type="submit" variante="secundario">
          Cerrar sesión
        </Boton>
      </form>
    </PantallaAcceso>
  );
}
