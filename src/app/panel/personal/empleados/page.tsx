import type { Metadata } from "next";
import type { Rol } from "@/lib/auth/permisos";
import { requireModulo } from "@/lib/auth/sesion";
import { resumenHorario, type EstadoEmpleado } from "@/lib/empleados";
import { createClient } from "@/lib/supabase/server";
import { EquipoEmpleados, type TarjetaEmpleado } from "./equipo-empleados";

export const metadata: Metadata = { title: "Empleados" };

export default async function EmpleadosPage() {
  const ctx = await requireModulo("personal");
  const supabase = await createClient();
  const [{ data: empleados }, { data: horarios }, { data: servicios }] = await Promise.all([
    supabase
      .from("empleados")
      .select("id, nombre, apellido, email, telefono, rol, especialidad, comision_pct, estado, reserva_web, color, foto_path, usuario_id")
      .eq("sucursal_id", ctx.sucursal.id)
      .order("orden"),
    supabase.from("horarios_empleado").select("empleado_id, dia_semana, trabaja, entrada, salida").eq("sucursal_id", ctx.sucursal.id),
    supabase.from("empleado_servicios").select("empleado_id").eq("sucursal_id", ctx.sucursal.id),
  ]);

  const tarjetas: TarjetaEmpleado[] = (empleados ?? []).map((e) => ({
    id: e.id,
    nombre: `${e.nombre} ${e.apellido}`.trim(),
    email: e.email,
    telefono: e.telefono,
    rol: e.rol as Rol,
    especialidad: e.especialidad,
    comision: Number(e.comision_pct),
    estado: e.estado as EstadoEmpleado,
    reservaWeb: e.reserva_web,
    color: e.color,
    fotoPath: e.foto_path,
    conAcceso: Boolean(e.usuario_id),
    horario: resumenHorario((horarios ?? []).filter((h) => h.empleado_id === e.id)),
    servicios: (servicios ?? []).filter((s) => s.empleado_id === e.id).length,
  }));

  return <EquipoEmpleados empleados={tarjetas} editable={ctx.permisos.personal === "total"} />;
}
