"use client";

import { ChevronRight, Search } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { buscarRuta, rutaDe } from "./navegacion";

export function BarraSuperior() {
  const pathname = usePathname();
  const { modulo, hijo } = buscarRuta(pathname);

  const migas = [
    { nombre: "Inicio", href: "/panel" },
    ...(modulo && modulo.slug ? [{ nombre: modulo.nombre, href: rutaDe(modulo) }] : []),
    ...(modulo && hijo ? [{ nombre: hijo.nombre, href: rutaDe(modulo, hijo) }] : []),
  ];

  return (
    <header className="sticky top-0 z-20 hidden border-b border-line bg-background/90 backdrop-blur lg:block">
      <div className="flex items-center justify-between gap-6 px-8 py-3">
        <nav aria-label="Ruta" className="flex items-center gap-1.5 text-sm text-muted">
          {migas.map((m, i) => (
            <span key={m.href} className="flex items-center gap-1.5">
              {i > 0 && <ChevronRight className="h-3.5 w-3.5 opacity-60" />}
              {i === migas.length - 1 ? (
                <span className="text-foreground">{m.nombre}</span>
              ) : (
                <Link href={m.href} className="hover:text-foreground">
                  {m.nombre}
                </Link>
              )}
            </span>
          ))}
        </nav>

        <label className="relative w-full max-w-sm">
          <span className="sr-only">Buscar clientes y sesiones</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            type="search"
            disabled
            placeholder="Buscar clientes y sesiones… (pronto)"
            className="w-full rounded-full border border-line bg-surface py-2 pl-9 pr-4 text-sm placeholder:text-muted/70 disabled:cursor-not-allowed"
          />
        </label>
      </div>
    </header>
  );
}
