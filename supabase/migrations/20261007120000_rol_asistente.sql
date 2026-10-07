-- Fase 1 · Sesión 4: nuevo rol "asistente".
-- Va en su propia migración porque un valor nuevo de enum no se puede usar
-- en la misma transacción en la que se crea.
-- Nota: el valor 'estilista' se mantiene en la base de datos; en la app se muestra como "Profesional".
alter type public.rol_usuario add value if not exists 'asistente';
