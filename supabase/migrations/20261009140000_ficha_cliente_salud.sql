-- =====================================================================
-- Fase 1 · Sesiones 11-12: ficha del cliente — historial médico y documentos
-- Datos sensibles (Ley 81 de 2019): consentimiento expreso, acceso solo a roles
-- autorizados, archivos privados con enlaces temporales y registro de consultas.
--
-- Diseño: las tablas sensibles NO se leen directo. Todo pasa por funciones que
-- verifican el permiso y dejan constancia de quién consultó qué.
-- =====================================================================

-- ¿Puede ver los datos de salud de este cliente?
-- Admin (con 2 pasos) y recepción con Clientes. El profesional con cita con el
-- cliente se agrega al construir la Agenda (sesiones 14-16).
create or replace function privado.puede_ver_salud(p_cliente uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select privado.es_admin_alguno() or exists (
    select 1 from public.accesos a
    where a.usuario_id = (select auth.uid()) and a.activo and a.rol = 'recepcion'
      and privado.puede(a.sucursal_id, 'clientes')
  );
$$;

-- ¿Puede registrar o cambiar datos de salud? Admin, o recepción con Clientes total.
create or replace function privado.puede_editar_salud(p_cliente uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select privado.es_admin_alguno() or exists (
    select 1 from public.accesos a
    where a.usuario_id = (select auth.uid()) and a.activo and a.rol = 'recepcion'
      and privado.puede(a.sucursal_id, 'clientes', true)
  );
$$;
revoke all on function privado.puede_ver_salud(uuid), privado.puede_editar_salud(uuid) from public, anon;
grant execute on function privado.puede_ver_salud(uuid), privado.puede_editar_salud(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- Tablas
-- ---------------------------------------------------------------------
create table public.historial_medico (
  cliente_id          uuid primary key references public.clientes (id) on delete cascade,
  -- Consentimiento expreso del cliente para guardar sus datos de salud.
  consentimiento      boolean not null default false,
  consentimiento_at   timestamptz,
  consentimiento_por  uuid references public.perfiles (id) on delete set null,
  alergias            text check (char_length(alergias) <= 1000),
  condiciones         text check (char_length(condiciones) <= 1000),
  observaciones       text check (char_length(observaciones) <= 2000),
  tipo_sangre         text check (tipo_sangre in ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-')),
  peso_kg             numeric(5, 1) check (peso_kg between 1 and 400),
  altura_cm           numeric(5, 1) check (altura_cm between 30 and 250),
  presion             text check (presion ~ '^\d{2,3}/\d{2,3}$'),
  actualizado_por     uuid references public.perfiles (id) on delete set null,
  updated_at          timestamptz not null default now(),
  -- Sin consentimiento no se guarda ningún dato de salud.
  check (
    consentimiento or (
      alergias is null and condiciones is null and observaciones is null
      and tipo_sangre is null and peso_kg is null and altura_cm is null and presion is null
    )
  )
);

create table public.medicamentos_cliente (
  id          uuid primary key default gen_random_uuid(),
  cliente_id  uuid not null references public.historial_medico (cliente_id) on delete cascade,
  medicamento text not null check (char_length(medicamento) between 1 and 120),
  dosis       text check (char_length(dosis) <= 80),
  desde       date,
  orden       smallint not null default 0
);
create index medicamentos_cliente_idx on public.medicamentos_cliente (cliente_id, orden);

create type public.categoria_documento as enum
  ('consentimiento', 'estudio', 'antes_despues', 'receta', 'identificacion', 'otro');

create table public.documentos_cliente (
  id          uuid primary key default gen_random_uuid(),
  cliente_id  uuid not null references public.clientes (id) on delete cascade,
  categoria   public.categoria_documento not null,
  nombre      text not null check (char_length(nombre) between 1 and 120),
  path        text not null unique check (path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.(pdf|webp)$'),
  tipo        text not null check (tipo in ('application/pdf', 'image/webp')),
  tamano      integer not null check (tamano between 1 and 10485760),
  subido_por  uuid references public.perfiles (id) on delete set null,
  created_at  timestamptz not null default now()
);
create index documentos_cliente_idx on public.documentos_cliente (cliente_id, created_at desc);

-- Registro de quién consulta o cambia datos sensibles.
create table public.consultas_salud (
  id           uuid primary key default gen_random_uuid(),
  cliente_id   uuid not null references public.clientes (id) on delete cascade,
  usuario_id   uuid references public.perfiles (id) on delete set null,
  accion       text not null check (accion in
                 ('ver_historial', 'editar_historial', 'ver_documento', 'subir_documento', 'eliminar_documento')),
  documento_id uuid,
  detalle      text check (char_length(detalle) <= 200),
  created_at   timestamptz not null default now()
);
create index consultas_salud_idx on public.consultas_salud (cliente_id, created_at desc);

-- ---------------------------------------------------------------------
-- Privilegios: sin acceso directo (solo por las funciones de abajo)
-- ---------------------------------------------------------------------
revoke all on public.historial_medico, public.medicamentos_cliente, public.documentos_cliente, public.consultas_salud
  from anon, authenticated;
grant select on public.consultas_salud to authenticated;

alter table public.historial_medico enable row level security;
alter table public.medicamentos_cliente enable row level security;
alter table public.documentos_cliente enable row level security;
alter table public.consultas_salud enable row level security;

create policy "historial_medico: solo por funciones" on public.historial_medico
  for all to authenticated using (false) with check (false);
create policy "medicamentos: solo por funciones" on public.medicamentos_cliente
  for all to authenticated using (false) with check (false);
create policy "documentos: solo por funciones" on public.documentos_cliente
  for all to authenticated using (false) with check (false);
create policy "consultas_salud: las ve un administrador" on public.consultas_salud
  for select to authenticated using (privado.es_admin_alguno());

create or replace function privado.registrar_consulta(p_cliente uuid, p_accion text, p_documento uuid default null, p_detalle text default null)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.consultas_salud (cliente_id, usuario_id, accion, documento_id, detalle)
  values (p_cliente, (select auth.uid()), p_accion, p_documento, left(p_detalle, 200));
$$;
revoke all on function privado.registrar_consulta(uuid, text, uuid, text) from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- Funciones públicas (las llama la app con la sesión del usuario)
-- ---------------------------------------------------------------------

-- Qué puede hacer el usuario actual con la salud de este cliente.
create or replace function public.permisos_salud(p_cliente uuid)
returns table (ver boolean, editar boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select privado.puede_ver_salud(p_cliente), privado.puede_editar_salud(p_cliente);
$$;

-- Lee el historial médico y deja constancia de la consulta.
create or replace function public.ver_historial_medico(p_cliente uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_resultado jsonb;
begin
  if not privado.puede_ver_salud(p_cliente) then
    raise exception 'Sin permiso para ver el historial médico' using errcode = '42501';
  end if;
  if not exists (select 1 from public.clientes c where c.id = p_cliente) then
    raise exception 'Cliente no encontrado' using errcode = 'P0002';
  end if;

  perform privado.registrar_consulta(p_cliente, 'ver_historial');

  select jsonb_build_object(
    'historial', (
      select to_jsonb(h) || jsonb_build_object(
        'actualizado_por_nombre', (select p.nombre_completo from public.perfiles p where p.id = h.actualizado_por),
        'consentimiento_por_nombre', (select p.nombre_completo from public.perfiles p where p.id = h.consentimiento_por)
      )
      from public.historial_medico h where h.cliente_id = p_cliente
    ),
    'medicamentos', coalesce((
      select jsonb_agg(jsonb_build_object('medicamento', m.medicamento, 'dosis', m.dosis, 'desde', m.desde) order by m.orden)
      from public.medicamentos_cliente m where m.cliente_id = p_cliente
    ), '[]'::jsonb)
  ) into v_resultado;
  return v_resultado;
end;
$$;

-- Guarda el historial médico completo (reemplaza la medicación).
create or replace function public.guardar_historial_medico(p_cliente uuid, p_datos jsonb, p_medicamentos jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_consentimiento boolean := coalesce((p_datos ->> 'consentimiento')::boolean, false);
  v_previo boolean;
begin
  if not privado.puede_editar_salud(p_cliente) then
    raise exception 'Sin permiso para editar el historial médico' using errcode = '42501';
  end if;
  if not exists (select 1 from public.clientes c where c.id = p_cliente) then
    raise exception 'Cliente no encontrado' using errcode = 'P0002';
  end if;
  if jsonb_typeof(coalesce(p_medicamentos, '[]'::jsonb)) <> 'array' or jsonb_array_length(coalesce(p_medicamentos, '[]'::jsonb)) > 30 then
    raise exception 'Lista de medicamentos no válida' using errcode = '22023';
  end if;
  if not v_consentimiento and jsonb_array_length(coalesce(p_medicamentos, '[]'::jsonb)) > 0 then
    raise exception 'Falta el consentimiento del cliente' using errcode = '23514';
  end if;

  select h.consentimiento into v_previo from public.historial_medico h where h.cliente_id = p_cliente;

  insert into public.historial_medico as h (
    cliente_id, consentimiento, consentimiento_at, consentimiento_por,
    alergias, condiciones, observaciones, tipo_sangre, peso_kg, altura_cm, presion,
    actualizado_por, updated_at
  ) values (
    p_cliente, v_consentimiento,
    case when v_consentimiento then now() end,
    case when v_consentimiento then (select auth.uid()) end,
    nullif(btrim(p_datos ->> 'alergias'), ''),
    nullif(btrim(p_datos ->> 'condiciones'), ''),
    nullif(btrim(p_datos ->> 'observaciones'), ''),
    nullif(p_datos ->> 'tipo_sangre', ''),
    nullif(p_datos ->> 'peso_kg', '')::numeric,
    nullif(p_datos ->> 'altura_cm', '')::numeric,
    nullif(btrim(p_datos ->> 'presion'), ''),
    (select auth.uid()), now()
  )
  on conflict (cliente_id) do update set
    consentimiento     = excluded.consentimiento,
    -- La fecha y el autor del consentimiento se conservan mientras siga vigente.
    consentimiento_at  = case when excluded.consentimiento and coalesce(v_previo, false) then h.consentimiento_at else excluded.consentimiento_at end,
    consentimiento_por = case when excluded.consentimiento and coalesce(v_previo, false) then h.consentimiento_por else excluded.consentimiento_por end,
    alergias = excluded.alergias, condiciones = excluded.condiciones, observaciones = excluded.observaciones,
    tipo_sangre = excluded.tipo_sangre, peso_kg = excluded.peso_kg, altura_cm = excluded.altura_cm,
    presion = excluded.presion, actualizado_por = excluded.actualizado_por, updated_at = excluded.updated_at;

  delete from public.medicamentos_cliente m where m.cliente_id = p_cliente;
  insert into public.medicamentos_cliente (cliente_id, medicamento, dosis, desde, orden)
  select p_cliente, btrim(e ->> 'medicamento'), nullif(btrim(e ->> 'dosis'), ''), nullif(e ->> 'desde', '')::date, (o - 1)::smallint
  from jsonb_array_elements(coalesce(p_medicamentos, '[]'::jsonb)) with ordinality as t(e, o)
  where nullif(btrim(e ->> 'medicamento'), '') is not null;

  perform privado.registrar_consulta(p_cliente, 'editar_historial',
    null, case when not v_consentimiento and coalesce(v_previo, false) then 'Consentimiento retirado' end);
end;
$$;

-- Lista de documentos (sin abrirlos).
create or replace function public.documentos_de_cliente(p_cliente uuid)
returns table (id uuid, categoria public.categoria_documento, nombre text, tipo text, tamano integer,
               subido_por_nombre text, created_at timestamptz)
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
           (select p.nombre_completo from public.perfiles p where p.id = d.subido_por), d.created_at
    from public.documentos_cliente d
    where d.cliente_id = p_cliente
    order by d.created_at desc;
end;
$$;

-- Registra un documento nuevo y devuelve la ruta donde el servidor debe subir el archivo.
create or replace function public.registrar_documento(p_cliente uuid, p_categoria public.categoria_documento,
                                                      p_nombre text, p_tipo text, p_tamano integer)
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
  insert into public.documentos_cliente (id, cliente_id, categoria, nombre, path, tipo, tamano, subido_por)
  values (v_id, p_cliente, p_categoria, btrim(p_nombre), v_path, p_tipo, p_tamano, (select auth.uid()));
  perform privado.registrar_consulta(p_cliente, 'subir_documento', v_id, btrim(p_nombre));
  return query select v_id, v_path;
end;
$$;

-- Autoriza abrir un documento: deja constancia y devuelve su ruta privada.
create or replace function public.abrir_documento(p_documento uuid)
returns table (path text, tipo text, nombre text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_doc public.documentos_cliente;
begin
  select * into v_doc from public.documentos_cliente d where d.id = p_documento;
  if v_doc.id is null or not privado.puede_ver_salud(v_doc.cliente_id) then
    raise exception 'Sin permiso para ver el documento' using errcode = '42501';
  end if;
  perform privado.registrar_consulta(v_doc.cliente_id, 'ver_documento', v_doc.id, v_doc.nombre);
  return query select v_doc.path, v_doc.tipo, v_doc.nombre;
end;
$$;

-- Elimina el registro de un documento y devuelve la ruta para borrar el archivo.
create or replace function public.eliminar_documento(p_documento uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_doc public.documentos_cliente;
begin
  select * into v_doc from public.documentos_cliente d where d.id = p_documento;
  if v_doc.id is null or not privado.puede_editar_salud(v_doc.cliente_id) then
    raise exception 'Sin permiso para eliminar el documento' using errcode = '42501';
  end if;
  delete from public.documentos_cliente d where d.id = p_documento;
  perform privado.registrar_consulta(v_doc.cliente_id, 'eliminar_documento', v_doc.id, v_doc.nombre);
  return v_doc.path;
end;
$$;

revoke all on function public.permisos_salud(uuid), public.ver_historial_medico(uuid),
  public.guardar_historial_medico(uuid, jsonb, jsonb), public.documentos_de_cliente(uuid),
  public.registrar_documento(uuid, public.categoria_documento, text, text, integer),
  public.abrir_documento(uuid), public.eliminar_documento(uuid)
  from public, anon;
grant execute on function public.permisos_salud(uuid), public.ver_historial_medico(uuid),
  public.guardar_historial_medico(uuid, jsonb, jsonb), public.documentos_de_cliente(uuid),
  public.registrar_documento(uuid, public.categoria_documento, text, text, integer),
  public.abrir_documento(uuid), public.eliminar_documento(uuid)
  to authenticated;

-- ---------------------------------------------------------------------
-- Archivos: almacenamiento privado SIN políticas para usuarios.
-- Solo el servidor (clave secreta) sube y firma enlaces, después de que la
-- base de datos autorizó y registró la acción con las funciones de arriba.
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('documentos', 'documentos', false, 10485760, array['application/pdf', 'image/webp'])
on conflict (id) do update
  set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;
