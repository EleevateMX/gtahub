# GTAHUB · Content Hub — contexto del proyecto

Dashboard interno del equipo de contenido de GTAHUB (GAMERSHUB LLC).
Sitio **estático sin build**: HTML + CSS + JavaScript vanilla, desplegado en
Vercel, con Supabase como base de datos y autenticación.

No hay `package.json`, ni bundler, ni framework. **No los agregues** salvo que
el usuario lo pida explícitamente: la gracia del proyecto es que cualquier
cambio se ve con abrir el archivo y un push redespliega en un minuto.

## Identidad de marca (respetarla siempre)

| Token | Valor |
|---|---|
| Primario (crimson) | `#E8005A` |
| Fondo base | `#000000` |
| Tarjetas | `#0B0B12` |
| Panel interno | `#171720` |
| Panel oscuro | `#0f0f1a` |
| Borde sutil | `#1a1a2e` |
| Texto | `#FFFFFF` |
| Texto secundario | `rgba(255,255,255,.68)` |
| Texto apagado | `rgba(255,255,255,.45)` |
| Títulos | Archivo Black / Arial Black / Impact, MAYÚSCULAS |
| Cuerpo | Inter / system-ui |

Etiquetas en mayúsculas con `letter-spacing` de 2–4px. Todo en español de México.

Paleta por plataforma (validada, no cambiarla):

| Plataforma | Color |
|---|---|
| Instagram | `#E1306C` |
| TikTok | `#25F4EE` |
| Discord | `#5865F2` |
| Email / Newsletter | `#F2A007` |
| Facebook | `#1877F2` |

## Archivos

- `index.html` — marcado de las tres pantallas: setup, login y shell de la app.
- `styles.css` — tokens de marca y todos los estilos.
- `app.js` — todo el comportamiento. Secciones marcadas con comentarios:
  catálogos, estado, utilidades, arranque, datos, navegación, vistas, modales.
- `config.js` — `SUPABASE_URL` y `SUPABASE_ANON_KEY`. Si están vacíos, el sitio
  pide los valores en pantalla y los guarda en `localStorage`.
- `sw.js` — service worker: red primero, caché de respaldo. Si cambias la lista
  de archivos del shell, sube la versión de `CACHE`.
- `supabase/schema.sql` — fuente de verdad del esquema. **Si cambias las
  columnas que usa `app.js`, actualiza también este archivo**; es lo que se
  corre en un proyecto nuevo.

## Datos (Supabase, esquema `public`)

- `perfiles` — `id` (= `auth.users.id`), `nombre`, `rol`. Se crea sola por trigger.
- `publicaciones` — `titulo`, `copy_texto`, `plataformas text[]`, `estado`
  (`idea|borrador|programada|publicada|pausada`), `fecha_programada`,
  `responsable`, `hashtags`, `url`, `notas`, métricas (`alcance`, `likes`,
  `comentarios`, `compartidos`, `guardados`).
- `pendientes` — kanban: `estado` (`por_hacer|en_progreso|listo`), `prioridad`
  (`alta|media|baja`), `responsable`, `fecha_limite`, `orden`.
- `ideas` — `estado` (`nueva|en_evaluacion|aprobada|convertida|descartada`),
  `impacto` y `esfuerzo` de 1 a 5, `plataformas text[]`.
- `tendencias` — lo que escribe la investigación semanal de servidores de
  roleplay: `titulo`, `resumen`, `fuente`, `servidor`, `metrica`, `valor`,
  `periodo`, `tags`. El dashboard la lee en Inicio y en Ideas; **el hub nunca
  escribe en esta tabla**.

RLS: el rol anónimo no ve nada; `authenticated` lee y escribe todo. Los usuarios
se dan de alta en Supabase → Authentication → Users.

## Convenciones de código

- Nombres de variables, funciones y textos de UI **en español**.
- Sin dependencias nuevas. Lo único externo: `@supabase/supabase-js` por CDN y
  las fuentes de Google.
- Las vistas se arman devolviendo HTML desde funciones `vistaX()` y todo el
  contenido variable pasa por `esc()`. Si agregas una vista, agrégala a `VISTAS`
  y al router de `render()`.
- Los clics se manejan por delegación en `document` con atributos `data-*`
  (`data-ir`, `data-nueva`, `data-pub`, `data-pen`, `data-idea`, `data-mes`).
- Después de escribir en la base: `cargarTodo()` y `render()`. El canal de
  realtime ya refresca a los demás.

## Qué no romper

- **Pendientes y próximas programadas van al frente.** El kanban es pestaña
  principal y las próximas programadas viven en Inicio, además del calendario.
- El arrastrar y soltar del kanban (`armarDnD`) y el orden de las columnas.
- La pantalla de setup: es la que permite estrenar el sitio sin tocar el repo.
- Los `id` de plataforma (`instagram`, `tiktok`, `discord`, `email`, `facebook`)
  se guardan tal cual en la base. Cambiarlos invalida los datos existentes.

## Flujo de trabajo

Rama de trabajo, commit y push. Vercel redespliega solo con cada push a `main`.
Antes de dar por terminado un cambio: `node --check app.js` y abrir el sitio
(`python3 -m http.server` en la carpeta) para verificar que no hay errores de
consola.
