-- =====================================================================
-- Fase 1 · Sesión 2: sucursales, usuarios, roles y auditoría
-- =====================================================================
-- Reglas generales:
--   * RLS activado en todas las tablas, ninguna tabla sin política.
--   * Las funciones auxiliares viven en el esquema "privado", que la API no expone.
--   * El rol "anon" (visitantes sin sesión) no tiene acceso directo a estas tablas.

-- ---------------------------------------------------------------------
-- Esquema privado
-- ---------------------------------------------------------------------
create schema if not exists privado;
revoke all on schema privado from public, anon;
grant usage on schema privado to authenticated;

-- ---------------------------------------------------------------------
-- Tipos
-- ---------------------------------------------------------------------
create type public.rol_usuario as enum ('admin', 'recepcion', 'estilista');

-- ---------------------------------------------------------------------
-- updated_at automático
-- ---------------------------------------------------------------------
create or replace function privado.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- Tablas
-- ---------------------------------------------------------------------
create table public.sucursales (
  id           uuid primary key default gen_random_uuid(),
  nombre       text not null check (char_length(nombre) between 2 and 120),
  slug         text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  direccion    text check (char_length(direccion) <= 300),
  telefono     text check (char_length(telefono) <= 30),
  zona_horaria text not null default 'America/Panama',
  activa       boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
comment on table public.sucursales is 'Locales del salón. Agregar una sucursal no requiere cambios de código.';

create table public.perfiles (
  id              uuid primary key references auth.users (id) on delete cascade,
  nombre_completo text not null default '' check (char_length(nombre_completo) <= 120),
  telefono        text check (char_length(telefono) <= 30),
  -- El dueño es admin en todas las sucursales, incluidas las que se creen después.
  -- Solo se puede activar desde SQL (no hay permiso de escritura sobre esta columna).
  es_dueno        boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
comment on table public.perfiles is 'Datos de cada usuario del sistema (1 a 1 con auth.users).';

create table public.accesos (
  id          uuid primary key default gen_random_uuid(),
  usuario_id  uuid not null references public.perfiles (id) on delete cascade,
  sucursal_id uuid not null references public.sucursales (id) on delete restrict,
  rol         public.rol_usuario not null,
  activo      boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (usuario_id, sucursal_id)
);
comment on table public.accesos is 'Qué rol tiene cada usuario en cada sucursal.';
create index accesos_sucursal_idx on public.accesos (sucursal_id);

create table public.auditoria (
  id            bigint generated always as identity primary key,
  sucursal_id   uuid references public.sucursales (id) on delete set null,
  tabla         text not null,
  registro_id   uuid,
  accion        text not null check (accion in ('crear', 'editar', 'anular', 'eliminar')),
  usuario_id    uuid references auth.users (id) on delete set null,
  datos_antes   jsonb,
  datos_despues jsonb,
  created_at    timestamptz not null default now()
);
comment on table public.auditoria is 'Registro de quién crea, edita o anula registros. Solo lo escriben los triggers.';
create index auditoria_sucursal_fecha_idx on public.auditoria (sucursal_id, created_at desc);
create index auditoria_registro_idx on public.auditoria (tabla, registro_id);

create trigger sucursales_updated_at before update on public.sucursales
  for each row execute function privado.set_updated_at();
create trigger perfiles_updated_at before update on public.perfiles
  for each row execute function privado.set_updated_at();
create trigger accesos_updated_at before update on public.accesos
  for each row execute function privado.set_updated_at();

-- ---------------------------------------------------------------------
-- Funciones de permisos (security definer: leen accesos sin pasar por RLS
-- para evitar recursión; solo devuelven información del usuario actual)
-- ---------------------------------------------------------------------
create or replace function privado.es_dueno()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select p.es_dueno from public.perfiles p where p.id = (select auth.uid())),
    false
  );
$$;

create or replace function privado.rol_en(p_sucursal uuid)
returns public.rol_usuario
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when privado.es_dueno() then 'admin'::public.rol_usuario
    else (
      select a.rol
      from public.accesos a
      where a.usuario_id = (select auth.uid())
        and a.sucursal_id = p_sucursal
        and a.activo
    )
  end;
$$;

