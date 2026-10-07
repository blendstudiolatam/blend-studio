"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({
  token_hash: z.string().min(10).max(500),
  type: z.enum(["invite", "recovery"]),
});

export async function confirmarEnlace(formData: FormData) {
  const parsed = schema.safeParse({
    token_hash: formData.get("token_hash"),
    type: formData.get("type"),
  });
  if (!parsed.success) redirect("/auth/confirmar?error=1");

  const supabase = await createClient();
  // Si había otra sesión abierta en este navegador, se cierra primero.
  await supabase.auth.signOut();
  const { error } = await supabase.auth.verifyOtp({
    token_hash: parsed.data.token_hash,
    type: parsed.data.type,
  });
  if (error) redirect(`/auth/confirmar?error=1&type=${parsed.data.type}`);

  redirect("/entrar/crear-contrasena");
}
