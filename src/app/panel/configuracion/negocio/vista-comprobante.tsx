import type { ValoresNegocio } from "./formulario-negocio";

const dinero = (n: number) => `B/. ${n.toFixed(2)}`;

// Servicios de ejemplo para la vista previa.
const EJEMPLO = [
  { nombre: "Corte y peinado", precio: 35 },
  { nombre: "Manicure semipermanente", precio: 22 },
];

/** Comprobante de ejemplo que se actualiza mientras se editan los datos. */
export function VistaComprobante({
  negocio,
  logo,
  itbms,
  sucursal,
}: {
  negocio: ValoresNegocio;
  logo: string | null;
  itbms: number;
  sucursal: { nombre: string; direccion: string | null; telefono: string | null };
}) {
  const subtotal = EJEMPLO.reduce((s, i) => s + i.precio, 0);
  const impuesto = Math.round(subtotal * itbms) / 100;
  const redes = [negocio.instagram, negocio.facebook, negocio.tiktok, negocio.sitio_web].filter(Boolean);

  return (
    <div className="mx-auto max-w-[320px] rounded-sm bg-white px-6 py-7 font-mono text-[11px] leading-relaxed text-stone-800 shadow-[0_12px_40px_-12px_rgba(0,0,0,0.25)]">
      <div className="text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={logo ?? "/brand/logo-provisional.png"}
          alt=""
          className="mx-auto h-16 w-16 rounded-full object-cover"
        />
        <p className="mt-3 font-sans text-sm font-semibold uppercase tracking-[0.18em]">
          {negocio.nombre_comercial || "Nombre comercial"}
        </p>
        {negocio.nombre_legal && <p>{negocio.nombre_legal}</p>}
        {negocio.ruc && (
          <p>
            RUC {negocio.ruc}
            {negocio.dv && ` DV ${negocio.dv}`}
          </p>
        )}
        <p>{sucursal.nombre}</p>
        {sucursal.direccion && <p>{sucursal.direccion}</p>}
        {(sucursal.telefono || negocio.telefono) && <p>Tel. {sucursal.telefono || negocio.telefono}</p>}
        {negocio.whatsapp && <p>WhatsApp {negocio.whatsapp}</p>}
      </div>

      <div className="my-4 border-t border-dashed border-stone-300" />
      <p>Comprobante de ejemplo</p>
      <p>Fecha: {new Date().toLocaleDateString("es-PA")}</p>
      <div className="my-3 border-t border-dashed border-stone-300" />

      {EJEMPLO.map((i) => (
        <div key={i.nombre} className="flex justify-between gap-2">
          <span>{i.nombre}</span>
          <span>{dinero(i.precio)}</span>
        </div>
      ))}
      <div className="my-3 border-t border-dashed border-stone-300" />
      <div className="flex justify-between">
        <span>Subtotal</span>
        <span>{dinero(subtotal)}</span>
      </div>
      <div className="flex justify-between">
        <span>ITBMS ({itbms}%)</span>
        <span>{dinero(impuesto)}</span>
      </div>
      <div className="mt-1 flex justify-between text-[13px] font-bold">
        <span>TOTAL</span>
        <span>{dinero(subtotal + impuesto)}</span>
      </div>

      <div className="my-4 border-t border-dashed border-stone-300" />
      <div className="space-y-0.5 text-center">
        {negocio.horario_texto && <p>{negocio.horario_texto}</p>}
        {redes.length > 0 && <p>{redes.join(" · ")}</p>}
        {negocio.mensaje_comprobante && <p className="mt-2 italic">{negocio.mensaje_comprobante}</p>}
      </div>
    </div>
  );
}
