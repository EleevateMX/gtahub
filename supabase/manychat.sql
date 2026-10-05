-- GTAHUB Content Hub — cortes de Manychat (flujo Nuevos Usuarios)
--
-- QUÉ HACE
-- 1. Crea gtahub_manychat: un renglón por corte del flujo de bienvenida.
-- 2. Siembra los dos cortes del reporte (el anterior y el último).
--
-- CÓMO CORRERLO
-- Supabase → proyecto hwqiyqullrznovamkhsz → SQL Editor → pegar todo → Run.
-- https://supabase.com/dashboard/project/hwqiyqullrznovamkhsz/sql/new
-- La última consulta imprime la comprobación.
--
-- El hub ya está preparado: si la tabla no existe, Métricas simplemente no
-- muestra el bloque de Manychat. En cuanto esto corra, aparece solo y compara
-- el último corte contra el anterior.
--
-- PARA AGREGAR UN CORTE NUEVO cada vez que saques números de Manychat:
--   insert into public.gtahub_manychat (corte, envios, contactos, bandeja)
--   values (current_date, 260, 180, 540)
--   on conflict (corte, flujo, brand) do update
--     set envios = excluded.envios, contactos = excluded.contactos,
--         bandeja = excluded.bandeja;
--
-- Se puede correr varias veces sin romper nada.

begin;

create extension if not exists pgcrypto;

create table if not exists public.gtahub_manychat (
  id          uuid primary key default gen_random_uuid(),
  corte       date not null,
  flujo       text not null default 'Nuevos Usuarios',
  brand       text not null default 'ESP',
  envios      integer not null default 0,
  contactos   integer not null default 0,
  bandeja     integer not null default 0,
  correos     integer not null default 0,
  telefonos   integer not null default 0,
  entregado   numeric,
  abierto     numeric,
  clic        numeric,
  nota        text,
  created_at  timestamptz not null default now(),
  unique (corte, flujo, brand)
);

comment on table public.gtahub_manychat is
  'Un renglon por corte del flujo de Manychat. El hub compara los dos mas recientes.';
comment on column public.gtahub_manychat.bandeja is
  'Conversaciones abiertas acumuladas en la bandeja de entrada.';
comment on column public.gtahub_manychat.entregado is
  'Porcentaje de entrega del primer mensaje del flujo (0-100).';

create index if not exists ix_manychat_corte on public.gtahub_manychat (corte desc);

-- RLS igual que el resto del contenido: herramienta interna detras del login.
alter table public.gtahub_manychat enable row level security;
do $$ begin
  drop policy if exists manychat_todo on public.gtahub_manychat;
  create policy manychat_todo on public.gtahub_manychat
    for all to anon, authenticated using (true) with check (true);
end $$;

-- ---------------------------------------------------------------------------
-- Los dos cortes del reporte. Si las fechas reales son otras, cambialas aqui.
-- ---------------------------------------------------------------------------
insert into public.gtahub_manychat
  (corte, flujo, brand, envios, contactos, bandeja, correos, telefonos,
   entregado, abierto, clic, nota)
values
  (current_date - 1, 'Nuevos Usuarios', 'ESP', 117,  85, 474, 0, 0,
   null, null, null, 'Corte anterior'),
  (current_date,     'Nuevos Usuarios', 'ESP', 222, 152, 523, 0, 0,
   100, 85.5, 49.3, 'Ultimo corte: entrada del flujo, 152 personas')
on conflict (corte, flujo, brand) do update
  set envios = excluded.envios, contactos = excluded.contactos,
      bandeja = excluded.bandeja, correos = excluded.correos,
      telefonos = excluded.telefonos, entregado = excluded.entregado,
      abierto = excluded.abierto, clic = excluded.clic, nota = excluded.nota;

commit;

-- Comprobacion: deben salir los dos cortes, el mas reciente arriba.
select corte, envios, contactos, bandeja, entregado, abierto, clic
from public.gtahub_manychat
order by corte desc;
