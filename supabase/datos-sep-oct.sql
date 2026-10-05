-- GTAHUB Content Hub — resultados de Instagram, septiembre y octubre 2026
--
-- QUÉ HACE
-- 1. Borra las dos tareas vencidas de la columna "Por hacer".
-- 2. Carga como PUBLICADAS las piezas que ya salieron en Instagram,
--    con las vistas reales que reporta la app.
--
-- CÓMO CORRERLO
-- Supabase → proyecto hwqiyqullrznovamkhsz → SQL Editor → pegar todo → Run.
-- https://supabase.com/dashboard/project/hwqiyqullrznovamkhsz/sql/new
--
-- Se puede correr varias veces: nada se duplica (se compara titulo + fecha)
-- y el borrado no falla si las tareas ya no estan.
--
-- OJO CON LAS FECHAS
-- El bloque 2 trae las fechas confirmadas en las pantallas de estadisticas.
-- El bloque 3 trae piezas cuya fecha no aparecia: revisa la columna de fecha
-- antes de correr, o corrige despues con el UPDATE del final.

begin;

-- ---------------------------------------------------------------------------
-- 1) Las dos tareas vencidas de "Por hacer"
--    NOTA: pendientes.sql ya hace esto y mas (vacia la columna completa y
--    deja un solo pendiente). Este bloque se queda por si corres solo este
--    archivo; correr los dos no hace dano.
-- ---------------------------------------------------------------------------
delete from public.gtahub_tareas
where col = 'todo'
  and title in (
    'Promo: Raspa y Ganas al 50% (toda esta semana)',
    'Countdown: migración a GTAHUB Orion (15 de septiembre)'
  );

-- ---------------------------------------------------------------------------
-- 2) Piezas con fecha y metricas confirmadas
--    views        = Visualizaciones / Reproducciones
--    interactions = "Interacciones" de Instagram cuando la reporta; si no,
--                   likes + comentarios + compartidos + guardados
--    notes        = el desglose completo, para no perder detalle
-- ---------------------------------------------------------------------------
insert into public.gtahub_publicaciones
  (title, platform, type, fmt, status, publish_date, brand, srv,
   views, likes, interactions, notes, created_by)
select v.* from (values
  ('Orión ya está en FiveM (XP x3 · 3 días)',
   'instagram','video','reel','publicado','2026-09-15'::date,'ESP','Orion',
   90148, 1200, 1519,
   'Reel 1:06 · comentarios 39 · compartidos 72 · guardados 96 · actividad de perfil 136','MeDed'),

  ('¿Y después de la migración, qué viene?',
   'instagram','video','reel','publicado','2026-09-23'::date,'ESP','Orion',
   7000, 238, 312,
   'Reel 0:40 · Instagram reporta 7 mil en redondo · comentarios 13 · compartidos 14 · guardados 47','MeDed'),

  ('Sé un militar en el HUB',
   'instagram','video','reel','publicado','2026-09-24'::date,'ESP','Orion',
   125000, 1521, 1574,
   'Reel 0:49 · PROMOCIONADO · Instagram reporta 125 mil en redondo · comentarios 28 · compartidos 7 · guardados 18','MeDed'),

  ('Halloween 2026 está llegando a GTAHUB',
   'instagram','video','reel','publicado','2026-09-30'::date,'ESP','Orion',
   29158, 470, 559,
   'Reel 0:48 · comentarios 8 · compartidos 13 · guardados 22 · actividad de perfil 34','MeDed')
) as v(title, platform, type, fmt, status, publish_date, brand, srv,
       views, likes, interactions, notes, created_by)
where not exists (select 1 from public.gtahub_publicaciones p
                  where p.title = v.title and p.publish_date = v.publish_date);

-- ---------------------------------------------------------------------------
-- 3) Piezas con vistas confirmadas y FECHA POR CONFIRMAR
--    Las vistas salen del grid del perfil. La fecha es estimada por el orden
--    del grid y por lo que dice la pieza; corrigela si no cuadra.
--    Sin likes ni interacciones: esas pantallas todavia no las tengo, y el
--    hub prefiere un hueco honesto a un numero inventado.
-- ---------------------------------------------------------------------------
insert into public.gtahub_publicaciones
  (title, platform, type, fmt, status, publish_date, brand, srv,
   views, likes, interactions, notes, created_by)
