import { createBrowserClient } from "@supabase/ssr";
import { requirePublicEnv } from "@/lib/env";

/** Cliente de Supabase para componentes que corren en el navegador. */
export function createClient() {
  const env = requirePublicEnv();
  return createBrowserClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
}
