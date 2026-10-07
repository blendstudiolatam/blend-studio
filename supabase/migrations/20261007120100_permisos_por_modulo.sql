-- =====================================================================
-- Fase 1 · Sesión 4: permisos por módulo
-- =====================================================================
-- Nivel efectivo de un usuario en un módulo y sucursal:
--   1. Sin acceso a la sucursal (o admin sin 2FA)  -> ninguno
--   2. Admin (incluido el dueño)                     -> total, siempre
--   3. Ajuste personal (permisos_usuario) o, si no hay, la matriz del rol (permisos_rol)
--   4. Límites fijos aprobados por Julio (no se pueden abrir):
--        * Caja y Finanzas: solo admin
--        * Profesional (estilista): solo Agenda; Clientes como máximo lectura
--          (y en las tablas de clientes solo verá los de sus citas)

create type public.modulo_app as enum (
  'agenda', 'clientes', 'servicios', 'personal', 'productos',
  'ventas', 'caja', 'finanzas', 'reportes', 'configuracion'
);

create type public.nivel_permiso as enum ('ninguno', 'lectura', 'total');

-- ---------------------------------------------------------------------
-- Matriz por rol (global para todo el negocio; solo la edita el dueño)
-- ---------------------------------------------------------------------
create table public.permisos_rol (
  rol        public.rol_usuario not null,
  modulo     public.modulo_app not null,
  nivel      public.nivel_permiso not null,
  updated_at timestamptz not null default now(),
  primary key (rol, modulo),
  -- El admin no está en la matriz: siempre tiene acceso total.
  check (rol <> 'admin')
);
comment on table public.permisos_rol is 'Matriz de permisos por rol. Los límites fijos se aplican aparte en privado.nivel_permiso().';

create trigger permisos_rol_updated_at before update on public.permisos_rol
  for each row execute function privado.set_updated_at();

-- Valores iniciales
insert into public.permisos_rol (rol, modulo, nivel)
select v.rol::public.rol_usuario, v.modulo::public.modulo_app, v.nivel::public.nivel_permiso
from (values
  ('recepcion', 'agenda', 'total'),
  ('recepcion', 'clientes', 'total'),
  ('recepcion', 'servicios', 'lectura'),
  ('recepcion', 'personal', 'lectura'),
  ('recepcion', 'productos', 'lectura'),
  ('recepcion', 'ventas', 'total'),
  ('recepcion', 'caja', 'ninguno'),
  ('recepcion', 'finanzas', 'ninguno'),
  ('recepcion', 'reportes', 'ninguno'),
  ('recepcion', 'configuracion', 'ninguno'),
  ('estilista', 'agenda', 'total'),
  ('estilista', 'clientes', 'lectura'),
  ('estilista', 'servicios', 'ninguno'),
  ('estilista', 'personal', 'ninguno'),
  ('estilista', 'productos', 'ninguno'),
  ('estilista', 'ventas', 'ninguno'),
  ('estilista', 'caja', 'ninguno'),
  ('estilista', 'finanzas', 'ninguno'),
  ('estilista', 'reportes', 'ninguno'),
  ('estilista', 'configuracion', 'ninguno'),
  ('asistente', 'agenda', 'lectura'),
  ('asistente', 'clientes', 'lectura'),
  ('asistente', 'servicios', 'lectura'),
  ('asistente', 'personal', 'ninguno'),
  ('asistente', 'productos', 'lectura'),
  ('asistente', 'ventas', 'ninguno'),
  ('asistente', 'caja', 'ninguno'),
  ('asistente', 'finanzas', 'ninguno'),
  ('asistente', 'reportes', 'ninguno'),
  ('asistente', 'configuracion', 'ninguno')
) as v(rol, modulo, nivel);

-- ---------------------------------------------------------------------
-- Ajustes por persona y sucursal (los edita el admin de esa sucursal)
-- ---------------------------------------------------------------------
create table public.permisos_usuario (
  id          uuid primary key default gen_random_uuid(),
  usuario_id  uuid not null references public.perfiles (id) on delete cascade,
  sucursal_id uuid not null references public.sucursales (id) on delete cascade,
  modulo      public.modulo_app not null,
  nivel       public.nivel_permiso not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (usuario_id, sucursal_id, modulo)
);
comment on table public.permisos_usuario is 'Excepciones a la matriz del rol para una persona en una sucursal.';
create index permisos_usuario_sucursal_idx on public.permisos_usuario (sucursal_id);

create trigger permisos_usuario_updated_at before update on public.permisos_usuario
  for each row execute function privado.set_updated_at();

