import type { Metadata } from "next";
import { hoyEnPanama, sumarDias } from "@/lib/agenda";
import { requireModulo } from "@/lib/auth/sesion";
import { getMarca } from "@/lib/marca";
import { rangoPeriodo } from "@/lib/periodos";
import { createClient } from "@/lib/supabase/server";
import { AlertaCumpleanos, type Cumpleanero, type FiltroCumple } from "./alerta-cumpleanos";

export const metadata: Metadata = { title: "Alerta de cumpleaños" };

const FILTROS: FiltroCumple[] = ["hoy", "semana", "mes", "personalizado"];

export default async function CumpleanosPage({ searchParams }: PageProps<"/panel/clientes/cumpleanos">) {
  const ctx = await requireModulo("clientes");
  const sp = await searchParams;
  const hoy = hoyEnPanama();
  const filtro = FILTROS.find((f) => f === sp.filtro) ?? "semana";
  const fecha = (v: unknown, def: string) => (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : def);

  let desde = hoy;
  let hasta = hoy;
  if (filtro === "semana") hasta = sumarDias(hoy, 6);
  if (filtro === "mes") ({ desde, hasta } = rangoPeriodo("mes", hoy));
  if (filtro === "personalizado") {
    desde = fecha(sp.desde, hoy);
    hasta = fecha(sp.hasta, sumarDias(hoy, 30));
    if (hasta < desde) hasta = desde;
    if (hasta > sumarDias(desde, 366)) hasta = sumarDias(desde, 366);
  }

  const supabase = await createClient();
  const { data } = await supabase.rpc("cumpleanos", { p_desde: desde, p_hasta: hasta });
  const rutas = (data ?? []).map((c) => c.foto_path).filter((p): p is string => Boolean(p));
  const firmadas = rutas.length ? (await supabase.storage.from("clientes").createSignedUrls(rutas, 3600)).data : [];
  const fotos = new Map((firmadas ?? []).map((f) => [f.path, f.signedUrl]));
  const marca = await getMarca();

  const lista: Cumpleanero[] = (data ?? []).map((c) => ({
    id: c.id,
    codigo: c.codigo,
    nombre: `${c.nombre} ${c.apellido}`.trim(),
    telefono: c.telefono,
    email: c.email,
    cumple: c.cumple,
    edad: c.edad,
    foto: c.foto_path ? (fotos.get(c.foto_path) ?? null) : null,
    aceptaMensajes: c.recordatorios_whatsapp,
  }));

  return (
    <AlertaCumpleanos
      lista={lista}
      filtro={filtro}
      desde={desde}
      hasta={hasta}
      hoy={hoy}
      salon={marca.nombreComercial}
      puedeExportar={ctx.permisos.clientes === "total"}
    />
  );
}
