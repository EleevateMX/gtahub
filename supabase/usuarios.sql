-- ============================================================
-- GTAHUB Content Hub — nombres y roles del equipo
--
-- Los usuarios se dan de alta en Supabase → Authentication → Users
-- → Add user, marcando "Auto Confirm User". El correo es
-- <usuario>@gtahub.gg: asi el equipo entra al hub escribiendo solo
-- su usuario (el hub le agrega el dominio).
--
-- AQUI NO VAN CONTRASENAS. Este archivo es publico; las contrasenas
-- viven solo en Supabase (cifradas) y cada quien cambia la suya al
-- entrar por primera vez.
--
-- Corre esto DESPUES de crear los usuarios: el perfil ya existe
-- (lo crea el trigger) y aqui solo se le pone nombre y rol.
-- ============================================================

-- Red de seguridad: si el schema no se corrio completo, esta columna puede
-- faltar. Se agrega aqui para que este archivo funcione por si solo.
alter table public.perfiles
  add column if not exists debe_cambiar_password boolean not null default true;

update public.perfiles p
set nombre = v.nombre,
    rol    = v.rol
from (values
  ('kevinagre@gtahub.gg', 'Kevinagre', 'CEO'),
  ('ferguson@gtahub.gg',  'Ferguson',  'CEO'),
  ('volter@gtahub.gg',    'Volter',    'CEO'),
  ('meded@gtahub.gg',     'MeDed',     'Director de Contenido')
) as v (correo, nombre, rol)
where p.id = (select u.id from auth.users u where u.email = v.correo);

-- Revisar como quedaron
select u.email, p.nombre, p.rol, p.debe_cambiar_password
from public.perfiles p
join auth.users u on u.id = p.id
order by p.rol, p.nombre;
