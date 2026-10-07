import type { Metadata } from "next";
import { requireModulo } from "@/lib/auth/sesion";
import { createClient } from "@/lib/supabase/server";
import { GestorCategorias, type Categoria } from "./gestor-categorias";

export const metadata: Metadata = { title: "Categorías de servicios" };

export default async function CategoriasPage() {
  const ctx = await requireModulo("servicios");
  const supabase = await createClient();
  const [{ data: categorias }, { data: servicios }] = await Promise.all([
    supabase
      .from("categorias_servicio")
      .select("id, nombre, descripcion, imagen, activa")
      .eq("sucursal_id", ctx.sucursal.id)
      .order("orden"),
    supabase.from("servicios").select("categoria_id").eq("sucursal_id", ctx.sucursal.id),
  ]);

  const conteo = new Map<string, number>();
  for (const s of servicios ?? []) conteo.set(s.categoria_id, (conteo.get(s.categoria_id) ?? 0) + 1);
  const lista: Categoria[] = (categorias ?? []).map((c) => ({ ...c, servicios: conteo.get(c.id) ?? 0 }));

  return <GestorCategorias categorias={lista} editable={ctx.permisos.servicios === "total"} />;
}
