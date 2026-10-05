-- GTAHUB Content Hub — tres marcas (ESP / ENG / BR), cuentas y brief
--
-- QUÉ HACE
-- 1. Permite la marca BR y renombra PE → ENG en las tres tablas de contenido.
-- 2. Crea gtahub_cuentas: la cuenta de cada marca en cada red.
-- 3. Crea gtahub_briefs: la guía de voz de cada marca.
-- 4. Permite el rol 'mkt' en gtahub_usuarios.
--
-- CÓMO CORRERLO
-- Supabase → proyecto hwqiyqullrznovamkhsz → SQL Editor → pegar todo → Run.
-- https://supabase.com/dashboard/project/hwqiyqullrznovamkhsz/sql/new
-- La última consulta imprime la comprobación.
--
-- El hub ya está preparado: funciona igual antes y después. Mientras estas
-- tablas no existan trata 'PE' como ENG al leer, sigue escribiendo 'PE', y
-- bloquea las altas en BR con un aviso. En cuanto esto corra, cambia solo.
--
-- Se puede correr varias veces sin romper nada.

begin;

-- ---------------------------------------------------------------------------
-- 1) La columna brand tiene que aceptar ESP, ENG y BR
-- ---------------------------------------------------------------------------
-- No se asume cómo se llama el CHECK que existía: se buscan y se quitan todos
-- los que restrinjan brand en estas tablas, y luego se pone el nuevo.
do $$
declare r record;
begin
  for r in
    select c.conrelid::regclass as tabla, c.conname as nombre
    from pg_constraint c
    join pg_attribute a
      on a.attrelid = c.conrelid and a.attnum = any (c.conkey)
    where c.contype = 'c'
      and a.attname = 'brand'
      and c.conrelid in ('public.gtahub_publicaciones'::regclass,
                         'public.gtahub_tareas'::regclass,
                         'public.gtahub_ideas'::regclass)
  loop
    execute format('alter table %s drop constraint %I', r.tabla, r.nombre);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 2) PE pasa a ENG en los datos que ya existen
-- ---------------------------------------------------------------------------
update public.gtahub_publicaciones set brand = 'ENG' where brand = 'PE';
update public.gtahub_tareas          set brand = 'ENG' where brand = 'PE';
update public.gtahub_ideas           set brand = 'ENG' where brand = 'PE';

-- Ahora sí, el CHECK con las tres marcas vigentes.
alter table public.gtahub_publicaciones
  add constraint gtahub_publicaciones_brand_check check (brand in ('ESP','ENG','BR'));
alter table public.gtahub_tareas
  add constraint gtahub_tareas_brand_check check (brand in ('ESP','ENG','BR'));
alter table public.gtahub_ideas
  add constraint gtahub_ideas_brand_check check (brand in ('ESP','ENG','BR'));

-- ---------------------------------------------------------------------------
-- 3) Cuentas: qué cuenta tiene cada marca en cada red
-- ---------------------------------------------------------------------------
create table if not exists public.gtahub_cuentas (
  brand      text not null check (brand in ('ESP','ENG','BR')),
  platform   text not null check (platform in ('instagram','tiktok','discord','email','facebook')),
  handle     text,
  url        text,
  updated_at timestamptz not null default now(),
  primary key (brand, platform)
);

-- Una fila por cada combinación marca·red, vacías para llenarse desde el hub.
insert into public.gtahub_cuentas (brand, platform)
select m.brand, p.platform
from (values ('ESP'),('ENG'),('BR')) as m(brand)
cross join (values ('instagram'),('tiktok'),('discord'),('email'),('facebook')) as p(platform)
on conflict (brand, platform) do nothing;

-- ---------------------------------------------------------------------------
-- 4) Brief: la guía de voz de cada marca
-- ---------------------------------------------------------------------------
create table if not exists public.gtahub_briefs (
  brand       text primary key check (brand in ('ESP','ENG','BR')),
  publico     text,
  tono        text,
  pilares     text,
  si_hacer    text,
  no_hacer    text,
  referencias text,
  cta         text,
  updated_at  timestamptz not null default now(),
  updated_by  text
);

insert into public.gtahub_briefs (brand)
values ('ESP'),('ENG'),('BR')
on conflict (brand) do nothing;

-- updated_at se mantiene solo: el hub hace upsert sin mandarlo.
create or replace function public.gtahub_touch()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

