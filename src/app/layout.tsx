import type { Metadata, Viewport } from "next";
import {
  Bodoni_Moda,
  Cormorant_Garamond,
  Jost,
  Lato,
  Montserrat,
  Playfair_Display,
} from "next/font/google";
import { connection } from "next/server";
import type { CSSProperties } from "react";
import { RegistrarServiceWorker } from "@/components/registrar-service-worker";
import { getMarca, variablesMarca } from "@/lib/marca";
import "./globals.css";

// Tipografías de la marca. Las alternativas no se precargan: el navegador solo
// las descarga si se eligen en Configuración > Preferencias.
const bodoni = Bodoni_Moda({ variable: "--font-bodoni", subsets: ["latin"], style: ["normal", "italic"] });
const jost = Jost({ variable: "--font-jost", subsets: ["latin"] });
const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  style: ["normal", "italic"],
  preload: false,
});
const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  preload: false,
});
const montserrat = Montserrat({ variable: "--font-montserrat", subsets: ["latin"], preload: false });
const lato = Lato({ variable: "--font-lato", subsets: ["latin"], weight: ["300", "400", "700"], preload: false });

const fuentes = [bodoni, jost, playfair, cormorant, montserrat, lato].map((f) => f.variable).join(" ");

export async function generateMetadata(): Promise<Metadata> {
  const { nombreComercial } = await getMarca();
  return {
    title: { default: nombreComercial, template: `%s · ${nombreComercial}` },
    description: `Gestión y reservas de ${nombreComercial}.`,
    applicationName: nombreComercial,
    appleWebApp: { capable: true, title: nombreComercial, statusBarStyle: "black-translucent" },
  };
}

export async function generateViewport(): Promise<Viewport> {
  const { colorPrimario } = await getMarca();
  return { themeColor: colorPrimario, width: "device-width", initialScale: 1 };
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // La CSP usa un nonce distinto en cada visita, así que todas las páginas
  // deben generarse por petición (no estáticas).
  await connection();
  const marca = await getMarca();

  return (
    <html
      lang="es-PA"
      className={`${fuentes} h-full antialiased`}
      style={variablesMarca(marca) as CSSProperties}
    >
      <body className="min-h-full flex flex-col font-sans">
        {children}
        <RegistrarServiceWorker />
      </body>
    </html>
  );
}
