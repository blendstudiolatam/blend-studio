-- =====================================================================
-- Fase 1 · Sesión 10: clientes (ficha única compartida entre sucursales)
-- =====================================================================

-- ¿Puede ver (o editar) un módulo en al menos una de sus sucursales?
-- Para datos compartidos por todo el negocio, como los clientes.
create or replace function privado.puede_alguna(p_modulo public.modulo_app, p_escribir boolean default false)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.sucursales s where privado.puede(s.id, p_modulo, p_escribir)
  );
$$;
revoke all on function privado.puede_alguna(public.modulo_app, boolean) from public, anon;
grant execute on function privado.puede_alguna(public.modulo_app, boolean) to authenticated;

-- Normaliza texto para buscar sin importar mayúsculas ni tildes.
create or replace function privado.normalizar(p_texto text)
returns text
language sql
immutable
parallel safe
set search_path = ''
as $$
  select translate(lower(coalesce(p_texto, '')), 'áàäâéèëêíìïîóòöôúùüûñç', 'aaaaeeeeiiiioooouuuunc');
$$;
grant execute on function privado.normalizar(text) to authenticated;

create table public.clientes (
  id                     uuid primary key default gen_random_uuid(),
  -- Número corto visible (C-0001) para buscar y hablar del cliente.
  codigo                 integer generated always as identity unique,
  nombre                 text not null check (char_length(nombre) between 1 and 60),
  apellido               text not null default '' check (char_length(apellido) <= 60),
  fecha_nacimiento       date check (fecha_nacimiento between '1900-01-01' and current_date),
  genero                 text check (genero in ('F', 'M', 'O')),
  documento              text check (char_length(documento) <= 30),
  telefono               text check (char_length(telefono) <= 30),
  email                  text check (char_length(email) <= 254),
  direccion              text check (char_length(direccion) <= 200),
  notas                  text check (char_length(notas) <= 1000),
  recordatorios_whatsapp boolean not null default true,
  -- Ley 81: solo se usan sus fotos en marketing si lo autoriza.
  permitir_fotos         boolean not null default false,
  foto_path              text check (foto_path ~ '^fotos/[a-z0-9-]{1,80}\.webp$'),
  activo                 boolean not null default true,
  origen                 text not null default 'panel' check (origen in ('panel', 'web', 'importacion')),
  sucursal_origen_id     uuid references public.sucursales (id) on delete set null,
  creado_por             uuid references public.perfiles (id) on delete set null default auth.uid(),
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  -- Para buscar: nombre, apellido, correo y documento sin tildes; teléfono solo con dígitos.
  busqueda               text generated always as (
    privado.normalizar(nombre || ' ' || apellido || ' ' || coalesce(email, '') || ' ' || coalesce(documento, ''))
  ) stored,
  telefono_digitos       text generated always as (regexp_replace(coalesce(telefono, ''), '\D', '', 'g')) stored
);
create index clientes_creado_idx on public.clientes (created_at desc);
create index clientes_telefono_idx on public.clientes (telefono_digitos);

create trigger clientes_updated_at before update on public.clientes
  for each row execute function privado.set_updated_at();
-- Ley 81: queda registro de quién crea, edita o borra la ficha (la ve el dueño).
create trigger clientes_auditoria after insert or update or delete on public.clientes
  for each row execute function privado.registrar_auditoria();

-- ---------------------------------------------------------------------
-- Privilegios y RLS
-- ---------------------------------------------------------------------
revoke all on public.clientes from anon, authenticated;
grant select, delete on public.clientes to authenticated;
grant insert (nombre, apellido, fecha_nacimiento, genero, documento, telefono, email, direccion, notas,
              recordatorios_whatsapp, permitir_fotos, foto_path, activo, origen, sucursal_origen_id)
  on public.clientes to authenticated;
grant update (nombre, apellido, fecha_nacimiento, genero, documento, telefono, email, direccion, notas,
              recordatorios_whatsapp, permitir_fotos, foto_path, activo)
  on public.clientes to authenticated;

alter table public.clientes enable row level security;

create policy "clientes: ve quien tiene Clientes" on public.clientes
  for select to authenticated using (privado.puede_alguna('clientes'));
create policy "clientes: crea Clientes total" on public.clientes
  for insert to authenticated
  with check (
    privado.puede_alguna('clientes', true)
    and (sucursal_origen_id is null or privado.tiene_acceso(sucursal_origen_id))
  );
create policy "clientes: edita Clientes total" on public.clientes
  for update to authenticated
  using (privado.puede_alguna('clientes', true))
  with check (privado.puede_alguna('clientes', true));
-- Borrar una ficha (derecho de supresión, Ley 81) solo lo hace un administrador.
create policy "clientes: borra un administrador" on public.clientes
  for delete to authenticated using (privado.es_admin_alguno());

-- ---------------------------------------------------------------------
-- Fotos de clientes: almacenamiento PRIVADO, se ven con enlaces temporales.
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('clientes', 'clientes', false, 1048576, array['image/webp'])
on conflict (id) do update
  set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create policy "clientes: ve fotos quien tiene Clientes" on storage.objects
  for select to authenticated
  using (bucket_id = 'clientes' and (storage.foldername(name))[1] = 'fotos' and privado.puede_alguna('clientes'));
create policy "clientes: sube fotos Clientes total" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'clientes' and (storage.foldername(name))[1] = 'fotos' and privado.puede_alguna('clientes', true));
create policy "clientes: reemplaza fotos Clientes total" on storage.objects
  for update to authenticated
  using (bucket_id = 'clientes' and (storage.foldername(name))[1] = 'fotos' and privado.puede_alguna('clientes', true))
  with check (bucket_id = 'clientes' and (storage.foldername(name))[1] = 'fotos' and privado.puede_alguna('clientes', true));
create policy "clientes: borra fotos Clientes total" on storage.objects
  for delete to authenticated
  using (bucket_id = 'clientes' and (storage.foldername(name))[1] = 'fotos' and privado.puede_alguna('clientes', true));
