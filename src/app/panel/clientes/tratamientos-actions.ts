"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireModulo } from "@/lib/auth/sesion";
import { createClient } from "@/lib/supabase/server";

export type Resultado = { ok?: string; error?: string; id?: string } | undefined;

const idSchema = z.guid();
const opcionalId = z
  .union([z.literal(""), z.guid()])
  .transform((v) => (v === "" ? null : v))
  .nullable()
  .optional();
const dinero = (nombre: string) =>
  z.coerce.number({ error: `${nombre} no válido.` }).min(0, { error: `${nombre} no válido.` }).max(99_999, { error: `${nombre} no válido.` });
const sesiones = z.coerce.number().int().min(1, { error: "Mínimo 1 sesión." }).max(100, { error: "Máximo 100 sesiones." });
const frecuencia = z.coerce.number().int().min(1, { error: "La frecuencia va de 1 a 365 días." }).max(365, { error: "La frecuencia va de 1 a 365 días." });
const textoOpcional = (max: number) =>
  z
    .string()
    .trim()
    .max(max, { error: `Máximo ${max} caracteres.` })
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .optional();

const error = (code?: string, porDefecto = "No se pudo guardar.") =>
  code === "42501" ? "No tienes permiso para hacer este cambio." : code === "23514" ? "No se pueden quitar sesiones ya realizadas o pagadas." : porDefecto;

const revalidar = () => revalidatePath("/panel/clientes", "layout");

// ---------------------------------------------------------------------
// Catálogo de paquetes
// ---------------------------------------------------------------------
const paqueteSchema = z.object({
  nombre: z.string().trim().min(1, { error: "Escribe el nombre." }).max(100),
  descripcion: textoOpcional(500),
  servicio_id: opcionalId,
  sesiones,
  frecuencia_dias: frecuencia,
  precio_sesion: dinero("Precio por sesión"),
  precio_total: dinero("Precio total"),
  activo: z.boolean(),
});
export type DatosPaquete = z.input<typeof paqueteSchema>;

export async function guardarPaquete(id: string | null, datos: DatosPaquete): Promise<Resultado> {
  const ctx = await requireModulo("servicios", true);
  const parsed = paqueteSchema.safeParse(datos);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const supabase = await createClient();
  if (id) {
    const pid = idSchema.safeParse(id);
    if (!pid.success) return { error: "Paquete no válido." };
    const { data, error: e } = await supabase
      .from("paquetes")
      .update(parsed.data)
      .eq("id", pid.data)
      .eq("sucursal_id", ctx.sucursal.id)
      .select("id");
    if (e || !data?.length) return { error: error(e?.code) };
  } else {
    const { error: e } = await supabase.from("paquetes").insert({ ...parsed.data, sucursal_id: ctx.sucursal.id });
    if (e) return { error: error(e.code) };
  }
  revalidar();
  return { ok: "Paquete guardado." };
}

export async function eliminarPaquete(id: string): Promise<Resultado> {
  const ctx = await requireModulo("servicios", true);
  const pid = idSchema.safeParse(id);
  if (!pid.success) return { error: "Paquete no válido." };
  const supabase = await createClient();
  const { data, error: e } = await supabase.from("paquetes").delete().eq("id", pid.data).eq("sucursal_id", ctx.sucursal.id).select("id");
  if (e || !data?.length) return { error: error(e?.code, "No se pudo eliminar.") };
  revalidar();
  return { ok: "Paquete eliminado. Los planes que lo usaban se conservan." };
}

// ---------------------------------------------------------------------
// Planes de tratamiento
// ---------------------------------------------------------------------
const planSchema = z.object({
  paquete_id: opcionalId,
  servicio_id: opcionalId,
  profesional_id: opcionalId,
  procedimiento: z.string().trim().min(1, { error: "Escribe el procedimiento." }).max(100),
  sesiones_total: sesiones,
  frecuencia_dias: frecuencia,
  fecha_inicio: z.iso.date({ error: "Elige la fecha de inicio." }),
  precio_sesion: dinero("Precio por sesión"),
  precio_total: dinero("Total del plan"),
  estado: z.enum(["activo", "pausado", "completado", "cancelado"]).optional(),
  notas: textoOpcional(1000),
});
export type DatosPlan = z.input<typeof planSchema>;

export async function crearPlan(clienteId: string, datos: DatosPlan): Promise<Resultado> {
  const ctx = await requireModulo("clientes", true);
  const cid = idSchema.safeParse(clienteId);
  const parsed = planSchema.safeParse(datos);
  if (!cid.success) return { error: "Cliente no válido." };
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const supabase = await createClient();
  const { data, error: e } = await supabase
    .from("planes_tratamiento")
    .insert({ ...parsed.data, estado: "activo", cliente_id: cid.data, sucursal_id: ctx.sucursal.id })
    .select("id")
    .single();
  if (e || !data) return { error: error(e?.code) };
  revalidar();
  return { ok: "Plan creado.", id: data.id };
}

export async function guardarPlan(id: string, datos: DatosPlan): Promise<Resultado> {
  await requireModulo("clientes", true);
  const pid = idSchema.safeParse(id);
  const parsed = planSchema.safeParse(datos);
  if (!pid.success) return { error: "Plan no válido." };
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const supabase = await createClient();
  const { data, error: e } = await supabase.from("planes_tratamiento").update(parsed.data).eq("id", pid.data).select("id");
  if (e || !data?.length) return { error: error(e?.code) };
  revalidar();
  return { ok: "Plan guardado." };
}

export async function eliminarPlan(id: string): Promise<Resultado> {
  await requireModulo("clientes", true);
  const pid = idSchema.safeParse(id);
  if (!pid.success) return { error: "Plan no válido." };
  const supabase = await createClient();
  const { data, error: e } = await supabase.from("planes_tratamiento").delete().eq("id", pid.data).select("id");
  if (e || !data?.length) return { error: error(e?.code, "No se pudo eliminar.") };
  revalidar();
  return { ok: "Plan eliminado." };
}

const sesionSchema = z.object({
  fecha: z
    .union([z.literal(""), z.iso.date({ error: "Fecha no válida." })])
    .transform((v) => (v === "" ? null : v))
    .nullable(),
  hora: z
    .union([z.literal(""), z.string().regex(/^([01]\d|2[0-3]):[0-5]\d(:00)?$/, { error: "Hora no válida." })])
    .transform((v) => (v === "" ? null : v))
    .nullable(),
  estado: z.enum(["pendiente", "completada", "cancelada"]),
  pagada: z.boolean(),
});
export type DatosSesion = z.input<typeof sesionSchema>;

export async function guardarSesion(id: string, datos: DatosSesion): Promise<Resultado> {
  await requireModulo("clientes", true);
  const sid = idSchema.safeParse(id);
  const parsed = sesionSchema.safeParse(datos);
  if (!sid.success) return { error: "Sesión no válida." };
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const supabase = await createClient();
  const { data, error: e } = await supabase.from("sesiones_tratamiento").update(parsed.data).eq("id", sid.data).select("id");
  if (e || !data?.length) return { error: error(e?.code) };
  revalidar();
  return { ok: "Guardado" };
}
