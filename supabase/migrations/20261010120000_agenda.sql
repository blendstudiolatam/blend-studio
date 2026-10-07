-- =====================================================================
-- Fase 1 · Sesiones 14-16: Agenda (citas), recordatorios y enlace con tratamientos
-- Zona horaria del negocio: America/Panama (UTC-5, sin horario de verano).
-- =====================================================================

create extension if not exists btree_gist with schema extensions;

create type public.estado_cita as enum ('pendiente', 'confirmada', 'completada', 'cancelada', 'no_asistio');

create table public.citas (
  id              uuid primary key default gen_random_uuid(),
  sucursal_id     uuid not null references public.sucursales (id) on delete cascade,
  cliente_id      uuid not null references public.clientes (id) on delete restrict,
  empleado_id     uuid not null references public.empleados (id) on delete restrict,
  servicio_id     uuid references public.servicios (id) on delete set null,
  -- Si la cita es una sesión de un plan de tratamiento.
  sesion_id       uuid unique references public.sesiones_tratamiento (id) on delete set null,
  inicio          timestamptz not null,
  fin             timestamptz not null,
  estado          public.estado_cita not null default 'confirmada',
  origen          text not null default 'panel' check (origen in ('panel', 'web')),
  precio          numeric(10, 2) check (precio >= 0),
  notas           text check (char_length(notas) <= 500),
  motivo_cancelacion text check (char_length(motivo_cancelacion) <= 200),
  creado_por      uuid references public.perfiles (id) on delete set null default auth.uid(),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  check (fin > inicio and fin - inicio <= interval '12 hours'),
  -- Un profesional no puede tener dos citas a la vez (las canceladas y "no asistió" no ocupan).
  constraint citas_sin_cruce exclude using gist (
    empleado_id with =,
    tstzrange(inicio, fin) with &&
  ) where (estado in ('pendiente', 'confirmada', 'completada'))
);
create index citas_sucursal_inicio_idx on public.citas (sucursal_id, inicio);
create index citas_cliente_idx on public.citas (cliente_id, inicio desc);
create index citas_empleado_idx on public.citas (empleado_id, inicio);

-- ---------------------------------------------------------------------
-- Reglas de horario: no se agenda fuera del horario del salón, del horario
-- del profesional ni en sus días libres. Mensajes en español para la app.
-- ---------------------------------------------------------------------
create or replace function privado.validar_cita()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ini   timestamp := new.inicio at time zone 'America/Panama';
  v_fin   timestamp := new.fin at time zone 'America/Panama';
  v_dia   smallint := extract(dow from v_ini)::smallint;
  v_suc   public.horarios_sucursal;
  v_hor   public.horarios_empleado;
  v_emp   public.empleados;
