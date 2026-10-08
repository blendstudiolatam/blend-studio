import {
  BellRing,
  CalendarDays,
  ChartColumn,
  House,
  Landmark,
  Package,
  Scissors,
  Settings,
  ShoppingCart,
  UserCog,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import type { ModuloApp, Permisos, Rol } from "@/lib/auth/permisos";

/**
 * Menú del panel (anexo v2 de CLAUDE.md). Un solo lugar define nombres, rutas,
 * íconos, fase y qué permiso exige cada módulo. La visibilidad es solo de interfaz:
 * los permisos reales se verifican en el servidor y con RLS.
 */
export type SubModulo = {
  nombre: string;
  slug: string;
  fase: 1 | 2 | 3;
  listo?: boolean;
  /** Visible solo para administradores (p. ej. gestión de usuarios). */
  soloAdmin?: boolean;
};

export type Modulo = {
  nombre: string;
  slug: string;
  icono: LucideIcon;
  descripcion: string;
  fase: 1 | 2 | 3;
  listo?: boolean;
  /** Módulo de permisos que lo controla (null = siempre visible). */
  permiso: ModuloApp | null;
  hijos?: SubModulo[];
};

export const MODULOS: Modulo[] = [
  {
    nombre: "Inicio",
    slug: "",
    icono: House,
    descripcion: "Resumen del día",
    fase: 1,
    listo: true,
    permiso: null,
  },
  {
    nombre: "Agenda",
    slug: "agenda",
    icono: CalendarDays,
    descripcion: "Citas por día, semana y mes",
    fase: 1,
    listo: true,
    permiso: "agenda",
  },
  {
    nombre: "Clientes",
    slug: "clientes",
    icono: Users,
    descripcion: "Fichas, tratamientos y fidelización",
    fase: 1,
    permiso: "clientes",
    hijos: [
      { nombre: "Lista de clientes", slug: "lista", fase: 1, listo: true },
      { nombre: "Planes de tratamiento", slug: "tratamientos", fase: 1, listo: true },
      { nombre: "Catálogo de paquetes", slug: "paquetes", fase: 1, listo: true },
      { nombre: "Tarjeta de fidelidad", slug: "fidelidad", fase: 3 },
      { nombre: "Tarjeta de regalo y cupones", slug: "regalos", fase: 3 },
      { nombre: "Alerta de cumpleaños", slug: "cumpleanos", fase: 1, listo: true },
    ],
  },
  {
    nombre: "Servicios",
    slug: "servicios",
    icono: Scissors,
    descripcion: "Categorías y catálogo de servicios",
    fase: 1,
    permiso: "servicios",
    hijos: [
      { nombre: "Categorías", slug: "categorias", fase: 1, listo: true },
      { nombre: "Catálogo", slug: "catalogo", fase: 1, listo: true },
    ],
  },
  {
    nombre: "Personal",
    slug: "personal",
    icono: UserCog,
    descripcion: "Empleados, usuarios y permisos",
    fase: 1,
    permiso: "personal",
    hijos: [
      { nombre: "Empleados", slug: "empleados", fase: 1, listo: true },
      { nombre: "Usuarios", slug: "usuarios", fase: 1, listo: true, soloAdmin: true },
      { nombre: "Servicios del personal", slug: "servicios", fase: 2 },
    ],
  },
  {
    nombre: "Caja",
    slug: "caja",
    icono: Wallet,
    descripcion: "Apertura, caja activa y movimientos",
    fase: 2,
    permiso: "caja",
    hijos: [
      { nombre: "Apertura de caja", slug: "apertura", fase: 2 },
      { nombre: "Caja activa", slug: "activa", fase: 2 },
      { nombre: "Movimientos", slug: "movimientos", fase: 2 },
    ],
  },
  {
    nombre: "Ventas",
    slug: "ventas",
    icono: ShoppingCart,
    descripcion: "Punto de venta, cotizaciones y devoluciones",
    fase: 2,
    permiso: "ventas",
    hijos: [
      { nombre: "Punto de venta", slug: "pos", fase: 2 },
      { nombre: "Lista de ventas", slug: "lista", fase: 2 },
      { nombre: "Cotizaciones", slug: "cotizaciones", fase: 2 },
      { nombre: "Devoluciones", slug: "devoluciones", fase: 2 },
    ],
  },
  {
    nombre: "Finanzas",
    slug: "finanzas",
    icono: Landmark,
    descripcion: "Flujo de efectivo, gastos y cuentas",
    fase: 2,
    permiso: "finanzas",
    hijos: [
      { nombre: "Flujo de efectivo", slug: "flujo", fase: 2 },
      { nombre: "Gastos", slug: "gastos", fase: 2 },
      { nombre: "Cuentas por cobrar", slug: "por-cobrar", fase: 2 },
      { nombre: "Cuentas por pagar", slug: "por-pagar", fase: 2 },
    ],
  },
  {
    nombre: "Inventario",
    slug: "inventario",
    icono: Package,
    descripcion: "Productos, stock y categorías",
    fase: 2,
    permiso: "productos",
    hijos: [
      { nombre: "Productos", slug: "productos", fase: 2 },
      { nombre: "Categorías", slug: "categorias", fase: 2 },
    ],
  },
  {
    nombre: "Reportes",
    slug: "reportes",
    icono: ChartColumn,
    descripcion: "Ventas, clientes, empleados y finanzas",
    fase: 3,
    permiso: "reportes",
  },
  {
    nombre: "Recordatorios",
    slug: "recordatorios",
    icono: BellRing,
    descripcion: "Avisos de citas por WhatsApp y correo",
    fase: 3,
    permiso: "agenda",
  },
  {
    nombre: "Configuración",
    slug: "configuracion",
    icono: Settings,
    descripcion: "Datos del negocio y preferencias",
    fase: 1,
    permiso: "configuracion",
    hijos: [
      { nombre: "Datos del negocio", slug: "negocio", fase: 1, listo: true },
      { nombre: "Preferencias", slug: "preferencias", fase: 1, listo: true },
    ],
  },
];

export const rutaDe = (modulo: Modulo, hijo?: SubModulo) =>
  ["/panel", modulo.slug, hijo?.slug].filter(Boolean).join("/");

export const puedeVerModulo = (m: Modulo, permisos: Permisos) =>
  m.permiso === null || permisos[m.permiso] !== "ninguno";

export function modulosVisibles(permisos: Permisos, rol: Rol): Modulo[] {
  return MODULOS.filter((m) => puedeVerModulo(m, permisos)).map((m) => ({
    ...m,
    hijos: m.hijos?.filter((h) => !h.soloAdmin || rol === "admin"),
  }));
}

/** Encuentra el módulo (y submódulo) que corresponde a una ruta del panel. */
export function buscarRuta(pathname: string) {
  const [, , slugModulo = "", slugHijo] = pathname.split("/");
  const modulo = MODULOS.find((m) => m.slug === slugModulo);
  const hijo = modulo?.hijos?.find((h) => h.slug === slugHijo);
  return { modulo, hijo };
}