drop trigger if exists gtahub_briefs_touch on public.gtahub_briefs;
create trigger gtahub_briefs_touch before update on public.gtahub_briefs
  for each row execute function public.gtahub_touch();

drop trigger if exists gtahub_cuentas_touch on public.gtahub_cuentas;
create trigger gtahub_cuentas_touch before update on public.gtahub_cuentas
  for each row execute function public.gtahub_touch();

-- ---------------------------------------------------------------------------
-- 5) Permisos — mismo criterio que el resto del contenido del hub
-- ---------------------------------------------------------------------------
-- OJO: todo el hub entra con la MISMA llave anónima, así que la base no
-- distingue quién escribe. El candado de "solo marketing edita el brief" vive
-- en la interfaz y NO es una barrera de seguridad: quien abra la consola del
-- navegador puede saltárselo. Para que sea un permiso real, el login tiene que
-- pasar a Supabase Auth; entonces RLS puede ver auth.uid() y aquí se podría
-- escribir una política de verdad.
grant select, insert, update on public.gtahub_cuentas to anon, authenticated;
grant select, insert, update on public.gtahub_briefs  to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 6) El rol 'mkt' para quien lleva marketing
-- ---------------------------------------------------------------------------
-- El CHECK se arma con los roles que YA existen en la tabla MAS los cuatro
-- del hub. Antes era una lista fija de cuatro, y si el equipo tenia un rol
-- con otro nombre (por ejemplo 'contenido') el ALTER fallaba con
--   23514: ... is violated by some row
-- y, como el SQL Editor envuelve el archivo entero en una transaccion, eso
-- tiraba TODA la migracion: ni marcas, ni cuentas, ni brief. Una migracion
-- no tiene por que opinar sobre los roles que ya usaba el equipo.
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

commit;

-- ---------------------------------------------------------------------------
-- COMPROBACIÓN — las cinco filas deben decir "ok"
-- ---------------------------------------------------------------------------
select 'no queda ninguna fila en PE' as revisa,
  case when not exists (
    select 1 from public.gtahub_publicaciones where brand = 'PE'
    union all select 1 from public.gtahub_tareas where brand = 'PE'
    union all select 1 from public.gtahub_ideas  where brand = 'PE'
  ) then 'ok' else 'FALTA' end as estado
union all
select 'las tres tablas de contenido aceptan BR',
  -- Acotado a las tres tablas de contenido: gtahub_cuentas y gtahub_briefs
  -- traen su propio CHECK sobre brand y antes inflaban la cuenta.
  case when (select count(*) from pg_constraint c
             where c.contype='c'
               and c.conrelid in ('public.gtahub_publicaciones'::regclass,
                                  'public.gtahub_tareas'::regclass,
                                  'public.gtahub_ideas'::regclass)
               and pg_get_constraintdef(c.oid) like '%BR%') = 3
       then 'ok' else 'FALTA' end
union all
select 'gtahub_cuentas con 15 filas (3 marcas x 5 redes)',
  case when (select count(*) from public.gtahub_cuentas) = 15 then 'ok' else 'FALTA' end
union all
select 'gtahub_briefs con una fila por marca',
  case when (select count(*) from public.gtahub_briefs) = 3 then 'ok' else 'FALTA' end
union all
select 'quién puede editar el Brief (rol mkt)',
  coalesce(
    (select string_agg(username, ', ' order by username)
     from public.gtahub_usuarios where role = 'mkt'),
    'NADIE todavía · dale el rol a quien lleve marketing con el UPDATE de abajo')
union all
select 'el rol mkt es válido',
  case when (select pg_get_constraintdef(oid) from pg_constraint
             where conname = 'gtahub_usuarios_role_check') like '%mkt%'
       then 'ok' else 'FALTA' end;

-- ---------------------------------------------------------------------------
-- DESPUÉS DE CORRER ESTO
-- 1. Asigna el rol a quien lleva marketing:
--      update public.gtahub_usuarios set role = 'mkt' where username = '<usuario>';
-- 2. Confirma el nombre real del servidor de BR en hub-data.js (MARCAS.BR.servidores):
--    quedó como 'Por confirmar'.
-- 3. Llena las cuentas de cada marca desde el hub, en la vista Brief.
-- ---------------------------------------------------------------------------
