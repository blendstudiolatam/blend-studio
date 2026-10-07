"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import sharp from "sharp";
import { z } from "zod";
import { requirePanel } from "@/lib/auth/sesion";
import { createClient } from "@/lib/supabase/server";

export type Resultado = { ok?: string; error?: string; logoPath?: string | null } | undefined;

/** Texto opcional: recorta espacios y guarda null si queda vacío. */
const opcional = (max: number) =>
  z
    .string()
    .trim()
    .max(max, { error: `Máximo ${max} caracteres.` })
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .optional();

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/, { error: "Color no válido." });

const negocioSchema = z.object({
  nombre_comercial: z.string().trim().min(2, { error: "El nombre comercial es obligatorio." }).max(80),
  nombre_legal: opcional(120),
  ruc: z
    .string()
    .trim()
    .regex(/^[0-9A-Za-z-]{0,25}$/, { error: "El RUC solo lleva números, letras y guiones." })
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .optional(),
  dv: z
    .string()
    .trim()
    .regex(/^[0-9]{0,2}$/, { error: "El DV son 1 o 2 números." })
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .optional(),
  telefono: opcional(30),
  whatsapp: opcional(30),
  email: z
    .union([z.literal(""), z.email({ error: "Correo no válido." }).max(254)])
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .optional(),
  email_respaldo: z
    .union([z.literal(""), z.email({ error: "Correo de respaldo no válido." }).max(254)])
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .optional(),
  instagram: opcional(100),
  facebook: opcional(100),
  tiktok: opcional(100),
  sitio_web: opcional(200),
  horario_texto: opcional(200),
  mensaje_comprobante: opcional(200),
  itbms_pct: z.coerce.number().min(0, { error: "El ITBMS no puede ser negativo." }).max(100).optional(),
  color_primario: hex.optional(),
  color_acento: hex.optional(),
  color_fondo: hex.optional(),
  tipografia_titulos: z.enum(["bodoni", "playfair", "cormorant"]).optional(),
  tipografia_texto: z.enum(["jost", "montserrat", "lato"]).optional(),
});

// Cada pantalla guarda solo sus campos (Datos del negocio o Preferencias).
const negocioParcialSchema = negocioSchema.partial();
export type DatosNegocio = z.input<typeof negocioParcialSchema>;

/** Solo administradores editan los datos globales (la base de datos también lo exige). */
async function requireAdminAlguno() {
  const ctx = await requirePanel();
  const esAdmin = ctx.esDueno || ctx.sucursales.some((s) => s.rol === "admin");
  if (!esAdmin) throw new Error("Solo un administrador puede cambiar los datos del negocio.");
  return ctx;
}

export async function guardarNegocio(datos: DatosNegocio): Promise<Resultado> {
  try {
    await requireAdminAlguno();
  } catch (e) {
    return { error: (e as Error).message };
  }
  const parsed = negocioParcialSchema.safeParse(datos);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Datos no válidos." };
  if (Object.keys(parsed.data).length === 0) return { ok: "Guardado" };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("negocio")
    .update(parsed.data)
    .eq("unico", true)
    .select("id");
  if (error || !data?.length) return { error: "No se pudo guardar." };

  // Colores, tipografías y nombre se usan en toda la app.
  revalidatePath("/", "layout");
  return { ok: "Guardado" };
}

// ---------------------------------------------------------------------
// Logo
// ---------------------------------------------------------------------
const TIPOS_LOGO = ["image/png", "image/jpeg", "image/webp"];
const MAX_LOGO = 3 * 1024 * 1024;

export async function subirLogo(formData: FormData): Promise<Resultado> {
  try {
    await requireAdminAlguno();
  } catch (e) {
    return { error: (e as Error).message };
  }

  const archivo = formData.get("logo");
  if (!(archivo instanceof File) || archivo.size === 0) return { error: "Elige una imagen." };
  if (!TIPOS_LOGO.includes(archivo.type)) return { error: "Usa una imagen PNG, JPG o WebP." };
  if (archivo.size > MAX_LOGO) return { error: "La imagen pesa más de 3 MB." };

  // Se vuelve a generar la imagen: elimina metadatos y cualquier contenido extraño.
  let webp: Buffer;
  try {
    webp = await sharp(Buffer.from(await archivo.arrayBuffer()), { limitInputPixels: 40_000_000 })
      .rotate()
      .resize(800, 800, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 90 })
      .toBuffer();
  } catch {
    return { error: "No se pudo leer la imagen." };
  }

  const supabase = await createClient();
  const { data: actual } = await supabase.from("negocio").select("logo_path").eq("unico", true).single();

  const path = `logo/${randomUUID()}.webp`;
  const { error: errorSubida } = await supabase.storage
    .from("marca")
    .upload(path, webp, { contentType: "image/webp", cacheControl: "31536000", upsert: false });
  if (errorSubida) return { error: "No se pudo subir el logo." };

  const { error } = await supabase.from("negocio").update({ logo_path: path }).eq("unico", true);
  if (error) {
    await supabase.storage.from("marca").remove([path]);
    return { error: "No se pudo guardar el logo." };
  }
  if (actual?.logo_path) await supabase.storage.from("marca").remove([actual.logo_path]);

  revalidatePath("/", "layout");
  return { ok: "Logo actualizado.", logoPath: path };
}

