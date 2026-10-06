/**
 * Logotipo tipográfico provisional de Blend Studio.
 * Se reemplazará por el archivo oficial cuando llegue el manual de marca.
 */
export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <div className={`text-center leading-none ${className}`}>
      <p className="text-[0.7em] tracking-[0.3em] uppercase font-sans">
        Est. 2026
      </p>
      <div className="mx-auto my-[0.5em] h-px w-[70%] bg-current opacity-70" />
      <p className="font-display text-[3.2em] tracking-tight">Blend</p>
      <p className="font-display italic text-[3.2em] -mt-[0.25em] tracking-tight">
        Studio
      </p>
      <div className="mx-auto my-[0.5em] h-px w-[70%] bg-current opacity-70" />
      <p className="text-[0.7em] tracking-[0.25em] uppercase font-sans">
        Beauty for everyone
      </p>
    </div>
  );
}
