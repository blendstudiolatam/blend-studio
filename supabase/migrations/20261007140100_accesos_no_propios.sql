-- Fase 1 · Sesión 5: un admin no puede modificar ni quitar su propio acceso
-- (evita quedarse sin administrador por error). El dueño no tiene filas en accesos.

drop policy "accesos: admin modifica en su sucursal" on public.accesos;
create policy "accesos: admin modifica en su sucursal (no el propio)" on public.accesos
  for update to authenticated
  using (privado.es_admin(sucursal_id) and usuario_id <> (select auth.uid()))
  with check (privado.es_admin(sucursal_id) and usuario_id <> (select auth.uid()));

drop policy "accesos: admin quita en su sucursal" on public.accesos;
create policy "accesos: admin quita en su sucursal (no el propio)" on public.accesos
  for delete to authenticated
  using (privado.es_admin(sucursal_id) and usuario_id <> (select auth.uid()));

-- Lo mismo para los ajustes personales de permisos.
drop policy "permisos_usuario: admin crea en su sucursal" on public.permisos_usuario;
create policy "permisos_usuario: admin crea en su sucursal (no para sí)" on public.permisos_usuario
  for insert to authenticated
  with check (privado.es_admin(sucursal_id) and usuario_id <> (select auth.uid()));

drop policy "permisos_usuario: admin edita en su sucursal" on public.permisos_usuario;
create policy "permisos_usuario: admin edita en su sucursal (no los propios)" on public.permisos_usuario
  for update to authenticated
  using (privado.es_admin(sucursal_id) and usuario_id <> (select auth.uid()))
  with check (privado.es_admin(sucursal_id) and usuario_id <> (select auth.uid()));

drop policy "permisos_usuario: admin borra en su sucursal" on public.permisos_usuario;
create policy "permisos_usuario: admin borra en su sucursal (no los propios)" on public.permisos_usuario
  for delete to authenticated
  using (privado.es_admin(sucursal_id) and usuario_id <> (select auth.uid()));
