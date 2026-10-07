"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import sharp from "sharp";
import { z } from "zod";
import { requireModulo } from "@/lib/auth/sesion";
import { leerHoja, type Fila } from "@/lib/excel.server";
import { createClient } from "@/lib/supabase/server";

export type Resultado = { ok?: string; error?: string; id?: string } | undefined;
export type ResumenImportacion = {
  error?: string;
  ok?: string;
  nuevos?: number;
  duplicados?: { fila: number; nombre: string; motivo: string }[];
  errores?: { fila: number; motivo: string }[];
};

const RUTA = "/panel/clientes";
const idSchema = z.guid();

const opcional = (max: number, mensaje?: string) =>
  z
    .string()
    .trim()
    .max(max, mensaje ? { error: mensaje } : undefined)
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .optional();

const clienteSchema = z.object({
  nombre: z.string().trim().min(1, { error: "Escribe el nombre." }).max(60, { error: "El nombre es muy largo." }),
  apellido: z.string().trim().max(60, { error: "El apellido es muy largo." }).optional(),
  telefono: opcional(30, "El teléfono es muy largo.").refine((v) => !v || /^[+\d][\d\s()-]{5,}$/.test(v), {
    error: "Teléfono no válido.",
  }),
  email: z
    .union([z.literal(""), z.email({ error: "Correo no válido." }).max(254)])
    .transform((v) => (v === "" ? null : v.toLowerCase()))
    .nullable()
    .optional(),
  fecha_nacimiento: z
    .union([z.literal(""), z.iso.date({ error: "Fecha de nacimiento no válida." })])
    .transform((v) => (v === "" ? null : v))
    .refine((v) => !v || (v >= "1900-01-01" && v <= new Date().toISOString().slice(0, 10)), {
      error: "Fecha de nacimiento no válida.",
    })
    .nullable()
    .optional(),
  genero: z
    .union([z.literal(""), z.enum(["F", "M", "O"])])
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .optional(),
  documento: opcional(30, "El documento es muy largo."),
  direccion: opcional(200, "La dirección es muy larga."),
  notas: opcional(1000, "Las notas son muy largas."),
  recordatorios_whatsapp: z.boolean().default(true),
  permitir_fotos: z.boolean().default(false),
  activo: z.boolean().default(true),
});
export type DatosCliente = z.input<typeof clienteSchema>;

const permisoError = (code?: string) =>
  code === "42501" ? "No tienes permiso para hacer este cambio." : "No se pudo guardar.";

const datosLimpios = (d: z.output<typeof clienteSchema>) => ({ ...d, apellido: d.apellido ?? "" });

// ---------------------------------------------------------------------
// Crear, editar y eliminar
// ---------------------------------------------------------------------
export async function crearCliente(datos: DatosCliente): Promise<Resultado> {
  const ctx = await requireModulo("clientes", true);
  const parsed = clienteSchema.safeParse(datos);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clientes")
    .insert({ ...datosLimpios(parsed.data), origen: "panel", sucursal_origen_id: ctx.sucursal.id })
    .select("id")
    .single();
  if (error || !data) return { error: permisoError(error?.code) };
  revalidatePath(RUTA, "layout");
  return { ok: "Cliente creado.", id: data.id };
}

export async function guardarCliente(id: string, datos: DatosCliente): Promise<Resultado> {
  await requireModulo("clientes", true);
  const cliId = idSchema.safeParse(id);
  const parsed = clienteSchema.safeParse(datos);
  if (!cliId.success) return { error: "Cliente no válido." };
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clientes")
    .update(datosLimpios(parsed.data))
    .eq("id", cliId.data)
    .select("id");
  if (error || !data?.length) return { error: permisoError(error?.code) };
  revalidatePath(RUTA, "layout");
  return { ok: "Guardado" };
}

