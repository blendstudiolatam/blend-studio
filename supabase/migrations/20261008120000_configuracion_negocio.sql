-- =====================================================================
-- Fase 1 · Sesiones 6 y 7: configuración del negocio, horarios y marca
-- =====================================================================

-- ¿Es admin (con 2FA) en al menos una sucursal, o es el dueño?
-- Los datos globales del negocio los editan solo administradores.
create or replace function privado.es_admin_alguno()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select privado.es_dueno() or (
    privado.aal2() and exists (
      select 1 from public.accesos a
      where a.usuario_id = (select auth.uid()) and a.activo and a.rol = 'admin'
    )
  );
$$;
revoke all on function privado.es_admin_alguno() from public, anon;
grant execute on function privado.es_admin_alguno() to authenticated;

-- ---------------------------------------------------------------------
-- Negocio (una sola fila para todo el negocio)
-- ---------------------------------------------------------------------
create table public.negocio (
  id                  uuid primary key default gen_random_uuid(),
  unico               boolean not null default true unique check (unico),
  nombre_comercial    text not null default 'Blend Studio' check (char_length(nombre_comercial) between 2 and 80),
  nombre_legal        text check (char_length(nombre_legal) <= 120),
  ruc                 text check (ruc ~ '^[0-9A-Za-z-]{1,25}$'),
  dv                  text check (dv ~ '^[0-9]{1,2}$'),
  logo_path           text check (char_length(logo_path) <= 200),
  telefono            text check (char_length(telefono) <= 30),
  whatsapp            text check (char_length(whatsapp) <= 30),
  email               text check (char_length(email) <= 254),
  email_respaldo      text check (char_length(email_respaldo) <= 254),
  instagram           text check (char_length(instagram) <= 100),
  facebook            text check (char_length(facebook) <= 100),
  tiktok              text check (char_length(tiktok) <= 100),
  sitio_web           text check (char_length(sitio_web) <= 200),
  horario_texto       text check (char_length(horario_texto) <= 200),
  mensaje_comprobante text check (char_length(mensaje_comprobante) <= 200),
  moneda              text not null default 'USD' check (moneda in ('USD')),
  itbms_pct           numeric(5, 2) not null default 7 check (itbms_pct between 0 and 100),
  -- Colores en formato #RRGGBB (se validan aquí para evitar inyección de CSS).
  color_primario      text not null default '#0b0b0b' check (color_primario ~ '^#[0-9a-fA-F]{6}$'),
  color_acento        text not null default '#c9a15b' check (color_acento ~ '^#[0-9a-fA-F]{6}$'),
  color_fondo         text not null default '#f6f1e9' check (color_fondo ~ '^#[0-9a-fA-F]{6}$'),
  tipografia_titulos  text not null default 'bodoni' check (tipografia_titulos in ('bodoni', 'playfair', 'cormorant')),
  tipografia_texto    text not null default 'jost' check (tipografia_texto in ('jost', 'montserrat', 'lato')),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
comment on table public.negocio is 'Datos globales del negocio y de la marca (una sola fila).';

insert into public.negocio (horario_texto, mensaje_comprobante)
values ('Lunes a sábado, 9:00 a.m. a 7:00 p.m.', 'Gracias por visitarnos. Beauty for everyone.');

create trigger negocio_updated_at before update on public.negocio
  for each row execute function privado.set_updated_at();
create trigger negocio_auditoria after update on public.negocio
  for each row execute function privado.registrar_auditoria();

revoke all on public.negocio from anon, authenticated;
grant select on public.negocio to authenticated;
grant update (
  nombre_comercial, nombre_legal, ruc, dv, logo_path, telefono, whatsapp, email, email_respaldo,
  instagram, facebook, tiktok, sitio_web, horario_texto, mensaje_comprobante, itbms_pct,
  color_primario, color_acento, color_fondo, tipografia_titulos, tipografia_texto
) on public.negocio to authenticated;

alter table public.negocio enable row level security;

create policy "negocio: lo ve el equipo" on public.negocio
  for select to authenticated
  using (
    privado.es_dueno()
    or exists (select 1 from public.accesos a where a.usuario_id = (select auth.uid()) and a.activo)
  );

create policy "negocio: lo editan administradores" on public.negocio
  for update to authenticated
  using (privado.es_admin_alguno())
  with check (privado.es_admin_alguno());

-- Datos públicos de la marca (para la página de reservas y el diseño). Nada sensible.
create or replace function public.marca_publica()
returns table (
  nombre_comercial text, logo_path text, telefono text, whatsapp text, email text,
  instagram text, facebook text, tiktok text, sitio_web text, horario_texto text,
  color_primario text, color_acento text, color_fondo text,
  tipografia_titulos text, tipografia_texto text
)
language sql
stable
security definer
set search_path = ''
as $$
  select n.nombre_comercial, n.logo_path, n.telefono, n.whatsapp, n.email,
         n.instagram, n.facebook, n.tiktok, n.sitio_web, n.horario_texto,
         n.color_primario, n.color_acento, n.color_fondo,
         n.tipografia_titulos, n.tipografia_texto
  from public.negocio n
  limit 1;
$$;
revoke all on function public.marca_publica() from public;
grant execute on function public.marca_publica() to anon, authenticated;

-- ---------------------------------------------------------------------
-- Sucursales: la edita quien tenga Configuración con acceso total en ella
-- ---------------------------------------------------------------------
drop policy "sucursales: admin edita la suya" on public.sucursales;
create policy "sucursales: edita quien configura la sucursal" on public.sucursales
  for update to authenticated
  using (privado.puede(id, 'configuracion', true))
  with check (privado.puede(id, 'configuracion', true));

-- ---------------------------------------------------------------------
-- Horario semanal por sucursal (0 = domingo ... 6 = sábado)
-- ---------------------------------------------------------------------
create table public.horarios_sucursal (
  id          uuid primary key default gen_random_uuid(),
  sucursal_id uuid not null references public.sucursales (id) on delete cascade,
  dia_semana  smallint not null check (dia_semana between 0 and 6),
  abierto     boolean not null default true,
  apertura    time not null default '09:00',
  cierre      time not null default '19:00',
  updated_at  timestamptz not null default now(),
  unique (sucursal_id, dia_semana),
  check (not abierto or cierre > apertura)
);
comment on table public.horarios_sucursal is 'Horario de atención por día. La agenda y las reservas web no permiten citas fuera de él.';

create trigger horarios_sucursal_updated_at before update on public.horarios_sucursal
  for each row execute function privado.set_updated_at();
create trigger horarios_sucursal_auditoria after update on public.horarios_sucursal
  for each row execute function privado.registrar_auditoria();

-- Horario inicial: lunes a sábado 9:00–19:00, domingo cerrado.
create or replace function privado.crear_horario_sucursal()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.horarios_sucursal (sucursal_id, dia_semana, abierto)
  select new.id, d, d <> 0 from generate_series(0, 6) as d;
  return new;
end;
$$;
revoke all on function privado.crear_horario_sucursal() from public, anon, authenticated;

create trigger sucursales_horario_inicial after insert on public.sucursales
  for each row execute function privado.crear_horario_sucursal();

insert into public.horarios_sucursal (sucursal_id, dia_semana, abierto)
select s.id, d, d <> 0
from public.sucursales s cross join generate_series(0, 6) as d
on conflict do nothing;

revoke all on public.horarios_sucursal from anon, authenticated;
grant select on public.horarios_sucursal to authenticated;
grant update (abierto, apertura, cierre) on public.horarios_sucursal to authenticated;

alter table public.horarios_sucursal enable row level security;

create policy "horarios: los ve quien tiene acceso" on public.horarios_sucursal
  for select to authenticated
  using (privado.tiene_acceso(sucursal_id));

create policy "horarios: edita quien configura la sucursal" on public.horarios_sucursal
  for update to authenticated
  using (privado.puede(sucursal_id, 'configuracion', true))
  with check (privado.puede(sucursal_id, 'configuracion', true));

-- ---------------------------------------------------------------------
-- Logo: almacenamiento público de solo lectura; solo admins suben o borran.
-- El servidor convierte la imagen a WebP antes de subirla (no se aceptan SVG).
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('marca', 'marca', true, 2097152, array['image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create policy "marca: admins suben" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'marca' and privado.es_admin_alguno());

create policy "marca: admins reemplazan" on storage.objects
  for update to authenticated
  using (bucket_id = 'marca' and privado.es_admin_alguno())
  with check (bucket_id = 'marca' and privado.es_admin_alguno());

create policy "marca: admins borran" on storage.objects
  for delete to authenticated
  using (bucket_id = 'marca' and privado.es_admin_alguno());
