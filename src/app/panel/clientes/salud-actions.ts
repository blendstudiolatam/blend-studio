"use server";

import { revalidatePath } from "next/cache";
import sharp from "sharp";
import { z } from "zod";
import { requireModulo } from "@/lib/auth/sesion";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type Resultado = { ok?: string; error?: string; url?: string } | undefined;

const idSchema = z.guid();
const rutaFicha = (id: string) => `/panel/clientes/lista/${id}`;

const mensaje = (code?: string, porDefecto = "No se pudo guardar.") =>
  code === "42501" ? "No tienes permiso para esto." : code === "23514" ? "Falta el consentimiento del cliente." : porDefecto;

const texto = (max: number) => z.string().trim().max(max, { error: `Máximo ${max} caracteres.` }).optional();
const numero = (min: number, max: number, nombre: string) =>
  z
    .union([z.literal(""), z.coerce.number().min(min, { error: `${nombre} no válido.` }).max(max, { error: `${nombre} no válido.` })])
    .optional();

const historialSchema = z.object({
  consentimiento: z.boolean(),
  alergias: texto(1000),
  condiciones: texto(1000),
  observaciones: texto(2000),
  tipo_sangre: z.union([z.literal(""), z.enum(["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"])]).optional(),
  peso_kg: numero(1, 400, "Peso"),
  altura_cm: numero(30, 250, "Altura"),
  presion: z
    .string()
    .trim()
    .regex(/^(\d{2,3}\/\d{2,3})?$/, { error: "Escribe la presión como 120/80." })
    .optional(),
});
const medicamentosSchema = z
  .array(
    z.object({
      medicamento: z.string().trim().min(1, { error: "Escribe el nombre del medicamento." }).max(120),
      dosis: z.string().trim().max(80).optional(),
      desde: z.union([z.literal(""), z.iso.date({ error: "Fecha no válida." })]).optional(),
    }),
  )
  .max(30, { error: "Máximo 30 medicamentos." });

export type DatosHistorial = z.input<typeof historialSchema>;
export type Medicamento = z.input<typeof medicamentosSchema>[number];

export async function guardarHistorial(clienteId: string, datos: DatosHistorial, meds: Medicamento[]): Promise<Resultado> {
  await requireModulo("clientes");
  const id = idSchema.safeParse(clienteId);
  const h = historialSchema.safeParse(datos);
  const m = medicamentosSchema.safeParse(meds.filter((x) => x.medicamento.trim() || x.dosis?.trim()));
  if (!id.success) return { error: "Cliente no válido." };
  if (!h.success) return { error: h.error.issues[0]?.message };
  if (!m.success) return { error: m.error.issues[0]?.message };

  // Sin consentimiento se borran los datos de salud (queda solo la constancia).
  const d = h.data.consentimiento ? h.data : { consentimiento: false };
  const supabase = await createClient();
  const { error } = await supabase.rpc("guardar_historial_medico", {
    p_cliente: id.data,
    p_datos: d,
    p_medicamentos: h.data.consentimiento ? m.data : [],
  });
  if (error) return { error: mensaje(error.code) };
  revalidatePath(rutaFicha(id.data));
  return { ok: "Guardado" };
}

// ---------------------------------------------------------------------
// Documentos. Los archivos viven en un almacenamiento privado al que ningún
// usuario accede directo: la base de datos autoriza y registra cada acción,
// y solo entonces el servidor sube el archivo o firma un enlace de 5 minutos.
// ---------------------------------------------------------------------
const categoriaSchema = z.enum(["consentimiento", "estudio", "antes_despues", "receta", "identificacion", "otro"]);
const MAX_ARCHIVO = 8 * 1024 * 1024;

export async function subirDocumento(clienteId: string, formData: FormData): Promise<Resultado> {
  await requireModulo("clientes");
  const id = idSchema.safeParse(clienteId);
  const categoria = categoriaSchema.safeParse(formData.get("categoria"));
  const nombre = z.string().trim().min(1, { error: "Ponle un nombre al documento." }).max(120).safeParse(formData.get("nombre"));
  const archivo = formData.get("archivo");
  if (!id.success) return { error: "Cliente no válido." };
  if (!categoria.success) return { error: "Elige una categoría." };
  if (!nombre.success) return { error: nombre.error.issues[0]?.message };
  if (!(archivo instanceof File) || archivo.size === 0) return { error: "Elige un archivo." };
  if (archivo.size > MAX_ARCHIVO) return { error: "El archivo pesa más de 8 MB." };

  const bytes = Buffer.from(await archivo.arrayBuffer());
  let contenido: Buffer;
  let tipo: "application/pdf" | "image/webp";
  if (bytes.subarray(0, 5).toString("latin1") === "%PDF-") {
    contenido = bytes;
    tipo = "application/pdf";
  } else {
    // Fotos: se convierten a WebP (y se les quitan datos ocultos como la ubicación GPS).
    try {
      contenido = await sharp(bytes, { limitInputPixels: 60_000_000 })
        .rotate()
        .resize(2000, 2000, { fit: "inside", withoutEnlargement: true })
        .webp({ quality: 85 })
        .toBuffer();
      tipo = "image/webp";
    } catch {
      return { error: "Usa un PDF o una foto (JPG, PNG o WebP)." };
    }
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .rpc("registrar_documento", {
      p_cliente: id.data,
      p_categoria: categoria.data,
      p_nombre: nombre.data,
      p_tipo: tipo,
      p_tamano: contenido.length,
    })
    .single();
  if (error || !data) return { error: mensaje(error?.code, "No se pudo registrar el documento.") };

  const { error: errSubida } = await createAdminClient()
    .storage.from("documentos")
    .upload(data.path, contenido, { contentType: tipo, cacheControl: "0" });
  if (errSubida) {
    await supabase.rpc("eliminar_documento", { p_documento: data.id });
    return { error: "No se pudo subir el archivo." };
  }
  revalidatePath(rutaFicha(id.data));
  return { ok: "Documento guardado." };
}

export async function abrirDocumento(documentoId: string): Promise<Resultado> {
  await requireModulo("clientes");
  const id = idSchema.safeParse(documentoId);
  if (!id.success) return { error: "Documento no válido." };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("abrir_documento", { p_documento: id.data }).single();
  if (error || !data) return { error: mensaje(error?.code, "No se pudo abrir el documento.") };
  const { data: firmado } = await createAdminClient().storage.from("documentos").createSignedUrl(data.path, 300);
  if (!firmado) return { error: "No se pudo abrir el documento." };
  return { url: firmado.signedUrl };
}

export async function eliminarDocumento(clienteId: string, documentoId: string): Promise<Resultado> {
  await requireModulo("clientes");
  const cli = idSchema.safeParse(clienteId);
  const id = idSchema.safeParse(documentoId);
  if (!cli.success || !id.success) return { error: "Documento no válido." };
  const supabase = await createClient();
  const { data: path, error } = await supabase.rpc("eliminar_documento", { p_documento: id.data });
  if (error || !path) return { error: mensaje(error?.code, "No se pudo eliminar.") };
  await createAdminClient().storage.from("documentos").remove([path]);
  revalidatePath(rutaFicha(cli.data));
  return { ok: "Documento eliminado." };
}
