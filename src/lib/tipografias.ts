// Tipografías disponibles en Preferencias (las mismas que acepta la base de datos).
export const TIPOGRAFIAS_TITULOS = [
  { id: "bodoni", nombre: "Bodoni Moda", descripcion: "Serif de alto contraste (provisional)" },
  { id: "playfair", nombre: "Playfair Display", descripcion: "Serif elegante y clásica" },
  { id: "cormorant", nombre: "Cormorant Garamond", descripcion: "Serif fina y editorial" },
] as const;

export const TIPOGRAFIAS_TEXTO = [
  { id: "jost", nombre: "Jost", descripcion: "Geométrica y limpia (provisional)" },
  { id: "montserrat", nombre: "Montserrat", descripcion: "Geométrica, más ancha" },
  { id: "lato", nombre: "Lato", descripcion: "Humanista, muy legible" },
] as const;

export type TipografiaTitulos = (typeof TIPOGRAFIAS_TITULOS)[number]["id"];
export type TipografiaTexto = (typeof TIPOGRAFIAS_TEXTO)[number]["id"];
