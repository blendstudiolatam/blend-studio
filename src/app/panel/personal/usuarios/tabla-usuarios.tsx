"use client";

import { KeyRound, Link2, Search, X } from "lucide-react";
import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { EnlaceCompartir } from "@/components/ui/enlace-compartir";
import { MensajeError } from "@/components/ui/mensaje-error";
import { ETIQUETA_ROL, type Rol } from "@/lib/auth/permisos";
import { cambiarActivo, cambiarRol, generarEnlaceAcceso, type Resultado } from "./actions";

export type FilaUsuario = {
  accesoId: string;
  usuarioId: string;
  nombre: string;
  email: string;
  rol: Rol;
  activo: boolean;
  esYo: boolean;
};

const ROLES: Rol[] = ["admin", "recepcion", "estilista", "asistente"];
const FILTROS = [
  { id: "todos", nombre: "Todos" },
  { id: "activos", nombre: "Activos" },
  { id: "inactivos", nombre: "Inactivos" },
] as const;

const iniciales = (nombre: string) =>
  nombre
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");

export function TablaUsuarios({ filas }: { filas: FilaUsuario[] }) {
  const [busqueda, setBusqueda] = useState("");
  const [filtro, setFiltro] = useState<(typeof FILTROS)[number]["id"]>("todos");
  const [resultado, setResultado] = useState<Resultado>();
  const [pendiente, iniciar] = useTransition();

  const visibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return filas.filter(
      (f) =>
        (filtro === "todos" || (filtro === "activos") === f.activo) &&
        (!q || f.nombre.toLowerCase().includes(q) || f.email.toLowerCase().includes(q)),
    );
  }, [filas, busqueda, filtro]);

  const ejecutar = (fn: () => Promise<Resultado>) =>
    iniciar(async () => setResultado(await fn()));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="relative w-full max-w-xs">
          <span className="sr-only">Buscar usuario</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            type="search"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre o correo"
            className="w-full rounded-full border border-line bg-surface py-2 pl-9 pr-4 text-sm outline-none focus:border-gold"
          />
        </label>
        <div className="flex gap-1 rounded-full border border-line bg-surface p-1">
          {FILTROS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFiltro(f.id)}
              className={`rounded-full px-3 py-1 text-xs transition ${
                filtro === f.id ? "bg-ink text-ivory" : "text-muted hover:text-foreground"
              }`}
            >
              {f.nombre}
            </button>
          ))}
        </div>
      </div>

      {resultado?.enlace && (
        <div className="relative">
          <button
            type="button"
            onClick={() => setResultado(undefined)}
            aria-label="Cerrar"
            className="absolute right-3 top-3 text-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
          <EnlaceCompartir enlace={resultado.enlace} nombre={resultado.nombre} />
        </div>
      )}
      {resultado?.ok && !resultado.enlace && (
        <p className="text-sm text-emerald-700" role="status">
          {resultado.ok}
        </p>
      )}
      <MensajeError>{resultado?.error}</MensajeError>

      <div className="overflow-x-auto rounded-xl border border-line bg-surface">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-line text-[11px] uppercase tracking-[0.14em] text-muted">
            <tr>
              <th className="px-4 py-3 font-medium">Usuario</th>
              <th className="px-4 py-3 font-medium">Rol</th>
              <th className="px-4 py-3 font-medium">Estado</th>
              <th className="px-4 py-3 text-right font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody className={pendiente ? "opacity-60" : undefined}>
            {visibles.map((f) => (
              <tr key={f.accesoId} className="border-b border-line last:border-0">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink text-xs text-gold">
                      {iniciales(f.nombre)}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-medium">
                        {f.nombre} {f.esYo && <span className="text-xs text-muted">(tú)</span>}
                      </p>
                      <p className="truncate text-xs text-muted">{f.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <select
                    value={f.rol}
                    disabled={f.esYo || pendiente}
                    onChange={(e) => ejecutar(() => cambiarRol(f.accesoId, e.target.value as Rol))}
                    aria-label={`Rol de ${f.nombre}`}
                    className="rounded-lg border border-line bg-background px-2 py-1.5 text-sm disabled:opacity-60"
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>
                        {ETIQUETA_ROL[r]}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    disabled={f.esYo || pendiente}
                    onClick={() => ejecutar(() => cambiarActivo(f.accesoId, !f.activo))}
                    className={`rounded-full px-3 py-1 text-xs disabled:opacity-60 ${
                      f.activo ? "bg-emerald-50 text-emerald-800" : "bg-stone-100 text-stone-600"
                    }`}
                    title={f.esYo ? undefined : f.activo ? "Desactivar" : "Activar"}
                  >
                    {f.activo ? "Activo" : "Inactivo"}
                  </button>
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1">
                    {!f.esYo && (
                      <>
                        <button
                          type="button"
                          disabled={pendiente}
                          onClick={() => ejecutar(() => generarEnlaceAcceso(f.accesoId))}
                          className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-muted hover:bg-background hover:text-foreground"
                          title="Generar enlace para crear o restablecer la contraseña"
                        >
                          <Link2 className="h-3.5 w-3.5" /> Enlace
                        </button>
                        <Link
                          href={`/panel/personal/usuarios/${f.usuarioId}`}
                          className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-muted hover:bg-background hover:text-foreground"
                        >
                          <KeyRound className="h-3.5 w-3.5" /> Permisos
                        </Link>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {visibles.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-sm text-muted">
                  No hay usuarios que coincidan.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
