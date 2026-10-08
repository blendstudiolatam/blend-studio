-- =====================================================================
-- Fase 1 · Sesión 20: ajustes de la revisión de seguridad
-- Funciones internas que por defecto quedaban ejecutables por PUBLIC.
-- (El público no tiene acceso al esquema "privado", así que no había
-- riesgo real; se cierra igual como defensa en profundidad.)
-- =====================================================================
revoke all on function privado.crear_perfil() from public, anon, authenticated;
revoke all on function privado.registrar_auditoria() from public, anon, authenticated;
revoke all on function privado.normalizar(text) from public, anon;
grant execute on function privado.normalizar(text) to authenticated;
