// Utilidades de clientes compartidas entre servidor y navegador.
export type EstadoCliente = "activo" | "nuevo" | "inactivo";
export type Genero = "F" | "M" | "O";

/** Un cliente es "nuevo" durante sus primeros 30 días. */
export const DIAS_CLIENTE_NUEVO = 30;

export const ETIQUETA_ESTADO_CLIENTE: Record<EstadoCliente, string> = {
  activo: "Activo",
  nuevo: "Nuevo",
  inactivo: "Inactivo",
};

export const CLASE_ESTADO_CLIENTE: Record<EstadoCliente, string> = {
  activo: "bg-emerald-50 text-emerald-800",
  nuevo: "bg-sky-50 text-sky-800",
  inactivo: "bg-stone-100 text-stone-500",
};

export const ETIQUETA_GENERO: Record<Genero, string> = { F: "Femenino", M: "Masculino", O: "Otro" };

export function estadoCliente(activo: boolean, creado: string, hoy = new Date()): EstadoCliente {
  if (!activo) return "inactivo";
  const dias = (hoy.getTime() - new Date(creado).getTime()) / 86_400_000;
  return dias < DIAS_CLIENTE_NUEVO ? "nuevo" : "activo";
}

/** Fecha desde la cual un cliente cuenta como nuevo (ISO). */
export const limiteClienteNuevo = (hoy = new Date()) =>
  new Date(hoy.getTime() - DIAS_CLIENTE_NUEVO * 86_400_000).toISOString();

/** 7 → "C-0007" */
export const codigoCliente = (codigo: number) => `C-${String(codigo).padStart(4, "0")}`;

/** Fecha de hoy en Panamá (YYYY-MM-DD). */
export const hoyPanama = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/Panama" });

/** Edad cumplida según la fecha de hoy en Panamá. */
export function edad(nacimiento: string | null, hoy = hoyPanama()): number | null {
  if (!nacimiento) return null;
  const [a, m, d] = nacimiento.split("-").map(Number);
  const [ha, hm, hd] = hoy.split("-").map(Number);
  return ha - a - (hm < m || (hm === m && hd < d) ? 1 : 0);
}

/** Enlace a WhatsApp; los números de 7 u 8 dígitos se asumen de Panamá (+507). */
export function enlaceWhatsApp(telefono: string | null): string | null {
  const digitos = (telefono ?? "").replace(/\D/g, "");
  if (digitos.length < 7) return null;
  return `https://wa.me/${digitos.length <= 8 ? `507${digitos}` : digitos}`;
}

/** Texto de búsqueda sin tildes ni símbolos raros (igual que privado.normalizar). */
export const normalizarBusqueda = (texto: string) =>
  texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9@._\- ]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 60);
