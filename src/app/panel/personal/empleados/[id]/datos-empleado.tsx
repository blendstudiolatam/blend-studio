"use client";

import { Camera, KeyRound, RotateCcw, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { Avatar } from "@/components/ui/avatar";
import { EnlaceCompartir } from "@/components/ui/enlace-compartir";
import { IndicadorGuardado } from "@/components/ui/indicador-guardado";
import { MensajeError } from "@/components/ui/mensaje-error";
import { ETIQUETA_ROL, type Rol } from "@/lib/auth/permisos";
import { ETIQUETA_ESTADO, urlFotoEmpleado, type EstadoEmpleado } from "@/lib/empleados";
import { useAutoguardado } from "@/lib/use-autoguardado";
import { darAccesoSistema, eliminarEmpleado, guardarEmpleado, subirFotoEmpleado, type Resultado } from "../actions";

type Valores = {
  nombre: string;
  apellido: string;
  email: string;
  telefono: string;
  rol: Rol;
  especialidad: string;
  comision_pct: number;
  estado: EstadoEmpleado;
  reserva_web: boolean;
  color: string;
};

export function DatosEmpleadoForm({
  id,
  inicial,
  fotoInicial,
  conAcceso,
  editable,
  puedeDarAcceso,
}: {
  id: string;
  inicial: Valores;
  fotoInicial: string | null;
  conAcceso: boolean;
  editable: boolean;
  puedeDarAcceso: boolean;
}) {
  const router = useRouter();
  const [v, setV] = useState(inicial);
  const [aviso, setAviso] = useState<string>();
  const { estado, error, valoresIniciales } = useAutoguardado(v, async (datos) => {
    const r = await guardarEmpleado(id, datos);
    setAviso(r?.aviso);
    return r;
  });
  const [foto, setFoto] = useState(fotoInicial);
  const [resultado, setResultado] = useState<Resultado>();
  const [pendiente, iniciar] = useTransition();
  const archivo = useRef<HTMLInputElement>(null);
  const set = <K extends keyof Valores>(k: K, valor: Valores[K]) => setV((x) => ({ ...x, [k]: valor }));

  const entrada =
    "block w-full rounded-lg border border-line bg-surface px-3.5 py-2.5 text-sm outline-none focus:border-gold disabled:bg-background disabled:text-muted";
  const etiqueta = "mb-1.5 block text-[11px] font-medium uppercase tracking-[0.16em] text-muted";

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {editable ? <IndicadorGuardado estado={estado} error={error} /> : <p className="text-sm text-muted">Solo lectura</p>}
          {editable && (
            <button
              type="button"
              onClick={() => setV(valoresIniciales)}
              disabled={JSON.stringify(v) === JSON.stringify(valoresIniciales)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-1.5 text-xs text-muted hover:border-gold hover:text-foreground disabled:opacity-40"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Restablecer
            </button>
          )}
        </div>
        {aviso && <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900">{aviso}</p>}

        <section className="grid gap-4 rounded-xl border border-line bg-surface p-5 sm:grid-cols-2 sm:p-6">
          <label className="block">
            <span className={etiqueta}>Nombre</span>
            <input value={v.nombre} onChange={(e) => set("nombre", e.target.value)} maxLength={60} disabled={!editable} className={entrada} />
          </label>
          <label className="block">
            <span className={etiqueta}>Apellido</span>
            <input value={v.apellido} onChange={(e) => set("apellido", e.target.value)} maxLength={60} disabled={!editable} className={entrada} />
          </label>
          <label className="block">
            <span className={etiqueta}>Teléfono</span>
            <input type="tel" value={v.telefono} onChange={(e) => set("telefono", e.target.value)} maxLength={30} disabled={!editable} className={entrada} />
          </label>
          <label className="block">
            <span className={etiqueta}>Correo</span>
            <input type="email" value={v.email} onChange={(e) => set("email", e.target.value)} maxLength={254} disabled={!editable} className={entrada} />
          </label>
          <label className="block">
            <span className={etiqueta}>Rol</span>
            <select value={v.rol} onChange={(e) => set("rol", e.target.value as Rol)} disabled={!editable} className={entrada}>
              {(["estilista", "recepcion", "asistente", "admin"] as Rol[]).map((r) => (
                <option key={r} value={r}>
                  {ETIQUETA_ROL[r]}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className={etiqueta}>Especialidad</span>
            <input value={v.especialidad} onChange={(e) => set("especialidad", e.target.value)} maxLength={80} disabled={!editable} className={entrada} />
          </label>
          <label className="block">
            <span className={etiqueta}>Comisión general (%)</span>
            <input
              type="number"
              min={0}
              max={100}
              step={0.5}
              value={v.comision_pct}
              onChange={(e) => set("comision_pct", Math.min(100, Math.max(0, Number(e.target.value) || 0)))}
              disabled={!editable}
              className={entrada}
            />
          </label>
          <label className="block">
            <span className={etiqueta}>Estado</span>
            <select value={v.estado} onChange={(e) => set("estado", e.target.value as EstadoEmpleado)} disabled={!editable} className={entrada}>
              {(["activo", "vacaciones", "inactivo"] as EstadoEmpleado[]).map((s) => (
                <option key={s} value={s}>
                  {ETIQUETA_ESTADO[s]}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className={etiqueta}>Color en la agenda</span>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={v.color}
                onChange={(e) => set("color", e.target.value)}
                disabled={!editable}
                className="h-10 w-12 rounded-md border border-line bg-surface p-1"
              />
              <span className="font-mono text-sm uppercase text-muted">{v.color}</span>
            </div>
          </label>
          <label className="flex items-center gap-2 self-end text-sm">
            <input
              type="checkbox"
              checked={v.reserva_web}
              onChange={(e) => set("reserva_web", e.target.checked)}
              disabled={!editable}
              className="h-4 w-4 accent-[var(--brand-gold)]"
            />
            Recibe reservas desde la web
          </label>
        </section>

        <MensajeError>{resultado?.error}</MensajeError>
        {editable && (
          <button
            type="button"
            disabled={pendiente}
            onClick={() => {
              if (!confirm("¿Eliminar este empleado? Si ya tuvo citas, mejor márcalo como Inactivo.")) return;
              iniciar(async () => {
                const r = await eliminarEmpleado(id);
                setResultado(r);
                if (r?.ok) router.push("/panel/personal/empleados");
              });
            }}
            className="inline-flex items-center gap-2 text-sm text-muted hover:text-red-700"
          >
            <Trash2 className="h-4 w-4" /> Eliminar empleado
          </button>
        )}
      </div>

      <aside className="space-y-5">
        <section className="rounded-xl border border-line bg-surface p-5 text-center">
          <Avatar nombre={`${v.nombre} ${v.apellido}`} foto={foto} tamano={140} color={v.color} className="mx-auto" />
          {editable && (
            <>
              <input
                ref={archivo}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  const datos = new FormData();
                  datos.set("foto", f);
                  iniciar(async () => {
                    const r = await subirFotoEmpleado(id, datos);
                    setResultado(r);
                    if (r?.fotoPath) setFoto(urlFotoEmpleado(r.fotoPath));
                  });
                  e.target.value = "";
                }}
              />
              <button
                type="button"
                disabled={pendiente}
                onClick={() => archivo.current?.click()}
                className="mt-4 inline-flex items-center gap-2 rounded-lg border border-line px-3.5 py-2 text-xs text-muted hover:border-gold hover:text-foreground"
              >
                <Camera className="h-4 w-4" /> {pendiente ? "Subiendo…" : "Cambiar foto"}
              </button>
            </>
          )}
        </section>

        <section className="rounded-xl border border-line bg-surface p-5">
          <h2 className="flex items-center gap-2 font-display text-lg">
            <KeyRound className="h-4 w-4 text-gold-strong" /> Acceso al sistema
          </h2>
          {conAcceso ? (
            <p className="mt-2 text-sm text-muted">
              Tiene usuario para entrar a la app.{" "}
              <Link href="/panel/personal/usuarios" className="text-gold-strong underline underline-offset-4">
                Gestionar en Usuarios
              </Link>
            </p>
          ) : resultado?.enlace ? (
            <div className="mt-3">
              <EnlaceCompartir enlace={resultado.enlace} nombre={v.nombre} />
            </div>
          ) : (
            <>
              <p className="mt-2 text-sm text-muted">No tiene usuario. Puede trabajar igual y aparecer en la agenda.</p>
              {puedeDarAcceso && (
                <button
                  type="button"
                  disabled={pendiente || !v.email}
                  onClick={() =>
                    iniciar(async () => {
                      const r = await darAccesoSistema(id);
                      setResultado(r);
                      if (r?.ok && !r.enlace) router.refresh();
                    })
                  }
                  className="mt-3 w-full rounded-lg bg-ink px-4 py-2.5 text-xs uppercase tracking-[0.14em] text-ivory disabled:opacity-50"
                  title={v.email ? undefined : "Primero escribe su correo"}
                >
                  Dar acceso al sistema
                </button>
              )}
            </>
          )}
          {resultado?.ok && !resultado.enlace && <p className="mt-2 text-xs text-emerald-700">{resultado.ok}</p>}
        </section>
      </aside>
    </div>
  );
}
