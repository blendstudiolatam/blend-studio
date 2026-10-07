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

export const puedeVer = (permisos: Permisos, modulo: ModuloApp) =>
  permisos[modulo] !== "ninguno";

export const puedeEditar = (permisos: Permisos, modulo: ModuloApp) =>
  permisos[modulo] === "total";
