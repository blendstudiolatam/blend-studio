import type { EstadoCita, Vista } from "@/lib/agenda";

export type CitaAgenda = {
  id: string;
  fecha: string; // YYYY-MM-DD (Panamá)
  hora: string; // HH:MM
  ini: number; // minutos desde medianoche
  fin: number;
  duracion: number;
  estado: EstadoCita;
  origen: "panel" | "web";
  precio: number | null;
  notas: string | null;
  motivoCancelacion: string | null;
  empleadoId: string;
  servicio: { id: string; nombre: string } | null;
  cliente: { id: string; nombre: string; telefono: string | null; codigo: number };
  sesion: { id: string; numero: number; total: number; procedimiento: string } | null;
};

export type ProfesionalAgenda = {
  id: string;
  nombre: string;
  color: string;
  fotoPath: string | null;
  especialidad: string | null;
  /** Horario por día de la semana (0 = domingo); null = no trabaja. */
  horario: ({ entrada: number; salida: number } | null)[];
  bloqueos: { desde: string; hasta: string; motivo: string }[];
  servicios: string[];
};

export type ServicioAgenda = { id: string; nombre: string; categoria: string; duracion: number; precio: number };

export type ConfigRecordatorios = {
  activo: boolean;
  por_whatsapp: boolean;
  por_correo: boolean;
  aviso_horas: number;
  seguimiento_activo: boolean;
  seguimiento_horas: number;
};

export type FiltroAgenda = {
  fecha: string;
  vista: Vista;
  profesional: string;
  pestana: "agenda" | "pendientes";
  color: "empleado" | "estado";
};
