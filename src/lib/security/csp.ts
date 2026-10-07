/**
 * Política de seguridad de contenido (CSP): le dice al navegador de dónde puede
 * cargar scripts, estilos e imágenes. Bloquea la mayoría de ataques XSS.
 */
export function buildCsp(nonce: string, supabaseUrl: string | null): string {
  const isDev = process.env.NODE_ENV === "development";

  const connect = ["'self'"];
  const img = ["'self'", "blob:", "data:"];
  if (supabaseUrl) {
    const { host } = new URL(supabaseUrl);
    connect.push(`https://${host}`, `wss://${host}`);
    img.push(`https://${host}`); // logo y archivos públicos de la marca
  }

  const directives = [
    "default-src 'self'",
    // https://challenges.cloudflare.com: respaldo para navegadores sin strict-dynamic (CAPTCHA).
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://challenges.cloudflare.com${isDev ? " 'unsafe-eval'" : ""}`,
    // Estilos en línea permitidos: los usan next/image y la agenda (posición de citas).
    // El riesgo real (scripts) sigue bloqueado por script-src con nonce.
    "style-src 'self' 'unsafe-inline'",
    `img-src ${img.join(" ")}`,
    "font-src 'self'",
    `connect-src ${connect.join(" ")}`,
    // CAPTCHA de Cloudflare (Turnstile) en la página de reservas.
    "frame-src https://challenges.cloudflare.com",
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
