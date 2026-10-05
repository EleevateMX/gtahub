# GTAHUB Content Hub — Contexto para Claude Code

## Qué es esto

Panel interno del equipo de contenido de GTAHUB (gtahub.gg): tres marcas,
**ESP** (Orion y Andromeda), **ENG** (Pegasus) y **BR**. App estática sin build ni
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

## Marcas

El catálogo `MARCAS` al inicio de `hub-data.js` es la fuente única: etiquetas,
selector, servidores, formularios y filtros se derivan de ahí. **Sumar una
marca es sumar una entrada**, no tocar condicionales.

`ENG` se llamaba `PE`. Ese nombre sigue en `MARCAS.ENG.alias`, y `normMarca()`
lo traduce al leer, así que el hub funciona igual antes y después de correr
`supabase/marcas-brief.sql`. Mientras esa migración no corra, `HUB.migrado` es
falso: se sigue escribiendo `'PE'` y las altas en BR quedan bloqueadas, porque
el CHECK de la base todavía no las acepta.

**Falta confirmar el nombre real del servidor de BR** (`MARCAS.BR.servidores`,
hoy `'Por confirmar'`).

Cada marca tiene su propia cuenta en cada red: `gtahub_cuentas`
(marca + plataforma → handle, url), que se ve y se edita en la vista Brief.

## Brief de marca

Vista `brief`: la guía de voz de cada marca (público, tono, pilares, qué sí,
qué no, referencias, CTA) en `gtahub_briefs`, una fila por marca.

Lo edita solo el rol `mkt`. **Es un candado de interfaz, no de seguridad**:
todo el hub entra a Supabase con la misma llave anónima, así que la base no
distingue quién escribe y RLS no puede frenarlo; quien abra la consola del
navegador puede saltárselo. Sirve para que nadie lo toque por error. Para que
sea un permiso real hay que mover el login a Supabase Auth y entonces RLS ve
`auth.uid()`.

## Identidad (respetar siempre)

Crimson `#E8005A` sobre negro. Títulos Archivo Black en MAYÚSCULAS, cuerpo
Inter, labels con letter-spacing 2–4px. Patrones: `.scan`, `.vig`,
`.hud.tl/.tr/.bl/.br`, `.diag`.

**Ningún componente escribe un color literal.** Todo sale de los tokens del
bloque `:root` al inicio de `hub-app.css`. Si necesitas un color nuevo, agrega
el token con su pareja clara; no pongas un hex en la regla.

- Superficies: `--bg --card --panel --panel2`, bordes `--line --line2 --line3`.
- Texto: `--tx --tx2 --tx3`. Estados: `--hover --hover-soft --track --track2`.
- Plataformas: `--ig --tt --dc --em --fb` pintan **rellenos** (puntos, barras).
  Para **texto** existe la pareja `--ig-tx --tt-tx --dc-tx --em-tx --fb-tx`,
  más `--ok-tx --bad-tx` y uno por marca (`--esp-tx` ámbar, `--eng-tx` cian,
  `--br-tx` violeta: tres hues distintos para que se separen de un vistazo),
  porque el mismo tono no alcanza
  4.5:1 en los dos temas.
- El crimson de marca como texto se queda en 4.28:1 sobre la tarjeta oscura,
  así que los enlaces usan `--crimson-tx`. Los rellenos siguen con `--crimson`.

## Referencias y propuestas de copy

En la ficha de cualquier publicación, tarea o idea (el drawer) hay dos bloques:
**referencias visuales** y **propuestas de copy**. Las imágenes se suben como
archivo o se pegan como URL; las propuestas son varias versiones del caption,
cada una firmada con el nombre de quien la escribió, para que el equipo elija.

A diferencia del brief, **esto no tiene candado de rol**: si solo MeDed pudiera
subir, nadie más podría proponer copy, que es justo para lo que sirve. El
autor queda registrado, y cerrarlo luego es la misma línea que
`puedeEditarBrief()`.

Las tarjetas de las vistas llevan un contador (`refBdg`) con cuántas imágenes y
cuántas propuestas trae la pieza, para no abrirla a ciegas.

## Tema claro y oscuro

Oscuro es el tema de la marca y el de partida. El claro se define una sola vez
y se activa por `prefers-color-scheme` o por `data-theme` en `<html>`. El
interruptor vive en el pie de la barra lateral (`#themeBtn`).

La preferencia se guarda en `localStorage` (`gtahub.tema`). **Es la única
excepción a la regla de no persistir nada**: no es dato de sesión, es una
preferencia de accesibilidad, y perderla en cada visita haría inútil el
interruptor. Un script en línea dentro de `<head>` la aplica antes del primer
pintado para que no haya destello.

