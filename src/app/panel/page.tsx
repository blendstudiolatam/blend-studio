import { CakeSlice, CalendarDays, ChartColumn, House, Wallet } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Encabezado, Indicador } from "@/components/panel/encabezado";
import { Avatar } from "@/components/ui/avatar";
import {
  CLASE_ESTADO_CITA,
  enPanama,
  ETIQUETA_ESTADO_CITA,
  fechaLarga,
  hora12,
  hoyEnPanama,
  instante,
  sumarDias,
  type EstadoCita,
} from "@/lib/agenda";
import { requirePanel } from "@/lib/auth/sesion";
import { codigoCliente } from "@/lib/clientes";
import { urlFotoEmpleado } from "@/lib/empleados";
import { dinero } from "@/lib/formato";
import { rangoPeriodo } from "@/lib/periodos";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Inicio" };

function saludo(): string {
  const hora = enPanama(new Date().toISOString()).minutos / 60;
  if (hora < 12) return "¡Buen día";
  if (hora < 19) return "¡Buenas tardes";
  return "¡Buenas noches";
}

export default async function PanelPage() {
  const ctx = await requirePanel();
  const { nombre, permisos, sucursal, rol } = ctx;
  const hoy = hoyEnPanama();
  const mes = rangoPeriodo("mes", hoy);
  const verClientes = permisos.clientes !== "ninguno";
  const verAgenda = permisos.agenda !== "ninguno";
  const supabase = await createClient();

  const contarClientes = () => supabase.from("clientes").select("id", { count: "exact", head: true });
  const [total, nuevos, { data: citas }, pendientes, { data: cumple }, { data: miEmpleado }] = await Promise.all([
    verClientes ? contarClientes() : Promise.resolve({ count: null }),
    verClientes ? contarClientes().gte("created_at", instante(mes.desde, "00:00")) : Promise.resolve({ count: null }),
    verAgenda
      ? supabase
          .from("citas")
          .select("id, inicio, estado, origen, precio, cliente:clientes(id, codigo, nombre, apellido), servicio:servicios(nombre), empleado:empleados(nombre, apellido, color, foto_path)")
          .eq("sucursal_id", sucursal.id)
          .gte("inicio", instante(hoy, "00:00"))
          .lt("inicio", instante(sumarDias(hoy, 1), "00:00"))
          .order("inicio")
      : Promise.resolve({ data: [] }),
    verAgenda
      ? supabase
          .from("citas")
          .select("id", { count: "exact", head: true })
          .eq("sucursal_id", sucursal.id)
          .eq("estado", "pendiente")
          .gte("inicio", instante(hoy, "00:00"))
      : Promise.resolve({ count: null }),
    verClientes ? supabase.rpc("cumpleanos", { p_desde: hoy, p_hasta: sumarDias(hoy, 6) }) : Promise.resolve({ data: [] }),
    rol === "estilista"
      ? supabase.from("empleados").select("id").eq("sucursal_id", sucursal.id).eq("usuario_id", ctx.usuario.id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  // Comisiones de la quincena: el profesional ve las suyas; el admin, las de todo el equipo.
  const quincena = rangoPeriodo("quincena", hoy);
  const comisiones =
    rol === "admin" || miEmpleado
      ? await supabase.rpc("comisiones", {
          p_sucursal: sucursal.id,
          p_desde: quincena.desde,
          p_hasta: quincena.hasta,
          p_empleado: (miEmpleado?.id ?? null) as string,
        })
      : null;
  const totalComision = (comisiones?.data ?? []).reduce((s, c) => s + Number(c.comision), 0);
  const totalVendido = (comisiones?.data ?? []).reduce((s, c) => s + Number(c.precio), 0);

  const activas = (citas ?? []).filter((c) => c.estado !== "cancelada");

  return (
    <div className="space-y-8">
      <Encabezado
        icono={House}
        titulo={`${saludo()}, ${nombre.split(" ")[0]}!`}
        subtitulo={`${sucursal.nombre} · ${fechaLarga(hoy)}`}
        accion={
          <div className="flex gap-2">
            {verAgenda && (
              <Link
                href="/panel/agenda"
                className="inline-flex items-center gap-2 rounded-lg bg-ink px-4 py-2.5 text-xs uppercase tracking-[0.16em] text-ivory hover:bg-ink/85"
              >
                <CalendarDays className="h-4 w-4" /> Abrir agenda
              </Link>
            )}
            {permisos.reportes !== "ninguno" && (
              <Link
                href="/panel/reportes"
                className="inline-flex items-center gap-2 rounded-lg border border-line bg-surface px-4 py-2.5 text-xs uppercase tracking-[0.16em] hover:border-gold"
              >
                <ChartColumn className="h-4 w-4" /> Ver reportes
              </Link>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {verClientes && <Indicador etiqueta="Clientes" valor={String(total.count ?? 0)} />}
        {verClientes && <Indicador etiqueta="Nuevos este mes" valor={String(nuevos.count ?? 0)} />}
        {verAgenda && <Indicador etiqueta={rol === "estilista" ? "Mis citas de hoy" : "Citas de hoy"} valor={String(activas.length)} />}
        {verAgenda && <Indicador etiqueta="Por confirmar" valor={String(pendientes.count ?? 0)} detalle="De hoy en adelante" />}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {verAgenda && (
          <section className="overflow-hidden rounded-xl border border-line bg-surface">
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <h2 className="font-display text-2xl">Reservas de hoy</h2>
              <Link href="/panel/agenda?vista=resumen" className="text-xs text-gold-strong hover:underline">
                Ver en la agenda
              </Link>
            </div>
            {(citas ?? []).length === 0 ? (
              <p className="px-5 py-12 text-center text-sm text-muted">No hay citas para hoy.</p>
            ) : (
              <ul className="divide-y divide-line">
                {(citas ?? []).map((c) => {
                  const pro = c.empleado ? `${c.empleado.nombre} ${c.empleado.apellido}`.trim() : "";
                  return (
                    <li key={c.id} className="flex items-center gap-4 px-5 py-3 text-sm">
                      <span className="w-20 shrink-0 font-medium">{hora12(enPanama(c.inicio).hora)}</span>
                      <div className="min-w-0 flex-1">
                        {c.cliente ? (
                          <Link href={`/panel/clientes/lista/${c.cliente.id}`} className="font-medium hover:underline">
                            {`${c.cliente.nombre} ${c.cliente.apellido}`.trim()}
                          </Link>
                        ) : (
                          "Cliente"
                        )}
                        <p className="truncate text-xs text-muted">
                          {c.servicio?.nombre ?? "Cita"}
                          {c.cliente && ` · ${codigoCliente(c.cliente.codigo)}`}
                        </p>
                      </div>
                      {c.empleado && rol !== "estilista" && (
                        <Avatar nombre={pro} foto={urlFotoEmpleado(c.empleado.foto_path)} tamano={28} color={c.empleado.color} />
                      )}
                      <span className={`rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wider ${CLASE_ESTADO_CITA[c.estado as EstadoCita]}`}>
                        {ETIQUETA_ESTADO_CITA[c.estado as EstadoCita]}
                        {c.origen === "web" && " · web"}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        )}

        <aside className="space-y-6">
          {comisiones && !comisiones.error && (
            <section className="rounded-xl border border-line bg-surface p-5">
              <h2 className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.16em] text-muted">
                <Wallet className="h-4 w-4 text-gold-strong" /> {miEmpleado ? "Mis comisiones" : "Comisiones del equipo"}
              </h2>
              <p className="mt-3 font-display text-3xl">{dinero(totalComision)}</p>
              <p className="text-xs text-muted">
                Esta quincena · {comisiones.data?.length ?? 0} servicios · {dinero(totalVendido)} en servicios
              </p>
              {rol === "admin" && (
                <Link href="/panel/personal/empleados" className="mt-3 inline-block text-xs text-gold-strong hover:underline">
                  Ver por profesional (pestaña Rendimiento)
                </Link>
              )}
            </section>
          )}

          {verClientes && (
            <section className="rounded-xl border border-line bg-surface p-5">
              <div className="flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.16em] text-muted">
                  <CakeSlice className="h-4 w-4 text-gold-strong" /> Cumpleaños esta semana
                </h2>
                <Link href="/panel/clientes/cumpleanos" className="text-xs text-gold-strong hover:underline">
                  Ver todos
                </Link>
              </div>
              {(cumple ?? []).length === 0 ? (
                <p className="mt-3 text-sm text-muted">Nadie cumple años esta semana.</p>
              ) : (
                <ul className="mt-3 space-y-2 text-sm">
                  {(cumple ?? []).slice(0, 6).map((c) => (
                    <li key={c.id} className="flex items-center justify-between gap-2">
                      <Link href={`/panel/clientes/lista/${c.id}`} className="truncate hover:underline">
                        {`${c.nombre} ${c.apellido}`.trim()}
                      </Link>
                      <span className={`shrink-0 text-xs ${c.cumple === hoy ? "font-medium text-gold-strong" : "text-muted"}`}>
                        {c.cumple === hoy ? "¡Hoy!" : fechaLarga(c.cumple).split(" ").slice(0, 2).join(" ")} · {c.edad}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}
