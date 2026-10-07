-- =====================================================================
-- Fase 1 · Sesión 9: empleados, horarios, días libres y servicios que realizan
-- =====================================================================

create type public.estado_empleado as enum ('activo', 'vacaciones', 'inactivo');

create table public.empleados (
  id           uuid primary key default gen_random_uuid(),
  sucursal_id  uuid not null references public.sucursales (id) on delete cascade,
  -- Usuario del sistema (null = sin acceso al sistema).
  usuario_id   uuid references public.perfiles (id) on delete set null,
  nombre       text not null check (char_length(nombre) between 1 and 60),
  apellido     text not null default '' check (char_length(apellido) <= 60),
  email        text check (char_length(email) <= 254),
  telefono     text check (char_length(telefono) <= 30),
  rol          public.rol_usuario not null default 'estilista',
  especialidad text check (char_length(especialidad) <= 80),
  comision_pct numeric(5, 2) not null default 0 check (comision_pct between 0 and 100),
  estado       public.estado_empleado not null default 'activo',
  reserva_web  boolean not null default true,
  color        text not null default '#c9a15b' check (color ~ '^#[0-9a-fA-F]{6}$'),
  foto_path    text check (foto_path ~ '^[a-z0-9/-]{1,120}\.webp$'),
  orden        integer not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (sucursal_id, usuario_id)
);
create index empleados_sucursal_idx on public.empleados (sucursal_id, orden);

create table public.horarios_empleado (
  id          uuid primary key default gen_random_uuid(),
  empleado_id uuid not null references public.empleados (id) on delete cascade,
  sucursal_id uuid not null references public.sucursales (id) on delete cascade,
  dia_semana  smallint not null check (dia_semana between 0 and 6),
  trabaja     boolean not null default true,
  entrada     time not null default '09:00',
  salida      time not null default '19:00',
  unique (empleado_id, dia_semana),
  check (not trabaja or salida > entrada)
);

create table public.bloqueos_empleado (
  id          uuid primary key default gen_random_uuid(),
  empleado_id uuid not null references public.empleados (id) on delete cascade,
  sucursal_id uuid not null references public.sucursales (id) on delete cascade,
  desde       date not null,
  hasta       date not null,
  motivo      text not null default 'Vacaciones' check (char_length(motivo) between 1 and 80),
  created_at  timestamptz not null default now(),
  check (hasta >= desde)
);
create index bloqueos_empleado_idx on public.bloqueos_empleado (empleado_id, desde);

create table public.empleado_servicios (
  empleado_id  uuid not null references public.empleados (id) on delete cascade,
  servicio_id  uuid not null references public.servicios (id) on delete cascade,
  sucursal_id  uuid not null references public.sucursales (id) on delete cascade,
  -- Comisión especial para este servicio (null = la general del empleado).
  comision_pct numeric(5, 2) check (comision_pct between 0 and 100),
  primary key (empleado_id, servicio_id)
);
create index empleado_servicios_servicio_idx on public.empleado_servicios (servicio_id);

-- ---------------------------------------------------------------------
-- Coherencia: todo debe ser de la misma sucursal
-- ---------------------------------------------------------------------
create or replace function privado.validar_sucursal_empleado()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (select 1 from public.empleados e where e.id = new.empleado_id and e.sucursal_id = new.sucursal_id) then
    raise exception 'El empleado no pertenece a la sucursal';
  end if;
  if tg_table_name = 'empleado_servicios' and not exists (
    select 1 from public.servicios s where s.id = new.servicio_id and s.sucursal_id = new.sucursal_id
  ) then
    raise exception 'El servicio no pertenece a la sucursal';
  end if;
  return new;
end;
$$;
revoke all on function privado.validar_sucursal_empleado() from public, anon, authenticated;

create trigger horarios_empleado_validar before insert or update on public.horarios_empleado
  for each row execute function privado.validar_sucursal_empleado();
create trigger bloqueos_empleado_validar before insert or update on public.bloqueos_empleado
  for each row execute function privado.validar_sucursal_empleado();
create trigger empleado_servicios_validar before insert or update on public.empleado_servicios
  for each row execute function privado.validar_sucursal_empleado();

-- Horario inicial: el de la sucursal.
create or replace function privado.crear_horario_empleado()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.horarios_empleado (empleado_id, sucursal_id, dia_semana, trabaja, entrada, salida)
  select new.id, new.sucursal_id, d,
         coalesce(h.abierto, d <> 0), coalesce(h.apertura, '09:00'), coalesce(h.cierre, '19:00')
  from generate_series(0, 6) as d
  left join public.horarios_sucursal h on h.sucursal_id = new.sucursal_id and h.dia_semana = d;
  return new;
end;
$$;
revoke all on function privado.crear_horario_empleado() from public, anon, authenticated;

create trigger empleados_horario_inicial after insert on public.empleados
  for each row execute function privado.crear_horario_empleado();

create trigger empleados_updated_at before update on public.empleados
  for each row execute function privado.set_updated_at();
create trigger empleados_auditoria after insert or update or delete on public.empleados
  for each row execute function privado.registrar_auditoria();

