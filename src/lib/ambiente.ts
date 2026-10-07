// Fotos de ambiente del salón (public/ambiente) que se pueden asignar a categorías.
export const FOTOS_AMBIENTE = [
  { id: "barberia-corte", nombre: "Barbería · corte" },
  { id: "barberia-tijera", nombre: "Barbería · tijera" },
  { id: "barberia-afeitado", nombre: "Barbería · afeitado" },
  { id: "coloracion", nombre: "Coloración" },
  { id: "brushing", nombre: "Brushing" },
  { id: "lavado", nombre: "Lavado" },
  { id: "peinado-recogido", nombre: "Peinado" },
  { id: "resultado-cabello", nombre: "Resultado cabello" },
  { id: "unas", nombre: "Uñas" },
  { id: "pestanas", nombre: "Pestañas" },
  { id: "cejas", nombre: "Cejas" },
  { id: "maquillaje", nombre: "Maquillaje" },
  { id: "facial", nombre: "Facial" },
  { id: "spa-masaje", nombre: "Spa · masaje" },
  { id: "spa-lounge", nombre: "Spa · descanso" },
  { id: "recepcion", nombre: "Recepción" },
  { id: "salon-interior", nombre: "Salón" },
  { id: "herramientas", nombre: "Herramientas" },
] as const;

export const urlAmbiente = (id: string | null) =>
  id && FOTOS_AMBIENTE.some((f) => f.id === id) ? `/ambiente/${id}.webp` : "/ambiente/salon-interior.webp";
