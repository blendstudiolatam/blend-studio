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
  const status = statusText[await checkSupabase()];

  return (
    <main className="flex flex-1 flex-col items-center justify-center bg-ink px-6 py-16 text-ivory">
      <Wordmark className="text-[15px] sm:text-[18px]" />

      <p className="mt-12 max-w-sm text-center text-sm text-ivory/70">
        Estamos preparando el sistema de gestión y reservas del salón.
      </p>

      <div className="mt-8 flex items-center gap-2 rounded-full border border-ivory/15 px-4 py-2 text-xs tracking-wide">
        <span className={`h-2 w-2 rounded-full ${status.color}`} />
        {status.label}
      </div>

      <p className="mt-16 text-[11px] uppercase tracking-[0.3em] text-gold">
        Fase 1 · En construcción
      </p>
    </main>
  );
}