select v.* from (values
  ('¿Cómo jugar? En 3 sencillos pasos',
   'instagram','video','reel','publicado','2026-10-01'::date,'ESP','Orion',
   6865, 152, 218,'FECHA POR CONFIRMAR · fijada en el perfil · espectadores 4,054 · tiempo promedio 11 s · nuevos seguidores 5 · comentarios 9 · republicaciones 13 · enviados 11 · guardados 33','MeDed'),

  ('Nos vemos en Andrómeda (abierto ahora en FiveM)',
   'instagram','post','post','publicado','2026-10-02'::date,'ESP','Andromeda',
   5725, null, null,'FECHA POR CONFIRMAR · fijada en el perfil','MeDed'),

  ('Imágenes de la semana 10 (semana 40)',
   'instagram','post','carrusel','publicado','2026-09-29'::date,'ESP','Orion',
   5881, null, null,'FECHA POR CONFIRMAR · la pieza dice semana 40 de 2026','MeDed'),

  ('Subastas de coches activas',
   'instagram','post','carrusel','publicado','2026-09-26'::date,'ESP','Orion',
   7240, null, null,'FECHA POR CONFIRMAR','MeDed'),

  ('La Isla: una nueva cara a Cayo Perico',
   'instagram','video','reel','publicado','2026-09-22'::date,'ESP','Orion',
   7016, null, null,'FECHA POR CONFIRMAR','MeDed'),

  ('Contrate sicarios, sale mal · GTA Roleplay',
   'instagram','post','carrusel','publicado','2026-09-21'::date,'ESP','Orion',
   7056, null, null,'FECHA POR CONFIRMAR','MeDed'),

  ('Imágenes de la semana 08 (semana 38)',
   'instagram','post','carrusel','publicado','2026-09-20'::date,'ESP','Orion',
   7516, null, null,'FECHA POR CONFIRMAR · la pieza dice semana 38 de 2026','MeDed'),

  ('¿Problemas con las texturas? Tutorial de PNK',
   'instagram','video','reel','publicado','2026-09-19'::date,'ESP','Orion',
   9880, null, null,'FECHA POR CONFIRMAR','MeDed'),

  ('Juega 2 horas y gana premios',
   'instagram','post','post','publicado','2026-09-18'::date,'ESP','Orion',
   5907, null, null,'FECHA POR CONFIRMAR · la pieza corre del sábado 19 al lunes 21 de septiembre','MeDed')
) as v(title, platform, type, fmt, status, publish_date, brand, srv,
       views, likes, interactions, notes, created_by)
where not exists (select 1 from public.gtahub_publicaciones p
                  where p.title = v.title and p.publish_date = v.publish_date);

-- ---------------------------------------------------------------------------
-- 4) Programadas
-- ---------------------------------------------------------------------------
insert into public.gtahub_publicaciones
  (title, platform, type, fmt, status, publish_date, brand, srv, notes, created_by)
select v.* from (values
  ('Farmeando Aura (Xanthi)',
   'instagram','video','reel','programado','2026-10-05'::date,'ESP','Orion',
   'Sale primero como reel de prueba y despues sube a reel principal','Xanthi')
) as v(title, platform, type, fmt, status, publish_date, brand, srv, notes, created_by)
where not exists (select 1 from public.gtahub_publicaciones p
                  where p.title = v.title and p.publish_date = v.publish_date);

commit;

-- ---------------------------------------------------------------------------
-- Cuando salga y tengas sus numeros:
--   update public.gtahub_publicaciones
--   set status='publicado', views=0, likes=0, interactions=0
--   where title = 'Farmeando Aura (Xanthi)';
--
-- Para corregir una fecha despues:
--   update public.gtahub_publicaciones
--   set publish_date = '2026-09-27'
--   where title = 'Subastas de coches activas';
--
-- Para agregar likes e interacciones cuando tengas la pantalla:
--   update public.gtahub_publicaciones
--   set likes = 120, interactions = 180
--   where title = 'La Isla: una nueva cara a Cayo Perico';
-- ---------------------------------------------------------------------------

-- Comprobacion
select publish_date, title, views, likes, interactions
from public.gtahub_publicaciones
where status = 'publicado' and publish_date >= '2026-09-01'
order by publish_date desc;

select col, count(*) as tareas from public.gtahub_tareas group by col order by col;
