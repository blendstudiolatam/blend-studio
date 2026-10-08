"use client";

import { CalendarDays, ChevronRight, Search, User } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { busquedaGlobal, type ResultadoBusqueda } from "@/app/panel/busqueda-actions";
import { fechaLarga } from "@/lib/agenda";
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
        <BuscadorGlobal key={pathname} />
      </div>
    </header>
  );
}

function BuscadorGlobal() {
  const router = useRouter();
  const [texto, setTexto] = useState("");
  const [abierto, setAbierto] = useState(false);
  const [resultado, setResultado] = useState<ResultadoBusqueda | null>(null);
  const caja = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (texto.trim().length < 2) return;
    let vigente = true;
    const t = setTimeout(() => busquedaGlobal(texto).then((r) => vigente && setResultado(r)), 250);
    return () => {
      vigente = false;
      clearTimeout(t);
    };
  }, [texto]);

  // Cerrar al hacer clic fuera
  useEffect(() => {
    const fuera = (e: MouseEvent) => !caja.current?.contains(e.target as Node) && setAbierto(false);
    document.addEventListener("mousedown", fuera);
    return () => document.removeEventListener("mousedown", fuera);
  }, []);

  const ir = (href: string) => {
    setAbierto(false);
    router.push(href);
  };
  const hay = texto.trim().length >= 2 && resultado;
  const primero = resultado?.clientes[0];

  return (
    <div ref={caja} className="relative w-full max-w-sm">
      <label className="relative block">
        <span className="sr-only">Buscar clientes y sesiones</span>
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <input
          type="search"
          value={texto}
          onChange={(e) => {
            setTexto(e.target.value);
            setAbierto(true);
            if (e.target.value.trim().length < 2) setResultado(null);
          }}
          onFocus={() => setAbierto(true)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setAbierto(false);
            if (e.key === "Enter" && primero) ir(`/panel/clientes/lista/${primero.id}`);
          }}
          maxLength={60}
          placeholder="Buscar clientes y sesiones…"
          className="w-full rounded-full border border-line bg-surface py-2 pl-9 pr-4 text-sm outline-none placeholder:text-muted/70 focus:border-gold"
        />
      </label>
      {abierto && hay && (
        <div className="absolute right-0 z-30 mt-2 w-[26rem] overflow-hidden rounded-xl border border-line bg-surface text-sm shadow-xl">
          {resultado.clientes.length === 0 ? (
            <p className="px-4 py-6 text-center text-muted">Sin resultados para «{texto}».</p>
          ) : (
            <>
              <p className="px-4 pb-1 pt-3 text-[11px] uppercase tracking-[0.16em] text-muted">Clientes</p>
              <ul>
                {resultado.clientes.map((c) => (
                  <li key={c.id}>
                    <button type="button" onClick={() => ir(`/panel/clientes/lista/${c.id}`)} className="flex w-full items-center gap-3 px-4 py-2 text-left hover:bg-background">
                      <User className="h-4 w-4 shrink-0 text-muted" />
                      <span className="min-w-0 flex-1 truncate">{c.nombre}</span>
                      <span className="shrink-0 text-xs text-muted">{c.detalle}</span>
                    </button>
                  </li>
                ))}
              </ul>
              {resultado.citas.length > 0 && (
                <>
                  <p className="border-t border-line px-4 pb-1 pt-3 text-[11px] uppercase tracking-[0.16em] text-muted">Próximas citas y sesiones</p>
                  <ul className="pb-2">
                    {resultado.citas.map((c) => (
                      <li key={c.id}>
                        <button type="button" onClick={() => ir(`/panel/agenda?fecha=${c.fecha}`)} className="flex w-full items-start gap-3 px-4 py-2 text-left hover:bg-background">
                          <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-gold-strong" />
                          <span className="min-w-0">
                            <span className="block truncate">
                              {c.titulo} · <span className="first-letter:uppercase">{fechaLarga(c.fecha)}</span>
                            </span>
                            <span className="block truncate text-xs text-muted">{c.detalle}</span>
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
