import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PantallaAcceso } from "@/components/auth/pantalla-acceso";
import { elegirSucursal } from "@/app/entrar/actions";
import { getSucursales, type Rol } from "@/lib/auth/sesion";

export const metadata: Metadata = { title: "Elegir sucursal" };

const nombreRol: Record<Rol, string> = {
  admin: "Administración",
  recepcion: "Recepción",
  estilista: "Estilista",
};

export default async function SeleccionarSucursalPage() {
  const sucursales = await getSucursales();
  if (sucursales.length === 0) redirect("/entrar/sin-acceso");

  return (
    <PantallaAcceso titulo="¿Dónde trabajas hoy?" subtitulo="Elige la sucursal.">
      <ul className="space-y-3">
        {sucursales.map((s) => (
          <li key={s.id}>
            <form action={elegirSucursal}>
              <input type="hidden" name="sucursalId" value={s.id} />
              <button
                type="submit"
                className="flex w-full items-center justify-between rounded-xl border border-line bg-surface px-5 py-4 text-left transition hover:border-gold"
              >
                <span className="font-display text-xl">{s.nombre}</span>
                <span className="text-[11px] uppercase tracking-[0.18em] text-muted">
                  {nombreRol[s.rol]}
                </span>
              </button>
            </form>
          </li>
        ))}
      </ul>
    </PantallaAcceso>
  );
}
