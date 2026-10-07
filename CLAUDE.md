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

## Decisiones del anexo v2 (aprobadas por Julio, 2026-10-07)
- Matriz de permisos por módulo configurable (Acceso total / Solo lectura / Sin acceso), pero con **límites fijos que no se pueden abrir**: Caja y Finanzas solo admin; el profesional (estilista) ve solo su agenda y sus comisiones.
- Historial médico del cliente: lo ven admin y recepción; cada profesional solo el de sus clientes con cita; registro de quién lo consulta.
- Datos de prueba: al menos 20 clientes ficticios (hombres y mujeres) y 8 empleados que cubran todos los roles, con tratamientos, sesiones agendadas, documentos y fotos de antes/después y de avance. Solo en el proyecto de desarrollo, nunca en producción.

## Imágenes de marca (entregadas por Julio, 2026-10-07)
- `public/ambiente/`: fotos propias del salón para usar donde haga falta (reservas web, categorías de servicios, pantallas vacías, entrada). Estilo: madera de nogal, travertino, terrazo, latón, plantas, luz cálida. Nombres por servicio: `barberia-corte`, `barberia-afeitado`, `barberia-tijera`, `coloracion`, `brushing`, `lavado`, `peinado-recogido`, `resultado-cabello`, `unas`, `pestanas`, `cejas`, `maquillaje`, `facial`, `spa-masaje`, `spa-lounge`, `recepcion`, `salon-interior`, `herramientas`.
- `docs/referencias/moodboard-estilo.webp`: solo referencia de estilo (tono oscuro elegante con dorado, tarjetas de servicio con foto). No publicar: contiene logos de otras marcas.

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

## Convenciones de base de datos
- Migraciones en `supabase/migrations/`; se aplican con `npm run db:push` (usa `SUPABASE_DB_URL` de `.env.local`).
- Cada tabla nueva: `revoke all ... from anon, authenticated`, luego `grant` solo lo necesario (por columna si aplica), `enable row level security` y políticas usando las funciones de `privado` (`tiene_acceso`, `tiene_rol`, `es_admin`, `es_dueno`).
- Permisos por módulo (sesión 4): en las políticas de tablas de negocio usar `privado.puede(sucursal_id, '<modulo>', escribir)`; ya aplica los límites fijos. En la app, `requireModulo(modulo, editar)` en cada página/acción. Roles: `admin`, `recepcion`, `estilista` (se muestra "Profesional"), `asistente`.
- Marca: `negocio` (una fila) + `public.marca_publica()` para datos públicos; `getMarca()` aplica colores y tipografías como variables CSS en `<html>`. Logo en Storage `marca` (público, solo admins escriben; el servidor lo convierte a WebP). Horario por día en `horarios_sucursal`.
- Empleados (sesión 9): `empleados` (usuario_id opcional, solo lo enlaza el servidor), `horarios_empleado`, `bloqueos_empleado`, `empleado_servicios` (comisión por servicio opcional). Fotos en Storage `equipo` (público). Datos de prueba: `npm run seed:empleados`.
- Tablas con citas, ventas o caja: trigger `privado.registrar_auditoria()`.
- Toda tabla nueva con pruebas de permisos en `tests/rls/` (`npm run test:rls`). Las pruebas corren en transacciones que se deshacen.
- El dueño (`perfiles.es_dueno`) es admin en todas las sucursales; solo se activa por SQL.
- Invitaciones sin correo: el admin genera un enlace (`generateLink` con la clave secreta) y lo envía por WhatsApp; vence en 1 hora. `/auth/confirmar` usa el enlace solo al pulsar "Continuar" (las vistas previas de WhatsApp no lo gastan).
- Usuarios de prueba: `npm run seed:usuarios` (correos `@prueba.blendstudio.test`, contraseñas en `supabase/seed-demo/credenciales-prueba.local.txt`, ignorado por Git).
- Sin Docker: el proyecto Supabase actual es de **desarrollo**. Para producción se creará un proyecto aparte.

## Fases
- **Fase 1:** base del proyecto (auth, roles, sucursales, ajustes del negocio y de marca), servicios y categorías (duración, precio), empleados (horarios, servicios que realizan, % de comisión), clientes (ficha, historial, notas, cumpleaños), agenda (día/semana, por estilista, estados de cita), reservas web públicas 24/7 con confirmación en pantalla, comisiones por servicio realizado, PWA instalable.
- **Fase 2:** punto de venta, caja (apertura, cierre, cuadre), productos e inventario con alertas de stock, métodos de pago (efectivo, Yappy, Tilopay, datáfono registrado a mano), factura electrónica vía PAC, ITBMS.
- **Fase 3:** recordatorios por WhatsApp, fidelidad, cumpleaños, reportes, dashboard y exportaciones.

