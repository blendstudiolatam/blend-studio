"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireModulo } from "@/lib/auth/sesion";
import { createClient } from "@/lib/supabase/server";

export type Resultado = { ok?: string; error?: string } | undefined;

const textoOpcional = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .optional();

const categoriaSchema = z.object({
  nombre: z.string().trim().min(2, { error: "Escribe el nombre de la categoría." }).max(60),
  descripcion: textoOpcional(300),
  imagen: z.string().regex(/^[a-z0-9-]{1,40}$/).nullable().optional(),
  activa: z.boolean().optional(),
});

const servicioSchema = z
  .object({
    categoria_id: z.guid({ error: "Elige una categoría." }),
    nombre: z.string().trim().min(2, { error: "Escribe el nombre del servicio." }).max(120),
    descripcion: textoOpcional(500),
    duracion_min: z.coerce.number().int().min(5, { error: "La duración mínima es 5 minutos." }).max(600),
    precio: z.coerce.number().min(0, { error: "El precio no puede ser negativo." }).max(100000),
    precio_descuento: z
      .union([z.literal(""), z.coerce.number().min(0)])
      .transform((v) => (v === "" ? null : v))
      .nullable()
      .optional(),
    reserva_web: z.boolean().optional(),
    activo: z.boolean().optional(),
  })
  .refine((s) => s.precio_descuento == null || s.precio_descuento < s.precio, {
    error: "El precio con descuento debe ser menor al precio de lista.",
    path: ["precio_descuento"],
  });

export type DatosCategoria = z.input<typeof categoriaSchema>;
export type DatosServicio = z.input<typeof servicioSchema>;

const refrescar = () => revalidatePath("/panel/servicios", "layout");

function mensajeError(code?: string): string {
  if (code === "23505") return "Ya existe uno con ese nombre.";
  if (code === "23503") return "No se puede borrar: todavía tiene servicios.";
  if (code === "42501") return "No tienes permiso para hacer este cambio.";
  return "No se pudo guardar.";
}

// ---------------------------------------------------------------------
// Categorías
// ---------------------------------------------------------------------
export async function guardarCategoria(id: string | null, datos: DatosCategoria): Promise<Resultado> {
  const ctx = await requireModulo("servicios", true);
  const parsed = categoriaSchema.safeParse(datos);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const supabase = await createClient();

  if (id) {
    const ok = z.guid().safeParse(id);
    if (!ok.success) return { error: "Categoría no válida." };
    const { data, error } = await supabase
      .from("categorias_servicio")
      .update(parsed.data)
      .eq("id", ok.data)
      .eq("sucursal_id", ctx.sucursal.id)
      .select("id");
    if (error || !data?.length) return { error: mensajeError(error?.code) };
  } else {
    const { count } = await supabase
      .from("categorias_servicio")
      .select("id", { count: "exact", head: true })
      .eq("sucursal_id", ctx.sucursal.id);
    const { error } = await supabase
      .from("categorias_servicio")
      .insert({ ...parsed.data, sucursal_id: ctx.sucursal.id, orden: count ?? 0 });
    if (error) return { error: mensajeError(error.code) };
  }
  refrescar();
  return { ok: "Categoría guardada." };
}

export async function eliminarCategoria(id: string): Promise<Resultado> {
  const ctx = await requireModulo("servicios", true);
  const ok = z.guid().safeParse(id);
  if (!ok.success) return { error: "Categoría no válida." };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categorias_servicio")
    .delete()
    .eq("id", ok.data)
    .eq("sucursal_id", ctx.sucursal.id)
    .select("id");
  if (error || !data?.length) return { error: mensajeError(error?.code) };
  refrescar();
  return { ok: "Categoría eliminada." };
}

// ---------------------------------------------------------------------
// Servicios
// ---------------------------------------------------------------------
export async function guardarServicio(id: string | null, datos: DatosServicio): Promise<Resultado> {
  const ctx = await requireModulo("servicios", true);
  const parsed = servicioSchema.safeParse(datos);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const supabase = await createClient();

  if (id) {
    const ok = z.guid().safeParse(id);
    if (!ok.success) return { error: "Servicio no válido." };
    const { data, error } = await supabase
      .from("servicios")
      .update(parsed.data)
      .eq("id", ok.data)
      .eq("sucursal_id", ctx.sucursal.id)
      .select("id");
    if (error || !data?.length) return { error: mensajeError(error?.code) };
  } else {
    const { error } = await supabase.from("servicios").insert({ ...parsed.data, sucursal_id: ctx.sucursal.id });
    if (error) return { error: mensajeError(error.code) };
  }
  refrescar();
  return { ok: "Servicio guardado." };
}

export async function cambiarEstadoServicio(
  id: string,
  campo: "activo" | "reserva_web",
  valor: boolean,
): Promise<Resultado> {
  const ctx = await requireModulo("servicios", true);
  const ok = z.guid().safeParse(id);
  const c = z.enum(["activo", "reserva_web"]).safeParse(campo);
  if (!ok.success || !c.success) return { error: "Datos no válidos." };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("servicios")
    .update(c.data === "activo" ? { activo: z.boolean().parse(valor) } : { reserva_web: z.boolean().parse(valor) })
    .eq("id", ok.data)
    .eq("sucursal_id", ctx.sucursal.id)
    .select("id");
  if (error || !data?.length) return { error: mensajeError(error?.code) };
  refrescar();
  return { ok: "Actualizado." };
}

export async function eliminarServicio(id: string): Promise<Resultado> {
  const ctx = await requireModulo("servicios", true);
  const ok = z.guid().safeParse(id);
  if (!ok.success) return { error: "Servicio no válido." };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("servicios")
    .delete()
    .eq("id", ok.data)
    .eq("sucursal_id", ctx.sucursal.id)
    .select("id");
  if (error || !data?.length) return { error: mensajeError(error?.code) };
  refrescar();
  return { ok: "Servicio eliminado." };
}
