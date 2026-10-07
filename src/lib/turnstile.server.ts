import "server-only";

// Cloudflare Turnstile (CAPTCHA gratuito). Mientras no haya claves reales, en
// desarrollo se usan las claves de prueba oficiales de Cloudflare (siempre pasan).
// En producción, sin claves reales, las reservas se rechazan.
const PRUEBA_SITIO = "1x00000000000000000000AA";
const PRUEBA_SECRETA = "1x0000000000000000000000000000000AA";
const produccion = process.env.NODE_ENV === "production";

export function claveSitioTurnstile(): string | null {
  return process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || (produccion ? null : PRUEBA_SITIO);
}

/** Verifica con Cloudflare que el token del formulario es de una persona. */
export async function verificarTurnstile(token: string, ip: string): Promise<boolean> {
  const secreta = process.env.TURNSTILE_SECRET_KEY || (produccion ? null : PRUEBA_SECRETA);
  if (!secreta || !token || token.length > 2048) return false;
  try {
    const cuerpo = new URLSearchParams({ secret: secreta, response: token });
    if (ip !== "desconocida") cuerpo.set("remoteip", ip);
    const r = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body: cuerpo,
      signal: AbortSignal.timeout(8000),
    });
    const datos = (await r.json()) as { success?: boolean };
    return datos.success === true;
  } catch {
    return false;
  }
}
