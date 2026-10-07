-- =====================================================================
-- Fase 1 · Sesiones 17-18: reservas web públicas (24/7)
-- El público NO toca tablas: todo pasa por funciones que solo puede llamar el
-- servidor (service_role), después de verificar el CAPTCHA y el límite de solicitudes.
-- Nunca se devuelven datos de otros clientes ni de otras citas.
-- =====================================================================

-- Consentimiento de datos (Ley 81): cuándo lo dio el cliente por primera vez.
alter table public.clientes add column consentimiento_datos_at timestamptz;

-- Reglas de la reserva web
-- Anticipación mínima: 2 horas. Máximo: 60 días. Intervalos de 15 minutos.

-- ---------------------------------------------------------------------
-- Catálogo público de una sucursal
-- ---------------------------------------------------------------------
create or replace function public.reserva_catalogo(p_slug text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'sucursal', jsonb_build_object('id', s.id, 'nombre', s.nombre, 'slug', s.slug, 'direccion', s.direccion, 'telefono', s.telefono),
    'horario', coalesce((
      select jsonb_agg(jsonb_build_object('dia', h.dia_semana, 'abierto', h.abierto,
                                          'apertura', to_char(h.apertura, 'HH24:MI'), 'cierre', to_char(h.cierre, 'HH24:MI'))
                       order by h.dia_semana)
      from public.horarios_sucursal h where h.sucursal_id = s.id
    ), '[]'::jsonb),
    'categorias', coalesce((
      select jsonb_agg(jsonb_build_object('id', c.id, 'nombre', c.nombre, 'descripcion', c.descripcion, 'imagen', c.imagen) order by c.orden, c.nombre)
      from public.categorias_servicio c
      where c.sucursal_id = s.id and c.activa
        and exists (select 1 from public.servicios sv where sv.categoria_id = c.id and sv.activo and sv.reserva_web)
    ), '[]'::jsonb),
    'servicios', coalesce((
      select jsonb_agg(jsonb_build_object('id', sv.id, 'categoria_id', sv.categoria_id, 'nombre', sv.nombre,
                                          'descripcion', sv.descripcion, 'duracion', sv.duracion_min,
                                          'precio', sv.precio, 'precio_descuento', sv.precio_descuento) order by sv.orden, sv.nombre)
      from public.servicios sv
      join public.categorias_servicio c on c.id = sv.categoria_id and c.activa
      where sv.sucursal_id = s.id and sv.activo and sv.reserva_web
    ), '[]'::jsonb),
    -- Solo nombre de pila, especialidad y foto (que ya es pública).
    'profesionales', coalesce((
      select jsonb_agg(jsonb_build_object('id', e.id, 'nombre', split_part(e.nombre, ' ', 1),
                                          'especialidad', e.especialidad, 'foto', e.foto_path, 'color', e.color,
                                          'servicios', (select coalesce(jsonb_agg(es.servicio_id), '[]'::jsonb)
                                                        from public.empleado_servicios es where es.empleado_id = e.id))
                       order by e.orden, e.nombre)
      from public.empleados e
      where e.sucursal_id = s.id and e.estado = 'activo' and e.reserva_web
    ), '[]'::jsonb)
  )
  from public.sucursales s
  where s.slug = p_slug and s.activa;
$$;

-- Sucursales activas (para elegir dónde reservar)
create or replace function public.reserva_sucursales()
returns table (nombre text, slug text, direccion text)
language sql
stable
security definer
set search_path = ''
as $$
  select s.nombre, s.slug, s.direccion from public.sucursales s where s.activa order by s.nombre;
$$;

