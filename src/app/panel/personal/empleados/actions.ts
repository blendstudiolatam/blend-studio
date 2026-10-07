"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import sharp from "sharp";
import { z } from "zod";
import { requireModulo } from "@/lib/auth/sesion";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { urlBase } from "@/lib/url";

export type Resultado = { ok?: string; error?: string; aviso?: string; id?: string; fotoPath?: string; enlace?: string } | undefined;

const RUTA = "/panel/personal/empleados";
const idSchema = z.guid();
const rolSchema = z.enum(["admin", "recepcion", "estilista", "asistente"]);

const opcional = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .optional();

const empleadoSchema = z.object({
  nombre: z.string().trim().min(1, { error: "Escribe el nombre." }).max(60),
  apellido: z.string().trim().max(60).optional(),
  email: z
    .union([z.literal(""), z.email({ error: "Correo no válido." }).max(254)])
    .transform((v) => (v === "" ? null : v.toLowerCase()))
    .nullable()
    .optional(),
  telefono: opcional(30),
  rol: rolSchema,
  especialidad: opcional(80),
  comision_pct: z.coerce.number().min(0, { error: "La comisión va de 0 a 100." }).max(100, { error: "La comisión va de 0 a 100." }),
  estado: z.enum(["activo", "vacaciones", "inactivo"]),
  reserva_web: z.boolean(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, { error: "Color no válido." }),
});
export type DatosEmpleado = z.input<typeof empleadoSchema>;

const permisoError = (code?: string) =>
  code === "42501" ? "No tienes permiso para hacer este cambio." : "No se pudo guardar.";

// ---------------------------------------------------------------------
// Crear y editar
// ---------------------------------------------------------------------
export async function crearEmpleado(datos: DatosEmpleado): Promise<Resultado> {
  const ctx = await requireModulo("personal", true);
  const parsed = empleadoSchema.safeParse(datos);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("empleados")
    .insert({ ...parsed.data, apellido: parsed.data.apellido ?? "", sucursal_id: ctx.sucursal.id })
    .select("id")
    .single();
  if (error || !data) return { error: permisoError(error?.code) };
  revalidatePath(RUTA);
  return { ok: "Empleado creado.", id: data.id };
}

export async function guardarEmpleado(id: string, datos: DatosEmpleado): Promise<Resultado> {
  const ctx = await requireModulo("personal", true);
  const empId = idSchema.safeParse(id);
  const parsed = empleadoSchema.safeParse(datos);
  if (!empId.success) return { error: "Empleado no válido." };
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("empleados")
    .update({ ...parsed.data, apellido: parsed.data.apellido ?? "" })
    .eq("id", empId.data)
    .eq("sucursal_id", ctx.sucursal.id)
    .select("usuario_id")
    .single();
  if (error || !data) return { error: permisoError(error?.code) };

  // Si tiene usuario, su rol en el sistema sigue al rol del empleado.
  let aviso: string | undefined;
  if (data.usuario_id) {
    const { data: acc } = await supabase
      .from("accesos")
      .update({ rol: parsed.data.rol })
      .eq("usuario_id", data.usuario_id)
      .eq("sucursal_id", ctx.sucursal.id)
      .select("id");
    if (!acc?.length) aviso = "El rol del empleado cambió, pero su acceso al sistema solo lo cambia un administrador en Usuarios.";
  }
  revalidatePath(RUTA, "layout");
  return { ok: "Guardado", aviso };
}

export async function eliminarEmpleado(id: string): Promise<Resultado> {
  const ctx = await requireModulo("personal", true);
  const empId = idSchema.safeParse(id);
  if (!empId.success) return { error: "Empleado no válido." };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("empleados")
    .delete()
    .eq("id", empId.data)
    .eq("sucursal_id", ctx.sucursal.id)
    .select("foto_path");
  if (error || !data?.length) return { error: permisoError(error?.code) };
  if (data[0].foto_path) await supabase.storage.from("equipo").remove([data[0].foto_path]);
  revalidatePath(RUTA);
  return { ok: "Empleado eliminado." };
}