## Forma de trabajar
- Al iniciar cada fase: plan corto (pantallas, tablas, orden de trabajo), lo que Julio debe crear o pagar, y estimación de sesiones. Esperar su aprobación.
- Cambios pequeños con commits claros. Probar antes de dar algo por terminado, incluidas pruebas de permisos RLS.
- Al terminar cada parte: decir en lenguaje simple qué se hizo y qué debe probar Julio.
- Diseño limpio, profesional y mobile-first. Marca del salón configurable en ajustes (logo, colores, tipografía), con valores provisionales hasta que Julio entregue la marca final.

## Anexo v2: funciones completas y diseño (integrado el 2026-10-07)

Lista de control de la app. Marca cada punto con [x] cuando esté terminado y probado. Si algo de este anexo choca con una sección anterior, manda el anexo para el alcance y las secciones anteriores para la seguridad.
Objetivo: paridad total con SalonSistem plan PRO (incluye Baby, Plus y Premium), según su web y su video demostrativo, más lo propio de este proyecto (seguridad, multi-sucursal, Yappy, Tilopay, factura electrónica PAC, ITBMS).
Se replica la estructura y las funciones, no la apariencia: colores, fotos, ilustraciones, textos y logo son propios del salón de Julio.

### 1. Diseño de la interfaz (aplicar ya)

#### Estructura general
- Menú lateral fijo a la izquierda. Arriba: logo del salón en círculo, nombre del salón y rol del usuario (Propietario, Recepción, etc.) con indicador de conectado.
- Debajo, los módulos con icono y nombre; los que tienen submódulos se despliegan con una flecha.
- Abajo del menú: "Cerrar sesión".
- Barra superior: ruta de navegación (por ejemplo Clientes > Ficha del cliente) y buscador global de clientes y sesiones.
- El contenido de cada módulo ocupa el área a la derecha del menú.
- En celular: el menú lateral se vuelve menú desplegable (hamburguesa) con el logo arriba.
- Patrón repetido en cada pantalla: título con icono y subtítulo; fila de tarjetas con indicadores (KPIs); buscador con filtros y pestañas de estado; tabla o tarjetas; panel lateral de detalle; botón principal arriba a la derecha (Nuevo cliente, Nueva venta, etc.).
- Los módulos de fases futuras aparecen como "Próximamente" para que se vea la estructura completa desde ya.
- Colores del dashboard personalizables desde Configuración.

#### Menú exacto
- Inicio
- Agenda
- Clientes: Lista de clientes · Planes de tratamiento · Catálogo de paquetes · Tarjeta de fidelidad · Tarjeta de regalo y cupones · Alerta de cumpleaños
- Servicios: Categorías · Catálogo
- Personal: Empleados · Usuarios · Servicios del personal
- Caja: Apertura de caja · Caja activa · Movimientos
- Ventas: Punto de venta · Lista de ventas · Cotizaciones · Devoluciones
- Finanzas: Flujo de efectivo · Gastos · Cuentas por cobrar · Cuentas por pagar
- Inventario: Productos · Categorías
- Reportes
- Recordatorios (con contador de pendientes)
- Configuración: Datos del negocio · Preferencias
- Cerrar sesión

#### Pantallas de acceso
- [x] Inicio de sesión con logo del salón, correo y contraseña (más verificación en dos pasos para admin) — sesión 3
- [ ] Inicio (dashboard): saludo personalizado ("¡Buen día, [nombre]!"), botones Abrir agenda y Ver reportes, total de clientes, clientes nuevos del mes y vista rápida de las reservas del día

### 2. Funciones por módulo y fase
Marca cada punto cuando esté terminado y probado.

#### Configuración (Fase 1)
- [x] (sesiones 6-7; el bloqueo de citas fuera de horario se aplica al construir Agenda y Reservas) Datos del negocio: logo, nombre legal, nombre comercial, RUC, horario de atención (texto), hora de apertura y cierre; no se pueden agendar citas fuera de ese rango, ni desde el panel ni desde la web de reservas
- [x] Contacto: teléfono, WhatsApp, correo y correo de respaldo para recordatorios; redes sociales
- [x] Vista previa del comprobante en tiempo real mientras se edita (logo, datos, horario y redes)
- [x] Guardado automático y botón Restablecer
- [x] Preferencias: moneda, impuesto (ITBMS 7%), colores del dashboard, tipografía
- [x] (selector en Ventas/Caja/Inventario: Fase 2) Sucursales: crear y elegir sucursal activa (selector visible en Ventas, Caja e Inventario)