begin
  -- Coherencia de sucursal
  select * into v_emp from public.empleados e where e.id = new.empleado_id;
  if v_emp.id is null or v_emp.sucursal_id <> new.sucursal_id then
    raise exception 'El profesional no pertenece a esta sucursal.';
  end if;
  if new.servicio_id is not null and not exists (
    select 1 from public.servicios s where s.id = new.servicio_id and s.sucursal_id = new.sucursal_id
  ) then
    raise exception 'El servicio no pertenece a esta sucursal.';
  end if;
  if new.sesion_id is not null and not exists (
    select 1 from public.sesiones_tratamiento st
    join public.planes_tratamiento p on p.id = st.plan_id
    where st.id = new.sesion_id and p.cliente_id = new.cliente_id and p.sucursal_id = new.sucursal_id
  ) then
    raise exception 'La sesión de tratamiento no es de este cliente.';
  end if;

  -- Las reglas de horario solo aplican a citas que ocupan agenda y cuando cambia el horario.
  if new.estado not in ('pendiente', 'confirmada') then
    return new;
  end if;
  if tg_op = 'UPDATE' and new.inicio = old.inicio and new.fin = old.fin and new.empleado_id = old.empleado_id
     and old.estado in ('pendiente', 'confirmada') then
    return new;
  end if;

  if v_ini::date <> (v_fin - interval '1 second')::date then
    raise exception 'La cita debe empezar y terminar el mismo día.';
  end if;

  select * into v_suc from public.horarios_sucursal h where h.sucursal_id = new.sucursal_id and h.dia_semana = v_dia;
  if v_suc.id is not null and (not v_suc.abierto or v_ini::time < v_suc.apertura or v_fin::time > v_suc.cierre
                               or v_fin::time = '00:00') then
    raise exception 'Fuera del horario del salón (%).',
      case when v_suc.abierto then to_char(v_suc.apertura, 'HH24:MI') || ' a ' || to_char(v_suc.cierre, 'HH24:MI') else 'cerrado ese día' end;
  end if;

  if v_emp.estado = 'inactivo' then
    raise exception '% está inactivo y no recibe citas.', v_emp.nombre;
  end if;

  select * into v_hor from public.horarios_empleado h where h.empleado_id = new.empleado_id and h.dia_semana = v_dia;
  if v_hor.id is not null and (not v_hor.trabaja or v_ini::time < v_hor.entrada or v_fin::time > v_hor.salida) then
    raise exception 'Fuera del horario de % (%).', v_emp.nombre,
      case when v_hor.trabaja then to_char(v_hor.entrada, 'HH24:MI') || ' a ' || to_char(v_hor.salida, 'HH24:MI') else 'no trabaja ese día' end;
  end if;

  if exists (
    select 1 from public.bloqueos_empleado b
    where b.empleado_id = new.empleado_id and v_ini::date between b.desde and b.hasta
  ) then
    raise exception '% no está disponible ese día (%).', v_emp.nombre,
      (select lower(b.motivo) from public.bloqueos_empleado b
        where b.empleado_id = new.empleado_id and v_ini::date between b.desde and b.hasta limit 1);
  end if;

  return new;
end;
$$;
revoke all on function privado.validar_cita() from public, anon, authenticated;
create trigger citas_validar before insert or update on public.citas
  for each row execute function privado.validar_cita();

-- La sesión del tratamiento sigue a su cita: fecha, hora y estado.
create or replace function privado.sincronizar_sesion_cita()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and old.sesion_id is not null and old.sesion_id is distinct from new.sesion_id then
    update public.sesiones_tratamiento set hora = null where id = old.sesion_id and estado = 'pendiente';
  end if;
  if new.sesion_id is null then
    return new;
  end if;
  update public.sesiones_tratamiento st set
    fecha  = (new.inicio at time zone 'America/Panama')::date,
    hora   = case when new.estado = 'cancelada' then null else (new.inicio at time zone 'America/Panama')::time end,
    estado = case
               when new.estado = 'completada' then 'completada'::public.estado_sesion
               when st.estado = 'completada' and new.estado <> 'completada' then 'pendiente'::public.estado_sesion
               else st.estado
             end
  where st.id = new.sesion_id;
  return new;
end;
$$;
revoke all on function privado.sincronizar_sesion_cita() from public, anon, authenticated;
create trigger citas_sesion after insert or update on public.citas
  for each row execute function privado.sincronizar_sesion_cita();

create trigger citas_updated_at before update on public.citas
  for each row execute function privado.set_updated_at();
create trigger citas_auditoria after insert or update or delete on public.citas
  for each row execute function privado.registrar_auditoria();

