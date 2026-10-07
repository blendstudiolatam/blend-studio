"use client";

import { Plus, ShieldCheck, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { Boton } from "@/components/ui/boton";
import { MensajeError } from "@/components/ui/mensaje-error";
import { guardarHistorial, type Medicamento } from "../../salud-actions";

export type DatosSalud = {
  historial: {
    consentimiento: boolean;
    consentimiento_at: string | null;
    consentimiento_por_nombre: string | null;
    alergias: string | null;
    condiciones: string | null;
    observaciones: string | null;
    tipo_sangre: string | null;
    peso_kg: number | null;
    altura_cm: number | null;
    presion: string | null;
    updated_at: string;
    actualizado_por_nombre: string | null;
  } | null;
  medicamentos: { medicamento: string; dosis: string | null; desde: string | null }[];
};

export type Consulta = { id: string; accion: string; detalle: string | null; fecha: string; usuario: string };

const ACCION: Record<string, string> = {
  ver_historial: "Vio el historial médico",
  editar_historial: "Editó el historial médico",
  ver_documento: "Abrió un documento",
  subir_documento: "Subió un documento",
  eliminar_documento: "Eliminó un documento",
};

const SANGRE = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const entrada =
  "block w-full rounded-lg border border-line bg-surface px-3.5 py-2.5 text-sm outline-none focus:border-gold disabled:opacity-70";
const etiqueta = "mb-1.5 block text-[11px] font-medium uppercase tracking-[0.16em] text-muted";
const fecha = (iso: string) =>
  new Date(iso).toLocaleString("es-PA", { timeZone: "America/Panama", dateStyle: "medium", timeStyle: "short" });

export function HistorialMedico({
  clienteId,
  inicial,
  editable,
  consultas,
}: {
  clienteId: string;
  inicial: DatosSalud;
  editable: boolean;
  consultas: Consulta[] | null;
}) {
  const h = inicial.historial;
  const [consentimiento, setConsentimiento] = useState(h?.consentimiento ?? false);
  const [meds, setMeds] = useState<Medicamento[]>(
    inicial.medicamentos.map((m) => ({ medicamento: m.medicamento, dosis: m.dosis ?? "", desde: m.desde ?? "" })),
  );
  const [error, setError] = useState<string>();
  const [ok, setOk] = useState<string>();
  const [pendiente, iniciar] = useTransition();
  const bloqueado = !editable || pendiente;

  const enviar = (fd: FormData) =>
    iniciar(async () => {
      if (!consentimiento && h?.consentimiento && !confirm("Sin consentimiento se borrarán los datos de salud de este cliente. ¿Continuar?")) {
        return;
      }
      const r = await guardarHistorial(
        clienteId,
        {
          consentimiento,
          alergias: String(fd.get("alergias") ?? ""),
          condiciones: String(fd.get("condiciones") ?? ""),
          observaciones: String(fd.get("observaciones") ?? ""),
          tipo_sangre: String(fd.get("tipo_sangre") ?? "") as "",
          peso_kg: String(fd.get("peso_kg") ?? ""),
          altura_cm: String(fd.get("altura_cm") ?? ""),
          presion: String(fd.get("presion") ?? ""),
        },
        consentimiento ? meds : [],
      );
      setError(r?.error);
      setOk(r?.ok ? "Historial guardado." : undefined);
      if (r?.ok && !consentimiento) setMeds([]);
    });

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
      <form action={enviar} className="space-y-6">
        <div className={`rounded-xl border p-4 ${consentimiento ? "border-emerald-200 bg-emerald-50/60" : "border-amber-200 bg-amber-50/60"}`}>
          <label className="flex items-start gap-3 text-sm">
            <input
              type="checkbox"
              checked={consentimiento}
              disabled={bloqueado}
              onChange={(e) => setConsentimiento(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-[var(--brand-gold)]"
            />
            <span>
              <strong>El cliente autorizó guardar sus datos de salud.</strong>
              <span className="mt-0.5 block text-muted">
                Ley 81 de 2019: sin esta autorización no se registra nada. Lo ideal es subir el consentimiento firmado en
                Documentos.
              </span>
              {h?.consentimiento && h.consentimiento_at && (
                <span className="mt-1 block text-xs text-emerald-800">
                  Registrado el {fecha(h.consentimiento_at)}
                  {h.consentimiento_por_nombre && ` por ${h.consentimiento_por_nombre}`}.
                </span>
              )}
            </span>
          </label>
        </div>

        <fieldset disabled={bloqueado || !consentimiento} className={`space-y-6 ${consentimiento ? "" : "opacity-50"}`}>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className={etiqueta}>Alergias</span>
              <textarea name="alergias" rows={3} maxLength={1000} defaultValue={h?.alergias ?? ""} placeholder="Ej.: látex, penicilina, tintes con amoníaco" className={entrada} />
            </label>
            <label className="block">
              <span className={etiqueta}>Condiciones médicas</span>
              <textarea name="condiciones" rows={3} maxLength={1000} defaultValue={h?.condiciones ?? ""} placeholder="Ej.: diabetes, embarazo, dermatitis" className={entrada} />
            </label>
          </div>

          <section>
            <div className="mb-2 flex items-center justify-between">
              <h3 className={etiqueta}>Medicación actual</h3>
              {editable && consentimiento && (
                <button
                  type="button"
                  onClick={() => setMeds((m) => [...m, { medicamento: "", dosis: "", desde: "" }])}
                  className="inline-flex items-center gap-1 text-xs text-gold-strong hover:underline"
                >
                  <Plus className="h-3.5 w-3.5" /> Agregar
                </button>
              )}
            </div>
            {meds.length === 0 ? (
              <p className="rounded-lg border border-dashed border-line px-4 py-3 text-sm text-muted">Sin medicación registrada.</p>
            ) : (
              <div className="space-y-2">
                {meds.map((m, i) => (
                  <div key={i} className="grid grid-cols-[1fr_auto] items-center gap-2 sm:grid-cols-[1fr_110px_150px_auto]">
                    <input
                      aria-label="Medicamento"
                      placeholder="Medicamento"
                      maxLength={120}
                      value={m.medicamento}
                      onChange={(e) => setMeds((l) => l.map((x, j) => (j === i ? { ...x, medicamento: e.target.value } : x)))}
                      className={entrada}
                    />
                    <input
                      aria-label="Dosis"
                      placeholder="Dosis"
                      maxLength={80}
                      value={m.dosis ?? ""}
                      onChange={(e) => setMeds((l) => l.map((x, j) => (j === i ? { ...x, dosis: e.target.value } : x)))}
                      className={entrada}
                    />
                    <input
                      aria-label="Desde"
                      type="date"
                      value={m.desde ?? ""}
                      onChange={(e) => setMeds((l) => l.map((x, j) => (j === i ? { ...x, desde: e.target.value } : x)))}
                      className={entrada}
                    />
                    <button
                      type="button"
                      onClick={() => setMeds((l) => l.filter((_, j) => j !== i))}
                      className="rounded-md p-2 text-muted hover:text-red-700"
                      aria-label="Quitar medicamento"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section>
            <h3 className={etiqueta}>Signos vitales</h3>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <label className="block">
                <span className="mb-1 block text-xs text-muted">Tipo de sangre</span>
                <select name="tipo_sangre" defaultValue={h?.tipo_sangre ?? ""} className={entrada}>
                  <option value="">—</option>
                  {SANGRE.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-xs text-muted">Peso (kg)</span>
                <input name="peso_kg" type="number" min={1} max={400} step={0.1} defaultValue={h?.peso_kg ?? ""} className={entrada} />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs text-muted">Altura (cm)</span>
                <input name="altura_cm" type="number" min={30} max={250} step={0.1} defaultValue={h?.altura_cm ?? ""} className={entrada} />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs text-muted">Presión</span>
                <input name="presion" placeholder="120/80" maxLength={7} defaultValue={h?.presion ?? ""} className={entrada} />
              </label>
            </div>
          </section>

          <label className="block">
            <span className={etiqueta}>Observaciones</span>
            <textarea name="observaciones" rows={3} maxLength={2000} defaultValue={h?.observaciones ?? ""} className={entrada} />
          </label>
        </fieldset>

        <MensajeError>{error}</MensajeError>
        {ok && !error && <p className="text-sm text-emerald-700">{ok}</p>}

        <div className="flex flex-wrap items-center justify-between gap-3">
          {editable ? (
            <Boton type="submit" cargando={pendiente} className="sm:w-auto">
              Guardar historial
            </Boton>
          ) : (
            <p className="text-sm text-muted">Solo lectura.</p>
          )}
          {h && (
            <p className="text-xs text-muted">
              Última actualización: {fecha(h.updated_at)}
              {h.actualizado_por_nombre && ` · ${h.actualizado_por_nombre}`}
            </p>
          )}
        </div>
      </form>

      <aside className="space-y-3">
        <div className="flex items-start gap-2 rounded-xl border border-line bg-surface p-4 text-xs text-muted">
          <ShieldCheck className="h-4 w-4 shrink-0 text-gold-strong" />
          <p>
            Dato sensible. Lo ven solo administración y recepción (y, cuando exista la Agenda, el profesional con cita con
            este cliente). Cada consulta queda registrada.
          </p>
        </div>
        {consultas && (
          <div className="rounded-xl border border-line bg-surface">
            <h3 className="border-b border-line px-4 py-3 text-[11px] font-medium uppercase tracking-[0.16em] text-muted">
              Registro de consultas
            </h3>
            <ul className="max-h-96 divide-y divide-line overflow-y-auto text-xs">
              {consultas.map((c) => (
                <li key={c.id} className="px-4 py-2.5">
                  <p className="text-foreground">
                    {c.usuario} · {ACCION[c.accion] ?? c.accion}
                  </p>
                  {c.detalle && <p className="truncate text-muted">{c.detalle}</p>}
                  <p className="text-muted">{fecha(c.fecha)}</p>
                </li>
              ))}
            </ul>
          </div>
        )}
      </aside>
    </div>
  );
}
