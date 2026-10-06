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
        Muy pronto podrás reservar tu cita en línea.
      </p>

      <Link
        href="/entrar"
        className="mt-8 rounded-full border border-gold px-8 py-3 text-xs uppercase tracking-[0.25em] text-gold transition hover:bg-gold hover:text-ink"
      >
        Entrar al sistema
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
