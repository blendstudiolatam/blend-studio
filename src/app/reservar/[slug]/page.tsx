import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getMarca } from "@/lib/marca";
import { createAdminClient } from "@/lib/supabase/admin";
import { claveSitioTurnstile } from "@/lib/turnstile.server";
import type { Catalogo } from "../tipos";
import { Reserva } from "./reserva";

export const metadata: Metadata = {
  title: "Reserva tu cita",
  description: "Reserva en línea las 24 horas: elige servicio, profesional, fecha y hora.",
};

export default async function ReservaSucursalPage({ params }: PageProps<"/reservar/[slug]">) {
  const { slug } = await params;
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) notFound();

  // Solo funciones públicas de reserva (no exponen datos de clientes).
  const { data } = await createAdminClient().rpc("reserva_catalogo", { p_slug: slug });
  if (!data) notFound();
  const catalogo = data as unknown as Catalogo;
  const marca = await getMarca();

  return (
    <Reserva
      catalogo={{
        ...catalogo,
        servicios: catalogo.servicios.map((s) => ({
          ...s,
          precio: Number(s.precio),
          precio_descuento: s.precio_descuento === null ? null : Number(s.precio_descuento),
        })),
      }}
      marca={{ nombre: marca.nombreComercial, logo: marca.logoUrl, whatsapp: marca.whatsapp ?? marca.telefono, instagram: marca.instagram }}
      claveSitio={claveSitioTurnstile()}
    />
  );
}
