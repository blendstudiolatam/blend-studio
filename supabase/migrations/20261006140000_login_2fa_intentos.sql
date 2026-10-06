-- =====================================================================
-- Fase 1 · Sesión 3: verificación en dos pasos y límite de intentos
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Los poderes de admin y de dueño exigen verificación en dos pasos (aal2).
--    Con solo la contraseña (aal1), un admin no tiene acceso a ninguna sucursal.
-- ---------------------------------------------------------------------
create or replace function privado.aal2()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select auth.jwt()) ->> 'aal', '') = 'aal2';
$$;

create or replace function privado.es_dueno()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select privado.aal2() and coalesce(
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
  with r as (
    select case
      when privado.es_dueno() then 'admin'::public.rol_usuario
      else (
        select a.rol
        from public.accesos a
        where a.usuario_id = (select auth.uid())
          and a.sucursal_id = p_sucursal
          and a.activo
      )
    end as rol
  )
  select case when r.rol = 'admin' and not privado.aal2() then null else r.rol end
  from r;
$$;

revoke all on function privado.aal2() from public, anon;
grant execute on function privado.aal2() to authenticated;

-- ---------------------------------------------------------------------
-- 2. Intentos de inicio de sesión (límite de intentos)
--    Solo el servidor (service_role) puede registrar y consultar intentos.
--    El correo se guarda como hash, no en texto.
-- ---------------------------------------------------------------------
create table privado.intentos_login (
  id         bigint generated always as identity primary key,
  email_hash text not null,
  ip         text not null,
  exito      boolean not null,
  created_at timestamptz not null default clock_timestamp()
);
create index intentos_login_email_idx on privado.intentos_login (email_hash, created_at desc);
create index intentos_login_ip_idx on privado.intentos_login (ip, created_at desc);
alter table privado.intentos_login enable row level security;
-- Sin políticas: nadie la lee ni escribe por la API; solo las funciones de abajo.
revoke all on privado.intentos_login from public, anon, authenticated;

-- Devuelve los segundos que faltan para poder intentar de nuevo (0 = permitido).
-- Reglas en una ventana de 15 minutos, contando fallos desde el último acierto:
--   * 5 fallos del mismo correo desde la misma IP
--   * 10 fallos del mismo correo desde cualquier IP
--   * 30 fallos desde la misma IP con cualquier correo
create or replace function public.login_espera_segundos(p_email_hash text, p_ip text)
returns integer
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_ventana constant interval := interval '15 minutes';
  v_desde timestamptz := now() - v_ventana;
  v_ultimo_ok timestamptz;
  v_bloqueo_hasta timestamptz;
begin
  select max(created_at) into v_ultimo_ok
  from privado.intentos_login
  where email_hash = p_email_hash and exito and created_at > v_desde;
  v_desde := greatest(v_desde, coalesce(v_ultimo_ok, v_desde));

  select max(t.hasta) into v_bloqueo_hasta
  from (
    -- 5.º fallo más reciente del correo desde esta IP
    select (select created_at from privado.intentos_login
            where email_hash = p_email_hash and ip = p_ip and not exito and created_at > v_desde
            order by created_at desc offset 4 limit 1) + v_ventana as hasta
    union all
    select (select created_at from privado.intentos_login
            where email_hash = p_email_hash and not exito and created_at > v_desde
            order by created_at desc offset 9 limit 1) + v_ventana
    union all
    select (select created_at from privado.intentos_login
            where ip = p_ip and not exito and created_at > now() - v_ventana
            order by created_at desc offset 29 limit 1) + v_ventana
  ) t;

  if v_bloqueo_hasta is null or v_bloqueo_hasta <= now() then
    return 0;
  end if;
  return ceil(extract(epoch from (v_bloqueo_hasta - now())))::integer;
end;
$$;

create or replace function public.login_registrar_intento(p_email_hash text, p_ip text, p_exito boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into privado.intentos_login (email_hash, ip, exito)
  values (left(p_email_hash, 128), left(p_ip, 64), p_exito);
  -- Limpieza: no guardar intentos de más de 1 día.
  delete from privado.intentos_login where created_at < now() - interval '1 day';
end;
$$;

revoke all on function public.login_espera_segundos(text, text) from public, anon, authenticated;
revoke all on function public.login_registrar_intento(text, text, boolean) from public, anon, authenticated;
grant execute on function public.login_espera_segundos(text, text) to service_role;
grant execute on function public.login_registrar_intento(text, text, boolean) to service_role;