-- ¿El empleado es el propio usuario actual?
create or replace function privado.es_mi_empleado(p_empleado uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.empleados e where e.id = p_empleado and e.usuario_id = (select auth.uid())
  );
$$;
revoke all on function privado.es_mi_empleado(uuid) from public, anon;
grant execute on function privado.es_mi_empleado(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- Privilegios y RLS
-- ---------------------------------------------------------------------
revoke all on public.empleados, public.horarios_empleado, public.bloqueos_empleado, public.empleado_servicios
  from anon, authenticated;

grant select, delete on public.empleados to authenticated;
grant insert (sucursal_id, nombre, apellido, email, telefono, rol, especialidad, comision_pct, estado, reserva_web, color, foto_path, orden)
  on public.empleados to authenticated;
grant update (nombre, apellido, email, telefono, rol, especialidad, comision_pct, estado, reserva_web, color, foto_path, orden)
  on public.empleados to authenticated;
-- usuario_id solo lo enlaza el servidor (al dar acceso al sistema).

grant select on public.horarios_empleado to authenticated;
grant update (trabaja, entrada, salida) on public.horarios_empleado to authenticated;
grant select, insert, delete on public.bloqueos_empleado to authenticated;
grant select, insert, delete on public.empleado_servicios to authenticated;
grant update (comision_pct) on public.empleado_servicios to authenticated;

alter table public.empleados enable row level security;
alter table public.horarios_empleado enable row level security;
alter table public.bloqueos_empleado enable row level security;
alter table public.empleado_servicios enable row level security;

create policy "empleados: ve Personal o la propia ficha" on public.empleados
  for select to authenticated
  using (privado.puede(sucursal_id, 'personal') or usuario_id = (select auth.uid()));
create policy "empleados: crea Personal total" on public.empleados
  for insert to authenticated with check (privado.puede(sucursal_id, 'personal', true));
create policy "empleados: edita Personal total" on public.empleados
  for update to authenticated
  using (privado.puede(sucursal_id, 'personal', true))
  with check (privado.puede(sucursal_id, 'personal', true));
create policy "empleados: borra Personal total" on public.empleados
  for delete to authenticated using (privado.puede(sucursal_id, 'personal', true));

create policy "horarios_empleado: ve Personal o el propio" on public.horarios_empleado
  for select to authenticated
  using (privado.puede(sucursal_id, 'personal') or privado.es_mi_empleado(empleado_id));
create policy "horarios_empleado: edita Personal total" on public.horarios_empleado
  for update to authenticated
  using (privado.puede(sucursal_id, 'personal', true))
  with check (privado.puede(sucursal_id, 'personal', true));

create policy "bloqueos: ve Personal o el propio" on public.bloqueos_empleado
  for select to authenticated
  using (privado.puede(sucursal_id, 'personal') or privado.es_mi_empleado(empleado_id));
create policy "bloqueos: crea Personal total" on public.bloqueos_empleado
  for insert to authenticated with check (privado.puede(sucursal_id, 'personal', true));
create policy "bloqueos: borra Personal total" on public.bloqueos_empleado
  for delete to authenticated using (privado.puede(sucursal_id, 'personal', true));

create policy "empleado_servicios: ve el equipo de la sucursal" on public.empleado_servicios
  for select to authenticated using (privado.tiene_acceso(sucursal_id));
create policy "empleado_servicios: crea Personal total" on public.empleado_servicios
  for insert to authenticated with check (privado.puede(sucursal_id, 'personal', true));
create policy "empleado_servicios: edita Personal total" on public.empleado_servicios
  for update to authenticated
  using (privado.puede(sucursal_id, 'personal', true))
  with check (privado.puede(sucursal_id, 'personal', true));
create policy "empleado_servicios: borra Personal total" on public.empleado_servicios
  for delete to authenticated using (privado.puede(sucursal_id, 'personal', true));

-- ---------------------------------------------------------------------
-- Fotos del equipo: públicas (se muestran en la agenda y en las reservas web).
-- Las sube quien tiene Personal con acceso total en alguna sucursal.
-- ---------------------------------------------------------------------
create or replace function privado.gestiona_personal_alguna()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select privado.es_dueno() or exists (
    select 1 from public.accesos a
    where a.usuario_id = (select auth.uid()) and a.activo
      and privado.puede(a.sucursal_id, 'personal', true)
  );
$$;
revoke all on function privado.gestiona_personal_alguna() from public, anon;
grant execute on function privado.gestiona_personal_alguna() to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('equipo', 'equipo', true, 1048576, array['image/webp'])
on conflict (id) do update
  set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create policy "equipo: sube quien gestiona personal" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'equipo' and privado.gestiona_personal_alguna());
create policy "equipo: reemplaza quien gestiona personal" on storage.objects
  for update to authenticated
  using (bucket_id = 'equipo' and privado.gestiona_personal_alguna())
  with check (bucket_id = 'equipo' and privado.gestiona_personal_alguna());
create policy "equipo: borra quien gestiona personal" on storage.objects
  for delete to authenticated
  using (bucket_id = 'equipo' and privado.gestiona_personal_alguna());
