import "server-only";
import { headers } from "next/headers";

/**
 * Dirección pública de la app (para enlaces que se comparten, como invitaciones).
 * En producción se fija con NEXT_PUBLIC_SITE_URL; en desarrollo se usa la del navegador.
 */
export async function urlBase(): Promise<string> {
  const fija = process.env.NEXT_PUBLIC_SITE_URL;
  if (fija) return fija.replace(/\/$/, "");
  // En producción es obligatoria: no se confía en el encabezado Host (se puede falsificar).
  if (process.env.NODE_ENV === "production") throw new Error("Falta NEXT_PUBLIC_SITE_URL en producción.");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}
