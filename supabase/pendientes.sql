-- GTAHUB Content Hub — dejar un solo pendiente en "Por hacer"
--
-- QUÉ HACE
-- 1. Vacia la columna "Por hacer" (col = 'todo') del kanban de Pendientes.
-- 2. Deja ahi una sola tarjeta: "Concurso de colección de Objetos".
--
-- QUÉ NO TOCA
-- Las columnas "En progreso" (prog) y "Hechas" (done) se quedan igual:
-- ahi vive el historico de lo que ya se trabajo, no se borra.
--
-- CÓMO CORRERLO
-- Supabase → proyecto hwqiyqullrznovamkhsz → SQL Editor → pegar todo → Run.
-- https://supabase.com/dashboard/project/hwqiyqullrznovamkhsz/sql/new
--
-- Se puede correr varias veces: el resultado siempre es el mismo pendiente.
-- Sustituye al bloque 1 de datos-sep-oct.sql (que borraba dos tareas por
-- nombre); este borra por columna, asi que no hace falta saber los titulos.

begin;

-- ---------------------------------------------------------------------------
-- 1) Fuera todo lo demas de "Por hacer"
-- ---------------------------------------------------------------------------
delete from public.gtahub_tareas
where col = 'todo'
  and title <> 'Concurso de colección de Objetos';

-- ---------------------------------------------------------------------------
-- 2) El unico pendiente
--    due_date queda en NULL a proposito: la tarjeta dira "sin fecha" hasta
--    que le pongas una. Sin fecha inventada no hay tarea falsamente vencida.
--    Marca y servidor: ESP / Orion. Se cambian desde el hub si toca otra.
-- ---------------------------------------------------------------------------
insert into public.gtahub_tareas
  (title, col, prio, brand, srv, platform, due_date, owner, prog, descr, created_by)
select 'Concurso de colección de Objetos', 'todo', 'alta',
       'ESP', 'Orion', null, null, '—', 0, null, 'MeDed'
where not exists (
  select 1 from public.gtahub_tareas
  where title = 'Concurso de colección de Objetos' and col = 'todo'
);

commit;

-- ---------------------------------------------------------------------------
-- Comprobacion: debe decir todo = 1
-- ---------------------------------------------------------------------------
select col, count(*) as tareas from public.gtahub_tareas group by col order by col;
select title, prio, brand, srv, coalesce(due_date::text,'sin fecha') as fecha
from public.gtahub_tareas where col = 'todo';
