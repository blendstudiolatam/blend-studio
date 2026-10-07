import { Settings } from "lucide-react";
import type { Metadata } from "next";
import { Encabezado } from "@/components/panel/encabezado";
import { requireModulo } from "@/lib/auth/sesion";
import { urlArchivoMarca } from "@/lib/marca";
import { createClient } from "@/lib/supabase/server";
import { PestanasConfiguracion } from "../pestanas";
import { FormularioNegocio } from "./formulario-negocio";

export const metadata: Metadata = { title: "Datos del negocio" };

export default async function NegocioPage() {
  const ctx = await requireModulo("configuracion");
  const supabase = await createClient();
  const [{ data: negocio }, { data: sucursal }] = await Promise.all([
    supabase.from("negocio").select("*").eq("unico", true).single(),
    supabase.from("sucursales").select("nombre, direccion, telefono").eq("id", ctx.sucursal.id).single(),
  ]);
  if (!negocio) throw new Error("No se encontraron los datos del negocio.");

  const editable = ctx.esDueno || ctx.sucursales.some((s) => s.rol === "admin");

  return (
    <div className="space-y-8">
      <Encabezado
        icono={Settings}
        titulo="Configuración"
        subtitulo="Datos del negocio, contacto y lo que aparece en los comprobantes."
      />
      <PestanasConfiguracion actual="/panel/configuracion/negocio" />
      <FormularioNegocio
        editable={editable}
        logoInicial={urlArchivoMarca(negocio.logo_path)}
        itbms={Number(negocio.itbms_pct)}
        sucursal={{
          nombre: sucursal?.nombre ?? ctx.sucursal.nombre,
          direccion: sucursal?.direccion ?? null,
          telefono: sucursal?.telefono ?? null,
        }}
        inicial={{
          nombre_comercial: negocio.nombre_comercial,
          nombre_legal: negocio.nombre_legal ?? "",
          ruc: negocio.ruc ?? "",
          dv: negocio.dv ?? "",
          telefono: negocio.telefono ?? "",
          whatsapp: negocio.whatsapp ?? "",
          email: negocio.email ?? "",
          email_respaldo: negocio.email_respaldo ?? "",
          instagram: negocio.instagram ?? "",
          facebook: negocio.facebook ?? "",
          tiktok: negocio.tiktok ?? "",
          sitio_web: negocio.sitio_web ?? "",
          horario_texto: negocio.horario_texto ?? "",
          mensaje_comprobante: negocio.mensaje_comprobante ?? "",
        }}
      />
    </div>
  );
}