export async function eliminarCliente(id: string): Promise<Resultado> {
  await requireModulo("clientes", true);
  const cliId = idSchema.safeParse(id);
  if (!cliId.success) return { error: "Cliente no válido." };
  const supabase = await createClient();
  const { data, error } = await supabase.from("clientes").delete().eq("id", cliId.data).select("foto_path");
  if (error || !data?.length) return { error: "Solo un administrador puede eliminar clientes." };
  if (data[0].foto_path) await supabase.storage.from("clientes").remove([data[0].foto_path]);
  revalidatePath(RUTA, "layout");
  return { ok: "Cliente eliminado." };
}

// ---------------------------------------------------------------------
// Foto (almacenamiento privado)
// ---------------------------------------------------------------------
export async function subirFotoCliente(id: string, formData: FormData): Promise<Resultado> {
  await requireModulo("clientes", true);
  const cliId = idSchema.safeParse(id);
  if (!cliId.success) return { error: "Cliente no válido." };
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
  const { data: actual } = await supabase.from("clientes").select("foto_path").eq("id", cliId.data).single();
  if (!actual) return { error: "Cliente no encontrado." };

  const path = `fotos/${randomUUID()}.webp`;
  const { error: errSubida } = await supabase.storage
    .from("clientes")
    .upload(path, webp, { contentType: "image/webp", cacheControl: "3600" });
  if (errSubida) return { error: "No se pudo subir la foto." };

  const { data, error } = await supabase.from("clientes").update({ foto_path: path }).eq("id", cliId.data).select("id");
  if (error || !data?.length) {
    await supabase.storage.from("clientes").remove([path]);
    return { error: permisoError(error?.code) };
  }
  if (actual.foto_path) await supabase.storage.from("clientes").remove([actual.foto_path]);
  revalidatePath(RUTA, "layout");
  return { ok: "Foto actualizada." };
}

// ---------------------------------------------------------------------
// Importar desde Excel o CSV
// ---------------------------------------------------------------------
/** Nombres de columna aceptados (sin tildes ni espacios) para cada dato. */
const ALIAS: Record<string, string[]> = {
  nombre: ["nombre", "nombres", "primernombre"],
  apellido: ["apellido", "apellidos"],
  completo: ["nombrecompleto", "cliente", "nombreyapellido"],
  telefono: ["telefono", "celular", "movil", "whatsapp", "tel", "numero"],
  email: ["correo", "email", "correoelectronico", "mail", "emailcorreo"],
  fecha_nacimiento: ["fechadenacimiento", "fechanacimiento", "nacimiento", "cumpleanos", "fechadenacimientoaaaammdd"],
  genero: ["genero", "sexo", "generofmo"],
  documento: ["documento", "cedula", "pasaporte", "documentodeidentidad", "cedulaopasaporte"],
  direccion: ["direccion", "domicilio"],
  notas: ["notas", "nota", "observaciones", "comentarios"],
};

const campo = (fila: Fila, dato: string) => {
  for (const alias of ALIAS[dato]) if (fila[alias]) return fila[alias];
  return "";
};

function fechaIso(texto: string): string {
  const t = texto.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t;
  const m = t.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/); // día/mes/año
  if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  return t;
}

function generoCodigo(texto: string): string {
  const t = texto.trim().toLowerCase();
  if (!t) return "";
  if (["f", "femenino", "mujer", "fem"].includes(t)) return "F";
  if (["m", "masculino", "hombre", "masc"].includes(t)) return "M";
  if (["o", "otro", "otra", "x"].includes(t)) return "O";
  return t;
}

/** Clave para detectar teléfonos repetidos: últimos 8 dígitos. */
const claveTelefono = (t: string | null | undefined) => {
  const d = (t ?? "").replace(/\D/g, "");
  return d.length >= 7 ? d.slice(-8) : null;
};

