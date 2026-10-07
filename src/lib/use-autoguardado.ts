"use client";

import { useEffect, useRef, useState } from "react";

export type EstadoGuardado = "sin-cambios" | "pendiente" | "guardando" | "guardado" | "error";

/**
 * Guarda automáticamente unos valores un momento después del último cambio.
 * `guardar` debe devolver { error } si algo falla.
 */
export function useAutoguardado<T>(
  valores: T,
  guardar: (valores: T) => Promise<{ error?: string } | undefined>,
  { espera = 900 }: { espera?: number } = {},
) {
  const serializado = JSON.stringify(valores);
  // Valores tal como estaban al abrir la página (para "Restablecer").
  const [inicial] = useState(serializado);
  const [guardado, setGuardado] = useState(serializado);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string>();
  const guardarRef = useRef(guardar);

  useEffect(() => {
    guardarRef.current = guardar;
  }, [guardar]);

  useEffect(() => {
    if (serializado === guardado) return;
    const t = setTimeout(async () => {
      setGuardando(true);
      const r = await guardarRef.current(JSON.parse(serializado) as T);
      setGuardando(false);
      if (r?.error) {
        setError(r.error);
      } else {
        setError(undefined);
        setGuardado(serializado);
      }
    }, espera);
    return () => clearTimeout(t);
  }, [serializado, guardado, espera]);

  let estado: EstadoGuardado = "sin-cambios";
  if (guardando) estado = "guardando";
  else if (error) estado = "error";
  else if (serializado !== guardado) estado = "pendiente";
  else if (guardado !== inicial) estado = "guardado";

  return { estado, error, valoresIniciales: JSON.parse(inicial) as T };
}
