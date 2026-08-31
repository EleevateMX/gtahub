# GTAHUB · Content Hub

Dashboard del equipo de GTAHUB: publicaciones, pendientes, ideas, calendario y
métricas — todo en vivo sobre Supabase, instalable como app (PWA) en PC y iPhone.

Sitio estático (HTML + CSS + JS, sin build). Se despliega en Vercel con cada push.

---

## 1. Desplegar en Vercel

1. Entra a [vercel.com](https://vercel.com) e inicia sesión con GitHub.
2. **Add New → Project** → importa `EleevateMX/gtahub`.
3. Framework preset: **Other**. Sin build command, sin output directory.
4. **Deploy**. En un minuto queda una URL tipo `gtahub.vercel.app`.

Cada push a `main` vuelve a desplegar solo.

## 2. Crear el proyecto de Supabase (gratis, aparte)

El hub necesita su **propio** proyecto de Supabase — nada mezclado con los
proyectos de punto de venta.

1. Crea (o usa) una cuenta de Supabase con un correo distinto al de los
   proyectos POS — por ejemplo el correo institucional. Cada cuenta trae su
   propia organización con proyectos gratis.
2. **New project** → nombre `GTAHUB`, región `us-east-1` o la más cercana,
   plan **Free**. Guarda la contraseña de la base.
3. Abre **SQL Editor**, pega el contenido de [`supabase/schema.sql`](supabase/schema.sql)
   y dale **Run**. Crea las tablas, las políticas de seguridad y el realtime.
   (Opcional: corre también `supabase/seed.sql` para ver el tablero con
   contenido de ejemplo.)

## 3. Dar de alta al equipo

En Supabase → **Authentication → Users → Add user**:

- Correo y contraseña de cada persona.
- Marca **Auto Confirm User** para que pueda entrar sin confirmar correo.

El perfil dentro del hub se crea solo. Para poner nombre y rol visibles:

```sql
update public.perfiles set nombre = 'Edy', rol = 'Dirección'
where id = (select id from auth.users where email = 'edy@gtahub.gg');
```

Nadie sin usuario ve datos: las tablas tienen RLS y el rol anónimo no tiene
permiso de lectura.

## 4. Conectar el sitio con la base

En [`config.js`](config.js) pon los dos valores de
**Supabase → Project Settings → API**:

```js
window.GTAHUB_CONFIG = {
  SUPABASE_URL: "https://xxxxxxxx.supabase.co",
  SUPABASE_ANON_KEY: "sb_publishable_..."
};
```

Commit + push → Vercel redespliega. La clave anon es pública por diseño; quien
protege los datos es RLS más el login.

> Si aún no tienes los valores, el sitio muestra una pantalla para pegarlos y
> los guarda en ese navegador. Sirve para probar, pero lo definitivo va en
> `config.js` para que todo el equipo lo tenga sin capturar nada.

## 5. Instalarlo como app

- **PC (Chrome/Edge):** abre la URL → ícono de instalar en la barra de
  direcciones → queda como app de escritorio.
- **iPhone (Safari):** abre la URL → Compartir → **Agregar a pantalla de
  inicio** → queda a pantalla completa con el ícono GTAHUB.

---

## Qué hay dentro

| Sección | Para qué |
|---|---|
| **Inicio** | KPIs del mes, próximas programadas, pendientes urgentes y últimas tendencias. |
| **Pendientes** | Kanban con arrastrar y soltar: Por hacer · En progreso · Listo. |
| **Publicaciones** | Alta, edición, filtros por plataforma/estado y captura de métricas. |
| **Calendario** | Mes completo con lo programado, por plataforma. |
| **Ideas** | Banco de ideas con impacto/esfuerzo y el panel de tendencias del sector. |
| **Métricas** | Alcance, interacciones, tasa de interacción y top de publicaciones. |

Plataformas que trackea: **Instagram, TikTok, Discord, Email/Newsletter y Facebook**.

Todo se clasifica por sección de marca con el selector global **Todo / ESP / PE**:
**GTAHUB ESP** (Orion / Andromeda, español) y **GTAHUB PE** (Pegasus, inglés),
con metas semanales de publicación propias por sección (tarjeta «Cadencia
semanal» en Inicio).

Todo cambio se replica en vivo (Supabase realtime): si alguien mueve una tarjeta,
los demás la ven moverse sin recargar.

---

## Estructura

```
index.html              Marcado de la app (setup, login, shell)
styles.css              Identidad GTAHUB: crimson #E8005A sobre negro
app.js                  Toda la lógica: auth, datos, vistas, modales, kanban
config.js               URL y clave de Supabase
manifest.webmanifest    PWA
sw.js                   Service worker (red primero, caché de respaldo)
vercel.json             Cache-Control para que un deploy nuevo se vea al instante
icons/                  Íconos de la app
supabase/schema.sql     Tablas, RLS, triggers y realtime
supabase/seed.sql       Datos de ejemplo (opcional)
CLAUDE.md               Contexto para sesiones de Claude Code
```

© GAMERSHUB LLC
