import Link from "next/link";
import { cerrarSesion } from "@/app/entrar/actions";
import type { Rol } from "@/lib/auth/sesion";

const nombreRol: Record<Rol, string> = {
  admin: "Administración",
  recepcion: "Recepción",
  estilista: "Estilista",
};

export function Cabecera({
  nombre,
  sucursal,
  rol,
  variasSucursales,
}: {
  nombre: string;
  sucursal: string;
  rol: Rol;
  variasSucursales: boolean;
}) {
  return (
    <header className="bg-ink text-ivory">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link href="/panel" className="leading-none">
          <span className="font-display text-xl">Blend</span>{" "}
          <span className="font-display text-xl italic">Studio</span>
        </Link>

        <div className="flex items-center gap-3 sm:gap-5">
          <div className="text-right leading-tight">
            <p className="text-sm">{nombre}</p>
            <p className="text-[10px] uppercase tracking-[0.18em] text-gold">
              {nombreRol[rol]} · {sucursal}
            </p>
          </div>
          {variasSucursales && (
            <Link
              href="/seleccionar-sucursal"
              className="hidden rounded-full border border-ivory/20 px-3 py-1.5 text-[10px] uppercase tracking-[0.18em] hover:border-gold sm:inline-block"
            >
              Cambiar
            </Link>
          )}
          <form action={cerrarSesion}>
            <button
              type="submit"
              className="rounded-full border border-ivory/20 px-3 py-1.5 text-[10px] uppercase tracking-[0.18em] hover:border-gold hover:text-gold"
            >
              Salir
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