#### Agenda (Fase 1)
- [ ] Vistas Día, Semana y Mes, más "Resumen del día"
- [ ] Columnas por profesional con foto; citas en bloques de color según el empleado o el estado
- [ ] Indicadores: citas de hoy, de la semana, confirmadas y pendientes
- [ ] Mini calendario de reservas con días marcados (selección, hoy, reservado)
- [ ] Pestañas Agenda y Reservas web (solicitudes de la web por confirmar)
- [ ] Botón "Agendar cita"; estados de cita (pendiente, confirmada, completada, cancelada, no asistió)
- [ ] Compartir agenda con el equipo: cada profesional ve la suya; admin y recepción ven todas
- [ ] Panel "Recordatorios automáticos": activo o no, canales (WhatsApp y correo), aviso principal (por ejemplo 1 día antes) y seguimiento (por ejemplo 2 horas antes), configurables

#### Reservas web públicas (Fase 1)
- [ ] Página "Reserva tu cita" con la marca del salón
- [ ] Paso 1: servicio, filtrado por categoría
- [ ] Paso 2: profesional opcional ("Sin preferencia" asigna el primero disponible); solo aparecen empleados con "Recibe reservas desde la web"
- [ ] Paso 3: fecha y hora disponibles según horario del negocio, del empleado y duración del servicio
- [ ] Paso 4: datos del cliente y consentimiento de datos; confirmación en pantalla
- [ ] Protección anti-spam (CAPTCHA y límite de solicitudes)

#### Clientes (Fase 1, salvo lo indicado)
- [ ] Lista de clientes con indicadores: total, activos, nuevos del mes, planes activos
- [ ] Buscador por nombre, ID o teléfono; pestañas Todos, Activo, Nuevo, Inactivo; vista tabla o tarjetas
- [ ] Columnas: cliente (foto, ID, edad, género), contacto, última visita, planes, sesiones, total gastado, estado, acciones
- [ ] Botones Importar (Excel/CSV), Exportar y Nuevo cliente
- [ ] Ficha del cliente con pestañas:
  - [ ] Datos personales: foto, nombre, apellidos, fecha de nacimiento, edad, género, documento de identidad, contacto; preferencias "Recordatorios por WhatsApp" y "Permitir uso de fotos"
  - [ ] Historial médico: alergias, condiciones médicas, medicación actual (medicamento, dosis, desde), signos vitales (tipo de sangre, peso, altura, presión) y última actualización con quién la hizo
  - [ ] Planes de tratamiento (ver módulo Tratamientos)
  - [ ] Documentos: subir archivos por categoría (consentimientos, estudios, fotografías antes/después, recetas, identificación)
  - [ ] Facturas y recibos (Fase 2)
  - [ ] Lista de ventas del cliente: registros, total en servicios, total en productos, neto; cada venta con servicios, productos, profesional, cajero, forma de pago, estado y total (Fase 2)

#### Tratamientos y paquetes (Fase 1)
- [ ] Catálogo de paquetes: paquetes de varias sesiones con precio por sesión y precio total
- [ ] Plan de tratamiento por cliente: procedimiento, cantidad de sesiones, fecha de inicio, profesional, estado, frecuencia (por ejemplo cada semana), precio por sesión, total del plan
- [ ] Barra de progreso: sesiones completadas de total
- [ ] Tabla de sesiones: número, procedimiento, fecha, hora, estado (completada o pendiente) y pago (pagada o no pagada)
- [ ] Las sesiones se crean como citas en la agenda ("Eventos en agenda")
- [ ] Tarjeta "Recordatorio próximo" con la siguiente sesión y botón "Enviar recordatorio" (envío real por WhatsApp en Fase 3)
- [ ] Botones Editar y Eliminar tratamiento; botón "Nuevo plan de tratamiento"

#### Servicios (Fase 1)
- [x] (sesión 8) Categorías con descripción, número de servicios y estado; indicadores: total de categorías, servicios en catálogo, categorías activas, categorías sin servicios
- [x] (sesión 8; "quién lo realiza" se completa en Empleados) Catálogo ilimitado agrupado por categoría: nombre, duración, precio de lista, precio con descuento, porcentaje de ahorro, quién lo realiza
- [x] (cargadas con datos de prueba: npm run seed:servicios) Categorías iniciales sugeridas: Barbería, Cabello, Uñas, Pestañas, Manicure, Pedicure, Facial, Corporal, Depilación, Spa (editables)

