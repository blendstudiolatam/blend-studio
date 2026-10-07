"use client";

import { ImageUp, RotateCcw, Trash2 } from "lucide-react";
import { useRef, useState, useTransition } from "react";
import { IndicadorGuardado } from "@/components/ui/indicador-guardado";
import { MensajeError } from "@/components/ui/mensaje-error";
import { useAutoguardado } from "@/lib/use-autoguardado";
import { guardarNegocio, quitarLogo, subirLogo } from "../actions";
import { VistaComprobante } from "./vista-comprobante";

export type ValoresNegocio = {
  nombre_comercial: string;
  nombre_legal: string;
  ruc: string;
  dv: string;
  telefono: string;
  whatsapp: string;
  email: string;
  email_respaldo: string;
  instagram: string;
  facebook: string;
  tiktok: string;
  sitio_web: string;
  horario_texto: string;
  mensaje_comprobante: string;
};

type Props = {
  inicial: ValoresNegocio;
  logoInicial: string | null;
  itbms: number;
  sucursal: { nombre: string; direccion: string | null; telefono: string | null };
  editable: boolean;
};

const urlLogo = (path: string | null) =>
  path ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/marca/${path}` : null;

export function FormularioNegocio({ inicial, logoInicial, itbms, sucursal, editable }: Props) {
  const [valores, setValores] = useState(inicial);
  const { estado, error, valoresIniciales } = useAutoguardado(valores, guardarNegocio);
  const [logo, setLogo] = useState(logoInicial);
  const [errorLogo, setErrorLogo] = useState<string>();
  const [subiendo, iniciar] = useTransition();
  const archivo = useRef<HTMLInputElement>(null);

  const cambiar = (campo: keyof ValoresNegocio) => (e: { target: { value: string } }) =>
    setValores((v) => ({ ...v, [campo]: e.target.value }));

  const campo = (
    campoId: keyof ValoresNegocio,
    etiqueta: string,
    opciones: { tipo?: string; max?: number; ayuda?: string; placeholder?: string } = {},
  ) => (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.16em] text-muted">
        {etiqueta}
      </span>
      <input
        type={opciones.tipo ?? "text"}
        value={valores[campoId]}
        onChange={cambiar(campoId)}
        maxLength={opciones.max ?? 120}
        placeholder={opciones.placeholder}
        disabled={!editable}
        className="block w-full rounded-lg border border-line bg-surface px-3.5 py-2.5 text-sm outline-none transition focus:border-gold focus:ring-2 focus:ring-gold/20 disabled:bg-background disabled:text-muted"
      />
      {opciones.ayuda && <span className="mt-1 block text-xs text-muted">{opciones.ayuda}</span>}
    </label>
  );

  return (
    <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_340px]">
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {editable ? (
            <IndicadorGuardado estado={estado} error={error} />
          ) : (
            <p className="text-sm text-muted">Solo un administrador puede cambiar estos datos.</p>
          )}
          {editable && (
            <button
              type="button"
              onClick={() => setValores(valoresIniciales)}
              disabled={JSON.stringify(valores) === JSON.stringify(valoresIniciales)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-1.5 text-xs text-muted transition hover:border-gold hover:text-foreground disabled:opacity-40"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Restablecer
            </button>
          )}
        </div>

        <Seccion titulo="Identidad">
          <div className="flex flex-wrap items-center gap-4 sm:col-span-2">
            <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-ink ring-1 ring-gold/50">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={logo ?? "/brand/logo-provisional.png"}
                alt="Logo actual"
                className="h-full w-full object-cover"
              />
            </div>
            {editable && (
              <div className="space-y-2">
                <input
                  ref={archivo}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    const datos = new FormData();
                    datos.set("logo", f);
                    iniciar(async () => {
                      const r = await subirLogo(datos);
                      setErrorLogo(r?.error);
                      if (r?.logoPath !== undefined) setLogo(urlLogo(r.logoPath));
                    });
                    e.target.value = "";
                  }}
                />
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={subiendo}
                    onClick={() => archivo.current?.click()}
                    className="inline-flex items-center gap-2 rounded-lg bg-ink px-3.5 py-2 text-xs uppercase tracking-[0.14em] text-ivory disabled:opacity-60"
                  >
                    <ImageUp className="h-4 w-4" /> {subiendo ? "Subiendo…" : "Cambiar logo"}
                  </button>
                  {logo && (
                    <button
                      type="button"
                      disabled={subiendo}
                      onClick={() =>
                        iniciar(async () => {
                          const r = await quitarLogo();
                          setErrorLogo(r?.error);
                          if (!r?.error) setLogo(null);
                        })
                      }
                      className="inline-flex items-center gap-2 rounded-lg border border-line px-3.5 py-2 text-xs text-muted hover:text-foreground"
                    >
                      <Trash2 className="h-4 w-4" /> Quitar
                    </button>
                  )}
                </div>
                <p className="text-xs text-muted">PNG, JPG o WebP de hasta 3 MB. Ideal: cuadrado.</p>
              </div>
            )}
            <div className="w-full">
              <MensajeError>{errorLogo}</MensajeError>
            </div>
          </div>
          {campo("nombre_comercial", "Nombre comercial", { max: 80 })}
          {campo("nombre_legal", "Nombre legal (razón social)")}
          {campo("ruc", "RUC", { max: 25, placeholder: "8-888-8888" })}
          {campo("dv", "DV", { max: 2, placeholder: "00" })}
        </Seccion>

        <Seccion titulo="Contacto">
          {campo("telefono", "Teléfono", { tipo: "tel", max: 30, placeholder: "+507 6000-0000" })}
          {campo("whatsapp", "WhatsApp", { tipo: "tel", max: 30, placeholder: "+507 6000-0000" })}
          {campo("email", "Correo", { tipo: "email", max: 254 })}
          {campo("email_respaldo", "Correo de respaldo", {
            tipo: "email",
            max: 254,
            ayuda: "Recibe copia de los recordatorios.",
          })}
        </Seccion>

        <Seccion titulo="Redes sociales">
          {campo("instagram", "Instagram", { max: 100, placeholder: "@blendstudio" })}
          {campo("facebook", "Facebook", { max: 100 })}
          {campo("tiktok", "TikTok", { max: 100, placeholder: "@blendstudio" })}
          {campo("sitio_web", "Sitio web", { max: 200, placeholder: "blendstudio.com" })}
        </Seccion>

        <Seccion titulo="Comprobante">
          {campo("horario_texto", "Horario de atención (texto)", {
            max: 200,
            ayuda: "Así aparece en el comprobante. El horario real de cada sucursal se define en “Sucursales y horarios”.",
          })}
          {campo("mensaje_comprobante", "Mensaje al pie", { max: 200 })}
        </Seccion>
      </div>

      <aside className="xl:sticky xl:top-20 xl:self-start">
        <p className="mb-3 text-[11px] uppercase tracking-[0.16em] text-muted">Vista previa del comprobante</p>
        <VistaComprobante negocio={valores} logo={logo} itbms={itbms} sucursal={sucursal} />
      </aside>
    </div>
  );
}

function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-line bg-surface p-5 sm:p-6">
      <h2 className="font-display text-xl">{titulo}</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}
