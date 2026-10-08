-- =====================================================================
-- Fase 1 · Sesión 19: comisiones por servicio realizado y cumpleaños
-- =====================================================================

-- ---------------------------------------------------------------------
-- Comisión: se "congela" el porcentaje al completar la cita, para que los
-- cambios futuros de comisión no alteren lo ya ganado.
-- ---------------------------------------------------------------------
alter table public.citas add column comision_pct numeric(5, 2) check (comision_pct between 0 and 100);

create or replace function privado.comision_cita()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.estado = 'completada' and (tg_op = 'INSERT' or old.estado <> 'completada' or new.empleado_id <> old.empleado_id
                                     or new.servicio_id is distinct from old.servicio_id) then
    new.comision_pct := coalesce(
      (select es.comision_pct from public.empleado_servicios es
        where es.empleado_id = new.empleado_id and es.servicio_id = new.servicio_id),
      (select e.comision_pct from public.empleados e where e.id = new.empleado_id),
      0
    );
  elsif new.estado <> 'completada' then
    new.comision_pct := null;
  elsif tg_op = 'UPDATE' then
    new.comision_pct := old.comision_pct; -- nadie la cambia a mano
  end if;
  return new;
end;
$$;
revoke all on function privado.comision_cita() from public, anon, authenticated;
create trigger citas_comision before insert or update on public.citas
  for each row execute function privado.comision_cita();

-- Citas ya completadas (datos de prueba)
update public.citas c set comision_pct = coalesce(
  (select es.comision_pct from public.empleado_servicios es where es.empleado_id = c.empleado_id and es.servicio_id = c.servicio_id),
  (select e.comision_pct from public.empleados e where e.id = c.empleado_id), 0)
where c.estado = 'completada';

-- El porcentaje de comisión no se lee directo de la tabla: solo el admin de la
-- sucursal o el propio profesional, con la función de abajo.
revoke select on public.citas from authenticated;
grant select (id, sucursal_id, cliente_id, empleado_id, servicio_id, sesion_id, inicio, fin, estado, origen,
              precio, notas, motivo_cancelacion, creado_por, created_at, updated_at)
  on public.citas to authenticated;

create or replace function public.comisiones(p_sucursal uuid, p_desde date, p_hasta date, p_empleado uuid default null)
returns table (cita_id uuid, empleado_id uuid, inicio timestamptz, cliente text, servicio text,
               precio numeric, comision_pct numeric, comision numeric)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not (privado.es_admin(p_sucursal) or (p_empleado is not null and privado.es_mi_empleado(p_empleado))) then
    raise exception 'Sin permiso para ver comisiones' using errcode = '42501';
  end if;
  return query
    select c.id, c.empleado_id, c.inicio,
           trim(cl.nombre || ' ' || cl.apellido),
           coalesce(s.nombre, (select p.procedimiento from public.sesiones_tratamiento st
                               join public.planes_tratamiento p on p.id = st.plan_id where st.id = c.sesion_id), 'Servicio'),
           coalesce(c.precio, 0), c.comision_pct,
           round(coalesce(c.precio, 0) * coalesce(c.comision_pct, 0) / 100, 2)
    from public.citas c
    join public.clientes cl on cl.id = c.cliente_id
    left join public.servicios s on s.id = c.servicio_id
    where c.sucursal_id = p_sucursal
      and c.estado = 'completada'
      and (p_empleado is null or c.empleado_id = p_empleado)
      and c.inicio >= (p_desde::timestamp at time zone 'America/Panama')
      and c.inicio < ((p_hasta + 1)::timestamp at time zone 'America/Panama')
    order by c.inicio;
end;
$$;
revoke all on function public.comisiones(uuid, date, date, uuid) from public, anon;
grant execute on function public.comisiones(uuid, date, date, uuid) to authenticated;

-- ---------------------------------------------------------------------
-- Cumpleaños entre dos fechas (cruza fin de año). Respeta RLS de clientes.
-- ---------------------------------------------------------------------
create or replace function public.cumpleanos(p_desde date, p_hasta date)
returns table (id uuid, codigo integer, nombre text, apellido text, telefono text, email text,
               fecha_nacimiento date, foto_path text, recordatorios_whatsapp boolean,
               cumple date, edad integer)
language sql
stable
security invoker
set search_path = ''
as $$
  with dias as (
    select d::date as dia from generate_series(p_desde, least(p_hasta, p_desde + 366), interval '1 day') d
  )
  select c.id, c.codigo, c.nombre, c.apellido, c.telefono, c.email, c.fecha_nacimiento, c.foto_path,
         c.recordatorios_whatsapp, d.dia,
         (extract(year from d.dia) - extract(year from c.fecha_nacimiento))::integer
  from public.clientes c
  join dias d
    on extract(month from d.dia) = extract(month from c.fecha_nacimiento)
   and (extract(day from d.dia) = extract(day from c.fecha_nacimiento)
        -- Los nacidos un 29 de febrero celebran el 28 en años no bisiestos.
        or (extract(month from c.fecha_nacimiento) = 2 and extract(day from c.fecha_nacimiento) = 29
            and extract(day from d.dia) = 28
            and extract(day from (date_trunc('year', d.dia) + interval '1 month 28 days')) <> 29))
  where c.activo and c.fecha_nacimiento is not null
  order by d.dia, c.nombre;
$$;
revoke all on function public.cumpleanos(date, date) from public, anon;
grant execute on function public.cumpleanos(date, date) to authenticated;
