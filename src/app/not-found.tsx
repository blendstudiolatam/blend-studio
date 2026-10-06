import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center bg-ink px-6 py-16 text-center text-ivory">
      <p className="text-[11px] uppercase tracking-[0.3em] text-gold">Error 404</p>
      <h1 className="mt-4 font-display text-4xl">Página no encontrada</h1>
      <p className="mt-4 max-w-sm text-sm text-ivory/70">
        La dirección que buscas no existe o fue movida.
      </p>
      <Link
        href="/"
        className="mt-8 rounded-full border border-gold px-6 py-2 text-xs uppercase tracking-[0.2em] text-gold hover:bg-gold hover:text-ink"
      >
        Volver al inicio
      </Link>
    </main>
  );
}
