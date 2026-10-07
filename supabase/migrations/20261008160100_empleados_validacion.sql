-- Corrige la validación de sucursal: el campo servicio_id solo existe en empleado_servicios,
-- así que se consulta en un bloque aparte (plpgsql no garantiza corto circuito en AND).
create or replace function privado.validar_sucursal_empleado()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (select 1 from public.empleados e where e.id = new.empleado_id and e.sucursal_id = new.sucursal_id) then
    raise exception 'El empleado no pertenece a la sucursal';
  end if;
  if tg_table_name = 'empleado_servicios' then
    if not exists (
      select 1 from public.servicios s
      where s.id = (to_jsonb(new) ->> 'servicio_id')::uuid and s.sucursal_id = new.sucursal_id
    ) then
      raise exception 'El servicio no pertenece a la sucursal';
    end if;
  end if;
  return new;
end;
$$;
