import { MapPin } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Wordmark } from "@/components/brand/wordmark";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata: Metadata = { title: "Reserva tu cita" };

/** Con una sola sucursal va directo; con varias, el cliente elige dónde. */
export default async function ReservarPage() {
  const { data } = await createAdminClient().rpc("reserva_sucursales");
  const sucursales = data ?? [];
  if (sucursales.length === 1) redirect(`/reservar/${sucursales[0].slug}`);

  return (
    <main className="flex min-h-dvh flex-col items-center bg-ink px-6 py-16 text-ivory">
      <Wordmark className="text-[13px]" />
      <h1 className="mt-10 font-display text-3xl">Reserva tu cita</h1>
      <p className="mt-2 text-sm text-ivory/70">Elige la sucursal</p>
      <ul className="mt-8 w-full max-w-md space-y-3">
        {sucursales.map((s) => (
          <li key={s.slug}>
            <Link href={`/reservar/${s.slug}`} className="block rounded-xl border border-ivory/15 px-5 py-4 transition hover:border-gold">
              <p className="font-display text-xl">{s.nombre}</p>
              {s.direccion && (
                <p className="mt-1 flex items-center gap-1.5 text-sm text-ivory/60">
                  <MapPin className="h-3.5 w-3.5" /> {s.direccion}
                </p>
              )}
            </Link>
          </li>
        ))}
      </ul>
      {sucursales.length === 0 && <p className="mt-8 text-sm text-ivory/60">Las reservas en línea no están disponibles por ahora.</p>}
    </main>
  );
}
