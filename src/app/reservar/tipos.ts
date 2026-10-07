export type Catalogo = {
  sucursal: { id: string; nombre: string; slug: string; direccion: string | null; telefono: string | null };
  horario: { dia: number; abierto: boolean; apertura: string; cierre: string }[];
  categorias: { id: string; nombre: string; descripcion: string | null; imagen: string | null }[];
  servicios: {
    id: string;
    categoria_id: string;
    nombre: string;
    descripcion: string | null;
    duracion: number;
    precio: number;
    precio_descuento: number | null;
  }[];
  profesionales: { id: string; nombre: string; especialidad: string | null; foto: string | null; color: string; servicios: string[] }[];
};

export type Confirmacion = {
  id: string;
  fecha: string;
  hora: string;
  duracion: number;
  servicio: string;
  precio: number;
  profesional: string;
  sucursal: string;
  direccion: string | null;
};
