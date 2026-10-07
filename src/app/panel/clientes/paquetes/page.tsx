import type { Metadata } from "next";
import { requireModulo } from "@/lib/auth/sesion";
import { createClient } from "@/lib/supabase/server";
import { CatalogoPaquetes, type Paquete } from "./catalogo-paquetes";

export const metadata: Metadata = { title: "Catálogo de paquetes" };

export default async function PaquetesPage() {
  const ctx = await requireModulo("clientes");
  const editable = ctx.permisos.servicios === "total";
  const supabase = await createClient();
  const [{ data: paquetes }, { data: servicios }, { data: planes }] = await Promise.all([
    supabase
      .from("paquetes")
      .select("id, servicio_id, nombre, descripcion, sesiones, frecuencia_dias, precio_sesion, precio_total, activo")
      .eq("sucursal_id", ctx.sucursal.id)
      .order("orden")
      .order("nombre"),
    editable
      ? supabase.from("servicios").select("id, nombre").eq("sucursal_id", ctx.sucursal.id).eq("activo", true).order("nombre")
      : Promise.resolve({ data: [] as { id: string; nombre: string }[] }),
    supabase.from("planes_tratamiento").select("paquete_id").eq("sucursal_id", ctx.sucursal.id).eq("estado", "activo"),
  ]);

  const enUso = new Map<string, number>();
  for (const p of planes ?? []) if (p.paquete_id) enUso.set(p.paquete_id, (enUso.get(p.paquete_id) ?? 0) + 1);

  return (
    <CatalogoPaquetes
      paquetes={(paquetes ?? []).map(
        (p): Paquete => ({
          ...p,
          precio_sesion: Number(p.precio_sesion),
          precio_total: Number(p.precio_total),
          planesActivos: enUso.get(p.id) ?? 0,
        }),
      )}
      servicios={servicios ?? []}
      editable={editable}
    />
  );
}
