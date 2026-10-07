"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { instante } from "@/lib/agenda";
import { requireModulo } from "@/lib/auth/sesion";
import { normalizarBusqueda } from "@/lib/clientes";
import { createClient } from "@/lib/supabase/server";

export type Resultado = { ok?: string; error?: string; id?: string } | undefined;

const idSchema = z.guid();
const opcionalId = z
  .union([z.literal(""), z.guid()])
  .transform((v) => (v === "" ? null : v))
  .nullable()
  .optional();

/** Traduce los errores de la base de datos a mensajes para el usuario. */
function mensaje(e: { code?: string; message?: string } | null, porDefecto = "No se pudo guardar la cita."): string {
  if (!e) return porDefecto;
  if (e.code === "23P01") return "Ese profesional ya tiene otra cita en ese horario.";
  if (e.code === "42501") return "No tienes permiso para hacer este cambio.";
  if (e.code === "P0001" && e.message) return e.message; // reglas de horario (ya vienen en español)
  return porDefecto;
}

const revalidar = () => {
  revalidatePath("/panel/agenda");
  revalidatePath("/panel/clientes", "layout");
};

// ---------------------------------------------------------------------
// Citas
// ---------------------------------------------------------------------
const citaSchema = z.object({
  cliente_id: z.guid({ error: "Elige el cliente." }),
  empleado_id: z.guid({ error: "Elige el profesional." }),
  servicio_id: opcionalId,
  sesion_id: opcionalId,
  fecha: z.iso.date({ error: "Elige la fecha." }),
  hora: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, { error: "Elige la hora." }),
  duracion: z.coerce.number().int().min(5, { error: "La duración mínima es 5 minutos." }).max(720, { error: "Máximo 12 horas." }),
  precio: z
    .union([z.literal(""), z.coerce.number().min(0).max(99_999)])
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .optional(),
  estado: z.enum(["pendiente", "confirmada"]).optional(),
  notas: z
    .string()
    .trim()
    .max(500, { error: "Máximo 500 caracteres." })
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .optional(),
});
export type DatosCita = z.input<typeof citaSchema>;

function filaCita(d: z.output<typeof citaSchema>) {
  const inicio = instante(d.fecha, d.hora);
  const fin = new Date(new Date(inicio).getTime() + d.duracion * 60_000).toISOString();
  return {
    cliente_id: d.cliente_id,
    empleado_id: d.empleado_id,
    servicio_id: d.servicio_id ?? null,
    sesion_id: d.sesion_id ?? null,
    inicio,
    fin,
    precio: d.precio ?? null,
    notas: d.notas ?? null,
  };
}

export async function crearCita(datos: DatosCita): Promise<Resultado> {
  const ctx = await requireModulo("agenda", true);
  const parsed = citaSchema.safeParse(datos);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("citas")
    .insert({ ...filaCita(parsed.data), estado: parsed.data.estado ?? "confirmada", sucursal_id: ctx.sucursal.id })
    .select("id")
    .single();
  if (error || !data) return { error: mensaje(error) };
  revalidar();
  return { ok: "Cita agendada.", id: data.id };
}

export async function guardarCita(id: string, datos: DatosCita): Promise<Resultado> {
  await requireModulo("agenda", true);
  const cid = idSchema.safeParse(id);
  const parsed = citaSchema.safeParse(datos);
  if (!cid.success) return { error: "Cita no válida." };
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const supabase = await createClient();
  const { data, error } = await supabase.from("citas").update(filaCita(parsed.data)).eq("id", cid.data).select("id");
  if (error || !data?.length) return { error: mensaje(error) };
  revalidar();
  return { ok: "Cita actualizada." };
}

const estadoSchema = z.enum(["pendiente", "confirmada", "completada", "cancelada", "no_asistio"]);

export async function cambiarEstadoCita(id: string, estado: z.input<typeof estadoSchema>, motivo?: string): Promise<Resultado> {
  await requireModulo("agenda", true);
  const cid = idSchema.safeParse(id);
  const est = estadoSchema.safeParse(estado);
  const mot = z.string().trim().max(200).optional().safeParse(motivo);
  if (!cid.success || !est.success || !mot.success) return { error: "Datos no válidos." };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("citas")
    .update({ estado: est.data, motivo_cancelacion: est.data === "cancelada" ? mot.data || null : null })
    .eq("id", cid.data)
    .select("id");
  if (error || !data?.length) return { error: mensaje(error, "No se pudo cambiar el estado.") };
  revalidar();
  return { ok: "Listo" };
}

// ---------------------------------------------------------------------
// Ayudas del formulario
// ---------------------------------------------------------------------
export type ClienteEncontrado = { id: string; nombre: string; telefono: string | null; codigo: number };

