import "server-only";
import { getPublicEnv } from "@/lib/env";

export type SupabaseStatus = "sin-configurar" | "conectado" | "error";

/** Comprueba si el proyecto de Supabase responde con las claves configuradas. */
export async function checkSupabase(): Promise<SupabaseStatus> {
  const env = getPublicEnv();
  if (!env) return "sin-configurar";

  try {
    const res = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/health`, {
      headers: { apikey: env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY },
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    return res.ok ? "conectado" : "error";
  } catch {
    return "error";
  }
}
