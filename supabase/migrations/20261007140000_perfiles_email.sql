-- =====================================================================
-- Fase 1 · Sesión 5: correo visible en el perfil (para la lista de usuarios)
-- =====================================================================
-- El correo vive en auth.users (no accesible desde la API). Se copia a perfiles,
-- que ya tiene RLS: solo lo ven el propio usuario, el dueño y admin/recepción
-- de una sucursal compartida. Nadie lo puede editar desde la app.

alter table public.perfiles add column email text;

update public.perfiles p
set email = u.email
from auth.users u
where u.id = p.id;

create or replace function privado.crear_perfil()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.perfiles (id, nombre_completo, email)
  values (new.id, coalesce(left(new.raw_user_meta_data ->> 'nombre_completo', 120), ''), new.email);
  return new;
end;
$$;

create or replace function privado.sincronizar_email_perfil()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.perfiles set email = new.email where id = new.id;
  return new;
end;
$$;

create trigger al_cambiar_email_usuario
  after update of email on auth.users
  for each row
  when (old.email is distinct from new.email)
  execute function privado.sincronizar_email_perfil();

revoke all on function privado.sincronizar_email_perfil() from public, anon, authenticated;
