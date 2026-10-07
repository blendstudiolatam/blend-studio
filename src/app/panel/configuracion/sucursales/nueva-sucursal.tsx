"use client";

import { Plus, X } from "lucide-react";
import { useRef, useState, useTransition } from "react";
import { Boton } from "@/components/ui/boton";
import { Campo } from "@/components/ui/campo";
import { MensajeError } from "@/components/ui/mensaje-error";
import { crearSucursal, type Resultado } from "../actions";

export function NuevaSucursal() {
  const dialogo = useRef<HTMLDialogElement>(null);
  const [resultado, setResultado] = useState<Resultado>();
  const [pendiente, iniciar] = useTransition();

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setResultado(undefined);
          dialogo.current?.showModal();
        }}
        className="inline-flex items-center gap-2 rounded-lg bg-ink px-4 py-2.5 text-xs uppercase tracking-[0.16em] text-ivory hover:bg-ink/85"
      >
        <Plus className="h-4 w-4" /> Nueva sucursal
      </button>
      <dialog ref={dialogo} className="m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl bg-background p-0 backdrop:bg-ink/60">
        <form
          className="space-y-4 p-6"
          action={(fd) =>
            iniciar(async () => {
              const r = await crearSucursal({
                nombre: String(fd.get("nombre") ?? ""),
                direccion: String(fd.get("direccion") ?? ""),
                telefono: String(fd.get("telefono") ?? ""),
              });
              setResultado(r);
              if (r?.ok) dialogo.current?.close();
            })
          }
        >
          <div className="flex items-start justify-between">
            <div>
              <h2 className="font-display text-2xl">Nueva sucursal</h2>
              <p className="mt-1 text-sm text-muted">Se crea con horario de lunes a sábado, 9:00 a 19:00.</p>
            </div>
            <button type="button" onClick={() => dialogo.current?.close()} aria-label="Cerrar" className="p-1 text-muted">
              <X className="h-5 w-5" />
            </button>
          </div>
          <Campo etiqueta="Nombre" name="nombre" required maxLength={120} placeholder="Blend Studio 2" />
          <Campo etiqueta="Dirección" name="direccion" maxLength={300} />
          <Campo etiqueta="Teléfono" name="telefono" type="tel" maxLength={30} />
          <MensajeError>{resultado?.error}</MensajeError>
          <Boton type="submit" cargando={pendiente}>
            Crear sucursal
          </Boton>
        </form>
      </dialog>
      {resultado?.ok && <p className="sr-only" role="status">{resultado.ok}</p>}
    </>
  );
}
