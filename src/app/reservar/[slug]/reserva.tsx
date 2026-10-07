"use client";

import { ArrowLeft, Check, Clock, MapPin, MessageCircle, Sparkles, UserRound } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { Wordmark } from "@/components/brand/wordmark";
import { Avatar } from "@/components/ui/avatar";
import { diaSemana, fechaLarga, hora12, hoyEnPanama, sumarDias } from "@/lib/agenda";
import { urlAmbiente } from "@/lib/ambiente";
import { enlaceWhatsApp } from "@/lib/clientes";
import { urlFotoEmpleado } from "@/lib/empleados";
import { ahorro, dinero, duracion } from "@/lib/formato";
import { enviarReserva, horariosDisponibles } from "../actions";
import type { Catalogo, Confirmacion } from "../tipos";

type Marca = { nombre: string; logo: string | null; whatsapp: string | null; instagram: string | null };
type Paso = 1 | 2 | 3 | 4;

const PASOS = ["Servicio", "Profesional", "Fecha y hora", "Tus datos"];
const DIAS_CORTOS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const SIN_PREFERENCIA = "";

export function Reserva({
  catalogo,
  marca,
  claveSitio,
}: {
  catalogo: Catalogo;
  marca: Marca;
  claveSitio: string | null;
}) {
  const [paso, setPaso] = useState<Paso>(1);
  const [categoria, setCategoria] = useState(catalogo.categorias[0]?.id ?? "");
  const [servicioId, setServicioId] = useState<string | null>(null);
  const [empleadoId, setEmpleadoId] = useState<string | null>(null); // "" = sin preferencia
  const [fecha, setFecha] = useState<string | null>(null);
  const [hora, setHora] = useState<string | null>(null);
  const [confirmacion, setConfirmacion] = useState<Confirmacion | null>(null);

  const servicio = catalogo.servicios.find((s) => s.id === servicioId) ?? null;
  const profesionales = catalogo.profesionales.filter((p) => servicioId && p.servicios.includes(servicioId));
  const profesional = catalogo.profesionales.find((p) => p.id === empleadoId) ?? null;

  const irA = (p: Paso) => {
    setPaso(p);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (confirmacion) return <Listo confirmacion={confirmacion} marca={marca} />;

  return (
    <div className="min-h-dvh bg-background">
      <header className="bg-ink px-5 pb-8 pt-8 text-ivory">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-6">
          <Link href="/" className="shrink-0" aria-label={marca.nombre}>
            {marca.logo ? (
              <Image src={marca.logo} alt={marca.nombre} width={72} height={72} className="h-16 w-16 rounded-full object-cover" />
            ) : (
              <Wordmark className="text-[7px]" />
            )}
          </Link>
          <div className="sm:text-right">
            <p className="text-[11px] uppercase tracking-[0.3em] text-gold">Reservas en línea 24/7</p>
            <h1 className="mt-1 font-display text-3xl sm:text-4xl">Reserva tu cita</h1>
            <p className="mt-1 text-sm text-ivory/70">
              {catalogo.sucursal.nombre}
              {catalogo.sucursal.direccion && ` · ${catalogo.sucursal.direccion}`}
            </p>
          </div>
        </div>
      </header>

      <nav className="sticky top-0 z-20 border-b border-line bg-background/95 backdrop-blur" aria-label="Pasos">
        <ol className="mx-auto flex max-w-5xl gap-1 overflow-x-auto px-5 py-3 text-xs">
          {PASOS.map((nombre, i) => {
            const n = (i + 1) as Paso;
            const hecho = n < paso;
            return (
              <li key={nombre} className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  disabled={!hecho}
                  onClick={() => irA(n)}
                  aria-current={n === paso ? "step" : undefined}
                  className={`flex items-center gap-2 rounded-full px-3 py-1.5 ${n === paso ? "bg-ink text-ivory" : hecho ? "text-foreground hover:bg-surface" : "text-muted"}`}
                >
                  <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] ${n === paso ? "bg-gold text-ink" : hecho ? "bg-gold/30" : "border border-line"}`}>
                    {hecho ? <Check className="h-3 w-3" /> : n}
                  </span>
                  {nombre}
                </button>
                {i < PASOS.length - 1 && <span className="h-px w-4 bg-line" />}
              </li>
            );
          })}
        </ol>
      </nav>

      <main className="mx-auto grid max-w-5xl gap-8 px-5 py-8 lg:grid-cols-[minmax(0,1fr)_300px]">
        <section className="min-w-0">
          {paso > 1 && (
            <button type="button" onClick={() => irA((paso - 1) as Paso)} className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground">
              <ArrowLeft className="h-4 w-4" /> Atrás
            </button>
          )}

          {paso === 1 && (
            <PasoServicio
              catalogo={catalogo}
              categoria={categoria}
              onCategoria={setCategoria}
              elegido={servicioId}
              onElegir={(id) => {
                setServicioId(id);
                setEmpleadoId(null);
                setHora(null);
                irA(2);
              }}
            />
          )}
          {paso === 2 && servicio && (
            <PasoProfesional
              profesionales={profesionales}
              elegido={empleadoId}
              onElegir={(id) => {
                setEmpleadoId(id);
                setHora(null);
                irA(3);
              }}
            />
          )}
          {paso === 3 && servicio && empleadoId !== null && (
            <PasoFecha
              catalogo={catalogo}
              servicioId={servicio.id}
              empleadoId={empleadoId}
              profesional={profesional}
              fecha={fecha}
              hora={hora}
              onFecha={(f) => (setFecha(f), setHora(null))}
              onHora={(h) => {
                setHora(h);
                irA(4);
              }}
            />
          )}
          {paso === 4 && servicio && fecha && hora && empleadoId !== null && (
            <PasoDatos
              slug={catalogo.sucursal.slug}
              servicioId={servicio.id}
              empleadoId={empleadoId}
              fecha={fecha}
              hora={hora}
              claveSitio={claveSitio}
              onListo={setConfirmacion}
              onOcupado={() => (setHora(null), irA(3))}
            />
          )}
        </section>

        <Resumen
          servicio={servicio}
          profesional={empleadoId === SIN_PREFERENCIA ? "Sin preferencia" : (profesional?.nombre ?? null)}
          fecha={fecha && hora ? fecha : null}
          hora={hora}
          sucursal={catalogo.sucursal}
          marca={marca}
        />
      </main>

      <footer className="border-t border-line px-5 py-6 text-center text-xs text-muted">
        {marca.nombre} ·{" "}
        <Link href="/privacidad" className="underline hover:text-foreground">
          Política de privacidad
        </Link>
      </footer>
    </div>
  );
}

// ---------------------------------------------------------------------
// Paso 1: servicio
// ---------------------------------------------------------------------
function PasoServicio({
  catalogo,
  categoria,
  onCategoria,
  elegido,
  onElegir,
}: {
  catalogo: Catalogo;
  categoria: string;
  onCategoria: (id: string) => void;
  elegido: string | null;
  onElegir: (id: string) => void;
}) {
  const cat = catalogo.categorias.find((c) => c.id === categoria);
  const servicios = catalogo.servicios.filter((s) => s.categoria_id === categoria);
  if (!catalogo.categorias.length) {
    return <p className="rounded-xl border border-dashed border-line py-14 text-center text-sm text-muted">Por ahora no hay servicios disponibles en línea.</p>;
  }
  return (
    <div className="space-y-6">
      <h2 className="font-display text-3xl">¿Qué te quieres hacer?</h2>
      <div className="-mx-5 flex gap-3 overflow-x-auto px-5 pb-2 lg:mx-0 lg:px-0">
        {catalogo.categorias.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => onCategoria(c.id)}
            aria-pressed={c.id === categoria}
            className={`group relative h-28 w-32 shrink-0 overflow-hidden rounded-xl text-left ${c.id === categoria ? "ring-2 ring-gold ring-offset-2 ring-offset-background" : ""}`}
          >
            <Image src={urlAmbiente(c.imagen)} alt="" fill sizes="128px" className="object-cover transition group-hover:scale-105" />
            <span className="absolute inset-0 bg-gradient-to-t from-ink/85 via-ink/20 to-transparent" />
            <span className="absolute inset-x-2 bottom-2 text-sm font-medium text-ivory">{c.nombre}</span>
          </button>
        ))}
      </div>
      {cat?.descripcion && <p className="text-sm text-muted">{cat.descripcion}</p>}
      <ul className="space-y-3">
        {servicios.map((s) => {
          const pct = ahorro(s.precio, s.precio_descuento);
          return (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => onElegir(s.id)}
                className={`flex w-full items-center justify-between gap-4 rounded-xl border bg-surface p-4 text-left transition hover:border-gold ${elegido === s.id ? "border-gold" : "border-line"}`}
              >
                <div className="min-w-0">
                  <p className="font-medium">{s.nombre}</p>
                  {s.descripcion && <p className="mt-0.5 line-clamp-2 text-sm text-muted">{s.descripcion}</p>}
                  <p className="mt-1 inline-flex items-center gap-1 text-xs text-muted">
                    <Clock className="h-3.5 w-3.5" /> {duracion(s.duracion)}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-display text-xl">{dinero(s.precio_descuento ?? s.precio)}</p>
                  {pct !== null && <p className="text-xs text-muted line-through">{dinero(s.precio)}</p>}
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// ---------------------------------------------------------------------
// Paso 2: profesional
// ---------------------------------------------------------------------
function PasoProfesional({
  profesionales,
  elegido,
  onElegir,
}: {
  profesionales: Catalogo["profesionales"];
  elegido: string | null;
  onElegir: (id: string) => void;
}) {
  return (
    <div className="space-y-6">
      <h2 className="font-display text-3xl">¿Con quién?</h2>
      <ul className="grid gap-3 sm:grid-cols-2">
        <li>
          <button
            type="button"
            onClick={() => onElegir(SIN_PREFERENCIA)}
            className={`flex h-full w-full items-center gap-4 rounded-xl border bg-surface p-4 text-left transition hover:border-gold ${elegido === SIN_PREFERENCIA ? "border-gold" : "border-line"}`}
          >
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-ink text-gold">
              <Sparkles className="h-6 w-6" />
            </span>
            <span>
              <span className="block font-medium">Sin preferencia</span>
              <span className="text-sm text-muted">Te asignamos al primero disponible</span>
            </span>
          </button>
        </li>
        {profesionales.map((p) => (
          <li key={p.id}>
            <button
              type="button"
              onClick={() => onElegir(p.id)}
              className={`flex h-full w-full items-center gap-4 rounded-xl border bg-surface p-4 text-left transition hover:border-gold ${elegido === p.id ? "border-gold" : "border-line"}`}
            >
              <Avatar nombre={p.nombre} foto={urlFotoEmpleado(p.foto)} tamano={56} color={p.color} />
              <span>
                <span className="block font-medium">{p.nombre}</span>
                {p.especialidad && <span className="text-sm text-muted">{p.especialidad}</span>}
              </span>
            </button>
          </li>
        ))}
      </ul>
      {profesionales.length === 0 && <p className="text-sm text-muted">Por ahora este servicio se asigna directamente en el salón.</p>}
    </div>
  );
}

// ---------------------------------------------------------------------
// Paso 3: fecha y hora
// ---------------------------------------------------------------------
function PasoFecha({
  catalogo,
  servicioId,
  empleadoId,
  profesional,
  fecha,
  hora,
  onFecha,
  onHora,
}: {
  catalogo: Catalogo;
  servicioId: string;
  empleadoId: string;
  profesional: Catalogo["profesionales"][number] | null;
  fecha: string | null;
  hora: string | null;
  onFecha: (f: string) => void;
  onHora: (h: string) => void;
}) {
  const hoy = hoyEnPanama();
  const dias = Array.from({ length: 14 }, (_, i) => sumarDias(hoy, i));
  const abierto = (f: string) => catalogo.horario.find((h) => h.dia === diaSemana(f))?.abierto ?? false;
  const [horas, setHoras] = useState<string[] | null>(null);
  const [error, setError] = useState<string>();
  const [cargando, iniciar] = useTransition();

  useEffect(() => {
    if (!fecha) return;
    let vigente = true;
    iniciar(async () => {
      const r = await horariosDisponibles(catalogo.sucursal.slug, servicioId, empleadoId, fecha);
      if (!vigente) return;
      setError(r.error);
      setHoras(r.horas ?? []);
    });
    return () => {
      vigente = false;
    };
  }, [fecha, servicioId, empleadoId, catalogo.sucursal.slug]);

  const grupos = [
    { nombre: "Mañana", horas: (horas ?? []).filter((h) => h < "12:00") },
    { nombre: "Tarde", horas: (horas ?? []).filter((h) => h >= "12:00" && h < "17:00") },
    { nombre: "Noche", horas: (horas ?? []).filter((h) => h >= "17:00") },
  ].filter((g) => g.horas.length);

  return (
    <div className="space-y-6">
      <h2 className="font-display text-3xl">¿Cuándo?</h2>
      {profesional && <p className="text-sm text-muted">Horarios libres de {profesional.nombre}.</p>}
      <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-2 lg:mx-0 lg:px-0">
        {dias.map((d) => {
          const ok = abierto(d);
          return (
            <button
              key={d}
              type="button"
              disabled={!ok}
              onClick={() => onFecha(d)}
              aria-pressed={d === fecha}
              aria-label={fechaLarga(d)}
              className={`flex w-16 shrink-0 flex-col items-center rounded-xl border py-2.5 transition ${
                d === fecha ? "border-ink bg-ink text-ivory" : ok ? "border-line bg-surface hover:border-gold" : "border-transparent text-muted/50"
              }`}
            >
              <span className="text-[11px] uppercase">{d === hoy ? "Hoy" : DIAS_CORTOS[diaSemana(d)]}</span>
              <span className="font-display text-2xl leading-tight">{Number(d.slice(8))}</span>
              <span className="text-[10px] opacity-70">{["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"][Number(d.slice(5, 7)) - 1]}</span>
            </button>
          );
        })}
      </div>
      <label className="flex items-center gap-3 text-sm text-muted">
        Otra fecha:
        <input
          type="date"
          min={hoy}
          max={sumarDias(hoy, 60)}
          value={fecha ?? ""}
          onChange={(e) => e.target.value && onFecha(e.target.value)}
          className="rounded-lg border border-line bg-surface px-3 py-1.5 text-foreground outline-none focus:border-gold"
        />
      </label>

      {!fecha ? (
        <p className="text-sm text-muted">Elige un día para ver las horas disponibles.</p>
      ) : cargando || horas === null ? (
        <p className="text-sm text-muted">Buscando horarios…</p>
      ) : error ? (
        <p className="text-sm text-red-700">{error}</p>
      ) : grupos.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line px-4 py-6 text-center text-sm text-muted">
          No quedan horarios libres el {fechaLarga(fecha)}. Prueba otro día{profesional ? " u otro profesional" : ""}.
        </p>
      ) : (
        <div className="space-y-5">
          <p className="text-sm first-letter:uppercase">{fechaLarga(fecha, true)}</p>
          {grupos.map((g) => (
            <div key={g.nombre}>
              <p className="mb-2 text-[11px] uppercase tracking-[0.16em] text-muted">{g.nombre}</p>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                {g.horas.map((h) => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => onHora(h)}
                    aria-pressed={h === hora}
                    className={`rounded-lg border py-2 text-sm transition ${h === hora ? "border-ink bg-ink text-ivory" : "border-line bg-surface hover:border-gold"}`}
                  >
                    {hora12(h)}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------
// Paso 4: datos del cliente y consentimiento
// ---------------------------------------------------------------------
function PasoDatos({
  slug,
  servicioId,
  empleadoId,
  fecha,
  hora,
  claveSitio,
  onListo,
  onOcupado,
}: {
  slug: string;
  servicioId: string;
  empleadoId: string;
  fecha: string;
  hora: string;
  claveSitio: string | null;
  onListo: (c: Confirmacion) => void;
  onOcupado: () => void;
}) {
  const [captcha, setCaptcha] = useState("");
  const [reiniciar, setReiniciar] = useState(0);
  const [error, setError] = useState<string>();
  const [pendiente, iniciar] = useTransition();
  const entrada = "block w-full rounded-lg border border-line bg-surface px-4 py-3 text-base outline-none focus:border-gold focus:ring-2 focus:ring-gold/25";
  const etiqueta = "mb-1.5 block text-[11px] font-medium uppercase tracking-[0.16em] text-muted";

  return (
    <form
      className="space-y-5"
      action={(fd) =>
        iniciar(async () => {
          const r = await enviarReserva({
            slug,
            servicio: servicioId,
            empleado: empleadoId,
            fecha,
            hora,
            nombre: String(fd.get("nombre") ?? ""),
            apellido: String(fd.get("apellido") ?? ""),
            telefono: String(fd.get("telefono") ?? ""),
            email: String(fd.get("email") ?? ""),
            notas: String(fd.get("notas") ?? ""),
            consentimiento: (fd.get("consentimiento") === "on") as true,
            captcha,
          });
          if (r.ok) return onListo(r.ok);
          setError(r.error);
          setCaptcha("");
          setReiniciar((n) => n + 1);
          if (r.ocupado) setTimeout(onOcupado, 1800);
        })
      }
    >
      <h2 className="font-display text-3xl">Tus datos</h2>
      <p className="text-sm text-muted">Solo lo necesario para tu cita. No necesitas crear una cuenta.</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className={etiqueta}>Nombre</span>
          <input name="nombre" required maxLength={60} autoComplete="given-name" className={entrada} />
        </label>
        <label className="block">
          <span className={etiqueta}>Apellido</span>
          <input name="apellido" maxLength={60} autoComplete="family-name" className={entrada} />
        </label>
        <label className="block">
          <span className={etiqueta}>Teléfono / WhatsApp</span>
          <input name="telefono" type="tel" required maxLength={30} autoComplete="tel" placeholder="6000-0000" className={entrada} />
        </label>
        <label className="block">
          <span className={etiqueta}>Correo (opcional)</span>
          <input name="email" type="email" maxLength={254} autoComplete="email" className={entrada} />
        </label>
        <label className="block sm:col-span-2">
          <span className={etiqueta}>Comentario (opcional)</span>
          <textarea name="notas" rows={2} maxLength={300} placeholder="¿Algo que debamos saber?" className={entrada} />
        </label>
      </div>

      <label className="flex items-start gap-3 rounded-xl border border-line bg-surface p-4 text-sm">
        <input name="consentimiento" type="checkbox" required className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--brand-gold)]" />
        <span>
          Acepto que usen mis datos (nombre, teléfono y correo) para gestionar mi cita y contactarme sobre ella, según la{" "}
          <Link href="/privacidad" target="_blank" className="underline">
            política de privacidad
          </Link>{" "}
          (Ley 81 de 2019).
        </span>
      </label>

      {claveSitio ? (
        <Turnstile key={reiniciar} claveSitio={claveSitio} onToken={setCaptcha} />
      ) : (
        <p className="text-sm text-red-700">Las reservas en línea no están disponibles en este momento.</p>
      )}

      {error && (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={pendiente || !captcha}
        className="w-full rounded-lg bg-ink px-5 py-3.5 text-xs font-medium uppercase tracking-[0.2em] text-ivory transition hover:bg-ink/85 disabled:bg-ink/40"
      >
        {pendiente ? "Reservando…" : "Confirmar reserva"}
      </button>
    </form>
  );
}

/** Widget de Cloudflare Turnstile (CAPTCHA). */
function Turnstile({ claveSitio, onToken }: { claveSitio: string; onToken: (t: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    type Api = { render: (el: HTMLElement, o: Record<string, unknown>) => string; remove: (id: string) => void };
    const w = window as unknown as { turnstile?: Api };
    let id: string | null = null;
    let cancelado = false;
    const pintar = () => {
      if (cancelado || !ref.current || !w.turnstile) return;
      id = w.turnstile.render(ref.current, {
        sitekey: claveSitio,
        language: "es",
        callback: (t: string) => onToken(t),
        "expired-callback": () => onToken(""),
        "error-callback": () => onToken(""),
      });
    };
    if (w.turnstile) pintar();
    else {
      let s = document.querySelector<HTMLScriptElement>("script[data-turnstile]");
      if (!s) {
        s = document.createElement("script");
        s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
        s.async = true;
        s.dataset.turnstile = "1";
        document.head.appendChild(s);
      }
      s.addEventListener("load", pintar);
    }
    return () => {
      cancelado = true;
      if (id && w.turnstile) w.turnstile.remove(id);
    };
  }, [claveSitio, onToken]);
  return <div ref={ref} className="min-h-[65px]" />;
}

// ---------------------------------------------------------------------
// Resumen y confirmación
// ---------------------------------------------------------------------
function Resumen({
  servicio,
  profesional,
  fecha,
  hora,
  sucursal,
  marca,
}: {
  servicio: Catalogo["servicios"][number] | null;
  profesional: string | null;
  fecha: string | null;
  hora: string | null;
  sucursal: Catalogo["sucursal"];
  marca: Marca;
}) {
  const wa = enlaceWhatsApp(marca.whatsapp);
  return (
    <aside className="h-fit space-y-4 rounded-xl border border-line bg-surface p-5 lg:sticky lg:top-20">
      <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted">Tu reserva</p>
      <dl className="space-y-3 text-sm">
        <Linea titulo="Servicio" valor={servicio ? `${servicio.nombre} · ${duracion(servicio.duracion)}` : null} />
        <Linea titulo="Profesional" valor={profesional} />
        <Linea titulo="Fecha" valor={fecha && hora ? `${fechaLarga(fecha)} · ${hora12(hora)}` : null} />
        <Linea titulo="Lugar" valor={`${sucursal.nombre}${sucursal.direccion ? ` · ${sucursal.direccion}` : ""}`} />
      </dl>
      {servicio && (
        <div className="flex items-baseline justify-between border-t border-line pt-3">
          <span className="text-sm text-muted">Precio</span>
          <span className="font-display text-2xl">{dinero(servicio.precio_descuento ?? servicio.precio)}</span>
        </div>
      )}
      <p className="text-xs text-muted">Pagas en el salón. Tu reserva queda pendiente hasta que la confirmemos.</p>
      {wa && (
        <a href={wa} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs text-emerald-700 hover:underline">
          <MessageCircle className="h-3.5 w-3.5" /> ¿Dudas? Escríbenos por WhatsApp
        </a>
      )}
    </aside>
  );
}

function Linea({ titulo, valor }: { titulo: string; valor: string | null }) {
  return (
    <div>
      <dt className="text-xs text-muted">{titulo}</dt>
      <dd className={`first-letter:uppercase ${valor ? "" : "text-muted/60"}`}>{valor ?? "—"}</dd>
    </div>
  );
}

function Listo({ confirmacion: c, marca }: { confirmacion: Confirmacion; marca: Marca }) {
  const wa = enlaceWhatsApp(marca.whatsapp);
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-ink px-6 py-16 text-ivory">
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-gold text-ink">
        <Check className="h-8 w-8" />
      </span>
      <h1 className="mt-6 text-center font-display text-4xl">¡Recibimos tu reserva!</h1>
      <p className="mt-2 max-w-md text-center text-sm text-ivory/70">
        Queda <strong className="text-gold">pendiente de confirmación</strong>. Te escribiremos por WhatsApp para confirmarla.
      </p>
      <dl className="mt-8 w-full max-w-sm space-y-3 rounded-2xl border border-ivory/15 p-6 text-sm">
        <div className="flex items-start gap-3">
          <Sparkles className="mt-0.5 h-4 w-4 text-gold" />
          <span>
            {c.servicio} · {dinero(c.precio)}
          </span>
        </div>
        <div className="flex items-start gap-3">
          <Clock className="mt-0.5 h-4 w-4 text-gold" />
          <span className="first-letter:uppercase">
            {fechaLarga(c.fecha, true)} · {hora12(c.hora)} ({duracion(c.duracion)})
          </span>
        </div>
        <div className="flex items-start gap-3">
          <UserRound className="mt-0.5 h-4 w-4 text-gold" />
          <span>Con {c.profesional}</span>
        </div>
        <div className="flex items-start gap-3">
          <MapPin className="mt-0.5 h-4 w-4 text-gold" />
          <span>
            {c.sucursal}
            {c.direccion && ` · ${c.direccion}`}
          </span>
        </div>
      </dl>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        {wa && (
          <a href={wa} target="_blank" rel="noopener noreferrer" className="rounded-full border border-gold px-6 py-3 text-xs uppercase tracking-[0.2em] text-gold hover:bg-gold hover:text-ink">
            Escribirnos por WhatsApp
          </a>
        )}
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="rounded-full border border-ivory/20 px-6 py-3 text-xs uppercase tracking-[0.2em] text-ivory/80 hover:border-ivory"
        >
          Hacer otra reserva
        </button>
      </div>
    </main>
  );
}
