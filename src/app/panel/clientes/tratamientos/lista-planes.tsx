"use client";

import { ClipboardList, Search } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Encabezado, Indicador } from "@/components/panel/encabezado";
import { codigoCliente, hoyPanama, normalizarBusqueda } from "@/lib/clientes";
import { dinero } from "@/lib/formato";
import { CLASE_ESTADO_PLAN, ETIQUETA_ESTADO_PLAN, fechaCorta, horaCorta, type EstadoPlan } from "@/lib/tratamientos";

export type FilaPlan = {
  id: string;
  procedimiento: string;
  estado: EstadoPlan;
  cliente: { id: string; codigo: number; nombre: string };
  profesional: { nombre: string; color: string } | null;
  completadas: number;
  total: number;
  proxima: { numero: number; fecha: string | null; hora: string | null } | null;
  pendientesFechas: string[];
  precioTotal: number;
  pagado: number;
};

const PESTANAS: { id: EstadoPlan | "todos"; nombre: string }[] = [
  { id: "activo", nombre: "Activos" },
  { id: "pausado", nombre: "Pausados" },
  { id: "completado", nombre: "Completados" },
  { id: "cancelado", nombre: "Cancelados" },
  { id: "todos", nombre: "Todos" },
];

const sumarDias = (iso: string, dias: number) => {
  const [a, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(a, m - 1, d + dias)).toISOString().slice(0, 10);
};

export function ListaPlanes({ planes }: { planes: FilaPlan[] }) {
  const [estado, setEstado] = useState<EstadoPlan | "todos">("activo");
  const [busqueda, setBusqueda] = useState("");
  const hoy = hoyPanama();
  const enSiete = sumarDias(hoy, 7);

  const activos = planes.filter((p) => p.estado === "activo");
  const estaSemana = activos.reduce((n, p) => n + p.pendientesFechas.filter((f) => f >= hoy && f < enSiete).length, 0);
  const porCobrar = activos.reduce((s, p) => s + (p.precioTotal - p.pagado), 0);

  const q = normalizarBusqueda(busqueda);
  const norm = normalizarBusqueda;
  const visibles = planes.filter(
      (p) =>
        (estado === "todos" || p.estado === estado) &&
        (!q || norm(p.cliente.nombre).includes(q) || norm(p.procedimiento).includes(q) || norm(p.profesional?.nombre ?? "").includes(q)),
  );

  const th = "px-4 py-3 text-left text-[11px] font-medium uppercase tracking-[0.14em] text-muted";

  return (
    <div className="space-y-8">
      <Encabezado
        icono={ClipboardList}
        titulo="Planes de tratamiento"
        subtitulo="Tratamientos por sesiones de todos los clientes de esta sucursal. Se crean desde la ficha del cliente."
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Indicador etiqueta="Planes activos" valor={String(activos.length)} />
        <Indicador etiqueta="Sesiones próximos 7 días" valor={String(estaSemana)} />
        <Indicador etiqueta="Completados" valor={String(planes.filter((p) => p.estado === "completado").length)} />
        <Indicador etiqueta="Por cobrar" valor={dinero(porCobrar)} detalle="De los planes activos" />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="relative w-full max-w-sm">
          <span className="sr-only">Buscar plan</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            type="search"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Cliente, procedimiento o profesional"
            className="w-full rounded-full border border-line bg-surface py-2 pl-9 pr-4 text-sm outline-none focus:border-gold"
          />
        </label>
        <div className="flex flex-wrap gap-1.5">
          {PESTANAS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setEstado(p.id)}
              className={`rounded-full border px-3 py-1 text-xs transition ${
                estado === p.id ? "border-ink bg-ink text-ivory" : "border-line bg-surface text-muted hover:text-foreground"
              }`}
            >
              {p.nombre}
            </button>
          ))}
        </div>
      </div>

      {visibles.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line py-14 text-center text-sm text-muted">No hay planes que coincidan.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-line bg-surface">
          <table className="w-full min-w-[860px] text-sm">
            <thead className="border-b border-line">
              <tr>
                <th className={th}>Cliente</th>
                <th className={th}>Procedimiento</th>
                <th className={th}>Profesional</th>
                <th className={th}>Progreso</th>
                <th className={th}>Próxima sesión</th>
                <th className={`${th} text-right`}>Pagado</th>
                <th className={th}>Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {visibles.map((p) => (
                <tr key={p.id} className="hover:bg-background/60">
                  <td className="px-4 py-3">
                    <Link href={`/panel/clientes/lista/${p.cliente.id}?tab=tratamientos`} className="font-medium hover:underline">
                      {p.cliente.nombre}
                    </Link>
                    <p className="text-xs text-muted">{codigoCliente(p.cliente.codigo)}</p>
                  </td>
                  <td className="px-4 py-3">{p.procedimiento}</td>
                  <td className="px-4 py-3">
                    {p.profesional ? (
                      <span className="inline-flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ background: p.profesional.color }} />
                        {p.profesional.nombre}
                      </span>
                    ) : (
                      <span className="text-muted">Sin asignar</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-24 overflow-hidden rounded-full bg-background">
                        <div className="h-full rounded-full bg-gold" style={{ width: `${(p.completadas / p.total) * 100}%` }} />
                      </div>
                      <span className="text-xs text-muted">
                        {p.completadas}/{p.total}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {p.proxima ? (
                      <>
                        <p className={p.proxima.fecha && p.proxima.fecha < hoy ? "text-red-700" : ""}>{fechaCorta(p.proxima.fecha)}</p>
                        <p className="text-muted">
                          Sesión {p.proxima.numero}
                          {p.proxima.hora && ` · ${horaCorta(p.proxima.hora)}`}
                        </p>
                      </>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right text-xs">
                    {dinero(p.pagado)}
                    <p className="text-muted">de {dinero(p.precioTotal)}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wider ${CLASE_ESTADO_PLAN[p.estado]}`}>
                      {ETIQUETA_ESTADO_PLAN[p.estado]}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
