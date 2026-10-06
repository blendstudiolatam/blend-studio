import type { ButtonHTMLAttributes } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variante?: "principal" | "secundario";
  cargando?: boolean;
};

const estilos = {
  principal: "bg-ink text-ivory hover:bg-ink/85 disabled:bg-ink/50",
  secundario:
    "border border-line bg-surface text-foreground hover:border-gold disabled:opacity-50",
};

export function Boton({
  variante = "principal",
  cargando = false,
  className = "",
  children,
  disabled,
  ...props
}: Props) {
  return (
    <button
      className={`inline-flex w-full items-center justify-center gap-2 rounded-lg px-5 py-3 text-xs font-medium uppercase tracking-[0.2em] transition ${estilos[variante]} ${className}`}
      disabled={disabled || cargando}
      aria-busy={cargando}
      {...props}
    >
      {cargando && (
        <span
          aria-hidden
          className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent"
        />
      )}
      {children}
    </button>
  );
}
