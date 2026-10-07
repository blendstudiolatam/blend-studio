import type { Metadata } from "next";
import { PantallaAcceso } from "@/components/auth/pantalla-acceso";
import { Boton } from "@/components/ui/boton";
import { confirmarEnlace } from "./actions";

export const metadata: Metadata = { title: "Acceso" };

/**
 * Página intermedia: el enlace solo se usa al pulsar el botón (POST).
 * Así, la vista previa que generan WhatsApp u otras apps no lo gasta.
 */
export default async function ConfirmarPage({ searchParams }: PageProps<"/auth/confirmar">) {
  const { token_hash, type, error } = await searchParams;
  const valido = typeof token_hash === "string" && (type === "invite" || type === "recovery");

  return (
    <PantallaAcceso
      titulo={type === "invite" ? "Te damos la bienvenida" : "Restablecer contraseña"}
      subtitulo={
        error
          ? undefined
          : valido
            ? "Pulsa continuar para crear tu contraseña."
            : "El enlace no es válido. Pide uno nuevo al administrador del salón."
      }
    >
      {error && (
        <p role="alert" className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          El enlace venció o ya se usó. Pide uno nuevo al administrador del salón.
        </p>
      )}
      {valido && (
        <form action={confirmarEnlace}>
          <input type="hidden" name="token_hash" value={token_hash} />
          <input type="hidden" name="type" value={type} />
          <Boton type="submit">Continuar</Boton>
        </form>
      )}
    </PantallaAcceso>
  );
}
