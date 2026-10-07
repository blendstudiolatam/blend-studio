import "server-only";
import { createClient } from "@supabase/supabase-js";
import { requirePublicEnv } from "@/lib/env";
import { requireServerEnv } from "@/lib/env.server";
import type { Database } from "./database.types";

/**
 * Cliente con la clave secreta (service_role). Se salta RLS, así que:
 * - Solo se usa en el servidor.
 * - Solo para tareas que no pertenecen a un usuario concreto (p. ej. límite de intentos).
 * - Nunca para leer o escribir datos de negocio en nombre de un usuario.
 *   Excepciones: archivos del almacenamiento privado "documentos" (solo después de que
 *   una función de la base de datos autorizó y registró la acción) y las funciones
 *   públicas de reserva web (reserva_*), que no exponen datos de clientes.
 */
export function createAdminClient() {
  const { NEXT_PUBLIC_SUPABASE_URL } = requirePublicEnv();
  const { SUPABASE_SECRET_KEY } = requireServerEnv();
  return createClient<Database>(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
