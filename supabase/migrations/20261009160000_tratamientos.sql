-- =====================================================================
-- Fase 1 · Sesión 13: catálogo de paquetes y planes de tratamiento
-- =====================================================================

-- ---------------------------------------------------------------------
-- Catálogo de paquetes (por sucursal; los precios son catálogo como Servicios)
-- ---------------------------------------------------------------------
create table public.paquetes (
  id              uuid primary key default gen_random_uuid(),
  sucursal_id     uuid not null references public.sucursales (id) on delete cascade,
  servicio_id     uuid references public.servicios (id) on delete set null,
  nombre          text not null check (char_length(nombre) between 1 and 100),
  descripcion     text check (char_length(descripcion) <= 500),
  sesiones        smallint not null check (sesiones between 1 and 100),
  frecuencia_dias smallint not null default 7 check (frecuencia_dias between 1 and 365),
  precio_sesion   numeric(10, 2) not null check (precio_sesion >= 0),
  -- Precio del paquete completo (normalmente con descuento sobre sesiones × precio).
  precio_total    numeric(10, 2) not null check (precio_total >= 0),
  activo          boolean not null default true,
  orden           integer not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index paquetes_sucursal_idx on public.paquetes (sucursal_id, orden);

-- ---------------------------------------------------------------------
-- Planes de tratamiento por cliente y sus sesiones
-- ---------------------------------------------------------------------
create type public.estado_plan as enum ('activo', 'pausado', 'completado', 'cancelado');
create type public.estado_sesion as enum ('pendiente', 'completada', 'cancelada');

create table public.planes_tratamiento (
  id              uuid primary key default gen_random_uuid(),
  sucursal_id     uuid not null references public.sucursales (id) on delete cascade,
  cliente_id      uuid not null references public.clientes (id) on delete cascade,
  paquete_id      uuid references public.paquetes (id) on delete set null,
  servicio_id     uuid references public.servicios (id) on delete set null,
  profesional_id  uuid references public.empleados (id) on delete set null,
  procedimiento   text not null check (char_length(procedimiento) between 1 and 100),
  sesiones_total  smallint not null check (sesiones_total between 1 and 100),
  frecuencia_dias smallint not null default 7 check (frecuencia_dias between 1 and 365),
  fecha_inicio    date not null,
  precio_sesion   numeric(10, 2) not null check (precio_sesion >= 0),
  precio_total    numeric(10, 2) not null check (precio_total >= 0),
  estado          public.estado_plan not null default 'activo',
  notas           text check (char_length(notas) <= 1000),
  creado_por      uuid references public.perfiles (id) on delete set null default auth.uid(),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index planes_cliente_idx on public.planes_tratamiento (cliente_id, created_at desc);
create index planes_sucursal_idx on public.planes_tratamiento (sucursal_id, estado);

create table public.sesiones_tratamiento (
  id          uuid primary key default gen_random_uuid(),
  plan_id     uuid not null references public.planes_tratamiento (id) on delete cascade,
  sucursal_id uuid not null references public.sucursales (id) on delete cascade,
  numero      smallint not null check (numero between 1 and 100),
  fecha       date,
  hora        time,
  estado      public.estado_sesion not null default 'pendiente',
  pagada      boolean not null default false,
  notas       text check (char_length(notas) <= 500),
  updated_at  timestamptz not null default now(),
  unique (plan_id, numero)
);
create index sesiones_fecha_idx on public.sesiones_tratamiento (sucursal_id, fecha);

-- Fotos de avance: un documento del cliente puede pertenecer a un plan.
alter table public.documentos_cliente
  add column plan_id uuid references public.planes_tratamiento (id) on delete set null;

-- ---------------------------------------------------------------------
-- Coherencia
-- ---------------------------------------------------------------------
create or replace function privado.validar_plan()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.paquete_id is not null and not exists (
    select 1 from public.paquetes p where p.id = new.paquete_id and p.sucursal_id = new.sucursal_id
  ) then
    raise exception 'El paquete no pertenece a la sucursal';
  end if;
  if new.servicio_id is not null and not exists (
    select 1 from public.servicios s where s.id = new.servicio_id and s.sucursal_id = new.sucursal_id
  ) then
    raise exception 'El servicio no pertenece a la sucursal';
  end if;
  if new.profesional_id is not null and not exists (
    select 1 from public.empleados e where e.id = new.profesional_id and e.sucursal_id = new.sucursal_id
  ) then
    raise exception 'El profesional no pertenece a la sucursal';
  end if;
  return new;
end;
$$;
revoke all on function privado.validar_plan() from public, anon, authenticated;
create trigger planes_validar before insert or update on public.planes_tratamiento
  for each row execute function privado.validar_plan();

create or replace function privado.validar_paquete()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.servicio_id is not null and not exists (
    select 1 from public.servicios s where s.id = new.servicio_id and s.sucursal_id = new.sucursal_id
  ) then
    raise exception 'El servicio no pertenece a la sucursal';
  end if;
  return new;
end;
$$;
revoke all on function privado.validar_paquete() from public, anon, authenticated;
create trigger paquetes_validar before insert or update on public.paquetes
  for each row execute function privado.validar_paquete();

-- Sesiones del plan: se crean solas con fechas sugeridas según la frecuencia.
-- Si cambia el total, se agregan sesiones o se quitan las pendientes del final.
create or replace function privado.sincronizar_sesiones()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_existentes integer;
  v_ultima date;
begin
  select count(*), max(fecha) into v_existentes, v_ultima
  from public.sesiones_tratamiento where plan_id = new.id;

  if v_existentes < new.sesiones_total then
    insert into public.sesiones_tratamiento (plan_id, sucursal_id, numero, fecha)
    select new.id, new.sucursal_id, n,
           case when v_existentes = 0 then new.fecha_inicio + (n - 1) * new.frecuencia_dias
                else coalesce(v_ultima, new.fecha_inicio) + (n - v_existentes) * new.frecuencia_dias end
    from generate_series(v_existentes + 1, new.sesiones_total) as n;
  elsif v_existentes > new.sesiones_total then
    if exists (
      select 1 from public.sesiones_tratamiento
      where plan_id = new.id and numero > new.sesiones_total and (estado <> 'pendiente' or pagada)
    ) then
      raise exception 'No se pueden quitar sesiones ya realizadas o pagadas' using errcode = '23514';
    end if;
    delete from public.sesiones_tratamiento where plan_id = new.id and numero > new.sesiones_total;
  end if;
  return new;
end;
$$;
revoke all on function privado.sincronizar_sesiones() from public, anon, authenticated;
create trigger planes_sesiones after insert or update of sesiones_total on public.planes_tratamiento
  for each row execute function privado.sincronizar_sesiones();

-- Al completar todas las sesiones, el plan pasa a "completado" (y vuelve a "activo" si se deshace).
create or replace function privado.estado_plan_por_sesiones()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_plan uuid := coalesce(new.plan_id, old.plan_id);
  v_pendientes integer;
begin
  select count(*) into v_pendientes from public.sesiones_tratamiento
  where plan_id = v_plan and estado = 'pendiente';
  update public.planes_tratamiento p
     set estado = case when v_pendientes = 0 then 'completado'::public.estado_plan else 'activo'::public.estado_plan end
   where p.id = v_plan
     and ((v_pendientes = 0 and p.estado = 'activo') or (v_pendientes > 0 and p.estado = 'completado'));
  return null;
end;
$$;
revoke all on function privado.estado_plan_por_sesiones() from public, anon, authenticated;
create trigger sesiones_estado_plan after update of estado on public.sesiones_tratamiento
  for each row execute function privado.estado_plan_por_sesiones();

create trigger paquetes_updated_at before update on public.paquetes
  for each row execute function privado.set_updated_at();
create trigger planes_updated_at before update on public.planes_tratamiento
  for each row execute function privado.set_updated_at();
create trigger sesiones_updated_at before update on public.sesiones_tratamiento
  for each row execute function privado.set_updated_at();
create trigger paquetes_auditoria after insert or update or delete on public.paquetes
  for each row execute function privado.registrar_auditoria();
create trigger planes_auditoria after insert or update or delete on public.planes_tratamiento
  for each row execute function privado.registrar_auditoria();
create trigger sesiones_auditoria after update or delete on public.sesiones_tratamiento
  for each row execute function privado.registrar_auditoria();

-- ---------------------------------------------------------------------
-- Privilegios y RLS
-- ---------------------------------------------------------------------
revoke all on public.paquetes, public.planes_tratamiento, public.sesiones_tratamiento from anon, authenticated;

grant select, delete on public.paquetes to authenticated;
grant insert (sucursal_id, servicio_id, nombre, descripcion, sesiones, frecuencia_dias, precio_sesion, precio_total, activo, orden)
  on public.paquetes to authenticated;
grant update (servicio_id, nombre, descripcion, sesiones, frecuencia_dias, precio_sesion, precio_total, activo, orden)
  on public.paquetes to authenticated;

grant select, delete on public.planes_tratamiento to authenticated;
grant insert (sucursal_id, cliente_id, paquete_id, servicio_id, profesional_id, procedimiento, sesiones_total,
              frecuencia_dias, fecha_inicio, precio_sesion, precio_total, estado, notas)
  on public.planes_tratamiento to authenticated;
grant update (paquete_id, servicio_id, profesional_id, procedimiento, sesiones_total, frecuencia_dias, fecha_inicio,
              precio_sesion, precio_total, estado, notas)
  on public.planes_tratamiento to authenticated;

-- Las sesiones las crea el sistema; se editan (fecha, hora, estado, pago, notas).
grant select on public.sesiones_tratamiento to authenticated;
grant update (fecha, hora, estado, pagada, notas) on public.sesiones_tratamiento to authenticated;

alter table public.paquetes enable row level security;
alter table public.planes_tratamiento enable row level security;
alter table public.sesiones_tratamiento enable row level security;

-- Paquetes: los ve quien ve Clientes o Servicios; los gestiona quien gestiona Servicios (precios).
create policy "paquetes: ve Clientes o Servicios" on public.paquetes
  for select to authenticated
  using (privado.puede(sucursal_id, 'clientes') or privado.puede(sucursal_id, 'servicios'));
create policy "paquetes: crea Servicios total" on public.paquetes
  for insert to authenticated with check (privado.puede(sucursal_id, 'servicios', true));
create policy "paquetes: edita Servicios total" on public.paquetes
  for update to authenticated
  using (privado.puede(sucursal_id, 'servicios', true))
  with check (privado.puede(sucursal_id, 'servicios', true));
create policy "paquetes: borra Servicios total" on public.paquetes
  for delete to authenticated using (privado.puede(sucursal_id, 'servicios', true));

-- Planes: los ve quien ve Clientes en esa sucursal; los gestiona Clientes total.
create policy "planes: ve Clientes" on public.planes_tratamiento
  for select to authenticated using (privado.puede(sucursal_id, 'clientes'));
create policy "planes: crea Clientes total" on public.planes_tratamiento
  for insert to authenticated with check (privado.puede(sucursal_id, 'clientes', true));
create policy "planes: edita Clientes total" on public.planes_tratamiento
  for update to authenticated
  using (privado.puede(sucursal_id, 'clientes', true))
  with check (privado.puede(sucursal_id, 'clientes', true));
create policy "planes: borra Clientes total" on public.planes_tratamiento
  for delete to authenticated using (privado.puede(sucursal_id, 'clientes', true));

create policy "sesiones: ve Clientes" on public.sesiones_tratamiento
  for select to authenticated using (privado.puede(sucursal_id, 'clientes'));
create policy "sesiones: edita Clientes total" on public.sesiones_tratamiento
  for update to authenticated
  using (privado.puede(sucursal_id, 'clientes', true))
  with check (privado.puede(sucursal_id, 'clientes', true));

-- ---------------------------------------------------------------------
-- Documentos: ahora pueden ir ligados a un plan (fotos de avance)
-- ---------------------------------------------------------------------
drop function public.documentos_de_cliente(uuid);
create function public.documentos_de_cliente(p_cliente uuid)
returns table (id uuid, categoria public.categoria_documento, nombre text, tipo text, tamano integer,
               subido_por_nombre text, created_at timestamptz, plan_id uuid)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not privado.puede_ver_salud(p_cliente) then
    raise exception 'Sin permiso para ver documentos' using errcode = '42501';
  end if;
  return query
    select d.id, d.categoria, d.nombre, d.tipo, d.tamano,
           (select p.nombre_completo from public.perfiles p where p.id = d.subido_por), d.created_at, d.plan_id
    from public.documentos_cliente d
    where d.cliente_id = p_cliente
    order by d.created_at desc;
end;
$$;

drop function public.registrar_documento(uuid, public.categoria_documento, text, text, integer);
create function public.registrar_documento(p_cliente uuid, p_categoria public.categoria_documento,
                                           p_nombre text, p_tipo text, p_tamano integer, p_plan uuid default null)
returns table (id uuid, path text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid := gen_random_uuid();
  v_path text := p_cliente::text || '/' || v_id::text || case when p_tipo = 'application/pdf' then '.pdf' else '.webp' end;
begin
  if not privado.puede_editar_salud(p_cliente) then
    raise exception 'Sin permiso para subir documentos' using errcode = '42501';
  end if;
  if p_plan is not null and not exists (
    select 1 from public.planes_tratamiento pl where pl.id = p_plan and pl.cliente_id = p_cliente
  ) then
    raise exception 'El plan no es de este cliente' using errcode = '22023';
  end if;
  insert into public.documentos_cliente (id, cliente_id, categoria, nombre, path, tipo, tamano, subido_por, plan_id)
  values (v_id, p_cliente, p_categoria, btrim(p_nombre), v_path, p_tipo, p_tamano, (select auth.uid()), p_plan);
  perform privado.registrar_consulta(p_cliente, 'subir_documento', v_id, btrim(p_nombre));
  return query select v_id, v_path;
end;
$$;

revoke all on function public.documentos_de_cliente(uuid),
  public.registrar_documento(uuid, public.categoria_documento, text, text, integer, uuid) from public, anon;
grant execute on function public.documentos_de_cliente(uuid),
  public.registrar_documento(uuid, public.categoria_documento, text, text, integer, uuid) to authenticated;
