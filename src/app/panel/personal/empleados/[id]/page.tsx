import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { Avatar } from "@/components/ui/avatar";
import { ETIQUETA_ROL, type Rol } from "@/lib/auth/permisos";
import { requireModulo } from "@/lib/auth/sesion";
import { CLASE_ESTADO, ETIQUETA_ESTADO, urlFotoEmpleado, type EstadoEmpleado } from "@/lib/empleados";
import { createClient } from "@/lib/supabase/server";
import { DatosEmpleadoForm } from "./datos-empleado";
import { HorarioEmpleado } from "./horario-empleado";
import { ServiciosEmpleado } from "./servicios-empleado";

export const metadata: Metadata = { title: "Empleado" };

const PESTANAS = [
  { id: "datos", nombre: "Datos" },
  { id: "horario", nombre: "Horario y días libres" },
  { id: "servicios", nombre: "Servicios que realiza" },
  { id: "rendimiento", nombre: "Rendimiento" },
] as const;

export default async function EmpleadoPage({ params, searchParams }: PageProps<"/panel/personal/empleados/[id]">) {
  const ctx = await requireModulo("personal");
  const { id } = await params;
  const { tab } = await searchParams;
  const empId = z.guid().safeParse(id);
  if (!empId.success) notFound();
  const pestana = PESTANAS.find((p) => p.id === tab)?.id ?? "datos";
  const editable = ctx.permisos.personal === "total";

  const supabase = await createClient();
  const { data: e } = await supabase
    .from("empleados")
    .select("*")
    .eq("id", empId.data)
    .eq("sucursal_id", ctx.sucursal.id)
    .maybeSingle();
  if (!e) notFound();

  const nombre = `${e.nombre} ${e.apellido}`.trim();

  return (
    <div className="space-y-8">
      <Link href="/panel/personal/empleados" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Volver al equipo
      </Link>

      <div className="flex flex-wrap items-center gap-5">
        <Avatar nombre={nombre} foto={urlFotoEmpleado(e.foto_path)} tamano={84} color={e.color} />
        <div>
          <h1 className="font-display text-4xl leading-tight">{nombre}</h1>
          <p className="mt-1 text-sm text-muted">
            {e.especialidad || "Sin especialidad"} · {ETIQUETA_ROL[e.rol as Rol]}
          </p>
          <span className={`mt-2 inline-block rounded-full px-2.5 py-0.5 text-[10px] uppercase tracking-wider ${CLASE_ESTADO[e.estado as EstadoEmpleado]}`}>
            {ETIQUETA_ESTADO[e.estado as EstadoEmpleado]}
          </span>
        </div>
      </div>

      <nav className="flex gap-1 overflow-x-auto border-b border-line" aria-label="Secciones del empleado">
        {PESTANAS.map((p) => (
          <Link
            key={p.id}
            href={p.id === "datos" ? "?" : `?tab=${p.id}`}
            aria-current={pestana === p.id ? "page" : undefined}
            className={`-mb-px shrink-0 border-b-2 px-4 py-2.5 text-sm transition ${
              pestana === p.id ? "border-gold text-foreground" : "border-transparent text-muted hover:text-foreground"
            }`}
          >
            {p.nombre}
          </Link>
        ))}
      </nav>

      {pestana === "datos" && (
        <DatosEmpleadoForm
          id={e.id}
          editable={editable}
          puedeDarAcceso={editable && ctx.rol === "admin"}
          conAcceso={Boolean(e.usuario_id)}
          fotoInicial={urlFotoEmpleado(e.foto_path)}
          inicial={{
            nombre: e.nombre,
            apellido: e.apellido,
            email: e.email ?? "",
            telefono: e.telefono ?? "",
            rol: e.rol as Rol,
            especialidad: e.especialidad ?? "",
            comision_pct: Number(e.comision_pct),
            estado: e.estado as EstadoEmpleado,
            reserva_web: e.reserva_web,
            color: e.color,
          }}
        />
      )}
      {pestana === "horario" && <PestanaHorario id={e.id} editable={editable} />}
      {pestana === "servicios" && <PestanaServicios id={e.id} sucursalId={ctx.sucursal.id} editable={editable} comisionGeneral={Number(e.comision_pct)} />}
      {pestana === "rendimiento" && (
        <div className="rounded-xl border border-dashed border-line bg-surface px-6 py-14 text-center">
          <p className="text-[11px] uppercase tracking-[0.3em] text-gold-strong">Rendimiento</p>
          <p className="mt-3 font-display text-2xl">Aquí verás citas atendidas, ventas y comisiones</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted">
            Se llenará solo cuando la Agenda esté funcionando y haya servicios realizados.
          </p>
        </div>
      )}
    </div>
  );
}

async function PestanaHorario({ id, editable }: { id: string; editable: boolean }) {
  const supabase = await createClient();
  const [{ data: dias }, { data: bloqueos }] = await Promise.all([
    supabase.from("horarios_empleado").select("dia_semana, trabaja, entrada, salida").eq("empleado_id", id),
    supabase.from("bloqueos_empleado").select("id, desde, hasta, motivo").eq("empleado_id", id).order("desde", { ascending: false }),
  ]);
  return (
    <HorarioEmpleado
      id={id}
      editable={editable}
      dias={(dias ?? [])
        .map((d) => ({ ...d, entrada: d.entrada.slice(0, 5), salida: d.salida.slice(0, 5) }))
        .sort((a, b) => ((a.dia_semana + 6) % 7) - ((b.dia_semana + 6) % 7))}
      bloqueos={bloqueos ?? []}
    />
  );
}

async function PestanaServicios({
  id,
  sucursalId,
  editable,
  comisionGeneral,
}: {
  id: string;
  sucursalId: string;
  editable: boolean;
  comisionGeneral: number;
}) {
  const supabase = await createClient();
  const [{ data: categorias }, { data: servicios }, { data: asignados }] = await Promise.all([
    supabase.from("categorias_servicio").select("id, nombre").eq("sucursal_id", sucursalId).order("orden"),
    supabase.from("servicios").select("id, categoria_id, nombre, precio, activo").eq("sucursal_id", sucursalId).order("orden"),
    supabase.from("empleado_servicios").select("servicio_id, comision_pct").eq("empleado_id", id),
  ]);
  return (
    <ServiciosEmpleado
      empleadoId={id}
      editable={editable}
      comisionGeneral={comisionGeneral}
      categorias={categorias ?? []}
      servicios={(servicios ?? []).map((s) => ({ ...s, precio: Number(s.precio) }))}
      asignados={Object.fromEntries((asignados ?? []).map((a) => [a.servicio_id, a.comision_pct === null ? null : Number(a.comision_pct)]))}
    />
  );
}
