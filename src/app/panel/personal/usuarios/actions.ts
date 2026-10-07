"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  limiteFijo,
  nivelPermitido,
  type ModuloApp,
  type NivelPermiso,
  type Rol,
} from "@/lib/auth/permisos";
import { requirePanel } from "@/lib/auth/sesion";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { urlBase } from "@/lib/url";

const RUTA = "/panel/personal/usuarios";

const rolSchema = z.enum(["admin", "recepcion", "estilista", "asistente"]);
const moduloSchema = z.enum([
  "agenda", "clientes", "servicios", "personal", "productos",
  "ventas", "caja", "finanzas", "reportes", "configuracion",
]);
const nivelSchema = z.enum(["ninguno", "lectura", "total"]);

export type Resultado = { ok?: string; error?: string; enlace?: string; nombre?: string } | undefined;

/** Solo un admin de la sucursal actual gestiona usuarios. */
async function requireAdmin() {
  const ctx = await requirePanel();
  if (ctx.rol !== "admin") throw new Error("Solo un administrador puede gestionar usuarios.");
  return ctx;
}

async function enlaceAcceso(tokenHash: string, tipo: "invite" | "recovery") {
  return `${await urlBase()}/auth/confirmar?token_hash=${encodeURIComponent(tokenHash)}&type=${tipo}`;
}

// ---------------------------------------------------------------------
// Invitar
// ---------------------------------------------------------------------
const invitarSchema = z.object({
  nombre: z.string().trim().min(2, { error: "Escribe el nombre completo." }).max(120),
  email: z.email({ error: "Escribe un correo válido." }).max(254).transform((e) => e.toLowerCase()),
  rol: rolSchema,
});

