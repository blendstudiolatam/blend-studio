import Link from "next/link";

const PESTANAS = [
  { href: "/panel/configuracion/negocio", nombre: "Datos del negocio" },
  { href: "/panel/configuracion/sucursales", nombre: "Sucursales y horarios" },
  { href: "/panel/configuracion/preferencias", nombre: "Preferencias" },
];

export function PestanasConfiguracion({ actual }: { actual: string }) {
  return (
    <nav className="flex gap-1 overflow-x-auto border-b border-line" aria-label="Secciones de configuración">
      {PESTANAS.map((p) => (
        <Link
          key={p.href}
          href={p.href}
          aria-current={actual === p.href ? "page" : undefined}
          className={`-mb-px shrink-0 border-b-2 px-4 py-2.5 text-sm transition ${
            actual === p.href
              ? "border-gold text-foreground"
              : "border-transparent text-muted hover:text-foreground"
          }`}
        >
          {p.nombre}
        </Link>
      ))}
    </nav>
  );
}