export async function buscarClientes(texto: string): Promise<ClienteEncontrado[]> {
  await requireModulo("agenda");
  const q = normalizarBusqueda(String(texto ?? ""));
  if (q.length < 2) return [];
  const supabase = await createClient();
  let consulta = supabase.from("clientes").select("id, codigo, nombre, apellido, telefono").eq("activo", true);
  const digitos = q.replace(/[\s()+-]/g, "");
  if (/^\d{3,}$/.test(digitos)) consulta = consulta.like("telefono_digitos", `%${digitos}%`);
  else for (const p of q.split(" ")) consulta = consulta.ilike("busqueda", `%${p}%`);
  const { data } = await consulta.order("nombre").limit(8);
  return (data ?? []).map((c) => ({ id: c.id, nombre: `${c.nombre} ${c.apellido}`.trim(), telefono: c.telefono, codigo: c.codigo }));
}

export async function crearClienteRapido(nombre: string, telefono: string): Promise<{ cliente?: ClienteEncontrado; error?: string }> {
  const ctx = await requireModulo("clientes", true);
  const n = z.string().trim().min(1, { error: "Escribe el nombre." }).max(120).safeParse(nombre);
  const t = z
    .string()
    .trim()
    .max(30)
    .refine((v) => !v || /^[+\d][\d\s()-]{5,}$/.test(v), { error: "Teléfono no válido." })
    .safeParse(telefono);
  if (!n.success) return { error: n.error.issues[0]?.message };
  if (!t.success) return { error: t.error.issues[0]?.message };
  const [primero, ...resto] = n.data.split(/\s+/);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clientes")
    .insert({ nombre: primero.slice(0, 60), apellido: resto.join(" ").slice(0, 60), telefono: t.data || null, sucursal_origen_id: ctx.sucursal.id })
    .select("id, codigo, nombre, apellido, telefono")
    .single();
  if (error || !data) return { error: "No se pudo crear el cliente." };
  revalidatePath("/panel/clientes", "layout");
  return { cliente: { id: data.id, nombre: `${data.nombre} ${data.apellido}`.trim(), telefono: data.telefono, codigo: data.codigo } };
}

export type SesionPendiente = {
  id: string;
  numero: number;
  total: number;
  procedimiento: string;
  servicioId: string | null;
  profesionalId: string | null;
  valor: number;
  fecha: string | null;
};

/** Sesiones de tratamiento pendientes de un cliente que aún no tienen cita. */
export async function sesionesPendientes(clienteId: string): Promise<SesionPendiente[]> {
  const ctx = await requireModulo("agenda");
  const cid = idSchema.safeParse(clienteId);
  if (!cid.success) return [];
  const supabase = await createClient();
  const [{ data: planes }, { data: ocupadas }] = await Promise.all([
    supabase
      .from("planes_tratamiento")
      .select("procedimiento, servicio_id, profesional_id, sesiones_total, precio_total, sesiones:sesiones_tratamiento(id, numero, fecha, estado)")
      .eq("cliente_id", cid.data)
      .eq("sucursal_id", ctx.sucursal.id)
      .eq("estado", "activo"),
    supabase.from("citas").select("sesion_id").eq("cliente_id", cid.data).not("sesion_id", "is", null).neq("estado", "cancelada"),
  ]);
  const conCita = new Set((ocupadas ?? []).map((o) => o.sesion_id));
  return (planes ?? []).flatMap((p) =>
    (p.sesiones ?? [])
      .filter((s) => s.estado === "pendiente" && !conCita.has(s.id))
      .sort((a, b) => a.numero - b.numero)
      .map((s) => ({
        id: s.id,
        numero: s.numero,
        total: p.sesiones_total,
        procedimiento: p.procedimiento,
        servicioId: p.servicio_id,
        profesionalId: p.profesional_id,
        valor: Math.round((Number(p.precio_total) / p.sesiones_total) * 100) / 100,
        fecha: s.fecha,
      })),
  );
}

// ---------------------------------------------------------------------
// Recordatorios automáticos (configuración)
// ---------------------------------------------------------------------
const recordatoriosSchema = z
  .object({
    activo: z.boolean(),
    por_whatsapp: z.boolean(),
    por_correo: z.boolean(),
    aviso_horas: z.coerce.number().int().min(1).max(168),
    seguimiento_activo: z.boolean(),
    seguimiento_horas: z.coerce.number().int().min(1).max(48),
  })
  .refine((d) => d.seguimiento_horas < d.aviso_horas, { error: "El seguimiento debe ser más cerca de la cita que el aviso principal." });
export type DatosRecordatorios = z.input<typeof recordatoriosSchema>;

export async function guardarRecordatorios(datos: DatosRecordatorios): Promise<Resultado> {
  const ctx = await requireModulo("agenda");
  if (ctx.rol !== "admin") return { error: "Solo un administrador cambia los recordatorios." };
  const parsed = recordatoriosSchema.safeParse(datos);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const supabase = await createClient();
  const { data: existe } = await supabase.from("config_recordatorios").select("sucursal_id").eq("sucursal_id", ctx.sucursal.id).maybeSingle();
  const { error } = existe
    ? await supabase.from("config_recordatorios").update(parsed.data).eq("sucursal_id", ctx.sucursal.id)
    : await supabase.from("config_recordatorios").insert({ ...parsed.data, sucursal_id: ctx.sucursal.id });
  if (error) return { error: "No se pudo guardar." };
  revalidatePath("/panel/agenda");
  return { ok: "Guardado" };
}
