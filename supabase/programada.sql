-- GTAHUB Content Hub — la programada «Farmeando Aura» de Xanthi
--
-- POR QUÉ ESTE ARCHIVO
-- La revision dice que falta, pero datos-sep-oct.sql ya metio las 13
-- publicadas. O sea que ese archivo corrio y solo esa pieza no entro, o
-- entro y despues cambio de estado.
--
-- Este script NO pisa nada: si la pieza ya existe en cualquier estado, la
-- deja tal cual (si ya la publicaste y le pusiste numeros, se respetan).
-- Solo la crea si de verdad no esta.
--
-- Supabase → SQL Editor → pegar todo → Run.
-- La tabla del final te dice como quedo.

begin;

insert into public.gtahub_publicaciones
  (title, platform, type, fmt, status, publish_date, brand, srv, notes, created_by)
select 'Farmeando Aura (Xanthi)','instagram','video','reel','programado',
       '2026-10-05'::date,'ESP','Orion',
       'Sale primero como reel de prueba y despues sube a reel principal','Xanthi'
where not exists (
  select 1 from public.gtahub_publicaciones where title ilike '%Farmeando Aura%'
);

commit;

-- ---------------------------------------------------------------------------
-- Como quedo. Si sale status = 'publicado' es que ya la publicaste desde el
-- hub: no hay nada que arreglar, y la revision tambien lo dara por bueno.
--
-- Cuando salga y tengas sus numeros:
--   update public.gtahub_publicaciones
--   set status='publicado', views=0, likes=0, interactions=0
--   where title ilike '%Farmeando Aura%';
-- ---------------------------------------------------------------------------
select title, status, publish_date, coalesce(views,0) as views, created_by
from public.gtahub_publicaciones
where title ilike '%Aura%';
