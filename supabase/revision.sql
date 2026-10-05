-- GTAHUB Content Hub — ¿qué falta correr?
--
-- Este archivo NO cambia nada: solo mira y reporta.
-- Pegalo en el SQL Editor y dale Run.
-- https://supabase.com/dashboard/project/hwqiyqullrznovamkhsz/sql/new
--
-- Es UNA SOLA consulta a proposito. El SQL Editor de Supabase muestra nada
-- mas el resultado de la ultima sentencia, asi que un archivo con varios
-- SELECT se ve como si solo tuviera el ultimo. Todo va unido en una tabla.
--
-- Lee la columna ESTADO:
--   LISTO  → ese archivo ya corrio.
--   FALTA  → corre supabase/<archivo> y vuelve a pegar esta revision.
--   A MEDIAS → la tabla existe pero le faltan filas: corre el archivo otra
--              vez (todos son idempotentes, no duplican nada).
--
-- El conteo de filas va por query_to_xml y no por un SELECT directo:
-- Postgres analiza la consulta entera antes de ejecutarla, asi que nombrar
-- una tabla que todavia no existe reventaria el archivo aunque el CASE nunca
-- llegue a esa rama. Asi el reporte sale igual con la base a medio migrar.

with
-- 1) Estructura: lo que cada archivo deja creado
estructura(paso, archivo, revisa, ok) as (values
  (1,'login-seguro.sql','funcion hub_login · el hash se compara dentro de Postgres',
     exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
             where n.nspname = 'public' and p.proname = 'hub_login')),
  (2,'marcas-brief.sql','tabla gtahub_cuentas · cuentas de cada marca en cada red',
     to_regclass('public.gtahub_cuentas') is not null),
  (3,'marcas-brief.sql','tabla gtahub_briefs · la guia de voz por marca',
     to_regclass('public.gtahub_briefs') is not null),
  (4,'marcas-brief.sql','la columna brand acepta BR · y el hub escribe ENG, no PE',
     exists (select 1 from pg_constraint
             where conrelid = 'public.gtahub_publicaciones'::regclass
               and pg_get_constraintdef(oid) like '%BR%')),
  (5,'manychat.sql','tabla gtahub_manychat',
     to_regclass('public.gtahub_manychat') is not null),
  (6,'manychat-detalle.sql','tabla gtahub_manychat_pasos',
     to_regclass('public.gtahub_manychat_pasos') is not null),
  (7,'manychat-detalle.sql','tabla gtahub_manychat_botones',
     to_regclass('public.gtahub_manychat_botones') is not null),
  (8,'cuenta.sql','tabla gtahub_cuenta · cortes de la cuenta de Instagram',
     to_regclass('public.gtahub_cuenta') is not null),
  (9,'referencias.sql','tabla gtahub_referencias · imagenes y propuestas de copy',
     to_regclass('public.gtahub_referencias') is not null),
  (10,'referencias.sql','bucket gtahub-media en Storage · para subir archivos',
     to_regclass('storage.buckets') is not null
     and exists (select 1 from storage.buckets where id = 'gtahub-media'))
),
-- 2) Datos: la tabla puede existir y estar vacia, que tambien es un "falta"
esperado(paso, archivo, revisa, rel, minimo) as (values
  (11,'manychat.sql',        'filas en gtahub_manychat',         'public.gtahub_manychat',         2),
  (12,'manychat-detalle.sql','filas en gtahub_manychat_pasos',   'public.gtahub_manychat_pasos',  11),
  (13,'manychat-detalle.sql','filas en gtahub_manychat_botones', 'public.gtahub_manychat_botones',12),
  (14,'cuenta.sql',          'filas en gtahub_cuenta',           'public.gtahub_cuenta',           1)
),
contado as (
  select paso, archivo, revisa, minimo,
         case when to_regclass(rel) is null then null
              else (xpath('/row/c/text()',
                     query_to_xml('select count(*) as c from '||rel, false, true, '')))[1]::text::bigint
         end as filas
  from esperado
),
-- 3) Contenido: el estado de las piezas, no del esquema
contenido(paso, archivo, revisa, estado) as (
  select 15,'pendientes.sql','tareas en «Por hacer» · debe quedar 1',
    case (select count(*) from public.gtahub_tareas where col = 'todo')
      when 1 then 'LISTO · 1'
      when 0 then 'FALTA · no esta el concurso'
      else 'FALTA · hay '||(select count(*) from public.gtahub_tareas where col = 'todo')||', deberia quedar 1'
    end
  union all
  select 16,'datos-sep-oct.sql','publicaciones publicadas · deben ser 13 o mas',
    case when (select count(*) from public.gtahub_publicaciones where status = 'publicado') >= 13
      then 'LISTO · '||(select count(*) from public.gtahub_publicaciones where status = 'publicado')
      else 'FALTA · hay '||(select count(*) from public.gtahub_publicaciones where status = 'publicado')||' de 13'
    end
  union all
  -- Se revisa que la pieza EXISTA, no que siga programada: 'programado' es
  -- un estado de paso, y en cuanto se publique este renglon diria FALTA
  -- para siempre por algo que en realidad ya se hizo.
  select 17,'datos-sep-oct.sql','la pieza «Farmeando Aura» · en cualquier estado',
    coalesce((select 'LISTO · '||status from public.gtahub_publicaciones
              where title ilike '%Farmeando Aura%' limit 1),
             'FALTA · corre programada.sql')
)
select paso, archivo, revisa,
       case when ok then 'LISTO' else 'FALTA' end as estado
from estructura
union all
select paso, archivo, revisa,
       case when filas is null  then 'FALTA · la tabla no existe'
            when filas = 0      then 'FALTA · la tabla esta vacia'
            when filas < minimo then 'A MEDIAS · '||filas||' de '||minimo
            else 'LISTO · '||filas end
from contado
union all
select paso, archivo, revisa, estado from contenido
order by 1;
