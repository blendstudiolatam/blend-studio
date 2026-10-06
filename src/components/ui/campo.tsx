import type { InputHTMLAttributes } from "react";

type Props = InputHTMLAttributes<HTMLInputElement> & {
  etiqueta: string;
  name: string;
};

export function Campo({ etiqueta, name, className = "", ...props }: Props) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.18em] text-muted">
        {etiqueta}
      </span>
      <input
        name={name}
        className={`block w-full rounded-lg border border-line bg-surface px-4 py-3 text-base text-foreground outline-none transition placeholder:text-muted/60 focus:border-gold focus:ring-2 focus:ring-gold/25 ${className}`}
        {...props}
      />
    </label>
  );
}
