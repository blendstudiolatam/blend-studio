"use client";

import { FileSpreadsheet } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Boton } from "@/components/ui/boton";
import { MensajeError } from "@/components/ui/mensaje-error";
import { importarClientes, type ResumenImportacion } from "../actions";

/** Paso 1: revisar el archivo (qué entra, qué está repetido, qué tiene errores). Paso 2: confirmar. */
export function ImportarClientes({ onListo }: { onListo: () => void }) {
  const router = useRouter();
  const [archivo, setArchivo] = useState<File | null>(null);
  const [resumen, setResumen] = useState<ResumenImportacion>();
  const [pendiente, iniciar] = useTransition();

  const enviar = (confirmar: boolean) => {
    if (!archivo) return;
    const fd = new FormData();
    fd.set("archivo", archivo);
    if (confirmar) fd.set("confirmar", "1");
    iniciar(async () => {
      const r = await importarClientes(fd);
      setResumen(r);
      if (confirmar && r.ok) router.refresh();
    });
  };

  if (resumen?.ok) {
    return (
      <div className="space-y-5">
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{resumen.ok}</p>
        <Boton type="button" onClick={onListo}>
          Listo
        </Boton>
      </div>
    );
  }

  return (
    <div className="space-y-5 text-sm">
      <ol className="list-decimal space-y-1 pl-5 text-muted">
        <li>
          Descarga la{" "}
          <a href="/panel/clientes/exportar?formato=plantilla" download className="text-gold-strong underline">
            plantilla de ejemplo
          </a>{" "}
          (o usa tu propio Excel con columnas Nombre, Apellido, Teléfono, Correo…).
        </li>
        <li>Llénala, guárdala y súbela aquí. Solo «Nombre» es obligatorio.</li>
        <li>Revisa el resumen y confirma.</li>
      </ol>

      <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-line bg-surface px-4 py-5 hover:border-gold">
        <FileSpreadsheet className="h-6 w-6 text-gold-strong" />
        <span className="flex-1 truncate">{archivo ? archivo.name : "Elegir archivo .xlsx o .csv"}</span>
        <input
          type="file"
          accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
          className="sr-only"
          onChange={(e) => {
            setArchivo(e.target.files?.[0] ?? null);
            setResumen(undefined);
          }}
        />
      </label>

      <MensajeError>{resumen?.error}</MensajeError>

      {resumen && !resumen.error && (
        <div className="space-y-3 rounded-xl border border-line bg-surface p-4">
          <p>
            <strong>{resumen.nuevos}</strong> clientes nuevos listos para importar.
          </p>
          {!!resumen.duplicados?.length && (
            <Detalle titulo={`${resumen.duplicados.length} ya existen y se omitirán`}>
              {resumen.duplicados.map((d) => (
                <li key={d.fila}>
                  Fila {d.fila}: {d.nombre} — {d.motivo}
                </li>
              ))}
            </Detalle>
          )}
          {!!resumen.errores?.length && (
            <Detalle titulo={`${resumen.errores.length} filas con errores (no se importan)`}>
              {resumen.errores.map((e) => (
                <li key={e.fila}>
                  Fila {e.fila}: {e.motivo}
                </li>
              ))}
            </Detalle>
          )}
        </div>
      )}

      {resumen && !resumen.error && (resumen.nuevos ?? 0) > 0 ? (
        <Boton type="button" cargando={pendiente} onClick={() => enviar(true)}>
          Importar {resumen.nuevos} clientes
        </Boton>
      ) : (
        <Boton type="button" cargando={pendiente} disabled={!archivo} onClick={() => enviar(false)}>
          Revisar archivo
        </Boton>
      )}
    </div>
  );
}

function Detalle({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <details>
      <summary className="cursor-pointer text-muted">{titulo}</summary>
      <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto text-xs text-muted">{children}</ul>
    </details>
  );
}
