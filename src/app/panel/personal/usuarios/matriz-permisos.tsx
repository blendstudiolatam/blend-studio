"use client";

import { Lock } from "lucide-react";
import { useState, useTransition } from "react";
import { MensajeError } from "@/components/ui/mensaje-error";
import {
  ETIQUETA_NIVEL,
  ETIQUETA_ROL,
  MODULOS_APP,
  limiteFijo,
  nivelPermitido,
  type ModuloApp,
  type NivelPermiso,
  type Rol,
} from "@/lib/auth/permisos";
import { cambiarPermisoRol, type Resultado } from "./actions";

const ROLES_EDITABLES: Exclude<Rol, "admin">[] = ["recepcion", "estilista", "asistente"];
const NIVELES: NivelPermiso[] = ["total", "lectura", "ninguno"];

export function MatrizPermisos({
  matriz,
  editable,
}: {
  matriz: { rol: Rol; modulo: ModuloApp; nivel: NivelPermiso }[];
  editable: boolean;
}) {
  const [resultado, setResultado] = useState<Resultado>();
  const [pendiente, iniciar] = useTransition();
  const nivelDe = (rol: Rol, modulo: ModuloApp) =>
    matriz.find((m) => m.rol === rol && m.modulo === modulo)?.nivel ?? "ninguno";

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">
        {editable
          ? "Define qué puede hacer cada rol en cada módulo. Los cambios se guardan al instante."
          : "Solo el propietario puede cambiar esta matriz. Para una persona concreta, usa “Permisos” en la lista de usuarios."}{" "}
        Los campos con <Lock className="inline h-3.5 w-3.5" /> son límites fijos de seguridad.
      </p>
      {resultado?.ok && <p className="text-sm text-emerald-700">{resultado.ok}</p>}
      <MensajeError>{resultado?.error}</MensajeError>

      <div className="overflow-x-auto rounded-xl border border-line bg-surface">
        <table className={`w-full min-w-[720px] text-left text-sm ${pendiente ? "opacity-60" : ""}`}>
          <thead className="border-b border-line text-[11px] uppercase tracking-[0.14em] text-muted">
            <tr>
              <th className="px-4 py-3 font-medium">Módulo</th>
              <th className="px-4 py-3 font-medium">{ETIQUETA_ROL.admin}</th>
              {ROLES_EDITABLES.map((r) => (
                <th key={r} className="px-4 py-3 font-medium">
                  {ETIQUETA_ROL[r]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {MODULOS_APP.map(({ modulo, nombre }) => (
              <tr key={modulo} className="border-b border-line last:border-0">
                <td className="px-4 py-3 font-medium">{nombre}</td>
                <td className="px-4 py-3 text-muted">
                  <span className="inline-flex items-center gap-1.5">
                    <Lock className="h-3.5 w-3.5" /> {ETIQUETA_NIVEL.total}
                  </span>
                </td>
                {ROLES_EDITABLES.map((rol) => {
                  const limite = limiteFijo(rol, modulo);
                  const bloqueado = limite === "ninguno";
                  return (
                    <td key={rol} className="px-4 py-3">
                      {bloqueado ? (
                        <span className="inline-flex items-center gap-1.5 text-muted">
                          <Lock className="h-3.5 w-3.5" /> {ETIQUETA_NIVEL.ninguno}
                        </span>
                      ) : (
                        <select
                          value={nivelDe(rol, modulo)}
                          disabled={!editable || pendiente}
                          onChange={(e) =>
                            iniciar(async () =>
                              setResultado(
                                await cambiarPermisoRol(rol, modulo, e.target.value as NivelPermiso),
                              ),
                            )
                          }
                          aria-label={`${nombre} para ${ETIQUETA_ROL[rol]}`}
                          className="rounded-lg border border-line bg-background px-2 py-1.5 text-sm disabled:opacity-70"
                        >
                          {NIVELES.map((n) => (
                            <option key={n} value={n} disabled={!nivelPermitido(n, limite)}>
                              {ETIQUETA_NIVEL[n]}
                              {!nivelPermitido(n, limite) ? " (bloqueado)" : ""}
                            </option>
                          ))}
                        </select>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
