import Link from "next/link";
import { Indicador } from "@/components/panel/encabezado";
import { enPanama, fechaLarga, hora12, instante, sumarDias } from "@/lib/agenda";
import { dinero } from "@/lib/formato";
import { PERIODOS, rangoPeriodo, type Periodo } from "@/lib/periodos";
import { createClient } from "@/lib/supabase/server";

/**
 * Rendimiento y comisiones de un profesional en un periodo.
 * Las comisiones solo se muestran si la base de datos lo permite
 * (admin de la sucursal o el propio profesional).
 */
export async function Rendimiento({
  sucursalId,
  empleadoId,
  periodo,
  hrefPeriodo,
}: {
  sucursalId: string;
  empleadoId: string;
  periodo: Periodo;
  hrefPeriodo: (p: Periodo) => string;
}) {
  const { desde, hasta } = rangoPeriodo(periodo);
  const supabase = await createClient();
  const [{ data: citas }, comisiones] = await Promise.all([
    supabase
      .from("citas")
      .select("estado, precio")
      .eq("sucursal_id", sucursalId)
      .eq("empleado_id", empleadoId)
      .gte("inicio", instante(desde, "00:00"))
      .lt("inicio", instante(sumarDias(hasta, 1), "00:00")),
    supabase.rpc("comisiones", { p_sucursal: sucursalId, p_desde: desde, p_hasta: hasta, p_empleado: empleadoId }),
  ]);

  const lista = citas ?? [];
  const completadas = lista.filter((c) => c.estado === "completada");
  const ingresos = completadas.reduce((s, c) => s + Number(c.precio ?? 0), 0);
  const noAsistio = lista.filter((c) => c.estado === "no_asistio").length;
  const verComision = !comisiones.error;
  const filas = comisiones.data ?? [];
  const totalComision = filas.reduce((s, f) => s + Number(f.comision), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted first-letter:uppercase">
          {fechaLarga(desde)} al {fechaLarga(hasta)}
        </p>
        <div className="flex flex-wrap gap-1.5">
          {PERIODOS.map((p) => (
            <Link
              key={p.id}
              href={hrefPeriodo(p.id)}
              prefetch={false}
              className={`rounded-full border px-3 py-1 text-xs transition ${
                periodo === p.id ? "border-ink bg-ink text-ivory" : "border-line bg-surface text-muted hover:text-foreground"
              }`}
            >
              {p.nombre}
            </Link>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Indicador etiqueta="Servicios realizados" valor={String(completadas.length)} detalle={`${lista.length} citas en total`} />
        <Indicador etiqueta="Ingresos generados" valor={dinero(ingresos)} detalle={completadas.length ? `Ticket promedio ${dinero(ingresos / completadas.length)}` : undefined} />
        <Indicador etiqueta="No asistieron" valor={String(noAsistio)} />
        {verComision ? (
          <Indicador etiqueta="Comisión del periodo" valor={dinero(totalComision)} />
        ) : (
          <Indicador etiqueta="Comisión" valor="—" detalle="Solo la ve un administrador o el propio profesional" />
        )}
      </div>

      {verComision && (
        <div className="overflow-x-auto rounded-xl border border-line bg-surface">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="border-b border-line">
              <tr className="text-left text-[11px] uppercase tracking-[0.14em] text-muted">
                <th className="px-4 py-3 font-medium">Fecha</th>
                <th className="px-4 py-3 font-medium">Cliente</th>
                <th className="px-4 py-3 font-medium">Servicio</th>
                <th className="px-4 py-3 text-right font-medium">Precio</th>
                <th className="px-4 py-3 text-right font-medium">%</th>
                <th className="px-4 py-3 text-right font-medium">Comisión</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {filas.map((f) => {
                const a = enPanama(f.inicio);
                return (
                  <tr key={f.cita_id}>
                    <td className="px-4 py-2.5 text-xs first-letter:uppercase">
                      {fechaLarga(a.fecha)} · {hora12(a.hora)}
                    </td>
                    <td className="px-4 py-2.5">{f.cliente}</td>
                    <td className="px-4 py-2.5">{f.servicio}</td>
                    <td className="px-4 py-2.5 text-right">{dinero(f.precio)}</td>
                    <td className="px-4 py-2.5 text-right text-muted">{Number(f.comision_pct)}%</td>
                    <td className="px-4 py-2.5 text-right font-medium">{dinero(f.comision)}</td>
                  </tr>
                );
              })}
              {filas.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-muted">
                    Sin servicios completados en este periodo.
                  </td>
                </tr>
              )}
            </tbody>
            {filas.length > 0 && (
              <tfoot className="border-t border-line">
                <tr>
                  <td colSpan={3} className="px-4 py-3 font-medium">
                    Total
                  </td>
                  <td className="px-4 py-3 text-right font-medium">{dinero(filas.reduce((s, f) => s + Number(f.precio), 0))}</td>
                  <td />
                  <td className="px-4 py-3 text-right font-display text-lg">{dinero(totalComision)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}
      <p className="text-xs text-muted">
        La comisión se calcula al marcar la cita como completada, con el porcentaje de ese momento (el del servicio si tiene uno especial, o
        el general del profesional). Las ventas de productos se sumarán en la Fase 2.
      </p>
    </div>
  );
}
