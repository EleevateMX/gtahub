# GTAHUB Content Hub

Panel interno del equipo de contenido de GTAHUB (ESP: Orion / Andromeda · PE: Pegasus).
App conectada a Supabase, en HTML + CSS + JS sin dependencias ni build.
Deploy: **GitHub Pages** en <https://eleevatemx.github.io/gtahub/>. El workflow
`.github/workflows/pages.yml` republica la rama `gh-pages` con cada push a las
ramas que lista. (Alternativa: importar el repo en Vercel, Framework: Other.)

## Estructura

- `index.html` — shell: login, pantalla de carga, layout de app, panel lateral, buscador global, tab bar móvil.
- `hub-app.css` — sistema visual completo (tokens, componentes, responsive, estados de carga).
- `hub-data.js` — helpers de UI y contenedores `POSTS/TASKS/IDEAS/TRENDS` (se llenan desde Supabase).
- `hub-api.js` — login con hash, carga y escritura contra Supabase (ver CLAUDE.md).
- `hub-app.js` — estado, vistas, interacciones (arrastre kanban, filtros, calendario, tooltips, drawer, avisos, búsqueda).
- `assets/` `hub-art/` — logo, fondos y recortes de personaje ya optimizados.

## Identidad

Crimson `#E8005A` sobre negro `#000`. Tarjetas `#0B0B12`, paneles `#171720` / `#0f0f1a`, bordes `#1a1a2e`.
Títulos Archivo Black en mayúsculas, cuerpo Inter, etiquetas con letter-spacing 2–4px.
Logo: cubo HUB de GTAHUB sobre cuadrado crimson con retícula de 32px al 5%.
Patrones de marca reutilizables como clases: `.scan` (scanlines), `.vig` (viñeta), `.hud.tl/.tr/.bl/.br` (corchetes de encuadre), rayado diagonal crimson en `.diag` y cabeceras de tarjeta.
Plataformas: Instagram `#E1306C`, TikTok `#25F4EE`, Discord `#5865F2`, Email `#F2A007`, Facebook `#1877F2`.

## Interacciones implementadas

| Zona | Acción |
| --- | --- |
| Login | Usuario + contraseña reales (tabla gtahub_usuarios) → pantalla de carga |
| Selector marca | Todo / ESP / PE filtra todas las vistas |
| Teclado | `1`–`6` cambian de sección · `⌘K` / `Ctrl+K` buscador global · `Esc` cierra |
| Inicio | KPIs con sparkline, próximas programadas, urgentes, cadencia, tendencias |
| Pendientes | Kanban con arrastre real entre columnas (actualiza estado y progreso) |
| Publicaciones | Filtros por estado y plataforma + vista tabla / galería |
| Calendario | Cambio de mes, selección de día, eventos por color de plataforma |
| Ideas | Orden por impacto o esfuerzo + buscador de tendencias con estado de carga |
| Métricas | Periodo 7 / 30 / 90 días recalcula KPIs y gráfica; tooltips en barras |
| Cualquier pieza | Panel lateral con ficha, checklist persistente y acciones |
| Avisos | Panel de notificaciones que abre la ficha correspondiente |
| Tabla | Ordenar por cualquier columna (clic en la cabecera) |
| Calendario | Arrastrar un evento a otro día lo reprograma, con opción de deshacer |
| Menú | Botón `≡` pliega la barra lateral |

## Estado de la conexión

Todo lo anterior YA está conectado a Supabase: login real, CRUD de publicaciones,
tareas e ideas, kanban y calendario persistentes, checklist guardada, métricas y
cadencia calculadas desde datos reales, avisos generados desde el estado, y radar
de tendencias alimentado cada lunes por Claude. Detalles en `CLAUDE.md`.
