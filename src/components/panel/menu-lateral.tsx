"use client";

import { ChevronDown, LogOut, Menu, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cerrarSesion } from "@/app/entrar/actions";
import type { Permisos, Rol } from "@/lib/auth/permisos";
import { buscarRuta, modulosVisibles, rutaDe, type Modulo } from "./navegacion";

type Props = {
  permisos: Permisos;
  rol: Rol;
  etiquetaRol: string;
  sucursal: string;
  variasSucursales: boolean;
};

export function MenuLateral(props: Props) {
  const [abierto, setAbierto] = useState(false);
  const pathname = usePathname();

  return (
    <>
      {/* Celular: barra con logo y botón de menú */}
      <div className="sticky top-0 z-30 flex items-center justify-between bg-ink px-4 py-3 text-ivory lg:hidden">
        <Marca compacta />
        <button
          type="button"
          onClick={() => setAbierto(true)}
          aria-label="Abrir menú"
          className="rounded-md p-2 hover:bg-ivory/10"
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>

      {/* Fondo oscuro detrás del menú en celular */}
      {abierto && (
        <div
          aria-hidden
          onClick={() => setAbierto(false)}
          className="fixed inset-0 z-40 bg-ink/50 lg:hidden"
        />
      )}

      <aside
        // En celular, cerrar el menú al tocar cualquier enlace.
        onClickCapture={(e) => {
          if ((e.target as HTMLElement).closest("a")) setAbierto(false);
        }}
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-ink text-ivory transition-transform lg:w-64 lg:translate-x-0 ${
          abierto ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <button
          type="button"
          onClick={() => setAbierto(false)}
          aria-label="Cerrar menú"
          className="absolute right-3 top-3 rounded-md p-2 hover:bg-ivory/10 lg:hidden"
        >
          <X className="h-5 w-5" />
        </button>
        <Contenido {...props} pathname={pathname} />
      </aside>
    </>
  );
}

function Marca({ compacta = false }: { compacta?: boolean }) {
  return (
    <Link href="/panel" className="flex items-center gap-3">
      <span
        className={`relative overflow-hidden rounded-full ring-1 ring-gold/60 ${
          compacta ? "h-9 w-9" : "h-14 w-14"
        }`}
      >
        <Image
          src="/brand/logo-provisional.png"
          alt="Blend Studio"
          fill
          sizes="56px"
          className="object-cover"
        />
      </span>
      {compacta && (
        <span className="font-display text-lg leading-none">
          Blend <span className="italic">Studio</span>
        </span>
      )}
    </Link>
  );
}

function Contenido({ permisos, rol, etiquetaRol, sucursal, variasSucursales, pathname }: Props & { pathname: string }) {
  const modulos = modulosVisibles(permisos, rol);
  const activo = buscarRuta(pathname);

  return (
    <>
      <div className="flex items-center gap-3 border-b border-ivory/10 px-5 pb-5 pt-6">
        <Marca />
        <div className="min-w-0 leading-tight">
          <p className="truncate font-display text-xl">Blend Studio</p>
          <p className="mt-1 flex items-center gap-1.5 text-[10px] uppercase tracking-[0.16em] text-ivory/70">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" aria-label="Conectado" />
            {etiquetaRol}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between px-5 py-3 text-[11px] text-ivory/60">
        <span className="truncate">{sucursal}</span>
        {variasSucursales && (
          <Link href="/seleccionar-sucursal" className="shrink-0 text-gold hover:underline">
            Cambiar
          </Link>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto px-3 pb-4" aria-label="Menú principal">
        <ul className="space-y-0.5">
          {modulos.map((m) => (
            <ItemMenu key={m.slug || "inicio"} modulo={m} activo={activo.modulo?.slug === m.slug} hijoActivo={activo.hijo?.slug} />
          ))}
        </ul>
      </nav>

      <form action={cerrarSesion} className="border-t border-ivory/10 p-3">
        <button
          type="submit"
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-ivory/80 transition hover:bg-ivory/5 hover:text-gold"
        >
          <LogOut className="h-4 w-4" />
          Cerrar sesión
        </button>
      </form>
    </>
  );
}

function ItemMenu({ modulo, activo, hijoActivo }: { modulo: Modulo; activo: boolean; hijoActivo?: string }) {
  const [desplegado, setDesplegado] = useState(activo);
  const Icono = modulo.icono;
  const base = `flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${
    activo ? "bg-ivory/10 text-ivory" : "text-ivory/75 hover:bg-ivory/5 hover:text-ivory"
  }`;
  const proximamente = !modulo.listo && !modulo.hijos?.length;

  if (!modulo.hijos?.length) {
    return (
      <li>
        <Link href={rutaDe(modulo)} className={base} aria-current={activo ? "page" : undefined}>
          <Icono className={`h-4 w-4 ${activo ? "text-gold" : ""}`} />
          <span className="flex-1">{modulo.nombre}</span>
          {proximamente && <Pronto />}
        </Link>
      </li>
    );
  }

  return (
    <li>
      <button
        type="button"
        onClick={() => setDesplegado((d) => !d)}
        aria-expanded={desplegado}
        className={base}
      >
        <Icono className={`h-4 w-4 ${activo ? "text-gold" : ""}`} />
        <span className="flex-1 text-left">{modulo.nombre}</span>
        <ChevronDown className={`h-4 w-4 opacity-60 transition ${desplegado ? "rotate-180" : ""}`} />
      </button>
      {desplegado && (
        <ul className="mb-1 ml-5 mt-0.5 space-y-0.5 border-l border-ivory/10 pl-3">
          {modulo.hijos.map((h) => {
            const esActivo = activo && hijoActivo === h.slug;
            return (
              <li key={h.slug}>
                <Link
                  href={rutaDe(modulo, h)}
                  aria-current={esActivo ? "page" : undefined}
                  className={`flex items-center gap-2 rounded-md px-3 py-2 text-[13px] transition ${
                    esActivo ? "text-gold" : "text-ivory/65 hover:text-ivory"
                  }`}
                >
                  <span className="flex-1">{h.nombre}</span>
                  {!h.listo && <Pronto />}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </li>
  );
}

function Pronto() {
  return (
    <span className="rounded-full border border-ivory/15 px-1.5 py-px text-[9px] uppercase tracking-wider text-ivory/45">
      Pronto
    </span>
  );
}