-- ---------------------------------------------------------------------
-- Quién ve qué: el profesional solo su agenda; los demás roles, toda la sucursal.
-- ---------------------------------------------------------------------
create or replace function privado.ve_agenda_de(p_sucursal uuid, p_empleado uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select privado.puede(p_sucursal, 'agenda')
     and (privado.rol_en(p_sucursal) <> 'estilista' or privado.es_mi_empleado(p_empleado));
$$;

create or replace function privado.edita_agenda_de(p_sucursal uuid, p_empleado uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select privado.puede(p_sucursal, 'agenda', true)
     and (privado.rol_en(p_sucursal) <> 'estilista' or privado.es_mi_empleado(p_empleado));
$$;
revoke all on function privado.ve_agenda_de(uuid, uuid), privado.edita_agenda_de(uuid, uuid) from public, anon;
grant execute on function privado.ve_agenda_de(uuid, uuid), privado.edita_agenda_de(uuid, uuid) to authenticated;

revoke all on public.citas from anon, authenticated;
grant select on public.citas to authenticated;
grant insert (sucursal_id, cliente_id, empleado_id, servicio_id, sesion_id, inicio, fin, estado, precio, notas)
  on public.citas to authenticated;
grant update (cliente_id, empleado_id, servicio_id, sesion_id, inicio, fin, estado, precio, notas, motivo_cancelacion)
  on public.citas to authenticated;
-- Las citas no se borran: se cancelan (queda historial y auditoría).

alter table public.citas enable row level security;

create policy "citas: ve su agenda" on public.citas
  for select to authenticated using (privado.ve_agenda_de(sucursal_id, empleado_id));
create policy "citas: crea quien edita la agenda" on public.citas
  for insert to authenticated with check (privado.edita_agenda_de(sucursal_id, empleado_id) and origen = 'panel');
create policy "citas: edita quien edita la agenda" on public.citas
  for update to authenticated
  using (privado.edita_agenda_de(sucursal_id, empleado_id))
  with check (privado.edita_agenda_de(sucursal_id, empleado_id));

-- ---------------------------------------------------------------------
-- Historial médico: ahora también lo ve el profesional con cita con el cliente
-- (cualquier cita no cancelada en esa sucursal, pasada o futura).
-- ---------------------------------------------------------------------
create or replace function privado.puede_ver_salud(p_cliente uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select privado.es_admin_alguno()
    or exists (
      select 1 from public.accesos a
      where a.usuario_id = (select auth.uid()) and a.activo and a.rol = 'recepcion'
        and privado.puede(a.sucursal_id, 'clientes')
    )
    or exists (
      select 1 from public.citas c
      join public.empleados e on e.id = c.empleado_id
      join public.accesos a on a.usuario_id = e.usuario_id and a.sucursal_id = c.sucursal_id and a.activo
      where c.cliente_id = p_cliente
        and e.usuario_id = (select auth.uid())
        and c.estado <> 'cancelada'
    );
$$;

-- ---------------------------------------------------------------------
-- Recordatorios automáticos (configuración; el envío llega en la Fase 3)
-- ---------------------------------------------------------------------
create table public.config_recordatorios (
  sucursal_id       uuid primary key references public.sucursales (id) on delete cascade,
  activo            boolean not null default false,
  por_whatsapp      boolean not null default true,
  por_correo        boolean not null default false,
  aviso_horas       smallint not null default 24 check (aviso_horas between 1 and 168),
  seguimiento_activo boolean not null default true,
  seguimiento_horas smallint not null default 2 check (seguimiento_horas between 1 and 48),
  updated_at        timestamptz not null default now(),
  check (seguimiento_horas < aviso_horas)
);
create trigger config_recordatorios_updated_at before update on public.config_recordatorios
  for each row execute function privado.set_updated_at();

revoke all on public.config_recordatorios from anon, authenticated;
grant select on public.config_recordatorios to authenticated;
grant insert (sucursal_id, activo, por_whatsapp, por_correo, aviso_horas, seguimiento_activo, seguimiento_horas)
  on public.config_recordatorios to authenticated;
grant update (activo, por_whatsapp, por_correo, aviso_horas, seguimiento_activo, seguimiento_horas)
  on public.config_recordatorios to authenticated;
alter table public.config_recordatorios enable row level security;

create policy "recordatorios: ve Agenda" on public.config_recordatorios
  for select to authenticated using (privado.puede(sucursal_id, 'agenda'));
create policy "recordatorios: crea un admin" on public.config_recordatorios
  for insert to authenticated with check (privado.es_admin(sucursal_id));
create policy "recordatorios: edita un admin" on public.config_recordatorios
  for update to authenticated using (privado.es_admin(sucursal_id)) with check (privado.es_admin(sucursal_id));
