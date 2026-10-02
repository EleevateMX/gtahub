-- GTAHUB Content Hub — login sin exponer los hashes de contraseña
--
-- POR QUÉ
-- Hasta ahora el navegador pedía la fila completa del usuario
-- (`select=username,display_name,role,salt,pass_hash`) y comparaba el hash en
-- JavaScript. Como la llave publishable y el código del sitio son públicos,
-- cualquiera podía descargar el salt y el pass_hash de TODO el equipo y
-- romperlos sin conexión: son SHA-256 de una pasada, sin estiramiento, así que
-- una tarjeta gráfica prueba miles de millones de combinaciones por segundo.
--
-- QUÉ HACE ESTE SCRIPT
-- Mueve la comparación adentro de Postgres. El navegador manda usuario y
-- contraseña, y la base responde solo con el perfil (o nada). El salt y el
-- pass_hash dejan de salir de la base.
--
-- Las contraseñas actuales siguen sirviendo: es el mismo esquema
-- sha256(salt || ':' || contraseña), solo que calculado del lado del servidor.
-- Nadie se queda fuera.
--
-- CÓMO CORRERLO
-- Supabase → proyecto del hub (hwqiyqullrznovamkhsz) → SQL Editor → pegar
-- todo → Run. La última consulta imprime la comprobación.
--
-- El sitio ya está preparado: `hubLogin` en hub-api.js llama primero a
-- `hub_login` y, mientras esta migración no se corra, sigue usando el camino
-- anterior. En cuanto corra, cambia solo.

begin;

-- 1) La función que valida la contraseña dentro de la base.
--    SECURITY DEFINER: corre con los permisos del dueño de la tabla, así que
--    puede leer pass_hash aunque quien la invoca (anon) ya no pueda.
--    search_path fijo para que nadie pueda secuestrarla con objetos propios.
create or replace function public.hub_login(p_usuario text, p_password text)
returns table (username text, display_name text, role text)
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select u.username::text, u.display_name::text, u.role::text
  from public.gtahub_usuarios u
  where u.username = lower(split_part(btrim(p_usuario), '@', 1))
    and encode(sha256(convert_to(u.salt || ':' || p_password, 'UTF8')), 'hex') = u.pass_hash
  limit 1;
$$;

comment on function public.hub_login(text, text) is
  'Valida usuario y contraseña contra gtahub_usuarios y devuelve solo el perfil. '
  'Evita que salt y pass_hash salgan de la base.';

-- 2) Solo se puede ejecutar, y solo por los roles del sitio.
revoke all on function public.hub_login(text, text) from public;
grant execute on function public.hub_login(text, text) to anon, authenticated;

-- 3) Cerrar la lectura directa de la tabla de usuarios.
--    Ninguna otra parte del hub la consulta: el único acceso era el login.
revoke select, insert, update, delete on public.gtahub_usuarios from anon;
revoke select, insert, update, delete on public.gtahub_usuarios from authenticated;

-- 4) RLS como segunda barrera: sin políticas, nadie que no sea el dueño de la
--    tabla lee nada. La función del punto 1 sigue funcionando porque corre
--    como el dueño.
alter table public.gtahub_usuarios enable row level security;

commit;

-- ---------------------------------------------------------------------------
-- COMPROBACIÓN
-- Las tres filas deben decir "ok". Si alguna dice "FALTA", algo no aplicó.
-- ---------------------------------------------------------------------------
select
  'función hub_login' as revisa,
  case when exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'hub_login' and p.prosecdef
  ) then 'ok' else 'FALTA' end as estado

union all

select
  'anon ya no lee gtahub_usuarios',
  case when has_table_privilege('anon', 'public.gtahub_usuarios', 'SELECT')
       then 'FALTA' else 'ok' end

union all

select
  'RLS activo en gtahub_usuarios',
  case when (select relrowsecurity from pg_class where oid = 'public.gtahub_usuarios'::regclass)
       then 'ok' else 'FALTA' end;

-- ---------------------------------------------------------------------------
-- PRUEBA MANUAL (opcional)
-- Devuelve una fila con el usuario correcto y cero filas con la contraseña mala:
--
--   select * from public.hub_login('kevinagre', 'la-contraseña-real');
--   select * from public.hub_login('kevinagre', 'incorrecta');
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- SIGUIENTE PASO RECOMENDADO (aparte)
-- Esto cierra la fuga, pero el esquema sigue siendo SHA-256 de una pasada. Si
-- alguna vez se filtrara un respaldo de la base, las contraseñas caerían
-- rápido. Lo sólido es migrar a bcrypt con la extensión pgcrypto
-- (crypt/gen_salt) o mudar el login a Supabase Auth. Cualquiera de los dos
-- requiere que el equipo vuelva a fijar su contraseña una vez.
-- ---------------------------------------------------------------------------
