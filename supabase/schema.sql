-- ============================================================
-- GTAHUB · Content Hub — esquema completo
-- Pégalo tal cual en Supabase → SQL Editor → Run.
-- Es idempotente: se puede volver a correr sin romper nada.
-- ============================================================

create extension if not exists pgcrypto;

-- ------------------------------------------------------------
-- Perfiles: una fila por persona del equipo, ligada a auth.users
-- ------------------------------------------------------------
create table if not exists public.perfiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  nombre     text not null default '',
  rol        text not null default 'Equipo',
  debe_cambiar_password boolean not null default true,
  created_at timestamptz not null default now()
);

-- Por si la tabla ya existia sin la columna
alter table public.perfiles
  add column if not exists debe_cambiar_password boolean not null default true;

comment on column public.perfiles.debe_cambiar_password is
  'true = el hub obliga a cambiar la contrasena temporal al entrar. Se apaga solo al cambiarla.';

comment on table public.perfiles is
  'Quien puede entrar al hub. Se crea sola al dar de alta el usuario en Authentication.';

-- Alta automatica del perfil cuando se crea el usuario
create or replace function public.fn_nuevo_perfil()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.perfiles (id, nombre, rol)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'nombre', ''), split_part(new.email, '@', 1)),
    coalesce(nullif(new.raw_user_meta_data ->> 'rol', ''), 'Equipo')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists tr_nuevo_perfil on auth.users;
create trigger tr_nuevo_perfil
  after insert on auth.users
  for each row execute function public.fn_nuevo_perfil();

-- Perfiles para usuarios que ya existieran antes de correr esto
insert into public.perfiles (id, nombre)
select u.id, split_part(u.email, '@', 1)
from auth.users u
where not exists (select 1 from public.perfiles p where p.id = u.id);

