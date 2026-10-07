import { Settings } from "lucide-react";
import type { Metadata } from "next";
import { Encabezado } from "@/components/panel/encabezado";
import { requireModulo } from "@/lib/auth/sesion";
import { createClient } from "@/lib/supabase/server";
import type { TipografiaTexto, TipografiaTitulos } from "@/lib/tipografias";
import { PestanasConfiguracion } from "../pestanas";
import { FormularioPreferencias } from "./formulario-preferencias";

export const metadata: Metadata = { title: "Preferencias" };

export default async function PreferenciasPage() {
  const ctx = await requireModulo("configuracion");
  const supabase = await createClient();
  const { data: n } = await supabase
    .from("negocio")
    .select("nombre_comercial, itbms_pct, color_primario, color_acento, color_fondo, tipografia_titulos, tipografia_texto")
    .eq("unico", true)
    .single();
  if (!n) throw new Error("No se encontraron los datos del negocio.");

  return (
    <div className="space-y-8">
      <Encabezado icono={Settings} titulo="Configuración" subtitulo="Impuesto, moneda, colores y tipografía." />
      <PestanasConfiguracion actual="/panel/configuracion/preferencias" />
      <FormularioPreferencias
        editable={ctx.esDueno || ctx.sucursales.some((s) => s.rol === "admin")}
        nombre={n.nombre_comercial}
        inicial={{
          itbms_pct: Number(n.itbms_pct),
          color_primario: n.color_primario,
          color_acento: n.color_acento,
          color_fondo: n.color_fondo,
          tipografia_titulos: n.tipografia_titulos as TipografiaTitulos,
          tipografia_texto: n.tipografia_texto as TipografiaTexto,
        }}
      />
    </div>
  );
}
