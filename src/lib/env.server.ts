import "server-only";
import { z } from "zod";

// Variables SECRETAS: solo existen en el servidor. Nunca usar NEXT_PUBLIC_ aquí.
const serverEnvSchema = z.object({
  SUPABASE_SECRET_KEY: z.string().startsWith("sb_secret_"),
});

export function requireServerEnv() {
  const parsed = serverEnvSchema.safeParse({
    SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY,
  });
  if (!parsed.success) {
    throw new Error("Falta SUPABASE_SECRET_KEY en .env.local (ver .env.example).");
  }
  return parsed.data;
}
