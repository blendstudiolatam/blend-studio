import type { Metadata } from "next";
import { requirePanel, type Rol } from "@/lib/auth/sesion";

export const metadata: Metadata = { title: "Inicio" };

type Modulo = { nombre: string; descripcion: string; roles: Rol[] };

// Módulos de la Fase 1. Se irán activando en las próximas sesiones.
const modulos: Modulo[] = [
  { nombre: "Agenda", descripcion: "Citas del día y de la semana", roles: ["admin", "recepcion", "estilista"] },
  { nombre: "Clientes", descripcion: "Fichas, historial y notas", roles: ["admin", "recepcion"] },
  { nombre: "Servicios", descripcion: "Categorías, duración y precios", roles: ["admin", "recepcion"] },
  { nombre: "Empleados", descripcion: "Horarios, servicios y comisiones", roles: ["admin"] },
  { nombre: "Comisiones", descripcion: "Lo ganado por servicio realizado", roles: ["admin", "estilista"] },
  { nombre: "Ajustes", descripcion: "Negocio, marca y sucursales", roles: ["admin"] },
];

export default async function PanelPage() {
  const { nombre, rol, sucursal } = await requirePanel();
  const visibles = modulos.filter((m) => m.roles.includes(rol));
  const primerNombre = nombre.split(" ")[0];

  return (
    <div>
      <p className="text-[11px] uppercase tracking-[0.3em] text-gold-strong">{sucursal.nombre}</p>
      <h1 className="mt-2 font-display text-4xl">Hola, {primerNombre}</h1>

      <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {visibles.map((m) => (
          <li
            key={m.nombre}
            className="rounded-xl border border-line bg-surface p-5"
          >
            <div className="flex items-start justify-between gap-3">
              <h2 className="font-display text-2xl">{m.nombre}</h2>
              <span className="rounded-full bg-background px-2.5 py-1 text-[10px] uppercase tracking-[0.15em] text-muted">
                Próximamente
              </span>
            </div>
            <p className="mt-2 text-sm text-muted">{m.descripcion}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