export async function importarClientes(formData: FormData): Promise<ResumenImportacion> {
  const ctx = await requireModulo("clientes", true);
  const archivo = formData.get("archivo");
  const confirmar = formData.get("confirmar") === "1";
  if (!(archivo instanceof File) || archivo.size === 0) return { error: "Elige un archivo." };
  if (archivo.size > 3 * 1024 * 1024) return { error: "El archivo pesa más de 3 MB." };

  const { filas, error: errLectura } = await leerHoja(archivo);
  if (errLectura) return { error: errLectura };
  if (filas.length === 0) return { error: "El archivo no tiene clientes." };
  const columnas = Object.keys(filas[0]);
  if (![...ALIAS.nombre, ...ALIAS.completo].some((a) => columnas.includes(a))) {
    return { error: "No encontré la columna «Nombre». Usa la plantilla de ejemplo." };
  }

  // Lo que ya existe, para no duplicar clientes.
  const supabase = await createClient();
  const { data: existentes } = await supabase.from("clientes").select("telefono, email, documento");
  const telefonos = new Set((existentes ?? []).map((c) => claveTelefono(c.telefono)).filter(Boolean));
  const correos = new Set((existentes ?? []).map((c) => c.email?.toLowerCase()).filter(Boolean));
  const documentos = new Set((existentes ?? []).map((c) => c.documento?.toLowerCase()).filter(Boolean));

  const nuevos: ReturnType<typeof datosLimpios>[] = [];
  const errores: { fila: number; motivo: string }[] = [];
  const duplicados: { fila: number; nombre: string; motivo: string }[] = [];

  filas.forEach((f, i) => {
    const fila = i + 2; // la fila 1 son los encabezados
    let nombre = campo(f, "nombre");
    let apellido = campo(f, "apellido");
    const completo = campo(f, "completo");
    if (!nombre && completo) {
      const [primero, ...resto] = completo.split(/\s+/);
      nombre = primero;
      apellido = apellido || resto.join(" ");
    }
    const parsed = clienteSchema.safeParse({
      nombre,
      apellido,
      telefono: campo(f, "telefono"),
      email: campo(f, "email"),
      fecha_nacimiento: fechaIso(campo(f, "fecha_nacimiento")),
      genero: generoCodigo(campo(f, "genero")),
      documento: campo(f, "documento"),
      direccion: campo(f, "direccion"),
      notas: campo(f, "notas"),
    });
    if (!parsed.success) {
      errores.push({ fila, motivo: parsed.error.issues[0]?.message ?? "Datos no válidos." });
      return;
    }
    const d = parsed.data;
    const tel = claveTelefono(d.telefono);
    const motivo =
      (tel && telefonos.has(tel) && "teléfono") ||
      (d.email && correos.has(d.email) && "correo") ||
      (d.documento && documentos.has(d.documento.toLowerCase()) && "documento") ||
      null;
    if (motivo) {
      duplicados.push({ fila, nombre: `${d.nombre} ${d.apellido ?? ""}`.trim(), motivo: `Ya existe un cliente con ese ${motivo}.` });
      return;
    }
    // También evita repetidos dentro del mismo archivo.
    if (tel) telefonos.add(tel);
    if (d.email) correos.add(d.email);
    if (d.documento) documentos.add(d.documento.toLowerCase());
    nuevos.push(datosLimpios(d));
  });

  if (!confirmar) return { nuevos: nuevos.length, duplicados, errores };
  if (nuevos.length === 0) return { error: "No hay clientes nuevos para importar." };

  for (let i = 0; i < nuevos.length; i += 500) {
    const lote = nuevos.slice(i, i + 500).map((d) => ({ ...d, origen: "importacion", sucursal_origen_id: ctx.sucursal.id }));
    const { error } = await supabase.from("clientes").insert(lote);
    if (error) {
      revalidatePath(RUTA, "layout");
      return { error: i ? `Se importaron ${i} clientes, pero el resto falló.` : permisoError(error.code) };
    }
  }
  revalidatePath(RUTA, "layout");
  return { ok: `Se importaron ${nuevos.length} clientes.`, nuevos: nuevos.length };
}
