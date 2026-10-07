"use client";

import { X } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";

/** Ventana modal controlada: se abre y cierra con la propiedad `abierto`. */
export function Dialogo({
  abierto,
  onCerrar,
  titulo,
  subtitulo,
  ancho = "max-w-lg",
  children,
}: {
  abierto: boolean;
  onCerrar: () => void;
  titulo: string;
  subtitulo?: string;
  ancho?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (abierto && !d.open) d.showModal();
    if (!abierto && d.open) d.close();
  }, [abierto]);

  return (
    <dialog
      ref={ref}
      onClose={onCerrar}
      className={`m-auto w-[calc(100%-2rem)] ${ancho} rounded-2xl bg-background p-0 backdrop:bg-ink/60`}
    >
      {abierto && (
        <div className="max-h-[85dvh] overflow-y-auto p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="font-display text-2xl">{titulo}</h2>
              {subtitulo && <p className="mt-1 text-sm text-muted">{subtitulo}</p>}
            </div>
            <button type="button" onClick={onCerrar} aria-label="Cerrar" className="rounded-md p-1 text-muted hover:text-foreground">
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="mt-6">{children}</div>
        </div>
      )}
    </dialog>
  );
}
