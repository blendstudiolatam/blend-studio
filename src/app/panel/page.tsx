import { CalendarDays, ChartColumn, House } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Encabezado, Indicador } from "@/components/panel/encabezado";
import { requirePanel } from "@/lib/auth/sesion";

export const metadata: Metadata = { title: "Inicio" };

function saludo(): string {
  const hora = Number(
    new Intl.DateTimeFormat("es-PA", {
      hour: "numeric",
      hourCycle: "h23",
      timeZone: "America/Panama",
    }).format(new Date()),
  );
  if (hora < 12) return "¡Buen día";
  if (hora < 19) return "¡Buenas tardes";
  return "¡Buenas noches";
}

export default async function PanelPage() {
  const { nombre, permisos, sucursal } = await requirePanel();
  const primerNombre = nombre.split(" ")[0];
  const hoy = new Intl.DateTimeFormat("es-PA", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "America/Panama",
  }).format(new Date());

  return (
    <div className="space-y-8">
      <Encabezado
        icono={House}
        titulo={`${saludo()}, ${primerNombre}!`}
        subtitulo={`${sucursal.nombre} · ${hoy}`}
        accion={
          <div className="flex gap-2">
            {permisos.agenda !== "ninguno" && (
              <Link
                href="/panel/agenda"
                className="inline-flex items-center gap-2 rounded-lg bg-ink px-4 py-2.5 text-xs uppercase tracking-[0.16em] text-ivory hover:bg-ink/85"
              >
                <CalendarDays className="h-4 w-4" /> Abrir agenda
              </Link>
            )}
            {permisos.reportes !== "ninguno" && (
              <Link
                href="/panel/reportes"
                className="inline-flex items-center gap-2 rounded-lg border border-line bg-surface px-4 py-2.5 text-xs uppercase tracking-[0.16em] hover:border-gold"
              >
                <ChartColumn className="h-4 w-4" /> Ver reportes
              </Link>
            )}
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Indicador etiqueta="Clientes" valor="—" detalle="Disponible al crear Clientes" />
        <Indicador etiqueta="Nuevos este mes" valor="—" detalle="Disponible al crear Clientes" />
        <Indicador etiqueta="Reservas de hoy" valor="—" detalle="Disponible al crear la Agenda" />
      </div>

      <section className="rounded-xl border border-line bg-surface p-6">
        <h2 className="font-display text-2xl">Reservas de hoy</h2>
        <p className="mt-6 py-8 text-center text-sm text-muted">
          Aquí verás las citas del día cuando la Agenda esté lista.
        </p>
      </section>
    </div>
  );
}