// ---------------------------------------------------------------------
// Foto
// ---------------------------------------------------------------------
export async function subirFotoEmpleado(id: string, formData: FormData): Promise<Resultado> {
  const ctx = await requireModulo("personal", true);
  const empId = idSchema.safeParse(id);
  if (!empId.success) return { error: "Empleado no válido." };
  const archivo = formData.get("foto");
  if (!(archivo instanceof File) || archivo.size === 0) return { error: "Elige una foto." };
  if (!["image/png", "image/jpeg", "image/webp"].includes(archivo.type)) return { error: "Usa una foto PNG, JPG o WebP." };
  if (archivo.size > 3 * 1024 * 1024) return { error: "La foto pesa más de 3 MB." };

  let webp: Buffer;
  try {
    webp = await sharp(Buffer.from(await archivo.arrayBuffer()), { limitInputPixels: 40_000_000 })
      .rotate()
      .resize(600, 600, { fit: "cover", position: "attention" })
      .webp({ quality: 82 })
      .toBuffer();
  } catch {
    return { error: "No se pudo leer la foto." };
  }

  const supabase = await createClient();
  const { data: actual } = await supabase
    .from("empleados")
    .select("foto_path")
    .eq("id", empId.data)
    .eq("sucursal_id", ctx.sucursal.id)
    .single();
  if (!actual) return { error: "Empleado no encontrado." };

  const path = `fotos/${randomUUID()}.webp`;
  const { error: errSubida } = await supabase.storage
    .from("equipo")
    .upload(path, webp, { contentType: "image/webp", cacheControl: "31536000" });
  if (errSubida) return { error: "No se pudo subir la foto." };

  const { error } = await supabase.from("empleados").update({ foto_path: path }).eq("id", empId.data);
  if (error) {
    await supabase.storage.from("equipo").remove([path]);
    return { error: "No se pudo guardar la foto." };
  }
  if (actual.foto_path) await supabase.storage.from("equipo").remove([actual.foto_path]);
  revalidatePath(RUTA, "layout");
  return { ok: "Foto actualizada.", fotoPath: path };
}

// ---------------------------------------------------------------------
// Horario y días libres
// ---------------------------------------------------------------------
const hora = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d(:00)?$/);
const horarioSchema = z
  .array(
    z
      .object({ dia_semana: z.number().int().min(0).max(6), trabaja: z.boolean(), entrada: hora, salida: hora })
      .refine((d) => !d.trabaja || d.salida.slice(0, 5) > d.entrada.slice(0, 5), {
        error: "La salida debe ser después de la entrada.",
      }),
  )
  .length(7);

export async function guardarHorarioEmpleado(id: string, dias: z.input<typeof horarioSchema>): Promise<Resultado> {
  await requireModulo("personal", true);
  const empId = idSchema.safeParse(id);
  const parsed = horarioSchema.safeParse(dias);
  if (!empId.success) return { error: "Empleado no válido." };
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const supabase = await createClient();
  for (const d of parsed.data) {
    const { data, error } = await supabase
      .from("horarios_empleado")
      .update({ trabaja: d.trabaja, entrada: d.entrada, salida: d.salida })
      .eq("empleado_id", empId.data)
      .eq("dia_semana", d.dia_semana)
      .select("id");
    if (error || !data?.length) return { error: permisoError(error?.code) };
  }
  revalidatePath(RUTA);
  return { ok: "Guardado" };
}

const bloqueoSchema = z
  .object({
    desde: z.iso.date({ error: "Fecha no válida." }),
    hasta: z.iso.date({ error: "Fecha no válida." }),
    motivo: z.string().trim().min(1, { error: "Escribe el motivo." }).max(80),
  })
  .refine((b) => b.hasta >= b.desde, { error: "La fecha final debe ser igual o posterior a la inicial." });

export async function agregarBloqueo(id: string, datos: z.input<typeof bloqueoSchema>): Promise<Resultado> {
  const ctx = await requireModulo("personal", true);
  const empId = idSchema.safeParse(id);
  const parsed = bloqueoSchema.safeParse(datos);
  if (!empId.success) return { error: "Empleado no válido." };
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const supabase = await createClient();
  const { error } = await supabase
    .from("bloqueos_empleado")
    .insert({ ...parsed.data, empleado_id: empId.data, sucursal_id: ctx.sucursal.id });
  if (error) return { error: permisoError(error.code) };
  revalidatePath(`${RUTA}/${empId.data}`);
  return { ok: "Días libres agregados." };
}

export async function quitarBloqueo(bloqueoId: string): Promise<Resultado> {
  const ctx = await requireModulo("personal", true);
  const bId = idSchema.safeParse(bloqueoId);
  if (!bId.success) return { error: "No válido." };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("bloqueos_empleado")
    .delete()
    .eq("id", bId.data)
    .eq("sucursal_id", ctx.sucursal.id)
    .select("empleado_id");
  if (error || !data?.length) return { error: permisoError(error?.code) };
  revalidatePath(`${RUTA}/${data[0].empleado_id}`);
  return { ok: "Quitado." };
}

