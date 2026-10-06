# Web app de gestión del salón de belleza

@AGENTS.md

## Contexto
- Dueño: Julio, diseñador gráfico, no programador. Explícale todo en español y en pasos simples.
- Pide su aprobación antes de: escribir código de una fase nueva, instalar servicios pagos, borrar datos o hacer cambios grandes.
- Negocio: salón de belleza en Panamá, un local al inicio, con planes de abrir más sucursales.
- Servicios configurables por categoría (por ejemplo barbería, peluquería, uñas, pestañas, manicure, pedicure, spa).
- Referencia funcional: todas las funciones del plan PRO de SalonSistem (salonsistem.com). Diseño y marca propios; no copiar su apariencia.
- Uso interno del negocio, más una página pública de reservas para clientes.
- Web app instalable (PWA) en computadora y celular, sin App Store ni Google Play.
- Idioma español, moneda USD (B/.), zona horaria America/Panama, ITBMS 7% configurable.

## Stack
- Next.js (App Router) + TypeScript + Tailwind CSS, como PWA (manifest + service worker).
- Supabase: Postgres, Auth, Storage, Row Level Security.
- Repositorio privado en GitHub; despliegue en Vercel (plan Pro al publicar).
- Integraciones posteriores: Tilopay (pago por redirección), Yappy Botón de Pago, WhatsApp Cloud API, PAC de factura electrónica (API).

## Multi-sucursal desde el día 1
- Toda tabla de negocio lleva `sucursal_id`. Un usuario puede tener acceso a una o varias sucursales.
- Agregar una sucursal no debe requerir cambios de código.
- Excepción aprobada por Julio: **clientes** es una ficha única compartida entre sucursales (historial común). Las citas, notas operativas y demás registros sí llevan `sucursal_id`.

## Decisiones de Fase 1 (aprobadas)
- Reserva pública sin cuenta de cliente: solo nombre, teléfono, correo y consentimiento.
- Las reservas web entran con estado **pendiente**; recepción las confirma.
- Nombre del salón: **Blend Studio** ("Beauty for everyone", Est. 2026). Marca provisional mientras llega el manual: negro, marfil y dorado; serif condensada de alto contraste para títulos y sans geométrica espaciada en mayúsculas para subtítulos. Logo provisional en `public/brand/`.

## Seguridad (obligatoria, no opcional)
- RLS activado en todas las tablas, con políticas por sucursal y por rol. Ninguna tabla sin política.
- Roles: dueño/admin, recepción, estilista. El estilista ve solo su agenda y sus comisiones; finanzas y caja solo admin.
- Permisos verificados en el servidor, nunca solo en la interfaz.
- Supabase Auth para contraseñas; verificación en dos pasos (TOTP) obligatoria para admin; límite de intentos de inicio de sesión.
- Validar en el servidor toda entrada con Zod. Nunca concatenar SQL. Escapar la salida para evitar XSS.
- Página pública de reservas: rate limiting, CAPTCHA (Cloudflare Turnstile), sin exponer datos de otros clientes.
- Secretos solo en variables de entorno. La clave service_role de Supabase solo en el servidor. `.env*` en `.gitignore`.
- Nunca guardar datos de tarjetas: los pagos se hacen en la página del procesador.
- Registro de auditoría: quién crea, edita o anula citas, ventas y movimientos de caja.
- Headers de seguridad (CSP, HSTS, X-Frame-Options, etc.).
- Ley 81 de 2019 de Panamá (datos personales): consentimiento en el formulario de reservas, política de privacidad publicada, pedir solo los datos necesarios.
- Revisar dependencias con `npm audit` antes de cada publicación.

## Fases
- **Fase 1:** base del proyecto (auth, roles, sucursales, ajustes del negocio y de marca), servicios y categorías (duración, precio), empleados (horarios, servicios que realizan, % de comisión), clientes (ficha, historial, notas, cumpleaños), agenda (día/semana, por estilista, estados de cita), reservas web públicas 24/7 con confirmación en pantalla, comisiones por servicio realizado, PWA instalable.
- **Fase 2:** punto de venta, caja (apertura, cierre, cuadre), productos e inventario con alertas de stock, métodos de pago (efectivo, Yappy, Tilopay, datáfono registrado a mano), factura electrónica vía PAC, ITBMS.
- **Fase 3:** recordatorios por WhatsApp, fidelidad, cumpleaños, reportes, dashboard y exportaciones.

## Forma de trabajar
- Al iniciar cada fase: plan corto (pantallas, tablas, orden de trabajo), lo que Julio debe crear o pagar, y estimación de sesiones. Esperar su aprobación.
- Cambios pequeños con commits claros. Probar antes de dar algo por terminado, incluidas pruebas de permisos RLS.
- Al terminar cada parte: decir en lenguaje simple qué se hizo y qué debe probar Julio.
- Diseño limpio, profesional y mobile-first. Marca del salón configurable en ajustes (logo, colores, tipografía), con valores provisionales hasta que Julio entregue la marca final.
