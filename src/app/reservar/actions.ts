"use server";

import { z } from "zod";
import { claveIntento, ipCliente } from "@/lib/auth/limite-intentos";
import { createAdminClient } from "@/lib/supabase/admin";
import { verificarTurnstile } from "@/lib/turnstile.server";
import type { Confirmacion } from "./tipos";

// Acciones PÚBLICAS (cualquier visitante puede llamarlas). Por eso:
// - todo se valida aquí con Zod;
// - hay límite de solicitudes por IP (y por teléfono al reservar) y CAPTCHA al reservar;
// - la base de datos solo expone funciones que no devuelven datos de otros clientes.

const slugSchema = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/).max(80);
const idOpcional = z.union([z.literal(""), z.guid()]).transform((v) => (v === "" ? null : v));

export async function horariosDisponibles(
  slug: string,
  servicioId: string,
  empleadoId: string,
  fecha: string,
): Promise<{ horas?: string[]; error?: string }> {
  const p = z
    .object({ slug: slugSchema, servicio: z.guid(), empleado: idOpcional, fecha: z.iso.date() })
    .safeParse({ slug, servicio: servicioId, empleado: empleadoId, fecha });
  if (!p.success) return { error: "Datos no válidos." };

  const admin = createAdminClient();
  const { data: permitido } = await admin.rpc("reserva_permitida", { p_tipo: "consulta", p_ip_hash: claveIntento(await ipCliente()) });
  if (!permitido) return { error: "Demasiadas consultas seguidas. Espera unos minutos e intenta de nuevo." };

  const { data, error } = await admin.rpc("reserva_horarios", {
    p_slug: p.data.slug,
    p_servicio: p.data.servicio,
    // null = sin preferencia (el tipo generado no lo refleja)
    p_empleado: p.data.empleado as string,
    p_fecha: p.data.fecha,
  });
  if (error) return { error: "No se pudieron cargar los horarios." };
  return { horas: (data ?? []).map((h) => h.hora) };
}

const reservaSchema = z.object({
  slug: slugSchema,
  servicio: z.guid({ error: "Elige un servicio." }),
  empleado: idOpcional,
  fecha: z.iso.date({ error: "Elige la fecha." }),
  hora: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, { error: "Elige la hora." }),
  nombre: z.string().trim().min(1, { error: "Escribe tu nombre." }).max(60, { error: "El nombre es muy largo." }),
  apellido: z.string().trim().max(60, { error: "El apellido es muy largo." }),
  telefono: z
    .string()
    .trim()
    .max(30)
    .refine((v) => /^[+\d][\d\s()-]{6,}$/.test(v) && v.replace(/\D/g, "").length >= 7, { error: "Escribe un teléfono válido." }),
  email: z.union([z.literal(""), z.email({ error: "Correo no válido." }).max(254)]),
  notas: z.string().trim().max(300, { error: "Máximo 300 caracteres." }),
  consentimiento: z.literal(true, { error: "Debes aceptar el uso de tus datos para reservar." }),
  captcha: z.string().min(1, { error: "Completa la verificación de seguridad." }).max(2048),
});
export type DatosReserva = z.input<typeof reservaSchema>;

export async function enviarReserva(datos: DatosReserva): Promise<{ ok?: Confirmacion; error?: string; ocupado?: boolean }> {
  const p = reservaSchema.safeParse(datos);
  if (!p.success) return { error: p.error.issues[0]?.message };
  const d = p.data;

  const ip = await ipCliente();
  if (!(await verificarTurnstile(d.captcha, ip))) {
    return { error: "No pudimos verificar que eres una persona. Recarga la página e intenta de nuevo." };
  }

  const admin = createAdminClient();
  const { data: permitido } = await admin.rpc("reserva_permitida", {
    p_tipo: "reserva",
    p_ip_hash: claveIntento(ip),
    p_clave_hash: claveIntento(d.telefono.replace(/\D/g, "").slice(-8)),
  });
  if (!permitido) return { error: "Recibimos demasiadas reservas seguidas. Escríbenos por WhatsApp y te ayudamos." };

  const { data, error } = await admin.rpc("crear_reserva_web", {
    p_slug: d.slug,
    p_servicio: d.servicio,
    p_empleado: d.empleado as string,
    p_fecha: d.fecha,
    p_hora: d.hora,
    p_nombre: d.nombre,
    p_apellido: d.apellido,
    p_telefono: d.telefono,
    p_email: d.email,
    p_notas: d.notas,
  });
  if (error) {
    if (error.code === "P0002") return { error: "Ese horario ya no está disponible. Elige otro.", ocupado: true };
    return { error: "No se pudo completar la reserva. Intenta de nuevo." };
  }
  return { ok: data as unknown as Confirmacion };
}