-- ---------------------------------------------------------------------
-- Horarios libres de un día para un servicio (y opcionalmente un profesional)
-- ---------------------------------------------------------------------
create or replace function privado.horarios_libres(p_sucursal uuid, p_servicio uuid, p_empleado uuid, p_fecha date)
returns table (hora time, empleado_id uuid)
language sql
stable
security definer
set search_path = ''
as $$
  with srv as (
    select sv.duracion_min as dur
    from public.servicios sv
    join public.categorias_servicio c on c.id = sv.categoria_id and c.activa
    where sv.id = p_servicio and sv.sucursal_id = p_sucursal and sv.activo and sv.reserva_web
  ),
  suc as (
    select h.apertura, h.cierre
    from public.horarios_sucursal h
    where h.sucursal_id = p_sucursal and h.dia_semana = extract(dow from p_fecha) and h.abierto
  ),
  pros as (
    select e.id, e.orden, greatest(he.entrada, suc.apertura) as desde, least(he.salida, suc.cierre) as hasta
    from public.empleados e
    join public.empleado_servicios es on es.empleado_id = e.id and es.servicio_id = p_servicio
    join public.horarios_empleado he on he.empleado_id = e.id and he.dia_semana = extract(dow from p_fecha) and he.trabaja
    cross join suc
    where e.sucursal_id = p_sucursal and e.estado = 'activo' and e.reserva_web
      and (p_empleado is null or e.id = p_empleado)
      and not exists (select 1 from public.bloqueos_empleado b where b.empleado_id = e.id and p_fecha between b.desde and b.hasta)
  ),
  candidatos as (
    select p.id, p.orden, t as ini, t + make_interval(mins => srv.dur) as fin
    from pros p
    cross join srv
    cross join lateral generate_series(p_fecha + p.desde, p_fecha + p.hasta - make_interval(mins => srv.dur), interval '15 minutes') as t
  )
  select distinct on (c.ini) c.ini::time, c.id
  from candidatos c
  where p_fecha between (now() at time zone 'America/Panama')::date and (now() at time zone 'America/Panama')::date + 60
    and (c.ini at time zone 'America/Panama') >= now() + interval '2 hours'
    and not exists (
      select 1 from public.citas ci
      where ci.empleado_id = c.id
        and ci.estado in ('pendiente', 'confirmada', 'completada')
        and tstzrange(ci.inicio, ci.fin) && tstzrange(c.ini at time zone 'America/Panama', c.fin at time zone 'America/Panama')
    )
  order by c.ini, c.orden, c.id;
$$;
revoke all on function privado.horarios_libres(uuid, uuid, uuid, date) from public, anon, authenticated;

create or replace function public.reserva_horarios(p_slug text, p_servicio uuid, p_empleado uuid, p_fecha date)
returns table (hora text)
language sql
stable
security definer
set search_path = ''
as $$
  select to_char(l.hora, 'HH24:MI')
  from public.sucursales s
  cross join lateral privado.horarios_libres(s.id, p_servicio, p_empleado, p_fecha) l
  where s.slug = p_slug and s.activa
  order by l.hora;
$$;

