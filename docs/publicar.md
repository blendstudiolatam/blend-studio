# Cómo publicar Blend Studio (producción)

Guía paso a paso. Las cuentas y pagos los crea **Julio**. Claude prepara el código, aplica las migraciones y
verifica, siempre con la aprobación de Julio en cada paso.
**Nunca pegues contraseñas ni claves secretas en el chat**: van solo en los paneles de Vercel/Supabase o en `.env.local`.

## Costos mensuales estimados (confirmar antes de contratar)

| Servicio | Plan | Para qué | Costo aprox. |
|---|---|---|---|
| Vercel | Pro (1 usuario) | Publicar la app (uso comercial) | USD 20/mes |
| Supabase | Pro | Base de datos de producción, copias diarias, sin pausas | USD 25/mes |
| Dominio | — | Por ejemplo, `blendstudio.com` | USD 10–20/año |
| Cloudflare Turnstile | Gratis | CAPTCHA de reservas | USD 0 |

> El plan gratis de Supabase pausa el proyecto tras 7 días sin uso y no tiene copias diarias: no sirve para producción.

## Paso 1 — Proyecto de producción en Supabase (Julio)
1. supabase.com → **New project**: nombre `blend-studio-prod`, región **East US (N. Virginia)**, que es la más cercana a Panamá. Contraseña de la base de datos larga y guardada en tu gestor de contraseñas.
2. Cambia el proyecto al plan **Pro**.
3. Copia en un archivo nuevo **`.env.production.local`** (ya está ignorado por Git): Project URL, Publishable key, Secret key y la conexión Session pooler (`SUPABASE_DB_URL`).
4. Avísale a Claude. Claude aplica las migraciones a producción, **sin datos de prueba**, y corre `npm run auditoria`.

## Paso 2 — Ajustes de Supabase producción (Julio, con guía)
Los de la lista final de `docs/revision-seguridad.md`: registro público desactivado, TOTP, contraseñas, URLs y copias.

## Paso 3 — Cloudflare Turnstile (Julio)
1. cloudflare.com → crear cuenta gratis → **Turnstile → Add widget**.
2. Nombre `Blend Studio reservas`; dominio: el definitivo (por ejemplo `blendstudio.com`); modo **Managed**.
3. Guarda la **Site key** y la **Secret key** para el paso 4.

## Paso 4 — Vercel (Julio)
1. vercel.com → entrar con GitHub → **Add New → Project** → importar `blendstudiolatam/blend-studio`.
2. Plan **Pro**.
3. En **Environment Variables** (Production), agrega:
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (producción)
   - `SUPABASE_SECRET_KEY` (producción; marcar como *Sensitive*)
   - `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY` (marcar como *Sensitive*)
   - `NEXT_PUBLIC_SITE_URL` = `https://<tu dominio>`
   - **No** agregar `SUPABASE_DB_URL` (solo se usa en la computadora).
4. **Deploy**. En **Settings → Domains**, conecta el dominio.

## Paso 5 — Primer acceso (Julio + Claude)
1. Claude crea tu usuario dueño en producción y te da el enlace de invitación (vence en 1 hora).
2. Creas tu contraseña y configuras la verificación en dos pasos.
3. Cargas los datos reales: negocio y marca, sucursal, horarios, servicios, empleados y clientes (puedes importarlos desde Excel).

## Paso 6 — Verificación final (Claude)
- `npm run auditoria` contra producción, `npm audit --omit=dev` y prueba de una reserva web real.
- Revisar encabezados de seguridad en el dominio y que la app se pueda instalar en celular y computadora.

## Después de publicar
- Cada cambio nuevo: Claude hace `git push` y Vercel publica solo.
- Las migraciones nuevas se aplican primero en desarrollo (con pruebas) y después en producción.
