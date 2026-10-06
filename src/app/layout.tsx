import type { Metadata, Viewport } from "next";
import { Bodoni_Moda, Jost } from "next/font/google";
import { connection } from "next/server";
import { RegistrarServiceWorker } from "@/components/registrar-service-worker";
import "./globals.css";

const bodoni = Bodoni_Moda({
  variable: "--font-bodoni",
  subsets: ["latin"],
  style: ["normal", "italic"],
});

const jost = Jost({
  variable: "--font-jost",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Blend Studio",
    template: "%s · Blend Studio",
  },
  description: "Gestión y reservas de Blend Studio. Beauty for everyone.",
  applicationName: "Blend Studio",
  appleWebApp: {
    capable: true,
    title: "Blend Studio",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  themeColor: "#0b0b0b",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // La CSP usa un nonce distinto en cada visita, así que todas las páginas
  // deben generarse por petición (no estáticas).
  await connection();

  return (
    <html
      lang="es-PA"
      className={`${bodoni.variable} ${jost.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">
        {children}
        <RegistrarServiceWorker />
      </body>
    </html>
  );
}
