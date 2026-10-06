/**
 * Política de seguridad de contenido (CSP): le dice al navegador de dónde puede
 * cargar scripts, estilos e imágenes. Bloquea la mayoría de ataques XSS.
 */
export function buildCsp(nonce: string, supabaseUrl: string | null): string {
  const isDev = process.env.NODE_ENV === "development";

  const connect = ["'self'"];
  if (supabaseUrl) {
    const { host } = new URL(supabaseUrl);
    connect.push(`https://${host}`, `wss://${host}`);
  }

  const directives = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    // Estilos en línea permitidos: los usan next/image y la agenda (posición de citas).
    // El riesgo real (scripts) sigue bloqueado por script-src con nonce.
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' blob: data:",
    "font-src 'self'",
    `connect-src ${connect.join(" ")}`,
    "worker-src 'self'",
    "manifest-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ];
  if (!isDev) directives.push("upgrade-insecure-requests");

  return directives.join("; ");
}
