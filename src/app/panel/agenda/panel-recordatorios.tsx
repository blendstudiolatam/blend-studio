"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Boton } from "@/components/ui/boton";
import { MensajeError } from "@/components/ui/mensaje-error";
import { guardarRecordatorios } from "./actions";
import type { ConfigRecordatorios } from "./tipos";

const AVISOS = [
  [2, "2 horas antes"],
  [12, "12 horas antes"],
  [24, "1 día antes"],
  [48, "2 días antes"],
  [72, "3 días antes"],
] as const;
const SEGUIMIENTOS = [
  [1, "1 hora antes"],
  [2, "2 horas antes"],
  [3, "3 horas antes"],
  [6, "6 horas antes"],
] as const;

const entrada = "block w-full rounded-lg border border-line bg-surface px-3.5 py-2.5 text-sm outline-none focus:border-gold disabled:opacity-70";

export function PanelRecordatorios({ inicial, editable, onListo }: { inicial: ConfigRecordatorios; editable: boolean; onListo: () => void }) {
  const router = useRouter();
  const [v, setV] = useState(inicial);
  const [error, setError] = useState<string>();
  const [pendiente, iniciar] = useTransition();
  const set = <K extends keyof ConfigRecordatorios>(k: K, valor: ConfigRecordatorios[K]) => setV((x) => ({ ...x, [k]: valor }));

  return (
    <form
      className="space-y-5 text-sm"
      action={() =>
        iniciar(async () => {
          const r = await guardarRecordatorios(v);
          if (r?.error) return setError(r.error);
          router.refresh();
          onListo();
        })
      }
    >
      <fieldset disabled={!editable || pendiente} className="space-y-5">
        <label className="flex items-center justify-between gap-3 rounded-xl border border-line bg-surface p-4">
          <span>
            <strong className="font-medium">Recordatorios automáticos</strong>
            <span className="block text-xs text-muted">{v.activo ? "Activados" : "Desactivados"}</span>
          </span>
          <input type="checkbox" checked={v.activo} onChange={(e) => set("activo", e.target.checked)} className="h-5 w-5 accent-[var(--brand-gold)]" />
        </label>

        <div className={v.activo ? "space-y-5" : "pointer-events-none space-y-5 opacity-50"}>
          <div>
            <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.16em] text-muted">Canales</p>
            <label className="flex items-center gap-2 py-1">
              <input type="checkbox" checked={v.por_whatsapp} onChange={(e) => set("por_whatsapp", e.target.checked)} className="h-4 w-4 accent-[var(--brand-gold)]" />
              WhatsApp
            </label>
            <label className="flex items-center gap-2 py-1">
              <input type="checkbox" checked={v.por_correo} onChange={(e) => set("por_correo", e.target.checked)} className="h-4 w-4 accent-[var(--brand-gold)]" />
              Correo electrónico
            </label>
          </div>
          <label className="block">
            <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.16em] text-muted">Aviso principal</span>
            <select value={v.aviso_horas} onChange={(e) => set("aviso_horas", Number(e.target.value))} className={entrada}>
              {AVISOS.map(([h, t]) => (
                <option key={h} value={h}>
                  {t}
                </option>
              ))}
            </select>
          </label>
          <div className="space-y-2">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={v.seguimiento_activo} onChange={(e) => set("seguimiento_activo", e.target.checked)} className="h-4 w-4 accent-[var(--brand-gold)]" />
              Enviar un segundo aviso de seguimiento
            </label>
            {v.seguimiento_activo && (
              <select value={v.seguimiento_horas} onChange={(e) => set("seguimiento_horas", Number(e.target.value))} className={entrada}>
                {SEGUIMIENTOS.map(([h, t]) => (
                  <option key={h} value={h}>
                    {t}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>
      </fieldset>

      <p className="rounded-lg bg-background px-4 py-3 text-xs text-muted">
        Aquí queda guardada la configuración. El envío automático se activa en la Fase 3, al conectar WhatsApp Cloud API y un servicio de correo (con
        costo a confirmar). Mientras tanto, usa el botón de WhatsApp de cada cita.
      </p>

      <MensajeError>{error}</MensajeError>
      {editable ? (
        <Boton type="submit" cargando={pendiente}>
          Guardar
        </Boton>
      ) : (
        <p className="text-xs text-muted">Solo un administrador cambia esta configuración.</p>
      )}
    </form>
  );
}
