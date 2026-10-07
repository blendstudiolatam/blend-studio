"use client";

import { Check, Copy, MessageCircle } from "lucide-react";
import { useState } from "react";

/** Muestra un enlace de acceso para copiarlo o enviarlo por WhatsApp. */
export function EnlaceCompartir({ enlace, nombre }: { enlace: string; nombre?: string }) {
  const [copiado, setCopiado] = useState(false);
  const mensaje = `Hola${nombre ? ` ${nombre.split(" ")[0]}` : ""}, este es tu enlace para entrar al sistema de Blend Studio y crear tu contraseña: ${enlace}`;

  return (
    <div className="space-y-3 rounded-xl border border-gold/40 bg-gold/5 p-4">
      <p className="text-sm">
        Envía este enlace a {nombre ?? "la persona"}. <strong className="font-medium">Vence en 1 hora</strong> y
        solo funciona una vez; si vence, genera otro.
      </p>
      <input
        readOnly
        value={enlace}
        onFocus={(e) => e.currentTarget.select()}
        className="w-full rounded-lg border border-line bg-surface px-3 py-2 font-mono text-xs"
      />
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={async () => {
            await navigator.clipboard.writeText(enlace);
            setCopiado(true);
          }}
          className="inline-flex items-center gap-2 rounded-lg bg-ink px-4 py-2 text-xs uppercase tracking-[0.14em] text-ivory"
        >
          {copiado ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {copiado ? "Copiado" : "Copiar"}
        </button>
        <a
          href={`https://wa.me/?text=${encodeURIComponent(mensaje)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-lg border border-line bg-surface px-4 py-2 text-xs uppercase tracking-[0.14em] hover:border-gold"
        >
          <MessageCircle className="h-4 w-4" /> Enviar por WhatsApp
        </a>
      </div>
    </div>
  );
}
