import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getPublicEnv } from "@/lib/env";
import { buildCsp } from "@/lib/security/csp";

/**
 * Corre antes de cada página:
 * 1. Genera un "nonce" (código de un solo uso) y aplica la CSP.
 * 2. Renueva la sesión de Supabase si está por vencer.
 * Los permisos reales NO se deciden aquí: se verifican en el servidor y con RLS.
 */
export async function proxy(request: NextRequest) {
  const env = getPublicEnv();
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const csp = buildCsp(nonce, env?.NEXT_PUBLIC_SUPABASE_URL ?? null);

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const nextResponse = () =>
    NextResponse.next({ request: { headers: requestHeaders } });
  let response = nextResponse();

  if (env) {
    const supabase = createServerClient(
      env.NEXT_PUBLIC_SUPABASE_URL,
      env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet, headers) {
            cookiesToSet.forEach(({ name, value }) =>
              request.cookies.set(name, value),
            );
            requestHeaders.set("cookie", request.cookies.toString());
            response = nextResponse();
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options),
            );
            Object.entries(headers).forEach(([key, value]) =>
              response.headers.set(key, value),
            );
          },
        },
      },
    );
    // No poner código entre createServerClient y getClaims: renueva la sesión.
    await supabase.auth.getClaims();
  }

  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export const config = {
  matcher: [
    {
      source:
        "/((?!_next/static|_next/image|icons/|brand/|sw.js|manifest.webmanifest|icon.png|apple-icon.png).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