-- Los cambios de permisos quedan en la auditoría.
create trigger permisos_rol_auditoria
  after insert or update or delete on public.permisos_rol
  for each row execute function privado.registrar_auditoria();
create trigger permisos_usuario_auditoria
  after insert or update or delete on public.permisos_usuario
  for each row execute function privado.registrar_auditoria();

-- ---------------------------------------------------------------------
-- Cálculo del nivel efectivo
-- ---------------------------------------------------------------------
create or replace function privado.nivel_permiso(p_sucursal uuid, p_modulo public.modulo_app)
returns public.nivel_permiso
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_rol   public.rol_usuario := privado.rol_en(p_sucursal);
  v_nivel public.nivel_permiso;
begin
  if v_rol is null then
    return 'ninguno';
  end if;
  if v_rol = 'admin' then
    return 'total';
  end if;

  -- Límites fijos
  if p_modulo in ('caja', 'finanzas') then
    return 'ninguno';
  end if;
  if v_rol = 'estilista' and p_modulo not in ('agenda', 'clientes') then
    return 'ninguno';
  end if;

  select pu.nivel into v_nivel
  from public.permisos_usuario pu
  where pu.usuario_id = (select auth.uid())
    and pu.sucursal_id = p_sucursal
    and pu.modulo = p_modulo;

  if v_nivel is null then
    select pr.nivel into v_nivel
    from public.permisos_rol pr
    where pr.rol = v_rol and pr.modulo = p_modulo;
  end if;

  v_nivel := coalesce(v_nivel, 'ninguno');

  if v_rol = 'estilista' and p_modulo = 'clientes' and v_nivel = 'total' then
    v_nivel := 'lectura';
  end if;

  return v_nivel;
end;
$$;

-- ¿Puede leer (lectura o total) o escribir (solo total)?
create or replace function privado.puede(p_sucursal uuid, p_modulo public.modulo_app, p_escribir boolean default false)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when p_escribir then privado.nivel_permiso(p_sucursal, p_modulo) = 'total'
    else privado.nivel_permiso(p_sucursal, p_modulo) <> 'ninguno'
  end;
$$;

revoke all on function privado.nivel_permiso(uuid, public.modulo_app) from public, anon;
revoke all on function privado.puede(uuid, public.modulo_app, boolean) from public, anon;
grant execute on function privado.nivel_permiso(uuid, public.modulo_app) to authenticated;
grant execute on function privado.puede(uuid, public.modulo_app, boolean) to authenticated;

-- Permisos del usuario actual en una sucursal (para mostrar el menú).
create or replace function public.mis_permisos(p_sucursal uuid)
returns table (modulo public.modulo_app, nivel public.nivel_permiso)
language sql
stable
security invoker
set search_path = ''
as $$
  select m, privado.nivel_permiso(p_sucursal, m)
  from unnest(enum_range(null::public.modulo_app)) as m;
$$;
revoke all on function public.mis_permisos(uuid) from public, anon;
grant execute on function public.mis_permisos(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- Privilegios y RLS
-- ---------------------------------------------------------------------
revoke all on public.permisos_rol, public.permisos_usuario from anon, authenticated;

grant select on public.permisos_rol to authenticated;
grant update (nivel) on public.permisos_rol to authenticated;
grant select, insert, delete on public.permisos_usuario to authenticated;
grant update (nivel) on public.permisos_usuario to authenticated;

alter table public.permisos_rol enable row level security;
alter table public.permisos_usuario enable row level security;

-- La matriz la ve cualquier usuario con acceso a alguna sucursal (para entender sus permisos).
create policy "permisos_rol: ver con sesión" on public.permisos_rol
  for select to authenticated
  using (
    privado.es_dueno()
    or exists (select 1 from public.accesos a where a.usuario_id = (select auth.uid()) and a.activo)
  );

create policy "permisos_rol: solo el dueño edita" on public.permisos_rol
  for update to authenticated
  using (privado.es_dueno())
  with check (privado.es_dueno());

create policy "permisos_usuario: ver los propios o, si es admin, los de su sucursal" on public.permisos_usuario
  for select to authenticated
  using (usuario_id = (select auth.uid()) or privado.es_admin(sucursal_id));

create policy "permisos_usuario: admin crea en su sucursal" on public.permisos_usuario
  for insert to authenticated
  with check (privado.es_admin(sucursal_id));

create policy "permisos_usuario: admin edita en su sucursal" on public.permisos_usuario
  for update to authenticated
  using (privado.es_admin(sucursal_id))
  with check (privado.es_admin(sucursal_id));

create policy "permisos_usuario: admin borra en su sucursal" on public.permisos_usuario
  for delete to authenticated
  using (privado.es_admin(sucursal_id));
