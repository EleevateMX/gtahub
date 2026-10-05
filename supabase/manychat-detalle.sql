-- GTAHUB Content Hub — detalle del flujo de Manychat
--
-- QUÉ HACE
-- Crea las dos tablas del recorrido, para que la sección de Manychat deje de
-- ser solo tres números:
--   gtahub_manychat_pasos    — cada mensaje del flujo con su envío y tasas
--   gtahub_manychat_botones  — el CTR de cada botón, o sea dónde deciden
-- y las siembra con el corte del reporte.
--
-- CÓMO CORRERLO
-- Supabase → proyecto hwqiyqullrznovamkhsz → SQL Editor → pegar todo → Run.
-- https://supabase.com/dashboard/project/hwqiyqullrznovamkhsz/sql/new
--
-- Requiere haber corrido antes supabase/manychat.sql.
-- El hub funciona igual sin esto: la sección muestra lo que haya.
--
-- Se puede correr varias veces sin romper nada.

begin;

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Pasos del flujo
-- ---------------------------------------------------------------------------
create table if not exists public.gtahub_manychat_pasos (
  id         uuid primary key default gen_random_uuid(),
  corte      date not null,
  flujo      text not null default 'Nuevos Usuarios',
  orden      integer not null default 0,
  paso       text not null,
  titulo     text,
  enviado    integer not null default 0,
  entregado  numeric,
  abierto    numeric,
  clic       numeric,
  created_at timestamptz not null default now(),
  unique (corte, flujo, paso)
);

comment on table public.gtahub_manychat_pasos is
  'Un renglon por mensaje del flujo. entregado/abierto/clic van en porcentaje (0-100).';
comment on column public.gtahub_manychat_pasos.clic is
  'Nulo cuando el mensaje no lleva boton: no es cero, es que no aplica.';

create index if not exists ix_mcpasos on public.gtahub_manychat_pasos (corte desc, orden);

-- ---------------------------------------------------------------------------
-- Botones: donde decide la gente
-- ---------------------------------------------------------------------------
create table if not exists public.gtahub_manychat_botones (
  id         uuid primary key default gen_random_uuid(),
  corte      date not null,
  flujo      text not null default 'Nuevos Usuarios',
  orden      integer not null default 0,
  paso       text not null,
  boton      text not null,
  ctr        numeric,
  created_at timestamptz not null default now(),
  unique (corte, flujo, paso, boton)
);

create index if not exists ix_mcbotones on public.gtahub_manychat_botones (corte desc, orden);

alter table public.gtahub_manychat_pasos   enable row level security;
alter table public.gtahub_manychat_botones enable row level security;
do $$ begin
  drop policy if exists mcpasos_todo on public.gtahub_manychat_pasos;
  create policy mcpasos_todo on public.gtahub_manychat_pasos
    for all to anon, authenticated using (true) with check (true);
  drop policy if exists mcbotones_todo on public.gtahub_manychat_botones;
  create policy mcbotones_todo on public.gtahub_manychat_botones
    for all to anon, authenticated using (true) with check (true);
end $$;

-- ---------------------------------------------------------------------------
-- Recorrido del ultimo corte
-- ---------------------------------------------------------------------------
insert into public.gtahub_manychat_pasos
  (corte, flujo, orden, paso, titulo, enviado, entregado, abierto, clic)
values
  (current_date,'Nuevos Usuarios', 1,'Bienvenida',  '¿Tienes GTA V en PC?',       152, 100, 85.5, 49.3),
  (current_date,'Nuevos Usuarios', 2,'Mensaje #1',  'Todavía no tengo el juego',   44, 100, 95.5, 27.3),
  (current_date,'Nuevos Usuarios', 3,'Mensaje #2',  '¿Ya tienes FiveM instalado?', 28, 100, 96.4, 92.9),
  (current_date,'Nuevos Usuarios', 4,'Mensaje #3',  'Estoy en consola',            15, 100, 93.3, 26.7),
  (current_date,'Nuevos Usuarios', 5,'Mensaje #4',  '¿Qué es FiveM?',               6, 100, 100,  50),
  (current_date,'Nuevos Usuarios', 6,'Mensaje #5',  'Descarga e instalación',      14, 100, 85.7, 42.9),
  (current_date,'Nuevos Usuarios', 7,'Mensaje #6',  'Soporte de instalación',       2, 100, 100,  50),
  (current_date,'Nuevos Usuarios', 8,'Mensaje #8',  'Nombre del personaje',        17, 100, 88.2, null),
  (current_date,'Nuevos Usuarios', 9,'Mensaje #10', 'Elección de comunidad',        9, 100, 88.9, 77.8),
  (current_date,'Nuevos Usuarios',10,'Mensaje #11', 'Cómo conectarse + referido',   7, 100, 100,  null),
  (current_date,'Nuevos Usuarios',11,'Mensaje #12', 'Invitación al Discord',        7, 100, 100,  42.9)
on conflict (corte, flujo, paso) do update set
  titulo = excluded.titulo, orden = excluded.orden, enviado = excluded.enviado,
  entregado = excluded.entregado, abierto = excluded.abierto, clic = excluded.clic;

-- ---------------------------------------------------------------------------
-- CTR por boton
-- ---------------------------------------------------------------------------
insert into public.gtahub_manychat_botones (corte, flujo, orden, paso, boton, ctr)
values
  (current_date,'Nuevos Usuarios',1,'Bienvenida · ¿Tienes GTA V en PC?','Todavía no',          29),
  (current_date,'Nuevos Usuarios',2,'Bienvenida · ¿Tienes GTA V en PC?','Sí, en PC',           18),
  (current_date,'Nuevos Usuarios',3,'Bienvenida · ¿Tienes GTA V en PC?','Lo tengo en consola', 10),
  (current_date,'Nuevos Usuarios',4,'Mensaje #2 · ¿Ya tienes FiveM instalado?','Sí, ya lo tengo', 43),
  (current_date,'Nuevos Usuarios',5,'Mensaje #2 · ¿Ya tienes FiveM instalado?','Todavía no',     39),
  (current_date,'Nuevos Usuarios',6,'Mensaje #2 · ¿Ya tienes FiveM instalado?','¿Qué es FiveM?', 21),
  (current_date,'Nuevos Usuarios',7,'Mensaje #10 · Elección de comunidad','Eligieron comunidad', 77.8),
  (current_date,'Nuevos Usuarios',8,'Mensaje #5 · Descarga e instalación','Ya quedó',            36),
  (current_date,'Nuevos Usuarios',9,'Mensaje #5 · Descarga e instalación','Me atoré',            14),
  (current_date,'Nuevos Usuarios',10,'Mensaje #6 · Soporte de instalación','Funcionó',           50),
  (current_date,'Nuevos Usuarios',11,'Mensaje #12 · Invitación al Discord','Botón del mensaje 1',27),
  (current_date,'Nuevos Usuarios',12,'Mensaje #12 · Invitación al Discord','Botón del mensaje 3',27)
on conflict (corte, flujo, paso, boton) do update set
  ctr = excluded.ctr, orden = excluded.orden;

commit;

-- Comprobacion
select orden, paso, titulo, enviado, abierto, clic
from public.gtahub_manychat_pasos order by corte desc, orden;
