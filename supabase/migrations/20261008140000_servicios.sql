-- =====================================================================
-- Fase 1 · Sesión 8: categorías y catálogo de servicios (por sucursal)
-- =====================================================================

create table public.categorias_servicio (
  id          uuid primary key default gen_random_uuid(),
  sucursal_id uuid not null references public.sucursales (id) on delete cascade,
  nombre      text not null check (char_length(nombre) between 2 and 60),
  descripcion text check (char_length(descripcion) <= 300),
  -- Foto de ambiente de public/ambiente (solo nombres de archivo seguros).
  imagen      text check (imagen ~ '^[a-z0-9-]{1,40}$'),
  orden       integer not null default 0,
  activa      boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (sucursal_id, nombre)
);
create index categorias_servicio_sucursal_idx on public.categorias_servicio (sucursal_id, orden);

create table public.servicios (
  id               uuid primary key default gen_random_uuid(),
  sucursal_id      uuid not null references public.sucursales (id) on delete cascade,
  categoria_id     uuid not null references public.categorias_servicio (id) on delete restrict,
  nombre           text not null check (char_length(nombre) between 2 and 120),
  descripcion      text check (char_length(descripcion) <= 500),
  duracion_min     integer not null check (duracion_min between 5 and 600),
  precio           numeric(10, 2) not null check (precio >= 0),
  precio_descuento numeric(10, 2) check (precio_descuento >= 0 and precio_descuento < precio),
  reserva_web      boolean not null default true,
  activo           boolean not null default true,
  orden            integer not null default 0,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (sucursal_id, categoria_id, nombre)
);
create index servicios_sucursal_idx on public.servicios (sucursal_id, categoria_id, orden);

-- La categoría debe ser de la misma sucursal que el servicio.
create or replace function privado.validar_categoria_servicio()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.categorias_servicio c
    where c.id = new.categoria_id and c.sucursal_id = new.sucursal_id
  ) then
    raise exception 'La categoría no pertenece a la sucursal del servicio';
  end if;
  return new;
end;
$$;
revoke all on function privado.validar_categoria_servicio() from public, anon, authenticated;

create trigger servicios_validar_categoria before insert or update of categoria_id, sucursal_id on public.servicios
  for each row execute function privado.validar_categoria_servicio();

create trigger categorias_servicio_updated_at before update on public.categorias_servicio
  for each row execute function privado.set_updated_at();
create trigger servicios_updated_at before update on public.servicios
  for each row execute function privado.set_updated_at();

-- Cambios de precios quedan registrados.
create trigger servicios_auditoria after insert or update or delete on public.servicios
  for each row execute function privado.registrar_auditoria();

-- ---------------------------------------------------------------------
-- Privilegios y RLS
-- ---------------------------------------------------------------------
revoke all on public.categorias_servicio, public.servicios from anon, authenticated;

grant select, delete on public.categorias_servicio to authenticated;
grant insert (sucursal_id, nombre, descripcion, imagen, orden, activa) on public.categorias_servicio to authenticated;
grant update (nombre, descripcion, imagen, orden, activa) on public.categorias_servicio to authenticated;

grant select, delete on public.servicios to authenticated;
grant insert (sucursal_id, categoria_id, nombre, descripcion, duracion_min, precio, precio_descuento, reserva_web, activo, orden)
  on public.servicios to authenticated;
grant update (categoria_id, nombre, descripcion, duracion_min, precio, precio_descuento, reserva_web, activo, orden)
  on public.servicios to authenticated;

alter table public.categorias_servicio enable row level security;
alter table public.servicios enable row level security;

-- Todo el equipo de la sucursal ve el catálogo (lo usa la agenda).
create policy "categorias: las ve el equipo de la sucursal" on public.categorias_servicio
  for select to authenticated using (privado.tiene_acceso(sucursal_id));
create policy "categorias: crea quien gestiona servicios" on public.categorias_servicio
  for insert to authenticated with check (privado.puede(sucursal_id, 'servicios', true));
create policy "categorias: edita quien gestiona servicios" on public.categorias_servicio
  for update to authenticated
  using (privado.puede(sucursal_id, 'servicios', true))
  with check (privado.puede(sucursal_id, 'servicios', true));
create policy "categorias: borra quien gestiona servicios" on public.categorias_servicio
  for delete to authenticated using (privado.puede(sucursal_id, 'servicios', true));

create policy "servicios: los ve el equipo de la sucursal" on public.servicios
  for select to authenticated using (privado.tiene_acceso(sucursal_id));
create policy "servicios: crea quien gestiona servicios" on public.servicios
  for insert to authenticated with check (privado.puede(sucursal_id, 'servicios', true));
create policy "servicios: edita quien gestiona servicios" on public.servicios
  for update to authenticated
  using (privado.puede(sucursal_id, 'servicios', true))
  with check (privado.puede(sucursal_id, 'servicios', true));
create policy "servicios: borra quien gestiona servicios" on public.servicios
  for delete to authenticated using (privado.puede(sucursal_id, 'servicios', true));
