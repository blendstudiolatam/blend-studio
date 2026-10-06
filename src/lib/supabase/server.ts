import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { requirePublicEnv } from "@/lib/env";

/**
 * Cliente de Supabase para el servidor (Server Components, Server Actions, Route Handlers).
 * Actúa con la sesión del usuario, así que las reglas RLS se aplican siempre.
 */
export async function createClient() {
  const env = requirePublicEnv();
  const cookieStore = await cookies();

  return createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Llamado desde un Server Component: no puede escribir cookies.
            // El proxy se encarga de renovar la sesión, así que es seguro ignorarlo.
          }
        },
      },
    },
  );
}
