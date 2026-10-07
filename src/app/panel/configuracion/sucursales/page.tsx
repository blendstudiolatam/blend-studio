import { Settings } from "lucide-react";
import type { Metadata } from "next";
import { Encabezado } from "@/components/panel/encabezado";
import { requireModulo } from "@/lib/auth/sesion";
import { createClient } from "@/lib/supabase/server";
import { PestanasConfiguracion } from "../pestanas";
import { NuevaSucursal } from "./nueva-sucursal";
import { TarjetaSucursal, type DiaHorario } from "./tarjeta-sucursal";

export const metadata: Metadata = { title: "Sucursales y horarios" };

export default async function SucursalesPage() {
  const ctx = await requireModulo("configuracion");
  const supabase = await createClient();
  const ids = ctx.sucursales.map((s) => s.id);

  const [{ data: sucursales }, { data: horarios }, permisos] = await Promise.all([
    supabase.from("sucursales").select("id, nombre, direccion, telefono").in("id", ids).order("nombre"),
    supabase
      .from("horarios_sucursal")
      .select("sucursal_id, dia_semana, abierto, apertura, cierre")
      .in("sucursal_id", ids),
    // ¿En cuáles puede editar? (la base de datos lo vuelve a verificar al guardar)
    Promise.all(
      ids.map(async (id) => {
        const { data } = await supabase.rpc("mis_permisos", { p_sucursal: id });
        return [id, data?.find((p) => p.modulo === "configuracion")?.nivel === "total"] as const;
      }),
    ),
  ]);
  const editable = Object.fromEntries(permisos);

  return (
    <div className="space-y-8">
      <Encabezado
        icono={Settings}
        titulo="Configuración"
        subtitulo="Datos de cada local y su horario. Las citas solo se podrán agendar dentro de este horario."
        accion={ctx.esDueno ? <NuevaSucursal /> : undefined}
      />
      <PestanasConfiguracion actual="/panel/configuracion/sucursales" />
      <div className="space-y-6">
        {(sucursales ?? []).map((s) => (
          <TarjetaSucursal
            key={s.id}
            sucursal={{
              id: s.id,
              nombre: s.nombre,
              direccion: s.direccion ?? "",
              telefono: s.telefono ?? "",
            }}
            horario={(horarios ?? [])
              .filter((h) => h.sucursal_id === s.id)
              .sort((a, b) => ((a.dia_semana + 6) % 7) - ((b.dia_semana + 6) % 7))
              .map(
                (h): DiaHorario => ({
                  dia_semana: h.dia_semana,
                  abierto: h.abierto,
                  apertura: h.apertura.slice(0, 5),
                  cierre: h.cierre.slice(0, 5),
                }),
              )}
            editable={Boolean(editable[s.id])}
            actual={s.id === ctx.sucursal.id}
          />
        ))}
      </div>
    </div>
  );
}
