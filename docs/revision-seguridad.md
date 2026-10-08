# Revisión de seguridad · Fase 1 (sesión 20)

Fecha: 7 de octubre de 2026. Alcance: todo lo construido en la Fase 1, en el proyecto de **desarrollo**.
Repetir antes de cada publicación: `npm run auditoria`, `npm run test:rls` y `npm audit --omit=dev`.

## Resultado

| Punto | Estado | Cómo se comprobó |
|---|---|---|
| Todas las tablas con RLS y con políticas | ✔ | `npm run auditoria` |
| El público (sin sesión) no puede leer ni escribir ninguna tabla | ✔ | auditoría + pruebas |
| El público solo ejecuta `marca_publica` y `datos_privacidad` (datos del negocio) | ✔ | auditoría |
| Funciones con privilegios elevados tienen `search_path` fijo | ✔ | auditoría |
| Archivos de clientes y documentos en almacenamiento privado | ✔ | auditoría + prueba de acceso directo (responde 400) |
| Pruebas de permisos por rol | ✔ 100 de 100 | `npm run test:rls` |
| Dependencias de producción sin vulnerabilidades | ✔ 0 | `npm audit --omit=dev` |
| Sin claves secretas en el repositorio ni en el historial de Git | ✔ | búsqueda en todo el historial |
| Encabezados de seguridad (CSP con nonce, HSTS, X-Frame-Options, etc.) | ✔ | revisión de respuestas |
| Verificación en dos pasos obligatoria para administradores | ✔ | pruebas (sin 2 pasos, el admin no tiene permisos) |
| Límite de intentos de inicio de sesión | ✔ | pruebas |
| Reservas web: CAPTCHA + límite de solicitudes + sin datos de otros clientes | ✔ | pruebas + reserva real en el navegador |
| Registro de auditoría de citas, clientes, comisiones y planes | ✔ | pruebas |
| Datos de salud: consentimiento, acceso por rol y registro de consultas | ✔ | pruebas |

## Cambios hechos en esta revisión

1. Tres funciones internas (`crear_perfil`, `registrar_auditoria`, `normalizar`) quedaban ejecutables por "todos".
   El público no tenía acceso al esquema, así que no había riesgo real, pero se cerró igual.
2. `NEXT_PUBLIC_SITE_URL` ahora es **obligatoria en producción**. Así los enlaces de invitación no dependen del
   encabezado `Host`, que se puede falsificar.
3. Se agregó `npm run auditoria`, una revisión automática de la base de datos para repetir antes de cada publicación.

## Pendientes conocidos (aceptados)

- **`braces` (alerta alta en `npm audit`)**: solo está en el revisor de código (ESLint), que no se publica con la app. No afecta a los usuarios.
- **Estilos en línea en la CSP (`style-src 'unsafe-inline'`)**: los necesitan las imágenes optimizadas y la posición de las citas en la agenda. Los scripts siguen bloqueados por el nonce, que es lo importante contra ataques XSS.
- **Política de privacidad**: es un texto base para la Ley 81. Que la revise un abogado antes de publicar.
- **Contenido del service worker**: no guarda páginas ni datos en el dispositivo, a propósito. Solo guarda una página estática "sin conexión".

## Ajustes que debe revisar Julio en Supabase (proyecto de producción)

- Authentication → Sign In / Providers: **registro público desactivado** (solo por invitación).
- Authentication → Multi-Factor: **TOTP activado**.
- Authentication → Passwords: mínimo 10 caracteres y **protección de contraseñas filtradas** activada (disponible en el plan Pro de Supabase).
- Authentication → URL Configuration: **Site URL** = la dirección final y **Redirect URLs** = `https://<dirección>/auth/confirmar`.
- Database → Backups: confirmar copias diarias (plan Pro de Supabase: copias diarias de 7 días).
