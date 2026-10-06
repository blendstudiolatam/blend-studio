import Image from "next/image";
import type { ReactNode } from "react";
import { Wordmark } from "@/components/brand/wordmark";

/**
 * Marco de las pantallas de acceso: imagen de marca a la izquierda (escritorio)
 * y formulario a la derecha. En celular, cabecera negra con el logo.
 */
export function PantallaAcceso({
  titulo,
  subtitulo,
  children,
}: {
  titulo: string;
  subtitulo?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-1 flex-col lg:flex-row">
      <aside className="relative flex items-center justify-center overflow-hidden bg-ink px-6 py-10 text-ivory lg:w-1/2 lg:py-0">
        <Image
          src="/brand/retrato.webp"
          alt=""
          fill
          priority
          sizes="(min-width: 1024px) 50vw, 0px"
          className="hidden object-cover object-[30%_center] lg:block"
        />
        <div
          aria-hidden
          className="absolute inset-0 hidden bg-gradient-to-l from-ink via-ink/40 to-transparent lg:block"
        />
        <div className="relative lg:absolute lg:right-[12%] lg:top-1/2 lg:-translate-y-1/2">
          <Wordmark className="text-[11px] lg:text-[15px]" />
        </div>
      </aside>

      <main className="flex flex-1 items-center justify-center bg-background px-6 py-10 sm:px-10">
        <div className="w-full max-w-sm">
          <h1 className="font-display text-3xl leading-tight text-foreground sm:text-4xl">
            {titulo}
          </h1>
          {subtitulo && <p className="mt-2 text-sm text-muted">{subtitulo}</p>}
          <div className="mt-8">{children}</div>
        </div>
      </main>
    </div>
  );
}
