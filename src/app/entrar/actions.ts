"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  claveIntento,
  ipCliente,
  mensajeEspera,
  registrarIntento,
  segundosDeEspera,
} from "@/lib/auth/limite-intentos";
import {
  COOKIE_SUCURSAL,
  destinoTrasContrasena,
  getSucursales,
  getUsuario,
} from "@/lib/auth/sesion";
import { createClient } from "@/lib/supabase/server";

export type EstadoFormulario = { error?: string } | undefined;

const credencialesSchema = z.object({
  email: z.email({ error: "Escribe un correo válido." }).max(254),
  password: z.string().min(1, { error: "Escribe tu contraseña." }).max(200),
});

const codigoSchema = z.object({
  codigo: z
    .string()
    .trim()
    .regex(/^\d{6}$/, { error: "El código tiene 6 números." }),
});

const ERROR_GENERICO = "Correo o contraseña incorrectos.";

export async function iniciarSesion(
  _prev: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  const parsed = credencialesSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? ERROR_GENERICO };

  const { email, password } = parsed.data;
  const clave = claveIntento(email);
  const ip = await ipCliente();

  const espera = await segundosDeEspera(clave, ip);
  if (espera > 0) return { error: mensajeEspera(espera) };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  await registrarIntento(clave, ip, !error);

  if (error) return { error: ERROR_GENERICO };

  redirect(await destinoTrasContrasena());
}

/** Paso 2 para quien ya tiene la app de autenticación configurada. */
export async function verificarCodigo(
  _prev: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  const usuario = await getUsuario();
  if (!usuario) redirect("/entrar");

  const parsed = codigoSchema.safeParse({ codigo: formData.get("codigo") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const clave = claveIntento(`mfa:${usuario.id}`);
  const ip = await ipCliente();
  const espera = await segundosDeEspera(clave, ip);
  if (espera > 0) return { error: mensajeEspera(espera) };

  const supabase = await createClient();
  const { data: factores } = await supabase.auth.mfa.listFactors();
  const factor = factores?.totp[0];
  if (!factor) redirect("/entrar/configurar-2fa");

  const { error } = await supabase.auth.mfa.challengeAndVerify({
    factorId: factor.id,
    code: parsed.data.codigo,
  });
  await registrarIntento(clave, ip, !error);
  if (error) return { error: "Código incorrecto o vencido. Prueba con el código actual." };

  redirect("/panel");
}

export type EstadoConfiguracion =
  | { error?: string; factorId?: string; qr?: string; secreto?: string }
  | undefined;

/** Genera el código QR para vincular la app de autenticación. */
export async function generarQr(): Promise<EstadoConfiguracion> {
  const usuario = await getUsuario();
  if (!usuario) redirect("/entrar");

  const supabase = await createClient();
  const { data: factores } = await supabase.auth.mfa.listFactors();
  if ((factores?.totp ?? []).length > 0) redirect("/entrar/verificar");

  // Borra intentos de configuración anteriores que no se terminaron.
  for (const f of factores?.all ?? []) {
    if (f.status === "unverified") await supabase.auth.mfa.unenroll({ factorId: f.id });
  }

  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: "totp",
    friendlyName: "Blend Studio",
    issuer: "Blend Studio",
  });
  if (error || !data) return { error: "No se pudo generar el código QR. Intenta de nuevo." };

  return { factorId: data.id, qr: data.totp.qr_code, secreto: data.totp.secret };
}

const confirmarSchema = codigoSchema.extend({ factorId: z.guid() });

/** Confirma la configuración con el primer código de la app. */
export async function confirmarQr(
  prev: EstadoConfiguracion,
  formData: FormData,
): Promise<EstadoConfiguracion> {
  const usuario = await getUsuario();
  if (!usuario) redirect("/entrar");

  const parsed = confirmarSchema.safeParse({
    codigo: formData.get("codigo"),
    factorId: formData.get("factorId"),
  });
  if (!parsed.success) return { ...prev, error: parsed.error.issues[0]?.message };

  const clave = claveIntento(`mfa:${usuario.id}`);
  const ip = await ipCliente();
  const espera = await segundosDeEspera(clave, ip);
  if (espera > 0) return { ...prev, error: mensajeEspera(espera) };

  const supabase = await createClient();
  const { error } = await supabase.auth.mfa.challengeAndVerify({
    factorId: parsed.data.factorId,
    code: parsed.data.codigo,
  });
  await registrarIntento(clave, ip, !error);
  if (error) return { ...prev, error: "Código incorrecto. Revisa la app y prueba con el código actual." };

  redirect("/panel");
}

const contrasenaSchema = z
  .object({
    password: z
      .string()
      .min(10, { error: "La contraseña debe tener al menos 10 caracteres." })
      .max(200),
    confirmacion: z.string(),
  })
  .refine((d) => d.password === d.confirmacion, { error: "Las contraseñas no coinciden." });

/** Crear o cambiar la contraseña (después de abrir un enlace de invitación o de acceso). */
export async function guardarContrasena(
  _prev: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  const usuario = await getUsuario();
  if (!usuario) redirect("/entrar");

  const parsed = contrasenaSchema.safeParse({
    password: formData.get("password"),
    confirmacion: formData.get("confirmacion"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    // Con verificación en dos pasos activa, Supabase exige el código antes de cambiar la contraseña.
    if (error.code === "insufficient_aal") redirect("/entrar/verificar");
    return {
      error:
        error.code === "same_password"
          ? "Usa una contraseña distinta a la anterior."
          : "No se pudo guardar. Prueba con otra contraseña más segura.",
    };
  }

  redirect(await destinoTrasContrasena());
}

export async function elegirSucursal(formData: FormData) {
  const parsed = z.guid().safeParse(formData.get("sucursalId"));
  const sucursales = await getSucursales();
  // Solo se acepta una sucursal a la que el usuario realmente tiene acceso.
  const valida = parsed.success && sucursales.some((s) => s.id === parsed.data);
  if (!valida) redirect("/seleccionar-sucursal");

  (await cookies()).set(COOKIE_SUCURSAL, parsed.data, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 180,
  });
  redirect("/panel");
}

export async function cerrarSesion() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  (await cookies()).delete(COOKIE_SUCURSAL);
  redirect("/entrar");
}