// ---------------------------------------------------------------------
// Servicios que realiza
// ---------------------------------------------------------------------
export async function cambiarServicioEmpleado(
  empleadoId: string,
  servicioId: string,
  realiza: boolean,
): Promise<Resultado> {
  const ctx = await requireModulo("personal", true);
  const e = idSchema.safeParse(empleadoId);
  const s = idSchema.safeParse(servicioId);
  if (!e.success || !s.success) return { error: "Datos no válidos." };
  const supabase = await createClient();
  const { error } = realiza
    ? await supabase
        .from("empleado_servicios")
        .insert({ empleado_id: e.data, servicio_id: s.data, sucursal_id: ctx.sucursal.id })
    : await supabase.from("empleado_servicios").delete().eq("empleado_id", e.data).eq("servicio_id", s.data);
  if (error && error.code !== "23505") return { error: permisoError(error.code) };
  revalidatePath("/panel", "layout");
  return { ok: "Guardado" };
}

export async function comisionServicioEmpleado(
  empleadoId: string,
  servicioId: string,
  comision: number | null,
): Promise<Resultado> {
  await requireModulo("personal", true);
  const e = idSchema.safeParse(empleadoId);
  const s = idSchema.safeParse(servicioId);
  const c = z.number().min(0).max(100).nullable().safeParse(comision);
  if (!e.success || !s.success || !c.success) return { error: "La comisión va de 0 a 100." };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("empleado_servicios")
    .update({ comision_pct: c.data })
    .eq("empleado_id", e.data)
    .eq("servicio_id", s.data)
    .select("servicio_id");
  if (error || !data?.length) return { error: permisoError(error?.code) };
  return { ok: "Guardado" };
}

// ---------------------------------------------------------------------
// Acceso al sistema (crea el usuario y lo enlaza; solo administradores)
// ---------------------------------------------------------------------
export async function darAccesoSistema(id: string): Promise<Resultado> {
  const ctx = await requireModulo("personal", true);
  if (ctx.rol !== "admin") return { error: "Solo un administrador puede dar acceso al sistema." };
  const empId = idSchema.safeParse(id);
  if (!empId.success) return { error: "Empleado no válido." };

  const supabase = await createClient();
  const { data: emp } = await supabase
    .from("empleados")
    .select("id, nombre, apellido, email, rol, usuario_id")
    .eq("id", empId.data)
    .eq("sucursal_id", ctx.sucursal.id)
    .single();
  if (!emp) return { error: "Empleado no encontrado." };
  if (emp.usuario_id) return { error: "Ya tiene acceso al sistema." };
  if (!emp.email) return { error: "Primero escribe el correo del empleado." };

  const admin = createAdminClient();
  const nombre = `${emp.nombre} ${emp.apellido}`.trim();
  const { data: perfil } = await admin.from("perfiles").select("id, es_dueno").eq("email", emp.email).maybeSingle();
  if (perfil?.es_dueno) return { error: "Ese correo es del propietario." };

  let usuarioId = perfil?.id;
  let enlace: string | undefined;
  let creado = false;
  if (!usuarioId) {
    const { data, error } = await admin.auth.admin.generateLink({
      type: "invite",
      email: emp.email,
      options: { data: { nombre_completo: nombre } },
    });
    if (error || !data.user) return { error: "No se pudo crear el usuario. Revisa el correo." };
    usuarioId = data.user.id;
    creado = true;
    enlace = `${await urlBase()}/auth/confirmar?token_hash=${encodeURIComponent(data.properties.hashed_token)}&type=invite`;
  }

  // El acceso lo crea el admin con su sesión (la base de datos verifica que sea admin aquí).
  const { error: errAcc } = await supabase
    .from("accesos")
    .insert({ usuario_id: usuarioId, sucursal_id: ctx.sucursal.id, rol: emp.rol });
  if (errAcc && errAcc.code !== "23505") {
    if (creado) await admin.auth.admin.deleteUser(usuarioId);
    return { error: "No se pudo dar el acceso." };
  }

  // Enlace empleado ↔ usuario (columna protegida: solo el servidor la escribe).
  const { error: errLink } = await admin
    .from("empleados")
    .update({ usuario_id: usuarioId })
    .eq("id", emp.id)
    .eq("sucursal_id", ctx.sucursal.id);
  if (errLink) return { error: "Se creó el acceso, pero no se pudo enlazar con el empleado." };

  revalidatePath(RUTA, "layout");
  return creado
    ? { ok: "Acceso creado. Envíale el enlace para que cree su contraseña.", enlace }
    : { ok: "Ya tenía cuenta: ahora también tiene acceso a esta sucursal." };
}
