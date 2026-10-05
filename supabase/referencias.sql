-- GTAHUB Content Hub — referencias visuales y propuestas de copy
--
-- PARA QUÉ
-- Que el equipo vea como va a quedar una pieza antes de que exista: capturas,
-- bocetos, moodboard. Y que el copy se pueda proponer en varias versiones
-- para que el equipo elija, en vez de una sola casilla de texto.
--
-- Se cuelga de una idea, de una publicacion o de una tarea del kanban.
--
-- QUÉ CREA
-- 1. La tabla gtahub_referencias.
-- 2. El bucket publico de Storage "gtahub-media", donde caen los archivos
--    que se suben desde el hub.
--
-- CÓMO CORRERLO
-- Supabase → proyecto hwqiyqullrznovamkhsz → SQL Editor → pegar todo → Run.
-- https://supabase.com/dashboard/project/hwqiyqullrznovamkhsz/sql/new
--
-- Se puede correr varias veces sin romper nada.
--
-- OJO CON EL BUCKET
-- Si el bloque 2 no tiene permiso para crear las politicas de Storage (sale
-- un NOTICE, no un error), hazlo a mano desde el panel: Storage → New bucket
-- → nombre "gtahub-media" → marcar "Public bucket". Mientras no exista, el
-- hub sigue aceptando imagenes por URL; solo la subida de archivo falla, y
-- lo dice con un aviso claro.

begin;

-- ---------------------------------------------------------------------------
-- 1) La tabla
--    ref_tipo + ref_id apuntan a la fila padre. No hay llave foranea porque
--    el padre puede ser de tres tablas distintas; el borrado lo limpia el
--    hub al eliminar la pieza.
--    tipo = 'imagen' usa url (y texto como nota al pie).
--    tipo = 'copy'   usa texto (la version propuesta del caption).
-- ---------------------------------------------------------------------------
create table if not exists public.gtahub_referencias(
  id         uuid primary key default gen_random_uuid(),
  ref_tipo   text not null check (ref_tipo in ('idea','publicacion','tarea')),
  ref_id     uuid not null,
  tipo       text not null check (tipo in ('imagen','copy')),
  url        text,
  texto      text,
  autor      text,
  created_at timestamptz not null default now(),
  constraint gtahub_referencias_contenido check (
    (tipo = 'imagen' and url   is not null and length(url)   > 0) or
    (tipo = 'copy'   and texto is not null and length(texto) > 0)
  )
);

create index if not exists gtahub_referencias_padre_idx
  on public.gtahub_referencias(ref_tipo, ref_id, tipo, created_at);

comment on table public.gtahub_referencias is
  'Imagenes de referencia y propuestas de copy colgadas de una idea, publicacion o tarea.';

-- RLS igual que el resto del contenido: herramienta interna detras del login.
alter table public.gtahub_referencias enable row level security;
do $$ begin
  drop policy if exists referencias_todo on public.gtahub_referencias;
  create policy referencias_todo on public.gtahub_referencias
    for all to anon, authenticated using (true) with check (true);
end $$;

grant select, insert, update, delete
  on public.gtahub_referencias to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2) El bucket de Storage
--    Publico de lectura: las imagenes se pintan con <img src>, sin firmar
--    cada URL. Son referencias de trabajo, no material sensible.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('gtahub-media','gtahub-media', true, 5242880,
        array['image/jpeg','image/png','image/webp','image/gif','image/avif'])
on conflict (id) do update
  set public = true,
      file_size_limit = 5242880,
      allowed_mime_types = array['image/jpeg','image/png','image/webp','image/gif','image/avif'];

do $$ begin
  drop policy if exists gtahub_media_leer on storage.objects;
  create policy gtahub_media_leer on storage.objects
    for select to anon, authenticated using (bucket_id = 'gtahub-media');

  drop policy if exists gtahub_media_subir on storage.objects;
  create policy gtahub_media_subir on storage.objects
    for insert to anon, authenticated with check (bucket_id = 'gtahub-media');

  drop policy if exists gtahub_media_borrar on storage.objects;
  create policy gtahub_media_borrar on storage.objects
    for delete to anon, authenticated using (bucket_id = 'gtahub-media');
exception when insufficient_privilege then
  raise notice 'Sin permiso para crear las politicas de Storage. Crea el bucket gtahub-media como publico desde Storage → New bucket y listo.';
end $$;

commit;

-- ---------------------------------------------------------------------------
-- Comprobacion: la tabla vacia y el bucket publico
-- ---------------------------------------------------------------------------
select count(*) as referencias from public.gtahub_referencias;
select id, public, file_size_limit from storage.buckets where id = 'gtahub-media';