#### Personal (Fase 1, salvo lo indicado)
- [x] (sesión 9) Empleados en tarjetas: foto, nombre, especialidad, rol, estado, contacto, horario y porcentaje de comisión
- [x] Indicadores: total, activos, profesionales, en vacaciones; filtros Profesional, Recepción, Asistente
- [x] (más horario semanal, vacaciones/días libres y servicios que realiza con comisión por servicio) Formulario de empleado: foto, nombre, correo, teléfono, rol (Administrador, Profesional, Recepción, Asistente), especialidad, horario, comisión %, estado (Activo, Vacaciones, Inactivo), "Recibe reservas desde la web", color de etiqueta en la agenda, acceso al sistema sí/no
- [ ] (pestaña creada; se llena con Agenda/Ventas) Botón Rendimiento por empleado
- [x] (sesiones 4 y 5) Usuarios: lista con rol y usuario; permisos por módulo (Agenda, Personal, Clientes, Servicios, Productos, Reportes, Configuración, Caja, Ventas, Finanzas) con niveles Acceso total, Solo lectura y Sin acceso; matriz global de permisos por rol
- [ ] Servicios del personal (Fase 2): registros enviados por los empleados desde su app; estados Pendiente, Validado, Rechazado; filtros Hoy, Semana, Quincena, Mes y Personalizado; columnas fecha, profesional, cliente, servicios, productos, pago, total, comisión, ajuste (+), descuento (−) y validar; al validar se actualizan inventario, caja y comisiones; resumen por profesional con comisión liquidada
- [ ] App del trabajador (Fase 2, vista móvil instalable): resumen del día (ventas, citas, pendientes, comisión) y asistente "Registrar nueva venta" paso a paso: cliente, servicios, productos, pago, resumen con su comisión; queda pendiente de validación
- [ ] Top empleado del mes (Fase 3)

#### Punto de venta y ventas (Fase 2)
- [ ] Indicadores del día: ventas, ticket promedio, productos vendidos, descuentos, impuestos
- [ ] Pestañas Nueva venta (POS), Lista de ventas y Cotizaciones
- [ ] Catálogo con pestañas Servicios, Productos y Tarjetas de regalo; filtros por categoría y marca; stock visible
- [ ] Carrito: cantidades, profesional por servicio, vendedor por producto, nota de la venta, subtotal, descuento (%), comisión del personal calculada, ITBMS y total
- [ ] Cliente (buscador), cajero que emite el recibo, método de pago: efectivo, tarjeta (datáfono), Yappy, transferencia, Tilopay (link), mixto
- [ ] Pantalla "Venta procesada" con comprobante y número; factura electrónica vía PAC
- [ ] Cotizaciones: se guardan sin descontar stock y se pueden convertir en venta
- [ ] Devoluciones: indicadores (totales, monto aprobado, pendiente de validar); historial con código, fecha, venta, cliente, vendedor, procesado por, motivo, monto, método y estado; nota de crédito electrónica
- [ ] Impresión de facturas con logo y redes sociales

#### Caja (Fase 2)
- [ ] Apertura de caja: responsable, fecha, caja, fondo inicial, observaciones; aviso si ya hay una caja abierta
- [ ] Caja activa: caja, responsable, hora de apertura, tiempo abierta, fondo inicial, saldo actual; alerta si lleva demasiadas horas abierta
- [ ] Indicadores por método: efectivo, tarjetas, transferencias/Yappy, otros, total vendido, saldo de caja; ventas de servicios, ventas de productos, ticket promedio, utilidad parcial
- [ ] Acciones rápidas: Ingreso, Egreso, Movimientos, Punto de venta, Caja chica, Gastos, Flujo de efectivo
- [ ] Resumen ejecutivo (ingresos, egresos, clientes atendidos, servicios, productos, devoluciones, utilidad parcial) y gráfico de métodos de pago
- [ ] Últimos movimientos: hora, tipo, origen, descripción, cliente o proveedor, método, ingreso, egreso, saldo
- [ ] Cierre y cuadre de caja contra efectivo, Yappy, Tilopay y cierre de lote del datáfono