export async function invitarUsuario(_prev: Resultado, formData: FormData): Promise<Resultado> {
  let ctx;
  try {
    ctx = await requireAdmin();
  } catch (e) {
    return { error: (e as Error).message };
  }

  const parsed = invitarSchema.safeParse({
    nombre: formData.get("nombre"),
    email: formData.get("email"),
    rol: formData.get("rol"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const { nombre, email, rol } = parsed.data;

  const admin = createAdminClient();
  const supabase = await createClient();

  // ¿Ya tiene cuenta (por ejemplo, en otra sucursal)? Entonces solo se le da acceso aquí.
  const { data: existente } = await admin
    .from("perfiles")
    .select("id, es_dueno")
    .eq("email", email)
    .maybeSingle();

  if (existente?.es_dueno) return { error: "Ese correo es del propietario; ya tiene acceso a todo." };

  let usuarioId = existente?.id;
  let enlace: string | undefined;
  let creado = false;

  if (!usuarioId) {
    const { data, error } = await admin.auth.admin.generateLink({
      type: "invite",
      email,
      options: { data: { nombre_completo: nombre } },
    });
    if (error || !data.user) return { error: "No se pudo crear la invitación. Revisa el correo." };
    usuarioId = data.user.id;
    creado = true;
    enlace = await enlaceAcceso(data.properties.hashed_token, "invite");
  }

  // El acceso se crea con la sesión del admin: la base de datos verifica que sea admin de esta sucursal.
  const { error: errorAcceso } = await supabase
    .from("accesos")
    .insert({ usuario_id: usuarioId, sucursal_id: ctx.sucursal.id, rol });

  if (errorAcceso) {
    if (creado) await admin.auth.admin.deleteUser(usuarioId);
    if (errorAcceso.code === "23505") return { error: "Esa persona ya tiene acceso a esta sucursal." };
    return { error: "No se pudo dar el acceso." };
  }

  revalidatePath(RUTA);
  return creado
    ? { ok: "Invitación creada.", enlace, nombre }
    : { ok: `${nombre} ya tenía cuenta: ahora también tiene acceso a ${ctx.sucursal.nombre}.` };
}

// ---------------------------------------------------------------------
// Cambiar rol / activar / desactivar
// ---------------------------------------------------------------------
async function accesoDeOtro(accesoId: string) {
  const ctx = await requireAdmin();
  const supabase = await createClient();
  const { data: acceso } = await supabase
    .from("accesos")
    .select("id, usuario_id, sucursal_id")
    .eq("id", accesoId)
    .eq("sucursal_id", ctx.sucursal.id)
    .maybeSingle();
  if (!acceso) throw new Error("Usuario no encontrado.");
  if (acceso.usuario_id === ctx.usuario.id) {
    throw new Error("No puedes cambiar tu propio acceso. Pídeselo a otro administrador.");
  }
  return { ctx, supabase, acceso };
}

export async function cambiarRol(accesoId: string, rol: Rol): Promise<Resultado> {
  try {
    const parsedRol = rolSchema.parse(rol);
    const { supabase, acceso } = await accesoDeOtro(z.guid().parse(accesoId));
    const { error } = await supabase.from("accesos").update({ rol: parsedRol }).eq("id", acceso.id);
    if (error) return { error: "No se pudo cambiar el rol." };
    revalidatePath(RUTA);
    return { ok: "Rol actualizado." };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export async function cambiarActivo(accesoId: string, activo: boolean): Promise<Resultado> {
  try {
    const { supabase, acceso } = await accesoDeOtro(z.guid().parse(accesoId));
    const { error } = await supabase
      .from("accesos")
      .update({ activo: z.boolean().parse(activo) })
      .eq("id", acceso.id);
    if (error) return { error: "No se pudo cambiar el estado." };
    revalidatePath(RUTA);
    return { ok: activo ? "Usuario activado." : "Usuario desactivado." };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

// ---------------------------------------------------------------------
// Enlace de acceso (crear o restablecer contraseña)
// ---------------------------------------------------------------------
export async function generarEnlaceAcceso(accesoId: string): Promise<Resultado> {
  try {
    const { ctx, acceso } = await accesoDeOtro(z.guid().parse(accesoId));
    const admin = createAdminClient();

    const { data: perfil } = await admin
      .from("perfiles")
      .select("email, nombre_completo, es_dueno")
      .eq("id", acceso.usuario_id)
      .single();
    if (!perfil?.email || perfil.es_dueno) return { error: "No se puede generar un enlace para esta cuenta." };

    // Un enlace de acceso permite entrar a la cuenta: para otro administrador solo lo genera el dueño.
    const { data: rolesAdmin } = await admin
      .from("accesos")
      .select("id")
      .eq("usuario_id", acceso.usuario_id)
      .eq("rol", "admin");
    if ((rolesAdmin ?? []).length > 0 && !ctx.esDueno) {
      return { error: "Para otro administrador, solo el propietario puede generar el enlace." };
    }

    const { data, error } = await admin.auth.admin.generateLink({ type: "recovery", email: perfil.email });
    if (error) return { error: "No se pudo generar el enlace." };

    await admin.from("auditoria").insert({
      sucursal_id: ctx.sucursal.id,
      tabla: "enlace_acceso",
      registro_id: acceso.usuario_id,
      accion: "editar",
      usuario_id: ctx.usuario.id,
      datos_despues: { motivo: "enlace para crear o restablecer contraseña" },
    });

    return {
      ok: "Enlace generado.",
      enlace: await enlaceAcceso(data.properties.hashed_token, "recovery"),
      nombre: perfil.nombre_completo,
    };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

// ---------------------------------------------------------------------
// Matriz de permisos por rol (solo el dueño)
// ---------------------------------------------------------------------
export async function cambiarPermisoRol(rol: Rol, modulo: ModuloApp, nivel: NivelPermiso): Promise<Resultado> {
  const ctx = await requirePanel();
  if (!ctx.esDueno) return { error: "Solo el propietario puede cambiar la matriz de permisos." };

  const parsed = z
    .object({ rol: rolSchema.exclude(["admin"]), modulo: moduloSchema, nivel: nivelSchema })
    .safeParse({ rol, modulo, nivel });
  if (!parsed.success) return { error: "Datos no válidos." };
  if (!nivelPermitido(parsed.data.nivel, limiteFijo(parsed.data.rol, parsed.data.modulo))) {
    return { error: "Ese permiso está bloqueado por un límite fijo." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("permisos_rol")
    .update({ nivel: parsed.data.nivel })
    .eq("rol", parsed.data.rol)
    .eq("modulo", parsed.data.modulo)
    .select("rol");
  if (error || !data?.length) return { error: "No se pudo guardar." };

  revalidatePath(RUTA);
  return { ok: "Permiso actualizado." };
}

// ---------------------------------------------------------------------
// Ajustes personales (admin de la sucursal)
// ---------------------------------------------------------------------
export async function cambiarPermisoPersonal(
  usuarioId: string,
  modulo: ModuloApp,
  nivel: NivelPermiso | "rol",
): Promise<Resultado> {
  try {
    const ctx = await requireAdmin();
    const id = z.guid().parse(usuarioId);
    const mod = moduloSchema.parse(modulo);
    if (id === ctx.usuario.id) return { error: "No puedes cambiar tus propios permisos." };

    const supabase = await createClient();
    const { data: acceso } = await supabase
      .from("accesos")
      .select("rol")
      .eq("usuario_id", id)
      .eq("sucursal_id", ctx.sucursal.id)
      .maybeSingle();
    if (!acceso) return { error: "Usuario no encontrado." };

    if (nivel === "rol") {
      const { error } = await supabase
        .from("permisos_usuario")
        .delete()
        .eq("usuario_id", id)
        .eq("sucursal_id", ctx.sucursal.id)
        .eq("modulo", mod);
      if (error) return { error: "No se pudo guardar." };
    } else {
      const niv = nivelSchema.parse(nivel);
      if (!nivelPermitido(niv, limiteFijo(acceso.rol, mod))) {
        return { error: "Ese permiso está bloqueado por un límite fijo." };
      }
      // Solo la columna "nivel" se puede actualizar, así que no se usa upsert.
      const { data: actual } = await supabase
        .from("permisos_usuario")
        .select("id")
        .eq("usuario_id", id)
        .eq("sucursal_id", ctx.sucursal.id)
        .eq("modulo", mod)
        .maybeSingle();
      const { error } = actual
        ? await supabase.from("permisos_usuario").update({ nivel: niv }).eq("id", actual.id)
        : await supabase
            .from("permisos_usuario")
            .insert({ usuario_id: id, sucursal_id: ctx.sucursal.id, modulo: mod, nivel: niv });
      if (error) return { error: "No se pudo guardar." };
    }

    revalidatePath(`${RUTA}/${id}`);
    return { ok: "Permiso actualizado." };
  } catch (e) {
    return { error: (e as Error).message };
  }
}
