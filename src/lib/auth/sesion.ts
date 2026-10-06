import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export type Rol = "admin" | "recepcion" | "estilista";

export type SucursalConRol = { id: string; nombre: string; rol: Rol };

export const COOKIE_SUCURSAL = "sucursal";

/** Usuario con sesión (JWT verificado), o null. */
export const getUsuario = cache(async () => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims?.sub) return null;
  return {
    id: data.claims.sub,
    email: typeof data.claims.email === "string" ? data.claims.email : "",
    aal: data.claims.aal === "aal2" ? ("aal2" as const) : ("aal1" as const),
  };
});

/**
 * Datos básicos del usuario y si debe usar verificación en dos pasos.
 * Funciona incluso antes de completar los 2 pasos (solo lee su propio perfil y accesos).
 */
export const getCuenta = cache(async () => {
  const usuario = await getUsuario();
  if (!usuario) return null;

  const supabase = await createClient();
  const [perfil, accesos] = await Promise.all([
    supabase
      .from("perfiles")
      .select("nombre_completo, es_dueno")
      .eq("id", usuario.id)
      .single(),
    supabase
      .from("accesos")
      .select("rol")
      .eq("usuario_id", usuario.id)
      .eq("activo", true),
  ]);

  const esDueno = perfil.data?.es_dueno === true;
  const esAdmin = (accesos.data ?? []).some((a) => a.rol === "admin");

  return {
    usuario,
    nombre: perfil.data?.nombre_completo || usuario.email,
    esDueno,
    requiere2fa: esDueno || esAdmin,
  };
});

/** ¿Tiene el usuario una app de autenticación ya configurada? */
export async function tieneFactorVerificado(): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase.auth.mfa.listFactors();
  return (data?.totp ?? []).length > 0;
}

/** A dónde debe ir alguien que acaba de poner su contraseña. */
export async function destinoTrasContrasena(): Promise<string> {
  const cuenta = await getCuenta();
  if (!cuenta) return "/entrar";
  if (cuenta.usuario.aal === "aal2") return "/panel";
  if (await tieneFactorVerificado()) return "/entrar/verificar";
  if (cuenta.requiere2fa) return "/entrar/configurar-2fa";
  return "/panel";
}

/**
 * Exige sesión completa: contraseña + 2 pasos cuando el rol lo requiere.
 * Si falta algo, redirige al paso correspondiente.
 */
export const requireCuentaCompleta = cache(async () => {
  const cuenta = await getCuenta();
  if (!cuenta) redirect("/entrar");
  if (cuenta.usuario.aal !== "aal2") {
    const destino = await destinoTrasContrasena();
    if (destino !== "/panel") redirect(destino);
  }
  return cuenta;
});

/** Sucursales a las que el usuario tiene acceso, con su rol en cada una. */
export const getSucursales = cache(async (): Promise<SucursalConRol[]> => {
  const cuenta = await requireCuentaCompleta();
  const supabase = await createClient();

  if (cuenta.esDueno) {
    // RLS ya devuelve todas las sucursales al dueño (con 2 pasos completados).
    const { data } = await supabase
      .from("sucursales")
      .select("id, nombre")
      .eq("activa", true)
      .order("nombre");
    return (data ?? []).map((s) => ({ ...s, rol: "admin" as const }));
  }

  const { data } = await supabase
    .from("accesos")
    .select("rol, sucursal:sucursales!inner(id, nombre, activa)")
    .eq("usuario_id", cuenta.usuario.id)
    .eq("activo", true)
    .eq("sucursal.activa", true);

  return (data ?? [])
    .map((a) => ({ id: a.sucursal.id, nombre: a.sucursal.nombre, rol: a.rol as Rol }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
});

/**
 * Exige sesión completa y una sucursal elegida. Devuelve el contexto de trabajo.
 * Los permisos reales los vuelve a comprobar la base de datos con RLS.
 */
export const requirePanel = cache(async () => {
  const cuenta = await requireCuentaCompleta();
  const sucursales = await getSucursales();
  if (sucursales.length === 0) redirect("/entrar/sin-acceso");

  const elegida = (await cookies()).get(COOKIE_SUCURSAL)?.value;
  const actual =
    sucursales.find((s) => s.id === elegida) ??
    (sucursales.length === 1 ? sucursales[0] : undefined);
  if (!actual) redirect("/seleccionar-sucursal");

  return { ...cuenta, sucursales, sucursal: actual, rol: actual.rol };
});