-- ------------------------------------------------------------
-- updated_at automatico
-- ------------------------------------------------------------
create or replace function public.fn_touch()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ------------------------------------------------------------
-- Publicaciones
-- ------------------------------------------------------------
create table if not exists public.publicaciones (
  id                uuid primary key default gen_random_uuid(),
  titulo            text not null,
  seccion           text not null default 'esp'
                    check (seccion in ('esp', 'pe', 'ambas')),
  copy_texto        text,
  plataformas       text[] not null default '{}',
  estado            text not null default 'idea'
                    check (estado in ('idea', 'borrador', 'programada', 'publicada', 'pausada')),
  fecha_programada  timestamptz,
  responsable       text,
  hashtags          text,
  url               text,
  notas             text,
  alcance           integer,
  likes             integer,
  comentarios       integer,
  compartidos       integer,
  guardados         integer,
  creado_por        uuid references auth.users (id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- Por si la tabla ya existia sin la columna (base creada antes de las secciones)
alter table public.publicaciones add column if not exists seccion text not null default 'esp';
do $$ begin
  alter table public.publicaciones
    add constraint publicaciones_seccion_check check (seccion in ('esp', 'pe', 'ambas'));
exception when duplicate_object then null;
end $$;

comment on column public.publicaciones.plataformas is
  'Arreglo de: instagram, tiktok, discord, email, facebook. El mismo id que usa el dashboard.';

comment on column public.publicaciones.seccion is
  'esp = GTAHUB ESP (Orion/Andromeda), pe = GTAHUB PE (Pegasus, ingles), ambas = aplica a las dos.';

create index if not exists ix_pub_fecha  on public.publicaciones (fecha_programada);
create index if not exists ix_pub_estado on public.publicaciones (estado);

drop trigger if exists tr_pub_touch on public.publicaciones;
create trigger tr_pub_touch before update on public.publicaciones
  for each row execute function public.fn_touch();

-- ------------------------------------------------------------
-- Pendientes (kanban)
-- ------------------------------------------------------------
create table if not exists public.pendientes (
  id            uuid primary key default gen_random_uuid(),
  titulo        text not null,
  seccion       text not null default 'esp'
                check (seccion in ('esp', 'pe', 'ambas')),
  descripcion   text,
  estado        text not null default 'por_hacer'
                check (estado in ('por_hacer', 'en_progreso', 'listo')),
  prioridad     text not null default 'media'
                check (prioridad in ('alta', 'media', 'baja')),
  responsable   text,
  fecha_limite  date,
  orden         integer not null default 0,
  creado_por    uuid references auth.users (id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table public.pendientes add column if not exists seccion text not null default 'esp';
do $$ begin
  alter table public.pendientes
    add constraint pendientes_seccion_check check (seccion in ('esp', 'pe', 'ambas'));
exception when duplicate_object then null;
end $$;

create index if not exists ix_pen_estado on public.pendientes (estado, orden);

drop trigger if exists tr_pen_touch on public.pendientes;
create trigger tr_pen_touch before update on public.pendientes
  for each row execute function public.fn_touch();

-- ------------------------------------------------------------
-- Ideas
-- ------------------------------------------------------------
create table if not exists public.ideas (
  id           uuid primary key default gen_random_uuid(),
  titulo       text not null,
  seccion      text not null default 'esp'
               check (seccion in ('esp', 'pe', 'ambas')),
  descripcion  text,
  categoria    text,
  plataformas  text[] not null default '{}',
  estado       text not null default 'nueva'
               check (estado in ('nueva', 'en_evaluacion', 'aprobada', 'convertida', 'descartada')),
  fuente       text,
  impacto      smallint default 3 check (impacto between 1 and 5),
  esfuerzo     smallint default 3 check (esfuerzo between 1 and 5),
  creado_por   uuid references auth.users (id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

alter table public.ideas add column if not exists seccion text not null default 'esp';
do $$ begin
  alter table public.ideas
    add constraint ideas_seccion_check check (seccion in ('esp', 'pe', 'ambas'));
exception when duplicate_object then null;
end $$;

drop trigger if exists tr_ideas_touch on public.ideas;
create trigger tr_ideas_touch before update on public.ideas
  for each row execute function public.fn_touch();

-- ------------------------------------------------------------
-- Tendencias — lo que escribe la investigacion semanal
-- (metricas y movimientos de servidores de roleplay)
-- ------------------------------------------------------------
create table if not exists public.tendencias (
  id          uuid primary key default gen_random_uuid(),
  titulo      text not null,
  seccion     text not null default 'ambas'
              check (seccion in ('esp', 'pe', 'ambas')),
  resumen     text,
  fuente      text,
  servidor    text,
  metrica     text,
  valor       numeric,
  periodo     date default current_date,
  tags        text[] not null default '{}',
  created_at  timestamptz not null default now()
);

alter table public.tendencias add column if not exists seccion text not null default 'ambas';
do $$ begin
  alter table public.tendencias
    add constraint tendencias_seccion_check check (seccion in ('esp', 'pe', 'ambas'));
exception when duplicate_object then null;
end $$;

create index if not exists ix_ten_periodo on public.tendencias (periodo desc);

-- ------------------------------------------------------------
-- Metas semanales de publicacion por seccion y plataforma
-- ------------------------------------------------------------
create table if not exists public.metas (
  seccion       text not null check (seccion in ('esp', 'pe')),
  plataforma    text not null,
  meta_semanal  integer not null default 3 check (meta_semanal >= 0),
  updated_at    timestamptz not null default now(),
  primary key (seccion, plataforma)
);

drop trigger if exists tr_metas_touch on public.metas;
create trigger tr_metas_touch before update on public.metas
  for each row execute function public.fn_touch();

-- Metas iniciales (editables desde el dashboard, en Inicio)
insert into public.metas (seccion, plataforma, meta_semanal)
select s, p.plataforma, p.meta
from (values ('tiktok', 7), ('instagram', 5), ('facebook', 3), ('discord', 2), ('email', 1))
  as p (plataforma, meta)
cross join (values ('esp'), ('pe')) as x (s)
on conflict (seccion, plataforma) do nothing;

-- ------------------------------------------------------------
-- RLS: nadie anonimo ve nada. Quien inicio sesion, trabaja.
-- ------------------------------------------------------------
alter table public.perfiles      enable row level security;
alter table public.publicaciones enable row level security;
alter table public.pendientes    enable row level security;
alter table public.ideas         enable row level security;
alter table public.tendencias    enable row level security;
alter table public.metas         enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array['publicaciones', 'pendientes', 'ideas', 'tendencias', 'metas']
  loop
    execute format('drop policy if exists equipo_lee on public.%I', t);
    execute format('drop policy if exists equipo_escribe on public.%I', t);
    execute format(
      'create policy equipo_lee on public.%I for select to authenticated using (true)', t);
    execute format(
      'create policy equipo_escribe on public.%I for all to authenticated using (true) with check (true)', t);
  end loop;
end;
$$;

drop policy if exists perfiles_lee on public.perfiles;
create policy perfiles_lee on public.perfiles
  for select to authenticated using (true);

drop policy if exists perfil_propio on public.perfiles;
create policy perfil_propio on public.perfiles
  for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

-- ------------------------------------------------------------
-- Realtime: que todos vean los cambios al instante
-- ------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array['publicaciones', 'pendientes', 'ideas', 'tendencias', 'metas']
  loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', t);
    exception
      when duplicate_object then null;
      when undefined_object then null;
    end;
  end loop;
end;
$$;