Hay superficies que son **fotografía** y no siguen el tema: el hero de cada
vista y el arte del login llevan imagen con degradado oscuro encima, así que su
texto va en blanco siempre. Están agrupadas en el bloque v4 del CSS.

Ambos temas están medidos: todo el texto pasa 4.5:1 (AA).

## Movimiento

Un solo ritmo, en tokens: `--dur-1` (120ms), `--dur-2` (180ms), `--dur-3`
(240ms), con `--ease-out` para entradas. No inventes duraciones sueltas.
`prefers-reduced-motion: reduce` apaga todo el movimiento.

**No simules latencia.** Los datos viven en memoria desde el arranque, así que
las vistas se pintan de forma síncrona. `render()` esperaba 300ms fijos y el
drawer otros 300ms antes de dibujar algo que ya tenían; el esqueleto solo debe
aparecer cuando `HUB.online` todavía es falso. El arranque (`boot()`) sigue a
la petición real con un piso corto (`BOOT_PISO`) para que no parpadee.

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
- `gtahub_referencias`: ref_tipo (idea|publicacion|tarea) + ref_id apuntan a la
  pieza padre, tipo (imagen|copy), url, texto, autor. Imágenes de muestra para
  que el equipo vea cómo va a quedar algo, y varias versiones del copy para
  elegir. No hay llave foránea (el padre vive en tres tablas distintas): el hub
  limpia las referencias al borrar la pieza, y al convertir una idea en
  publicación las mueve con ella. Los archivos subidos van al bucket público
  `gtahub-media` de Storage; también se acepta pegar una URL. Lo crea
  `supabase/referencias.sql`; mientras no corra, `HUB.refs` es falso y la ficha
  muestra el aviso en vez de una galería vacía.
- `gtahub_metas`: platform (pk), weekly_goal — metas de cadencia semanal.
- `gtahub_usuarios`: username (pk), display_name, role, salt, pass_hash.
  Login: la función `hub_login(p_usuario, p_password)` compara
  sha256(salt || ':' || password) **dentro de Postgres** y devuelve solo
  username/display_name/role. `anon` no tiene SELECT sobre la tabla, así que el
  salt y el pass_hash no salen de la base. La creó `supabase/login-seguro.sql`.
  `hubLogin` en hub-api.js llama esa función y, si responde 404 (base sin
  migrar), cae a `hubLoginSinMigrar`, que baja la fila y compara en el
  navegador. Ese respaldo filtra los hashes: si sigue haciendo falta, es que
  la migración no se ha corrido. NUNCA guardar contraseñas en claro. El login
  acepta usuario o correo (se toma la parte antes de la @).

`supabase/revision.sql` no cambia nada: reporta, archivo por archivo, qué
migración ya corrió y cuál falta. Es el primer sitio al que ir cuando el hub
muestra un aviso de migración.

Archivos `migracion-v4.sql` y `seed-v4.sql` (en el histórico del proyecto) crearon
este esquema. RLS: abierto vía anon para tablas de contenido (herramienta interna);
`gtahub_usuarios` cerrada, solo accesible por `hub_login`.

Pendiente de fondo: el hash es SHA-256 de una pasada, sin estiramiento. Si se
filtrara un respaldo de la base, las contraseñas caerían rápido. Lo sólido es
bcrypt (pgcrypto: `crypt`/`gen_salt`) o Supabase Auth; cualquiera de los dos
obliga al equipo a fijar su contraseña una vez.

## Convenciones

- Sin frameworks ni CDNs. UI en español, fechas es-MX.
- Los mapeos DB↔UI viven SOLO en hub-api.js (`mapPost/mapTask/mapIdea/mapTrend`
  y `PF_DB/DB_PF/ST_DB/DB_ST`). Si agregas un campo, tócalo ahí.
- Nada de localStorage/sessionStorage para datos: la sesión vive en memoria
  (login por visita). La única clave guardada es `gtahub.tema`.
- Toda escritura con `persist()` para mantener datos frescos y toasts coherentes.
- Los formularios de creación se renderizan en el drawer (`newForm` en hub-app.js),
  y los de edición en `editarPublicacion/editarTarea/editarIdea`. Las tres fichas
  llevan botón «Editar»: todo campo que se puede crear se puede corregir después.
- Thumbs: si la publicación no tiene `thumb` (URL), se usa un arte por plataforma
  (`THUMB_PF` en hub-api.js).

## Qué NO hacer

- No subir llaves service_role ni credenciales en claro.
- No romper el kanban de Pendientes ni Próximas programadas (lo más usado).
- No renombrar tablas/columnas sin migración coordinada en Supabase.
- No fabricar métricas: si no hay views registradas, mostrar estados vacíos honestos.