create or replace function privado.tiene_acceso(p_sucursal uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select privado.rol_en(p_sucursal) is not null;
$$;

create or replace function privado.tiene_rol(p_sucursal uuid, p_roles public.rol_usuario[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(privado.rol_en(p_sucursal) = any (p_roles), false);
$$;

create or replace function privado.es_admin(p_sucursal uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select privado.tiene_rol(p_sucursal, array['admin']::public.rol_usuario[]);
$$;

-- ¿Puede el usuario actual ver el perfil de otra persona?
-- Sí, si comparten una sucursal donde el usuario actual es admin o recepción.
create or replace function privado.puede_ver_perfil(p_usuario uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select privado.es_dueno() or exists (
    select 1
    from public.accesos a
    where a.usuario_id = p_usuario
      and privado.tiene_rol(a.sucursal_id, array['admin', 'recepcion']::public.rol_usuario[])
  );
$$;

revoke all on all functions in schema privado from public, anon;
grant execute on function
  privado.es_dueno(),
  privado.rol_en(uuid),
  privado.tiene_acceso(uuid),
  privado.tiene_rol(uuid, public.rol_usuario[]),
  privado.es_admin(uuid),
  privado.puede_ver_perfil(uuid)
to authenticated;

-- ---------------------------------------------------------------------
-- Perfil automático al crear un usuario en Supabase Auth
-- ---------------------------------------------------------------------
create or replace function privado.crear_perfil()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.perfiles (id, nombre_completo)
  values (new.id, coalesce(left(new.raw_user_meta_data ->> 'nombre_completo', 120), ''));
  return new;
end;
$$;

create trigger al_crear_usuario
  after insert on auth.users
  for each row execute function privado.crear_perfil();

-- ---------------------------------------------------------------------
-- Auditoría genérica (se reutiliza para citas, ventas y caja en el futuro)
-- ---------------------------------------------------------------------
create or replace function privado.registrar_auditoria()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_antes   jsonb := case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end;
  v_despues jsonb := case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end;
  v_fila    jsonb := coalesce(v_despues, v_antes);
  v_accion  text;
  v_sucursal uuid;
begin
  v_accion := case tg_op
    when 'INSERT' then 'crear'
    when 'DELETE' then 'eliminar'
    else 'editar'
  end;

  -- Cambiar el estado a cancelada/anulada cuenta como "anular".
  if tg_op = 'UPDATE'
     and v_despues ? 'estado'
     and (v_despues ->> 'estado') in ('cancelada', 'anulada')
     and (v_antes ->> 'estado') is distinct from (v_despues ->> 'estado') then
    v_accion := 'anular';
  end if;

  v_sucursal := case
    -- Una sucursal borrada ya no existe: la auditoría queda sin sucursal (solo la ve el dueño).
    when tg_table_name = 'sucursales' and tg_op = 'DELETE' then null
    when tg_table_name = 'sucursales' then (v_fila ->> 'id')::uuid
    else (v_fila ->> 'sucursal_id')::uuid
  end;

  insert into public.auditoria
    (sucursal_id, tabla, registro_id, accion, usuario_id, datos_antes, datos_despues)
  values
    (v_sucursal, tg_table_name, (v_fila ->> 'id')::uuid, v_accion, auth.uid(), v_antes, v_despues);

  return coalesce(new, old);
end;
$$;

create trigger sucursales_auditoria
  after insert or update or delete on public.sucursales
  for each row execute function privado.registrar_auditoria();
create trigger accesos_auditoria
  after insert or update or delete on public.accesos
  for each row execute function privado.registrar_auditoria();

-- ---------------------------------------------------------------------
-- Privilegios por columna/tabla (primera barrera)
-- ---------------------------------------------------------------------
revoke all on public.sucursales, public.perfiles, public.accesos, public.auditoria from anon;
revoke all on public.sucursales, public.perfiles, public.accesos, public.auditoria from authenticated;

grant select, insert, update on public.sucursales to authenticated;
grant select on public.perfiles to authenticated;
grant update (nombre_completo, telefono) on public.perfiles to authenticated;
grant select, insert, delete on public.accesos to authenticated;
grant update (rol, activo) on public.accesos to authenticated;
grant select on public.auditoria to authenticated;

-- ---------------------------------------------------------------------
-- RLS (segunda barrera: qué filas puede tocar cada quien)
-- ---------------------------------------------------------------------
alter table public.sucursales enable row level security;
alter table public.perfiles   enable row level security;
alter table public.accesos    enable row level security;
alter table public.auditoria  enable row level security;

-- Sucursales
create policy "sucursales: ver las propias" on public.sucursales
  for select to authenticated
  using (privado.tiene_acceso(id));

create policy "sucursales: solo el dueño crea" on public.sucursales
  for insert to authenticated
  with check (privado.es_dueno());

create policy "sucursales: admin edita la suya" on public.sucursales
  for update to authenticated
  using (privado.es_admin(id))
  with check (privado.es_admin(id));

-- Perfiles
create policy "perfiles: ver el propio o los del equipo" on public.perfiles
  for select to authenticated
  using (id = (select auth.uid()) or privado.puede_ver_perfil(id));

create policy "perfiles: editar el propio" on public.perfiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- Accesos
create policy "accesos: ver los propios o, si es admin, los de su sucursal" on public.accesos
  for select to authenticated
  using (usuario_id = (select auth.uid()) or privado.es_admin(sucursal_id));

create policy "accesos: admin asigna en su sucursal" on public.accesos
  for insert to authenticated
  with check (privado.es_admin(sucursal_id));

create policy "accesos: admin modifica en su sucursal" on public.accesos
  for update to authenticated
  using (privado.es_admin(sucursal_id))
  with check (privado.es_admin(sucursal_id));

create policy "accesos: admin quita en su sucursal" on public.accesos
  for delete to authenticated
  using (privado.es_admin(sucursal_id));

-- Auditoría (solo lectura; la escriben los triggers)
create policy "auditoria: admin ve la de su sucursal" on public.auditoria
  for select to authenticated
  using (
    privado.es_admin(sucursal_id)
    or (sucursal_id is null and privado.es_dueno())
  );