-- ---------------------------------------------------------------------
-- Crear la reserva (entra como "pendiente"; recepción la confirma)
-- ---------------------------------------------------------------------
create or replace function public.crear_reserva_web(
  p_slug text, p_servicio uuid, p_empleado uuid, p_fecha date, p_hora time,
  p_nombre text, p_apellido text, p_telefono text, p_email text, p_notas text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_suc       public.sucursales;
  v_srv       public.servicios;
  v_emp       uuid;
  v_cliente   uuid;
  v_digitos   text := regexp_replace(coalesce(p_telefono, ''), '\D', '', 'g');
  v_inicio    timestamptz;
  v_cita      uuid;
  v_nombre    text := btrim(p_nombre);
  v_apellido  text := coalesce(btrim(p_apellido), '');
  v_email     text := nullif(lower(btrim(p_email)), '');
begin
  if char_length(v_nombre) not between 1 and 60 or char_length(v_apellido) > 60
     or length(v_digitos) not between 7 and 15 or char_length(p_telefono) > 30
     or char_length(coalesce(v_email, '')) > 254 or char_length(coalesce(p_notas, '')) > 300 then
    raise exception 'Datos no válidos.' using errcode = '22023';
  end if;

  select * into v_suc from public.sucursales s where s.slug = p_slug and s.activa;
  select * into v_srv from public.servicios sv where sv.id = p_servicio and sv.sucursal_id = v_suc.id and sv.activo and sv.reserva_web;
  if v_suc.id is null or v_srv.id is null then
    raise exception 'El servicio no está disponible.' using errcode = '22023';
  end if;

  -- El horario debe seguir libre (con el profesional elegido o el primero disponible).
  select l.empleado_id into v_emp
  from privado.horarios_libres(v_suc.id, p_servicio, p_empleado, p_fecha) l
  where l.hora = p_hora
  limit 1;
  if v_emp is null then
    raise exception 'Ese horario ya no está disponible. Elige otro.' using errcode = 'P0002';
  end if;

  -- Cliente: si ya existe con ese teléfono se usa su ficha (sin cambiar sus datos).
  select c.id into v_cliente
  from public.clientes c
  where right(c.telefono_digitos, 8) = right(v_digitos, 8) and length(c.telefono_digitos) >= 7
  order by c.activo desc, c.created_at
  limit 1;
  if v_cliente is null then
    insert into public.clientes (nombre, apellido, telefono, email, origen, sucursal_origen_id, consentimiento_datos_at)
    values (v_nombre, v_apellido, btrim(p_telefono), v_email, 'web', v_suc.id, now())
    returning id into v_cliente;
  else
    update public.clientes set consentimiento_datos_at = now()
    where id = v_cliente and consentimiento_datos_at is null;
  end if;

  v_inicio := (p_fecha + p_hora) at time zone 'America/Panama';
  insert into public.citas (sucursal_id, cliente_id, empleado_id, servicio_id, inicio, fin, estado, origen, precio, notas)
  values (
    v_suc.id, v_cliente, v_emp, v_srv.id, v_inicio, v_inicio + make_interval(mins => v_srv.duracion_min),
    'pendiente', 'web', coalesce(v_srv.precio_descuento, v_srv.precio),
    left(concat_ws(' · ',
      'Reserva web: ' || v_nombre || nullif(' ' || v_apellido, ' ') || coalesce(' · ' || v_email, ''),
      nullif(btrim(p_notas), '')), 500)
  )
  returning id into v_cita;

  return jsonb_build_object(
    'id', v_cita,
    'fecha', p_fecha,
    'hora', to_char(p_hora, 'HH24:MI'),
    'duracion', v_srv.duracion_min,
    'servicio', v_srv.nombre,
    'precio', coalesce(v_srv.precio_descuento, v_srv.precio),
    'profesional', (select split_part(e.nombre, ' ', 1) from public.empleados e where e.id = v_emp),
    'sucursal', v_suc.nombre,
    'direccion', v_suc.direccion
  );
exception
  when exclusion_violation then
    raise exception 'Ese horario ya no está disponible. Elige otro.' using errcode = 'P0002';
end;
$$;

-- ---------------------------------------------------------------------
-- Límite de solicitudes (anti-spam), además del CAPTCHA
-- ---------------------------------------------------------------------
create table privado.solicitudes_reserva (
  id         bigint generated always as identity primary key,
  tipo       text not null check (tipo in ('consulta', 'reserva')),
  ip_hash    text not null,
  clave_hash text,
  created_at timestamptz not null default now()
);
create index solicitudes_reserva_ip_idx on privado.solicitudes_reserva (tipo, ip_hash, created_at desc);
create index solicitudes_reserva_clave_idx on privado.solicitudes_reserva (tipo, clave_hash, created_at desc);
alter table privado.solicitudes_reserva enable row level security;
revoke all on privado.solicitudes_reserva from public, anon, authenticated;

-- Devuelve true si se permite (y la registra). Límites:
--   consultas de horarios: 120 por hora por IP
--   reservas: 5 por hora por IP y 3 por día por teléfono
create or replace function public.reserva_permitida(p_tipo text, p_ip_hash text, p_clave_hash text default null)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_tipo = 'consulta' and (
    select count(*) from privado.solicitudes_reserva
    where tipo = 'consulta' and ip_hash = p_ip_hash and created_at > now() - interval '1 hour'
  ) >= 120 then
    return false;
  end if;
  if p_tipo = 'reserva' and (
    (select count(*) from privado.solicitudes_reserva
      where tipo = 'reserva' and ip_hash = p_ip_hash and created_at > now() - interval '1 hour') >= 5
    or (p_clave_hash is not null and (select count(*) from privado.solicitudes_reserva
      where tipo = 'reserva' and clave_hash = p_clave_hash and created_at > now() - interval '1 day') >= 3)
  ) then
    return false;
  end if;
  insert into privado.solicitudes_reserva (tipo, ip_hash, clave_hash) values (p_tipo, p_ip_hash, p_clave_hash);
  delete from privado.solicitudes_reserva where created_at < now() - interval '2 days';
  return true;
end;
$$;

-- Solo el servidor (service_role) llama a estas funciones.
revoke all on function public.reserva_catalogo(text), public.reserva_sucursales(),
  public.reserva_horarios(text, uuid, uuid, date),
  public.crear_reserva_web(text, uuid, uuid, date, time, text, text, text, text, text),
  public.reserva_permitida(text, text, text)
  from public, anon, authenticated;
grant execute on function public.reserva_catalogo(text), public.reserva_sucursales(),
  public.reserva_horarios(text, uuid, uuid, date),
  public.crear_reserva_web(text, uuid, uuid, date, time, text, text, text, text, text),
  public.reserva_permitida(text, text, text)
  to service_role;

-- Datos del responsable para la política de privacidad (públicos).
create or replace function public.datos_privacidad()
returns table (nombre_comercial text, nombre_legal text, ruc text, dv text, email text, telefono text, whatsapp text, direccion text)
language sql
stable
security definer
set search_path = ''
as $$
  select n.nombre_comercial, n.nombre_legal, n.ruc, n.dv, n.email, n.telefono, n.whatsapp,
         (select s.direccion from public.sucursales s where s.activa order by s.created_at limit 1)
  from public.negocio n limit 1;
$$;
revoke all on function public.datos_privacidad() from public;
grant execute on function public.datos_privacidad() to anon, authenticated;
