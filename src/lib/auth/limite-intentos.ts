import "server-only";
import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";

/** Identificador del intento: el correo (u otra clave) se guarda como hash, no en texto. */
export function claveIntento(valor: string): string {
  return createHash("sha256").update(valor.trim().toLowerCase()).digest("hex");
}

export async function ipCliente(): Promise<string> {
  const h = await headers();
  const reenviada = h.get("x-forwarded-for")?.split(",")[0]?.trim();
  return reenviada || h.get("x-real-ip") || "desconocida";
}

/** Segundos que faltan para poder intentar de nuevo (0 = permitido). */
export async function segundosDeEspera(clave: string, ip: string): Promise<number> {
  const { data, error } = await createAdminClient().rpc("login_espera_segundos", {
    p_email_hash: clave,
    p_ip: ip,
  });
  if (error) throw new Error("No se pudo verificar el límite de intentos");
  return Number(data) || 0;
}

export async function registrarIntento(clave: string, ip: string, exito: boolean) {
  const { error } = await createAdminClient().rpc("login_registrar_intento", {
    p_email_hash: clave,
    p_ip: ip,
    p_exito: exito,
  });
  if (error) throw new Error("No se pudo registrar el intento");
}

export function mensajeEspera(segundos: number): string {
  const minutos = Math.max(1, Math.ceil(segundos / 60));
  return `Demasiados intentos fallidos. Intenta de nuevo en ${minutos} ${minutos === 1 ? "minuto" : "minutos"}.`;
}
