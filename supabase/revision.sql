-- GTAHUB Content Hub — ¿qué falta correr?
--
-- Este archivo NO cambia nada: solo mira y reporta. Pegalo en el SQL Editor
-- y te dice, archivo por archivo, que ya corrio y que no.
-- https://supabase.com/dashboard/project/hwqiyqullrznovamkhsz/sql/new
--
-- Lee la columna ESTADO:
--   LISTO  → ese archivo ya se corrio, no lo vuelvas a correr (aunque podrias:
--            todos son idempotentes).
--   FALTA  → corre supabase/<archivo> y vuelve a pegar esta revision.

-- ---------------------------------------------------------------------------
-- 1) ESTRUCTURA: tablas y funciones que cada archivo deja en la base
-- ---------------------------------------------------------------------------
select orden as paso, archivo, revisa,
       case when ok then 'LISTO' else 'FALTA' end as estado
from (values
  (1,'login-seguro.sql',   'funcion hub_login (el hash se compara en Postgres)',
     exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
             where n.nspname = 'public' and p.proname = 'hub_login')),
  (2,'marcas-brief.sql',   'tabla gtahub_cuentas (y con ella la marca BR y el brief)',
     to_regclass('public.gtahub_cuentas') is not null),
  (3,'marcas-brief.sql',   'tabla gtahub_briefs',
     to_regclass('public.gtahub_briefs') is not null),
  (4,'manychat.sql',       'tabla gtahub_manychat',
     to_regclass('public.gtahub_manychat') is not null),
  (5,'manychat-detalle.sql','tabla gtahub_manychat_pasos',
     to_regclass('public.gtahub_manychat_pasos') is not null),
  (6,'manychat-detalle.sql','tabla gtahub_manychat_botones',
     to_regclass('public.gtahub_manychat_botones') is not null),
  (7,'cuenta.sql',         'tabla gtahub_cuenta (cortes de la cuenta de IG)',
     to_regclass('public.gtahub_cuenta') is not null),
  (8,'referencias.sql',    'tabla gtahub_referencias (imagenes y propuestas de copy)',
     to_regclass('public.gtahub_referencias') is not null),
  (9,'referencias.sql',    'bucket gtahub-media en Storage',
     to_regclass('storage.buckets') is not null
     and exists (select 1 from storage.buckets where id = 'gtahub-media'))
) as t(orden, archivo, revisa, ok)
order by orden;

-- ---------------------------------------------------------------------------
-- 2) DATOS: la tabla puede existir y estar vacia. Esto cuenta las filas.
--    Un 0 donde esperabas numeros = falta correr la carga de ese archivo.
--
--    El conteo va por query_to_xml y no por un SELECT directo: Postgres
--    analiza la consulta entera antes de ejecutarla, asi que nombrar una
--    tabla que todavia no existe revienta el archivo aunque el CASE nunca
--    llegue a esa rama. Asi el reporte sale igual con la base a medio migrar.
-- ---------------------------------------------------------------------------
with esperado(orden, archivo, tabla, rel) as (values
  (1,'manychat.sql',        'gtahub_manychat · 2 cortes',          'public.gtahub_manychat'),
  (2,'manychat-detalle.sql','gtahub_manychat_pasos · 11 pasos',    'public.gtahub_manychat_pasos'),
  (3,'manychat-detalle.sql','gtahub_manychat_botones · 12 botones','public.gtahub_manychat_botones'),
  (4,'cuenta.sql',          'gtahub_cuenta · 1 corte de 30 dias',  'public.gtahub_cuenta'),
  (5,'referencias.sql',     'gtahub_referencias · arranca vacia',  'public.gtahub_referencias')
)
select orden as paso, archivo, tabla,
       case when to_regclass(rel) is null then 'la tabla no existe'
            else (xpath('/row/c/text()',
                   query_to_xml('select count(*) as c from '||rel, false, true, '')))[1]::text
       end as filas
from esperado
order by orden;

-- ---------------------------------------------------------------------------
-- 3) PENDIENTES Y PUBLICACIONES: el estado del contenido, no del esquema
--    - "Por hacer" deberia tener 1 (el concurso) despues de pendientes.sql
--    - publicadas sube a 13 despues de datos-sep-oct.sql
-- ---------------------------------------------------------------------------
select 'pendientes.sql' as archivo, 'tareas en Por hacer' as revisa,
       (select count(*) from public.gtahub_tareas where col = 'todo') as filas
union all
select 'datos-sep-oct.sql', 'publicaciones publicadas',
       (select count(*) from public.gtahub_publicaciones where status = 'publicado')
union all
select 'datos-sep-oct.sql', 'publicaciones programadas',
       (select count(*) from public.gtahub_publicaciones where status = 'programado');

-- ---------------------------------------------------------------------------
-- 4) ¿La marca BR ya es escribible?
--    Antes de marcas-brief.sql la columna brand solo acepta ESP y PE, asi que
--    el hub bloquea las altas en BR y sigue escribiendo 'PE' en vez de 'ENG'.
-- ---------------------------------------------------------------------------
select case when exists (
         select 1 from pg_constraint
         where conrelid = 'public.gtahub_publicaciones'::regclass
           and pg_get_constraintdef(oid) like '%BR%')
       then 'LISTO · BR acepta altas y se escribe ENG'
       else 'FALTA · la base todavia escribe PE y bloquea BR (corre marcas-brief.sql)'
       end as marcas;
