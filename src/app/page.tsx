import Link from "next/link";
import { Wordmark } from "@/components/brand/wordmark";
import { checkSupabase, type SupabaseStatus } from "@/lib/supabase/health";

const statusText: Record<SupabaseStatus, { label: string; color: string }> = {
  conectado: { label: "Base de datos conectada", color: "bg-emerald-500" },
  "sin-configurar": {
    label: "Falta configurar Supabase (.env.local)",
    color: "bg-amber-500",
  },
  error: { label: "No se pudo conectar con Supabase", color: "bg-red-500" },
};

export default async function Home() {
  // El indicador técnico solo se muestra en desarrollo, nunca al público.
  const status =
    process.env.NODE_ENV === "development" ? statusText[await checkSupabase()] : null;

  return (
    <main className="flex flex-1 flex-col items-center justify-center bg-ink px-6 py-16 text-ivory">
      <Wordmark className="text-[15px] sm:text-[18px]" />

      <p className="mt-12 max-w-sm text-center text-sm text-ivory/70">
        Reserva tu cita en línea, las 24 horas.
      </p>

      <Link
        href="/reservar"
        className="mt-8 rounded-full bg-gold px-10 py-3.5 text-xs font-medium uppercase tracking-[0.25em] text-ink transition hover:bg-ivory"
      >
        Reservar cita
      </Link>

      <Link href="/entrar" className="mt-6 text-[11px] uppercase tracking-[0.25em] text-ivory/50 transition hover:text-gold">
        Entrar al sistema (equipo)
      </Link>

      <Link href="/privacidad" className="mt-10 text-[11px] text-ivory/40 underline hover:text-ivory/70">
        Política de privacidad
      </Link>

      {status && (
        <div className="mt-10 flex items-center gap-2 rounded-full border border-ivory/15 px-4 py-2 text-xs tracking-wide">
          <span className={`h-2 w-2 rounded-full ${status.color}`} />
          {status.label}
        </div>
      )}
    </main>
  );
}
