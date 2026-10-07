import type { Metadata } from "next";
import { requireModulo } from "@/lib/auth/sesion";
import { createClient } from "@/lib/supabase/server";
import type { EstadoPlan } from "@/lib/tratamientos";
import { ListaPlanes, type FilaPlan } from "./lista-planes";

export const metadata: Metadata = { title: "Planes de tratamiento" };

export default async function PlanesPage() {
  const ctx = await requireModulo("clientes");
  const supabase = await createClient();
  const { data } = await supabase
    .from("planes_tratamiento")
    .select(
      "id, procedimiento, estado, precio_total, sesiones_total, cliente:clientes(id, codigo, nombre, apellido), profesional:empleados(nombre, apellido, color), sesiones:sesiones_tratamiento(numero, fecha, hora, estado, pagada)",
    )
    .eq("sucursal_id", ctx.sucursal.id)
    .order("created_at", { ascending: false })
    .limit(1000);

  const planes: FilaPlan[] = (data ?? []).map((p) => {
    const sesiones = [...(p.sesiones ?? [])].sort((a, b) => a.numero - b.numero);
    const validas = sesiones.filter((s) => s.estado !== "cancelada");
    const proxima = sesiones.find((s) => s.estado === "pendiente");
    return {
      id: p.id,
      procedimiento: p.procedimiento,
      estado: p.estado as EstadoPlan,
      cliente: {
        id: p.cliente?.id ?? "",
        codigo: p.cliente?.codigo ?? 0,
        nombre: `${p.cliente?.nombre ?? ""} ${p.cliente?.apellido ?? ""}`.trim(),
      },
      profesional: p.profesional ? { nombre: `${p.profesional.nombre} ${p.profesional.apellido}`.trim(), color: p.profesional.color } : null,
      completadas: validas.filter((s) => s.estado === "completada").length,
      total: validas.length || p.sesiones_total,
      proxima: proxima ? { numero: proxima.numero, fecha: proxima.fecha, hora: proxima.hora } : null,
      pendientesFechas: sesiones.filter((s) => s.estado === "pendiente" && s.fecha).map((s) => s.fecha as string),
      precioTotal: Number(p.precio_total),
      pagado: (sesiones.filter((s) => s.pagada).length * Number(p.precio_total)) / p.sesiones_total,
    };
  });

  return <ListaPlanes planes={planes} />;
}
