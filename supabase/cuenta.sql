-- GTAHUB Content Hub — cortes de la cuenta de Instagram
--
-- QUÉ HACE
-- Crea gtahub_cuenta: un renglón por corte de las estadísticas de la cuenta
-- (no de una pieza suelta). Siembra el corte de 30 días del 5 de septiembre
-- al 4 de octubre de 2026.
--
-- CÓMO CORRERLO
-- Supabase → proyecto hwqiyqullrznovamkhsz → SQL Editor → pegar todo → Run.
-- https://supabase.com/dashboard/project/hwqiyqullrznovamkhsz/sql/new
--
-- El hub ya está preparado: si la tabla no existe, Métricas no pinta el
-- bloque. Con un corte muestra la foto; con dos o más compara contra el
-- anterior y sale el crecimiento.
--
-- PARA AGREGAR EL CORTE DEL MES QUE VIENE:
--   insert into public.gtahub_cuenta
--     (corte, periodo_dias, reproducciones, espectadores, seguidores_netos,
--      interacciones, historias, reels, publicaciones)
--   values ('2026-11-04', 30, 0, 0, 0, 0, 0, 0, 0)
--   on conflict (corte, plataforma, brand) do update set
--     reproducciones = excluded.reproducciones, espectadores = excluded.espectadores,
--     seguidores_netos = excluded.seguidores_netos, interacciones = excluded.interacciones,
--     historias = excluded.historias, reels = excluded.reels,
--     publicaciones = excluded.publicaciones;
--
-- Se puede correr varias veces sin romper nada.

begin;

create extension if not exists pgcrypto;

create table if not exists public.gtahub_cuenta (
  id                uuid primary key default gen_random_uuid(),
  corte             date not null,
  plataforma        text not null default 'instagram',
  brand             text not null default 'ESP',
  periodo_dias      integer not null default 30,
  reproducciones    bigint  not null default 0,
  espectadores      bigint  not null default 0,
  seguidores_netos  integer not null default 0,
  interacciones     bigint  not null default 0,
  historias         bigint  not null default 0,
  reels             bigint  not null default 0,
  publicaciones     bigint  not null default 0,
  en_vivo           bigint  not null default 0,
  nota              text,
  created_at        timestamptz not null default now(),
  unique (corte, plataforma, brand)
);

comment on table public.gtahub_cuenta is
  'Cortes de las estadisticas de la cuenta. El hub compara los dos mas recientes.';
comment on column public.gtahub_cuenta.espectadores is
  'Cuentas distintas que vieron contenido en el periodo.';
comment on column public.gtahub_cuenta.seguidores_netos is
  'Altas menos bajas en el periodo. Puede ser negativo.';

create index if not exists ix_cuenta_corte on public.gtahub_cuenta (corte desc);

alter table public.gtahub_cuenta enable row level security;
do $$ begin
  drop policy if exists cuenta_todo on public.gtahub_cuenta;
  create policy cuenta_todo on public.gtahub_cuenta
    for all to anon, authenticated using (true) with check (true);
end $$;

-- ---------------------------------------------------------------------------
-- Corte de 30 dias: 5 de septiembre al 4 de octubre de 2026.
-- Historias, reels y publicaciones vienen redondeados por Instagram.
-- ---------------------------------------------------------------------------
insert into public.gtahub_cuenta
  (corte, plataforma, brand, periodo_dias, reproducciones, espectadores,
   seguidores_netos, interacciones, historias, reels, publicaciones, en_vivo, nota)
values
  ('2026-10-04', 'instagram', 'ESP', 30, 940807, 163237, 141, 12900,
   459000, 97000, 45000, 0,
   'Del 5 de septiembre al 4 de octubre. Historias/reels/publicaciones en redondo')
on conflict (corte, plataforma, brand) do update set
  reproducciones = excluded.reproducciones, espectadores = excluded.espectadores,
  seguidores_netos = excluded.seguidores_netos, interacciones = excluded.interacciones,
  historias = excluded.historias, reels = excluded.reels,
  publicaciones = excluded.publicaciones, en_vivo = excluded.en_vivo,
  nota = excluded.nota;

commit;

-- Comprobacion
select corte, reproducciones, espectadores, seguidores_netos, interacciones
from public.gtahub_cuenta order by corte desc;
