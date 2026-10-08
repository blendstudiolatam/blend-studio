import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Blend Studio",
    short_name: "Blend",
    description: "Gestión y reservas de Blend Studio.",
    lang: "es-PA",
    // El equipo instala la app para trabajar: abre directo en el panel
    // (sin sesión, el panel lleva a "Entrar").
    start_url: "/panel",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#0b0b0b",
    theme_color: "#0b0b0b",
    categories: ["business", "lifestyle"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icons/maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      { name: "Agenda", url: "/panel/agenda", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Clientes", url: "/panel/clientes/lista", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Reservar cita", url: "/reservar", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
