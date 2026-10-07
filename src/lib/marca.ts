import "server-only";
import { cache } from "react";
import { getPublicEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export type Marca = {
  nombreComercial: string;
  logoUrl: string | null;
  telefono: string | null;
  whatsapp: string | null;
  email: string | null;
  instagram: string | null;
  facebook: string | null;
  tiktok: string | null;
  sitioWeb: string | null;
  horarioTexto: string | null;
  colorPrimario: string;
  colorAcento: string;
  colorFondo: string;
  tipografiaTitulos: string;
  tipografiaTexto: string;
};

export const MARCA_POR_DEFECTO: Marca = {
  nombreComercial: "Blend Studio",
  logoUrl: null,
  telefono: null,
  whatsapp: null,
  email: null,
  instagram: null,
  facebook: null,
  tiktok: null,
  sitioWeb: null,
  horarioTexto: null,
  colorPrimario: "#0b0b0b",
  colorAcento: "#c9a15b",
  colorFondo: "#f6f1e9",
  tipografiaTitulos: "bodoni",
  tipografiaTexto: "jost",
};

/** URL pública de un archivo del almacenamiento "marca". */
export function urlArchivoMarca(path: string | null): string | null {
  const env = getPublicEnv();
  if (!path || !env) return null;
  return `${env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/marca/${path}`;
}

/** Marca pública del negocio (colores, logo, contacto). Si algo falla, usa la provisional. */
export const getMarca = cache(async (): Promise<Marca> => {
  if (!getPublicEnv()) return MARCA_POR_DEFECTO;
  try {
    const supabase = await createClient();
    const { data } = await supabase.rpc("marca_publica");
    const m = data?.[0];
    if (!m) return MARCA_POR_DEFECTO;
    return {
      nombreComercial: m.nombre_comercial,
      logoUrl: urlArchivoMarca(m.logo_path),
      telefono: m.telefono,
      whatsapp: m.whatsapp,
      email: m.email,
      instagram: m.instagram,
      facebook: m.facebook,
      tiktok: m.tiktok,
      sitioWeb: m.sitio_web,
      horarioTexto: m.horario_texto,
      colorPrimario: m.color_primario,
      colorAcento: m.color_acento,
      colorFondo: m.color_fondo,
      tipografiaTitulos: m.tipografia_titulos,
      tipografiaTexto: m.tipografia_texto,
    };
  } catch {
    return MARCA_POR_DEFECTO;
  }
});

/** Oscurece un color #RRGGBB (para la variante "fuerte" del acento). */
export function oscurecer(hex: string, cantidad = 0.18): string {
  const n = parseInt(hex.slice(1), 16);
  const canal = (v: number) => Math.round(v * (1 - cantidad)).toString(16).padStart(2, "0");
  return `#${canal((n >> 16) & 255)}${canal((n >> 8) & 255)}${canal(n & 255)}`;
}

const HEX = /^#[0-9a-fA-F]{6}$/;
const seguro = (c: string, porDefecto: string) => (HEX.test(c) ? c : porDefecto);

/** Variables CSS de la marca (los colores se validan otra vez antes de usarlos). */
export function variablesMarca(m: Marca): Record<string, string> {
  const acento = seguro(m.colorAcento, MARCA_POR_DEFECTO.colorAcento);
  return {
    "--brand-ink": seguro(m.colorPrimario, MARCA_POR_DEFECTO.colorPrimario),
    "--brand-gold": acento,
    "--brand-gold-strong": oscurecer(acento),
    "--brand-ivory": seguro(m.colorFondo, MARCA_POR_DEFECTO.colorFondo),
    "--font-titulos": `var(--font-${m.tipografiaTitulos})`,
    "--font-texto": `var(--font-${m.tipografiaTexto})`,
  };
}
