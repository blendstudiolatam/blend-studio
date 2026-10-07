"use client";

import { Lock } from "lucide-react";
import { useState, useTransition } from "react";
import { MensajeError } from "@/components/ui/mensaje-error";
import {
  ETIQUETA_NIVEL,
  MODULOS_APP,
  limiteFijo,
  nivelPermitido,
  type ModuloApp,
  type NivelPermiso,
  type Rol,
} from "@/lib/auth/permisos";
import { cambiarPermisoPersonal, type Resultado } from "../actions";

const NIVELES: NivelPermiso[] = ["total", "lectura", "ninguno"];

export function PermisosPersona({
  usuarioId,
  rol,
  delRol,
  ajustes,
}: {
  usuarioId: string;
  rol: Rol;
  delRol: Record<ModuloApp, NivelPermiso>;
  ajustes: Partial<Record<ModuloApp, NivelPermiso>>;
}) {
  const [resultado, setResultado] = useState<Resultado>();
  const [pendiente, iniciar] = useTransition();

  if (rol === "admin") {
    return (
      <p className="rounded-xl border border-line bg-surface p-6 text-sm text-muted">
        Los administradores siempre tienen acceso total. Para limitar a esta persona, cambia su rol en la
        lista de usuarios.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {resultado?.ok && <p className="text-sm text-emerald-700">{resultado.ok}</p>}
      <MensajeError>{resultado?.error}</MensajeError>
      <div className="overflow-x-auto rounded-xl border border-line bg-surface">
        <table className={`w-full min-w-[520px] text-left text-sm ${pendiente ? "opacity-60" : ""}`}>
          <thead className="border-b border-line text-[11px] uppercase tracking-[0.14em] text-muted">
            <tr>
              <th className="px-4 py-3 font-medium">Módulo</th>
              <th className="px-4 py-3 font-medium">Permiso</th>
            </tr>
          </thead>
          <tbody>
            {MODULOS_APP.map(({ modulo, nombre }) => {
              const limite = limiteFijo(rol, modulo);
              const delRolNivel = delRol[modulo] ?? "ninguno";
              return (
                <tr key={modulo} className="border-b border-line last:border-0">
                  <td className="px-4 py-3 font-medium">{nombre}</td>
                  <td className="px-4 py-3">
                    {limite === "ninguno" ? (
                      <span className="inline-flex items-center gap-1.5 text-muted">
                        <Lock className="h-3.5 w-3.5" /> {ETIQUETA_NIVEL.ninguno} (límite fijo)
                      </span>
                    ) : (
                      <select
                        value={ajustes[modulo] ?? "rol"}
                        disabled={pendiente}
                        onChange={(e) =>
                          iniciar(async () =>
                            setResultado(
                              await cambiarPermisoPersonal(
                                usuarioId,
                                modulo,
                                e.target.value as NivelPermiso | "rol",
                              ),
                            ),
                          )
                        }
                        aria-label={`Permiso en ${nombre}`}
                        className="rounded-lg border border-line bg-background px-2 py-1.5 text-sm"
                      >
                        <option value="rol">Según su rol ({ETIQUETA_NIVEL[delRolNivel]})</option>
                        {NIVELES.map((n) => (
                          <option key={n} value={n} disabled={!nivelPermitido(n, limite)}>
                            {ETIQUETA_NIVEL[n]}
                            {!nivelPermitido(n, limite) ? " (bloqueado)" : ""}
                          </option>
                        ))}
                      </select>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