#### Inventario (Fase 2)
- [ ] Productos con indicadores: total, valor del inventario, activos, con stock bajo; por sucursal
- [ ] Filtros por categoría, marca y estado (normal o bajo); buscador por nombre, código o SKU; exportar
- [ ] Columnas: producto, categoría, marca, stock actual, precio costo, utilidad %, precio venta, estado
- [ ] Panel de detalle con pestañas Información, Stock, Movimientos y Proveedores
- [ ] Alerta de stock bajo; productos de venta y de uso interno
- [ ] Categorías de productos

#### Finanzas (Fase 2)
- [ ] Flujo de efectivo (ingresos y egresos totales)
- [ ] Gastos por categoría
- [ ] Cuentas por cobrar y cuentas por pagar
- [ ] Módulo contable personalizable (categorías de ingresos y gastos)

#### Fidelización (Fase 3, conectada al POS)
- [ ] Tarjeta de fidelidad: configuración del programa (sellos para completar, premio, mensaje de WhatsApp con plantilla); cada servicio suma un sello automáticamente
- [ ] Indicadores: clientes con tarjeta, premio listo, en progreso, sellos activos, premios canjeados, ingreso fidelizado, tasa de cumplimiento
- [ ] Tarjeta por cliente: sellos visuales, nivel (Bronce, Plata, Oro), servicios, facturado, canjes, último servicio; botones +/− sello, Enviar premio y Promocionar; filtros y orden por progreso
- [ ] Tarjetas de regalo: estado del portafolio (emitidas, activas, parcialmente usadas, reservadas, vencidas, saldo disponible); vender con plantilla personalizable (Minimalista, Premium, Spa, Barbería, Salón, Navidad, San Valentín, Día de la Madre, Cumpleaños), color y mensaje; enviar por WhatsApp o correo; canjear por código o escaneo; tabla con código, cliente, valor inicial, saldo, estado, emisión, vencimiento y empleado
- [ ] Cupones: código, descripción, tipo (porcentaje o monto fijo), valor, audiencia, máximo de usos, color de etiqueta
- [ ] Alerta de cumpleaños: cumpleaños próximos (Hoy, Esta semana, Este mes, Personalizado), exportar, mensaje sugerido editable con cupón, envío por WhatsApp con un clic, configuración de canales (la lista se hace en Fase 1; el envío en Fase 3)
- [ ] Clientes más frecuentes

#### Recordatorios y WhatsApp (Fase 3)
- [ ] Módulo Recordatorios con contador de pendientes
- [ ] Recordatorios automáticos de citas por WhatsApp y correo, con aviso principal y seguimiento configurables
- [ ] El cliente confirma o cancela respondiendo al mensaje y la cita cambia de estado sola
- [ ] Recordatorio de la próxima sesión de tratamiento (manual con botón y automático)
- [ ] Mensajes personalizados: cumpleaños, premio de fidelidad, tarjeta de regalo, promociones
- [ ] Respuestas automáticas a preguntas frecuentes: horario, ubicación, enlace de reservas, aviso fuera de horario (extra nuestro; no aparece en el video)

#### Reportes (Fase 3)
- [ ] Pestañas Resumen, Ventas, Clientes, Inventario, Servicios, Empleados, Financiero
- [ ] Filtros: periodo (hoy, semana, este mes, rango), empleado, cliente, método de pago, estado; botón Exportar
- [ ] Indicadores con comparación contra el periodo anterior: ventas totales, número de ventas, ticket promedio, clientes nuevos, productos vendidos, servicios realizados
- [ ] Gráficos: ventas en el periodo, métodos de pago, productos más vendidos, servicios más vendidos, top clientes, ventas por vendedor
- [ ] Empleados: ranking de ventas, top empleado, comisiones del periodo, ventas vs servicios por empleado, detalle por empleado
- [ ] Indicadores financieros: efectivo en caja, gastos del periodo, utilidad estimada
- [ ] Reportes diarios, semanales, mensuales y financieros

### 3. Notas de seguridad adicionales
- El historial médico y los documentos del cliente son datos sensibles (Ley 81 de 2019): consentimiento expreso del cliente, acceso solo a roles autorizados, archivos en almacenamiento privado con enlaces temporales, y registro de quién los ve o modifica.
- "Permitir uso de fotos" debe respetarse en toda la app (no mostrar fotos del cliente en marketing si está desactivado).
- La app del trabajador solo crea registros pendientes; nada afecta caja, inventario ni comisiones hasta que un admin lo valida.
- Recordatorios por correo: usar un servicio de correo transaccional; costo a confirmar antes de activarlo.
