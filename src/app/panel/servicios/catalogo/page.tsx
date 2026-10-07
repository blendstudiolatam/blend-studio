import type { Metadata } from "next";
import { requireModulo } from "@/lib/auth/sesion";
import { createClient } from "@/lib/supabase/server";
import { CatalogoServicios, type Servicio } from "./catalogo-servicios";

export const metadata: Metadata = { title: "Catálogo de servicios" };

export default async function CatalogoPage({ searchParams }: PageProps<"/panel/servicios/catalogo">) {
  const ctx = await requireModulo("servicios");
  const { categoria } = await searchParams;
  const supabase = await createClient();
  const [{ data: categorias }, { data: servicios }, { data: asignaciones }] = await Promise.all([
    supabase
      .from("categorias_servicio")
      .select("id, nombre, activa")
      .eq("sucursal_id", ctx.sucursal.id)
      .order("orden"),
    supabase
      .from("servicios")
      .select("id, categoria_id, nombre, descripcion, duracion_min, precio, precio_descuento, reserva_web, activo")
      .eq("sucursal_id", ctx.sucursal.id)
      .order("orden"),
    // Quién realiza cada servicio (si el usuario puede ver al equipo).
    supabase
      .from("empleado_servicios")
      .select("servicio_id, empleado:empleados!inner(id, nombre, apellido, foto_path, color, estado)")
      .eq("sucursal_id", ctx.sucursal.id),
  ]);

  const profesionales: Record<string, { id: string; nombre: string; fotoPath: string | null; color: string }[]> = {};
  for (const a of asignaciones ?? []) {
    if (a.empleado.estado === "inactivo") continue;
    (profesionales[a.servicio_id] ??= []).push({
      id: a.empleado.id,
      nombre: `${a.empleado.nombre} ${a.empleado.apellido}`.trim(),
      fotoPath: a.empleado.foto_path,
      color: a.empleado.color,
    });
  }

  return (
    <CatalogoServicios
      categorias={categorias ?? []}
      servicios={(servicios ?? []).map(
        (s): Servicio => ({
          ...s,
          precio: Number(s.precio),
          precio_descuento: s.precio_descuento === null ? null : Number(s.precio_descuento),
        }),
      )}
      profesionales={profesionales}
      categoriaInicial={typeof categoria === "string" ? categoria : null}
      editable={ctx.permisos.servicios === "total"}
    />
  );
}
