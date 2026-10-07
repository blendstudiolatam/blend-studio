import type { Database } from "@/lib/supabase/database.types";

// Tipos y etiquetas compartidas entre servidor y navegador (sin secretos).
export type Rol = Database["public"]["Enums"]["rol_usuario"];
export type ModuloApp = Database["public"]["Enums"]["modulo_app"];
export type NivelPermiso = Database["public"]["Enums"]["nivel_permiso"];
export type Permisos = Record<ModuloApp, NivelPermiso>;

export const ETIQUETA_ROL: Record<Rol, string> = {
  admin: "Administrador",
  recepcion: "Recepción",
  estilista: "Profesional",
  asistente: "Asistente",
};

export const ETIQUETA_NIVEL: Record<NivelPermiso, string> = {
  total: "Acceso total",
  lectura: "Solo lectura",
  ninguno: "Sin acceso",
};

export const MODULOS_APP: { modulo: ModuloApp; nombre: string }[] = [
  { modulo: "agenda", nombre: "Agenda" },
  { modulo: "clientes", nombre: "Clientes" },
  { modulo: "servicios", nombre: "Servicios" },
  { modulo: "personal", nombre: "Personal" },
  { modulo: "productos", nombre: "Productos e inventario" },
  { modulo: "ventas", nombre: "Ventas" },
  { modulo: "caja", nombre: "Caja" },
  { modulo: "finanzas", nombre: "Finanzas" },
  { modulo: "reportes", nombre: "Reportes" },
  { modulo: "configuracion", nombre: "Configuración" },
];

const ORDEN_NIVEL: Record<NivelPermiso, number> = { ninguno: 0, lectura: 1, total: 2 };

/**
 * Límite fijo aprobado por Julio (espejo de privado.nivel_permiso en la base de datos):
 * devuelve el nivel máximo permitido, o null si el módulo es libre para ese rol.
 */
export function limiteFijo(rol: Rol, modulo: ModuloApp): NivelPermiso | null {
  if (rol === "admin") return null;
  if (modulo === "caja" || modulo === "finanzas") return "ninguno";
  if (rol === "estilista" && modulo === "clientes") return "lectura";
  if (rol === "estilista" && modulo !== "agenda") return "ninguno";
  return null;
}

export const nivelPermitido = (nivel: NivelPermiso, limite: NivelPermiso | null) =>
  limite === null || ORDEN_NIVEL[nivel] <= ORDEN_NIVEL[limite];

export const puedeVer = (permisos: Permisos, modulo: ModuloApp) =>
  permisos[modulo] !== "ninguno";

export const puedeEditar = (permisos: Permisos, modulo: ModuloApp) =>
  permisos[modulo] === "total";
