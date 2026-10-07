import Image from "next/image";
import { iniciales } from "@/lib/empleados";

/** Foto redonda de una persona, o sus iniciales si no tiene foto. */
export function Avatar({
  nombre,
  foto,
  tamano = 40,
  color,
  className = "",
  privada = false,
}: {
  nombre: string;
  foto: string | null;
  tamano?: number;
  color?: string;
  className?: string;
  /** Enlace temporal de un archivo privado: se muestra tal cual, sin pasar por el optimizador. */
  privada?: boolean;
}) {
  return (
    <span
      className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-ink text-gold ${className}`}
      style={{ width: tamano, height: tamano, boxShadow: color ? `0 0 0 2px ${color}` : undefined }}
    >
      {foto ? (
        <Image src={foto} alt={nombre} fill unoptimized={privada} sizes={`${tamano * 2}px`} className="object-cover" />
      ) : (
        <span style={{ fontSize: tamano * 0.36 }}>{iniciales(nombre)}</span>
      )}
    </span>
  );
}
