# GTAHUB Content Hub — Contexto para Claude Code

## Qué es esto

Panel interno del equipo de contenido de GTAHUB (gtahub.gg): marcas **ESP**
(servidores Orion y Andromeda) y **PE** (Pegasus). App estática sin build ni
dependencias, conectada a Supabase. Se publica en **GitHub Pages** vía
`.github/workflows/pages.yml`: cada push a las ramas listadas ahí republica la
rama `gh-pages`, que se sirve en <https://eleevatemx.github.io/gtahub/>. Las
rutas son relativas para que funcione bajo el subpath `/gtahub/`.

## Estructura

- `index.html` — shell: login, pantalla de carga, layout, drawer, buscador global, tab bar móvil.
- `hub-app.css` — sistema visual completo (tokens, componentes, responsive).
- `hub-data.js` — helpers de UI (`$`, `PF`, `pill`, `brandTag`, `fmt`) y contenedores
  vacíos `POSTS/TASKS/IDEAS/TRENDS` que se llenan desde Supabase.
- `hub-api.js` — capa de datos: config de Supabase, sha256, login (`hubLogin`),
  carga (`hubLoad` + mapeos fila→objeto), escritura (`dbCreate*/dbPatch*/dbDelete*`)
  y helpers de fecha (`dlabel`, `dueInfo`, `todayISO`…).
- `hub-app.js` — estado, vistas e interacciones. Toda escritura pasa por
  `persist(fn, msg)` que guarda → recarga → re-renderiza → toast.
- `assets/`, `hub-art/` — logo, fondos y personajes.

## Identidad (respetar siempre)

Crimson `#E8005A` sobre negro. Tarjetas `#0B0B12`, paneles `#171720`/`#0f0f1a`,
bordes `#1a1a2e`. Títulos Archivo Black en MAYÚSCULAS, cuerpo Inter, labels con
letter-spacing 2–4px. Patrones: `.scan`, `.vig`, `.hud.tl/.tr/.bl/.br`, `.diag`.
Colores por plataforma en CSS vars: `--ig --tt --dc --em --fb`.

## Backend (Supabase)

Proyecto `hwqiyqullrznovamkhsz`. La app usa la llave publishable (anon) vía
PostgREST desde `hub-api.js`. Tablas:

- `gtahub_publicaciones`: title, platform (instagram|tiktok|discord|email|facebook|multi),
  type, status (borrador|pendiente|programado|publicado), publish_date, publish_time,
  brand (ESP|PE), srv (Orion|Andromeda|Pegasus), fmt, copy_text, chk (jsonb array),
  chk_state (jsonb array), thumb, url, notes, views, likes, interactions, created_by.
  En UI el status se mapea: publicado→publicada, programado→programada, resto→borrador.
- `gtahub_tareas` (kanban Pendientes): title, col (todo|prog|done), prio (alta|media|baja),
  brand, srv, platform (nullable), due_date, owner, prog (0-100), descr, created_by.
- `gtahub_ideas`: title, description, platform, brand, imp (1-5), eff (1-5),
  status (nueva|aprobada|descartada|convertida — en UI: aprobada→APROBADA, nueva→EN REVISIÓN;
  descartada/convertida no se muestran), rationale, copy_text, source (manual|claude), priority.
- `gtahub_tendencias`: title, insight, source_url, relevance (alta|media|baja).
  Las llena Claude cada lunes (tarea programada). NO inventar deltas/sparklines para
  tendencias: solo hay relevancia + análisis.
- `gtahub_metas`: platform (pk), weekly_goal — metas de cadencia semanal.
- `gtahub_usuarios`: username (pk), display_name, role, salt, pass_hash.
  Login: sha256hex(salt + ":" + password) === pass_hash (implementado en hub-api.js).
  NUNCA guardar contraseñas en claro. El login acepta usuario o correo (se toma
  la parte antes de la @).

Archivos `migracion-v4.sql` y `seed-v4.sql` (en el histórico del proyecto) crearon
este esquema. RLS: abierto vía anon para tablas de contenido (herramienta interna);
usuarios solo lectura.

## Convenciones

- Sin frameworks ni CDNs. UI en español, fechas es-MX.
- Los mapeos DB↔UI viven SOLO en hub-api.js (`mapPost/mapTask/mapIdea/mapTrend`
  y `PF_DB/DB_PF/ST_DB/DB_ST`). Si agregas un campo, tócalo ahí.
- Nada de localStorage/sessionStorage: la sesión vive en memoria (login por visita).
- Toda escritura con `persist()` para mantener datos frescos y toasts coherentes.
- Los formularios de creación se renderizan en el drawer (`newForm` en hub-app.js).
- Thumbs: si la publicación no tiene `thumb` (URL), se usa un arte por plataforma
  (`THUMB_PF` en hub-api.js).

## Qué NO hacer

- No subir llaves service_role ni credenciales en claro.
- No romper el kanban de Pendientes ni Próximas programadas (lo más usado).
- No renombrar tablas/columnas sin migración coordinada en Supabase.
- No fabricar métricas: si no hay views registradas, mostrar estados vacíos honestos.
