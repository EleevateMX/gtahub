-- GTAHUB Content Hub — MeDed pasa a rol 'mkt' (el que edita el Brief)
--
-- QUÉ HACE
-- 1. Se asegura de que el CHECK de la columna role acepte 'mkt'. Lo arma
--    leyendo los roles que YA existen y sumandoles los del hub, asi que no
--    puede fallar contra los datos de nadie.
-- 2. Le pone rol 'mkt' a MeDed.
--
-- POR QUÉ EL PASO 1
-- Para que este archivo funcione se corra antes o despues de
-- marcas-brief.sql. Si el CHECK todavia no conoce 'mkt', el UPDATE moriria
-- con 23514 y, como el SQL Editor envuelve todo en una transaccion, no se
-- aplicaria nada.
--
-- OJO: en el hub, el rol es ademas la etiqueta que sale bajo tu nombre en
-- la barra lateral. MeDed pasara a leerse MKT en vez de lo que diga hoy.
--
-- Supabase → SQL Editor → pegar todo → Run.

begin;

-- 1) Que 'mkt' sea un valor valido, sin tocar los roles que ya usa el equipo
do $$
declare
  r record;
  lista text;
begin
  for r in
    select c.conname as nombre
    from pg_constraint c
    join pg_attribute a
      on a.attrelid = c.conrelid and a.attnum = any (c.conkey)
    where c.contype = 'c'
      and a.attname = 'role'
      and c.conrelid = 'public.gtahub_usuarios'::regclass
  loop
    execute format('alter table public.gtahub_usuarios drop constraint %I', r.nombre);
  end loop;

  select string_agg(quote_literal(v), ', ' order by v) into lista
  from (
    select distinct role as v
    from public.gtahub_usuarios
    where role is not null and length(trim(role)) > 0
    union
    select unnest(array['ceo','dir','inv','mkt'])
  ) t;

  execute format(
    'alter table public.gtahub_usuarios add constraint gtahub_usuarios_role_check check (role in (%s))',
    lista);
end $$;

-- 2) El cambio. Se busca por usuario o por nombre, sin importar mayusculas,
--    para no depender de como quedo escrito al crear la cuenta.
update public.gtahub_usuarios
set role = 'mkt'
where lower(username) = 'meded' or lower(display_name) = 'meded';

commit;

-- ---------------------------------------------------------------------------
-- Comprobacion. Si MeDed no sale en la lista, es que su usuario se llama de
-- otra forma: mira la tabla completa y corrige el UPDATE de arriba.
--
-- Para quitarselo despues:
--   update public.gtahub_usuarios set role = 'dir' where username = 'meded';
-- ---------------------------------------------------------------------------
select username, display_name, role,
       case when role = 'mkt' then 'edita el Brief' else 'solo lectura del Brief' end as brief
from public.gtahub_usuarios
order by (role = 'mkt') desc, username;