export async function quitarLogo(): Promise<Resultado> {
  try {
    await requireAdminAlguno();
  } catch (e) {
    return { error: (e as Error).message };
  }
  const supabase = await createClient();
  const { data: actual } = await supabase.from("negocio").select("logo_path").eq("unico", true).single();
  const { error } = await supabase.from("negocio").update({ logo_path: null }).eq("unico", true);
  if (error) return { error: "No se pudo quitar el logo." };
  if (actual?.logo_path) await supabase.storage.from("marca").remove([actual.logo_path]);
  revalidatePath("/", "layout");
  return { ok: "Logo quitado. Se usa el provisional.", logoPath: null };
}

// ---------------------------------------------------------------------
// Sucursales y horarios
// ---------------------------------------------------------------------
const sucursalSchema = z.object({
  nombre: z.string().trim().min(2, { error: "El nombre de la sucursal es obligatorio." }).max(120),
  direccion: opcional(300),
  telefono: opcional(30),
});

export async function guardarSucursal(id: string, datos: z.input<typeof sucursalSchema>): Promise<Resultado> {
  await requirePanel();
  const sucursalId = z.guid().safeParse(id);
  const parsed = sucursalSchema.safeParse(datos);
  if (!sucursalId.success) return { error: "Sucursal no válida." };
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  // RLS decide: solo quien tiene Configuración con acceso total en esa sucursal.
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sucursales")
    .update(parsed.data)
    .eq("id", sucursalId.data)
    .select("id");
  if (error || !data?.length) return { error: "No tienes permiso para editar esta sucursal." };

  revalidatePath("/panel", "layout");
  return { ok: "Guardado" };
}

const hora = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d(:00)?$/, { error: "Hora no válida." });
const horarioSchema = z
  .array(
    z
      .object({ dia_semana: z.number().int().min(0).max(6), abierto: z.boolean(), apertura: hora, cierre: hora })
      .refine((d) => !d.abierto || d.cierre.slice(0, 5) > d.apertura.slice(0, 5), {
        error: "La hora de cierre debe ser después de la apertura.",
      }),
  )
  .length(7);

export async function guardarHorario(
  sucursalId: string,
  dias: z.input<typeof horarioSchema>,
): Promise<Resultado> {
  await requirePanel();
  const id = z.guid().safeParse(sucursalId);
  const parsed = horarioSchema.safeParse(dias);
  if (!id.success) return { error: "Sucursal no válida." };
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const supabase = await createClient();
  for (const d of parsed.data) {
    const { data, error } = await supabase
      .from("horarios_sucursal")
      .update({ abierto: d.abierto, apertura: d.apertura, cierre: d.cierre })
      .eq("sucursal_id", id.data)
      .eq("dia_semana", d.dia_semana)
      .select("id");
    if (error || !data?.length) return { error: "No tienes permiso para cambiar este horario." };
  }
  return { ok: "Guardado" };
}

const slug = (texto: string) =>
  texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50) || "sucursal";

export async function crearSucursal(datos: z.input<typeof sucursalSchema>): Promise<Resultado> {
  const ctx = await requirePanel();
  if (!ctx.esDueno) return { error: "Solo el propietario puede crear sucursales." };
  const parsed = sucursalSchema.safeParse(datos);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const supabase = await createClient();
  const base = slug(parsed.data.nombre);
  for (let intento = 0; intento < 5; intento++) {
    const { error } = await supabase
      .from("sucursales")
      .insert({ ...parsed.data, slug: intento === 0 ? base : `${base}-${intento + 1}` });
    if (!error) {
      revalidatePath("/panel", "layout");
      return { ok: `Sucursal "${parsed.data.nombre}" creada.` };
    }
    if (error.code !== "23505") return { error: "No se pudo crear la sucursal." };
  }
  return { error: "Ya existe una sucursal con un nombre muy parecido." };
}
