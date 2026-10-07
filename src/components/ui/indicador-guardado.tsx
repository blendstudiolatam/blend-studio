import { Check, CloudAlert, LoaderCircle } from "lucide-react";
import type { EstadoGuardado } from "@/lib/use-autoguardado";

export function IndicadorGuardado({ estado, error }: { estado: EstadoGuardado; error?: string }) {
  const base = "inline-flex items-center gap-1.5 text-xs";
  if (estado === "guardando" || estado === "pendiente") {
    return (
      <span className={`${base} text-muted`} role="status">
        <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> Guardando…
      </span>
    );
  }
  if (estado === "guardado") {
    return (
      <span className={`${base} text-emerald-700`} role="status">
        <Check className="h-3.5 w-3.5" /> Cambios guardados
      </span>
    );
  }
  if (estado === "error") {
    return (
      <span className={`${base} text-red-700`} role="alert">
        <CloudAlert className="h-3.5 w-3.5" /> {error ?? "No se pudo guardar"}
      </span>
    );
  }
  return <span className={`${base} text-muted`}>Los cambios se guardan solos</span>;
}
