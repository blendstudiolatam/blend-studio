export function MensajeError({ children }: { children?: string }) {
  if (!children) return null;
  return (
    <p
      role="alert"
      className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
    >
      {children}
    </p>
  );
}
