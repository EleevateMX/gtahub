# BRIEF PARA CLAUDE DESIGN — Vista "ESTUDIO" del GTAHUB Content Hub

Copia todo este archivo como primer mensaje en Claude Design. Está escrito
para que diseñe una vista nueva dentro de una app que ya existe, no una app
desde cero. Las secciones 1–4 son contexto y sistema visual; la 5 en adelante
es lo que hay que diseñar.

---

## 1. Qué es y qué pido

GTAHUB Content Hub es el panel interno del equipo de contenido de GTAHUB
(comunidades de roleplay en GTA V / FiveM: Orion y Andromeda para la marca ESP,
Pegasus para PE). Hoy tiene seis vistas: Inicio, Pendientes (kanban),
Publicaciones, Calendario, Ideas y Métricas. Es una app estática (HTML + CSS +
JS sin frameworks) conectada a Supabase.

Quiero diseñar la **séptima vista: ESTUDIO**. Es un estudio de generación de
video e imagen con IA que funciona como Midjourney: armo el prompt eligiendo
elementos (personaje, escenario, acción, cámara, luz…), lo genero en
Higgsfield / Kling 3.0, veo los resultados en una galería, elijo uno, lo varío
o lo refino, y cuando me gusta lo guardo como publicación.

Entregables que espero de Claude Design:

1. Vista ESTUDIO en escritorio (1440 px) y móvil (390 px), tema oscuro y claro.
2. Panel de detalle (drawer) de una generación con sus acciones.
3. Estados: vacío, generando, fallida, seleccionada.
4. Flujo de "refinar" (diagnóstico de un resultado que salió mal).
5. Los componentes nuevos documentados con los tokens existentes.

Respeta el sistema visual de la sección 3 al pie de la letra: la vista debe
sentirse como una vista más del hub, no como otra app.

---

## 2. Dónde vive en la app (shell existente)

Escritorio: barra lateral izquierda fija (logo "CONTENT HUB / GTAHUB", selector
de marca TODO / ESP / PE como segmented control, navegación vertical con los
seis botones, pie con avatar + nombre + rol, botón de tema y salir). A la
derecha, una barra superior con el título de la vista en Archivo Black
MAYÚSCULAS, buscador global "⌘K", botones "Buscar", "Avisos" y el CTA crimson
"+ Nueva publicación". Debajo, el área de la vista.

Móvil: la barra lateral desaparece; una tab bar inferior con los seis destinos
abreviados (Inicio · Pend. · Public. · Calend. · Ideas · Métricas). ESTUDIO se
agrega como séptimo destino en ambos (en móvil, abreviado "Estudio").

Los detalles y formularios de creación NO son modales: se abren en un
**drawer** que entra por la derecha (460 px) en escritorio y desde abajo (88 %
de alto) en móvil, con cabecera (título + ×), cuerpo con scroll y pie con
botones. ESTUDIO usa ese mismo drawer para el detalle de una generación.

Atajos: teclas 1–6 cambian de vista; ESTUDIO sería la 7.

---

## 3. Sistema visual (obligatorio)

Marca: crimson sobre negro. Ningún componente escribe un color literal; todo
sale de tokens. Los dos temas ya existen; el oscuro es el de partida.

### Tokens oscuro (default)

```
--crimson:#E8005A  --crimson-rgb:232,0,90  --on-crimson:#fff  --crimson-tx:#FF1F6B
--bg:#000  --card:#0B0B12  --panel:#171720  --panel2:#0f0f1a
--line:#1a1a2e  --line2:#2a2a44  --line3:#31314f
--tx:#fff  --tx2:rgba(255,255,255,.68)  --tx3:rgba(255,255,255,.45)
--hover:rgba(255,255,255,.04)  --track:rgba(255,255,255,.08)  --track2:rgba(255,255,255,.1)
--sk1:#14141f  --sk2:#1d1d2c  (esqueletos)   --scrim:rgba(0,0,0,.62)
--shadow:0 1px 0 rgba(255,255,255,.03),0 10px 26px rgba(0,0,0,.35)
--ig:#E1306C --tt:#25F4EE --dc:#5865F2 --em:#F2A007 --fb:#1877F2   (rellenos por plataforma)
--ok:#39d98a --bad:#ff5b5b   --esp-tx:#ffd166 --pe-tx:#6ee7ff   (texto de marca)
```

### Tokens claro

```
--bg:#F1F1F6 --card:#fff --panel:#fff --panel2:#F8F8FB
--line:#E3E3EC --line2:#C7C7D8 --line3:#AEAEC4
--tx:#0B0B12 --tx2:#41414F --tx3:#63636F --crimson-tx:#E8005A
--ok-tx:#0B7A4B --bad-tx:#C4142B --esp-tx:#8A5B00 --pe-tx:#00636E
```

Regla de contraste: todo texto pasa 4.5:1 en los dos temas. El crimson como
texto solo en su variante `--crimson-tx`; el crimson puro es para rellenos y
botones.

### Tipografía

- Títulos (h1–h4): **Archivo Black**, siempre MAYÚSCULAS, peso 400, tracking -0.01em. Título de vista 20–23 px; título de card 12 px.
- Cuerpo: **Inter**. Texto 12.5–13 px. Meta 11 px en `--tx3`.
- Labels: Inter 700, 10 px, MAYÚSCULAS, letter-spacing 2–4 px, color `--tx3`. Se usan como encabezados de sección pequeños ("MARCA", "AVISOS DEL HUB").

### Componentes existentes (reutilizar tal cual)

- **.card**: fondo `--card`, borde 1px `--line`, radio 14 px, padding 16, sombra `--shadow`. Cabecera con h3 de 12 px precedido por una barrita vertical crimson de 4×12 px.
- **.btn**: relleno crimson, texto blanco, Inter 700 11 px, tracking 2 px, MAYÚSCULAS, radio 8, padding 11×16. Variante `.gh2` (ghost): fondo `--panel`, borde `--line`, texto `--tx2`. Variante `.sm`: 8×11, 10 px. Mínimo 44 px de alto en móvil.
- **.seg** (segmented): contenedor `--panel` con borde, radio 8, padding 3; botón activo relleno crimson con texto blanco; inactivos `--tx3` 10 px tracking 2 px.
- **.chip**: fondo `--panel`, borde `--line`, radio 7, padding 8×12, Inter 700 10 px, tracking 1.5 px, MAYÚSCULAS. Activo: borde crimson, fondo crimson al 12 %, texto `--tx`. Deshabilitado al 35 %.
- **.hero**: banda de 210 px con fotografía de fondo (arte GTAHUB), degradado oscuro encima, texto siempre en blanco aunque el tema sea claro, franja diagonal crimson de 5 px a la izquierda (`.diag`), y un personaje recortado a la derecha que desaparece en móvil. Cada vista abre con un hero.
- **.col** (columna kanban): fondo `--panel2`, borde, radio 12, padding 12, h3 de 11 px con contador en `--tx3`.
- **.thumb**: 38×38, radio 8, borde `--line`.
- **Drawer**: descrito arriba. **Toast**: esquina inferior, texto corto, acción opcional.
- Patrones decorativos disponibles: `.scan` (scanlines), `.vig` (viñeta), `.hud.tl/.tr/.bl/.br` (esquinas HUD tipo videojuego), `.diag` (franja diagonal crimson). Usarlos con moderación, como en el login y los heros.

### Movimiento

Tres duraciones: 120 / 180 / 240 ms con `cubic-bezier(.22,1,.36,1)`. Hover en
botones = brillo +12 %; active = scale(.97). `prefers-reduced-motion` apaga
todo. Nada de latencia simulada: los datos están en memoria; el esqueleto
solo aparece si la app aún no cargó.

### Idioma y tono

UI en español (es-MX). Labels cortos y en mayúsculas. Nada de emojis en la UI.
Estados vacíos honestos: si no hay generaciones, se dice y se explica cómo
empezar; no se inventan métricas ni placeholders que parezcan datos.

---

## 4. Cómo se arma un prompt (lógica que la UI tiene que reflejar)

El prompt es un esqueleto fijo con **slots**; cada slot se llena con una
**pieza** de una biblioteca con código. Orden de slots (fijo, importa):

| Slot | Etiqueta en UI | Piezas de ejemplo (código · nombre) | Presupuesto |
|---|---|---|---|
| STYLE_LOCK | ESTILO | STY-01 Corto · STY-02 Medio · STY-03 Largo | 180–350 car. |
| SOURCE | FUENTE | SRC-01 Personaje · SRC-02 Personaje + vehículo · SRC-03 Escenario · SRC-04 Grupo | 120–260 |
| CHARACTER | PERSONAJE | PJ-01 Protagonista · PJ-POL Policía · PJ-MIL Militar · PJ-EMS · PJ-BOM · PJ-MAF · PJ-CIV · PJ-GRP Grupo | 0–300 |
| ACTION | ACCIÓN | ACT-01 Bienvenida · ACT-02 Camina a cámara · ACT-03 Saca el teléfono · ACT-04 Baja del auto · ACT-05 Llega el auto · ACT-06 Aterrizaje · ACT-07 Reacción de grupo · ACT-08 Formación · ACT-09 Persecución · ACT-10 Fiesta · ACT-11 Brindis · ACT-12 Detención | 300–600 |
| MIC (múltiple) | MICROACCIONES | MIC-01 Cambia el peso · MIC-02 Mira alrededor · MIC-03 Ajusta gafas · … MIC-10 | dentro de ACCIÓN |
| CAMERA | CÁMARA | CAM-01 Push-in · CAM-02 Handheld sutil · CAM-03 Pull-back reveal · CAM-04 Tracking lateral · CAM-05 Follow · CAM-06 Low-angle · CAM-07 Crane · CAM-08 Órbita parcial · CAM-09 Dolly atrás · CAM-10 Rack focus · CAM-11 OTS · CAM-12 Vehículo · CAM-13 Pista · CAM-14 Wide · CAM-15 Secuenciado | 100–250 |
| LOCATION | ESCENARIO | LOC-01 Cayo Perico · LOC-02 Aeropuerto · LOC-03 Barrio · LOC-04 Centro noche · LOC-05 Comisaría · LOC-06 Base militar · LOC-07 Hospital · LOC-08 Club · LOC-09 Carreras · LOC-10 Mansión · LOC-11 Puerto · LOC-12 Gasolinera | — |
| ENVIRONMENT (múltiple, 2–4) | AMBIENTE | AMB-01 … AMB-15 (NPCs hablando, moto pasa, tráfico lejano, palmeras, olas, perro…) | 120–300 |
| LIGHTING | LUZ | LUZ-01 Día · LUZ-02 Golden hour · LUZ-03 Atardecer costa · LUZ-04 Noche urbana · LUZ-05 Interior · LUZ-06 Hangar · LUZ-07 Club · LUZ-08 Nublado · LUZ-09 Faros · LUZ-10 Pista | 80–200 |
| DIALOGUE | DIÁLOGO | DLG-01 "Bienvenido a la isla de Cayo Perico." · DLG-02 … · texto libre | 0–220 |
| CONTINUITY | CONTINUIDAD | CON-01 … CON-07 | 80–200 |
| ENDING | CIERRE | END-01 … END-07 | 50–120 |
| AVOID | EVITAR | NEG-01 Live action · NEG-02 Artefactos · NEG-03 Imagen | 120–220 |

Variantes del esqueleto (segmented control arriba del builder):
**Single shot** (1 imagen → 1 clip) · **Multishot** (hasta 4 shots con
duración cada uno, total ≤ 15 s) · **Start → End** (2 imágenes) · **Imagen
previa** (genera la imagen que luego se anima) · **Motion control** · **Texto**
(sin imagen).

Reglas que la UI hace visibles:

- Contador de caracteres total con barra: verde hasta 2,300, ámbar hasta
  2,500, rojo si se pasa. Meta: 1,500–2,300 (single shot corto: 700–1,400).
- Cada slot muestra su propio presupuesto y cuánto ocupa.
- Multishot: cada shot tiene un campo de segundos; la suma se muestra "12 / 15 s".
- Start → End: dos zonas de imagen etiquetadas IMAGE 1 · START y IMAGE 2 · END, sin posibilidad de confundirlas.
- Toda pieza es editable en línea después de elegirla (el texto del slot es un textarea que arranca con la pieza).
- El prompt final se ve completo, en inglés, listo para copiar; el diálogo queda en español.

Ejemplo de prompt final (single shot, 1,785 caracteres) para usar como dato
de muestra en el diseño:

```
STYLE: Cinematic gameplay footage captured directly inside GTA V / FiveM. Keep GTA Online-style character anatomy and proportions, game facial topology, hair cards, clothing and tattoo textures as in-game assets, map props, in-engine lighting and shadows. Cinematic camera, game-engine look.

SOURCE: Starting from the provided image as the first frame. Keep the character exactly as shown: face, hair, glasses, makeup, tattoos, outfit and proportions. No redesign. Keep the beach road, time of day and props exactly as in the image.

ACTION: The woman from the source image stands facing camera, shifts her weight, then opens both arms outward in a relaxed welcoming gesture while looking slightly past the lens, then lets the arms settle at her sides with a small nod.

CAMERA: Starts on a medium close-up, pulls back slowly to a wide shot revealing the coast behind her.

ENVIRONMENT: Palm fronds move in a light wind, waves roll onto the beach behind her, a motorcycle passes screen-left to screen-right on the road in the background.

LIGHTING: Orange sunset sky behind her, soft ambient fill from the water, no artificial fill.

DIALOGUE — Spanish (speaker: the white-haired woman, tone: warm, confident):
"Bienvenido a la isla de Cayo Perico."

CONTINUITY: She stays on the same spot; only her posture and arms move.

ENDING: She holds the pose, small breath, the frame settles on the wide shot.

AVOID: Do not turn the character into a real human. No live action, no photorealistic skin, no Unreal Engine or MetaHuman look, no GTA VI reinterpretation, no studio lighting, no character redesign.
```

---

## 5. Layout de la vista ESTUDIO

### Escritorio (1440)

Hero de la vista (como las demás): título "ESTUDIO", subtítulo "Arma el
prompt por piezas, genera en Higgsfield y elige la toma", CTA "+ Nueva
generación" y, a la derecha, el personaje recurrente de GTAHUB (mujer de
cabello platinado en space buns, gafas redondas negras, top negro, cargo
blancos; es un personaje de GTA V / FiveM, no una persona real).

Debajo, tres columnas:

**Columna A — PIEZAS (≈ 300 px, scroll propio).** Un acordeón por slot en el
orden de la tabla. Cada sección tiene su label (ESTILO, FUENTE, PERSONAJE…),
el presupuesto en `--tx3` ("300–600") y una rejilla de chips con el código en
`--tx3` y el nombre ("ACT-03 · Saca el teléfono"). Un chip activo se marca
como `.chip.act`. Los slots múltiples (MICROACCIONES, AMBIENTE) permiten
varios activos y muestran "2 de 4". Al final de cada sección, un chip fantasma
"+ Propia" que abre un textarea en línea. Buscador de piezas arriba de la
columna ("Buscar pieza…").

**Columna B — PROMPT (flexible, la más ancha).** Arriba, el segmented de
variante (SINGLE · MULTISHOT · START→END · IMAGEN · MOTION · TEXTO) y, a la
derecha, un `.seg.sm` de formato (9:16 · 16:9 · 1:1) y un select de duración
(5 · 8 · 10 · 15 s). Zona de imágenes de referencia: una o dos casillas de
arrastrar/soltar según la variante, con etiqueta grande "IMAGE 1 · START",
"IMAGE 2 · END". Luego el prompt en bloques: una card por slot con su label,
el textarea con la pieza elegida y el contador propio "412 / 600". Los bloques
vacíos opcionales (DIÁLOGO) se muestran colapsados. Al pie, fijo: barra de
presupuesto total "1,785 / 2,500", checklist de 5 puntos con ✓/✗ (style lock
al inicio · un movimiento de cámara · dirección en pantalla · cierre estable ·
sin palabras prohibidas) y dos botones: `.btn.gh2` "COPIAR PROMPT" y `.btn`
"GENERAR". Al copiar, toast "Prompt copiado · pégalo en Higgsfield".

Bajo el prompt, una card "VISTA DEL PROMPT" con el texto final completo en
monoespaciada pequeña, en `--panel2`, solo lectura.

**Columna C — GALERÍA (≈ 360 px, scroll propio).** Encabezado "GENERACIONES"
con filtros: `.seg.sm` TODO · VIDEO · IMAGEN, y chips de marca ESP / PE. Rejilla
de 2 columnas de tiles: cada tile es el thumb con su relación (9:16 o 16:9),
esquina superior izquierda con el tipo (VIDEO 8 s / IMAGEN) en label, esquina
inferior con el modelo (KLING 3.0) y la fecha corta. Un tile "en cola" muestra
esqueleto `--sk1/--sk2` con un anillo de progreso; uno "fallido" muestra borde
`--bad` y el texto "Falló · Reintentar". Hover: se ven cuatro acciones
pequeñas, al estilo Midjourney: **USAR** (marcar como elegida), **VARIAR**
(duplica el prompt con la misma semilla de piezas y abre el builder), **REFINAR**
(abre el diagnóstico, sección 7), **START / END** (mandar esta imagen a la
casilla 1 o 2 de la variante Start→End). Tile elegido: borde crimson de 2 px y
una marca ✓ en la esquina.

Las generaciones se agrupan por **hilo**: una generación derivada (variación,
refinado) cuelga de su padre. En la galería se ve el padre y un pequeño
contador "3 variaciones"; el hilo completo se ve en el drawer.

### Móvil (390)

Tres pestañas arriba de la vista, tipo `.seg`: PIEZAS · PROMPT · GALERÍA.
PIEZAS es el acordeón a pantalla completa; PROMPT los bloques con la barra de
presupuesto y los dos botones fijos abajo (encima de la tab bar); GALERÍA una
rejilla de 2 columnas. El hero se reduce a 18 px de título y el personaje
desaparece. Todos los botones e inputs con 44 px mínimo.

---

## 6. Drawer: detalle de una generación

Cabecera: "GENERACIÓN · #0142" y ×. Cuerpo:

1. Reproductor o imagen a ancho completo, con su relación.
2. Fila de meta: VARIANTE · MODELO · DURACIÓN · FORMATO · MARCA · fecha · autor.
3. "PROMPT USADO": el texto completo, botón "COPIAR".
4. "PIEZAS": la lista de códigos usados como chips inactivos (STY-02, SRC-01, PJ-01, ACT-01, CAM-03…). Tocar uno lo resalta en el prompt.
5. "HILO": línea vertical con las generaciones padre e hijas (miniaturas de 38 px y etiqueta "Variación" o "Refinado: cámara").
6. "NOTA": textarea corto para apuntar qué salió bien o mal (esto se guarda).

Pie: `.btn.gh2` "VARIAR", `.btn.gh2` "REFINAR", `.btn` "GUARDAR COMO
PUBLICACIÓN" (abre el formulario de publicación ya existente con el thumb y el
copy precargados). Menú secundario: "Usar como START", "Usar como END",
"Descargar", "Eliminar" (con confirmación).

---

## 7. Flujo REFINAR (diagnóstico)

Un paso, dentro del drawer. Pregunta "¿Qué salió mal?" con chips de síntoma:

- SE VE PERSONA REAL / NO SE VE GTA
- CAMBIÓ EL PERSONAJE
- PARECE ESTUDIO
- JALA AL LADO INCORRECTO
- ESTÁ CONGELADO
- PATINAN LOS PIES
- LA CÁMARA HACE DE TODO
- NO LLEGA AL END FRAME
- SE TELETRANSPORTA (MULTISHOT)
- SE VE GENÉRICO

Al elegir uno, aparece la tarjeta "Ajuste sugerido": qué slot se toca y con
qué pieza (por ejemplo, para "SE VE PERSONA REAL": "ESTILO → STY-03 largo ·
EVITAR → NEG-01 · quitar 'realistic' del texto"). Botón "APLICAR Y ABRIR
PROMPT": crea una generación hija con la etiqueta "Refinado: estilo" y lleva
al builder con solo ese slot cambiado y resaltado. Regla visible en la
tarjeta: "Cambia una sola cosa por intento".

---

## 8. Estados

- **Vacío (sin generaciones):** en la columna C, ilustración discreta con
  patrón `.hud`, título "AÚN NO HAY GENERACIONES", texto "Elige piezas a la
  izquierda, copia el prompt y pégalo en Higgsfield. Cuando tengas el
  resultado, súbelo aquí con + Nueva generación." Sin números inventados.
- **Generando / en cola:** tile con esqueleto y anillo; el botón GENERAR pasa
  a "EN COLA…" deshabilitado al 60 %.
- **Fallida:** tile con borde `--bad`, texto en `--bad-tx`, acción "Reintentar".
- **Sin conexión / cargando el hub:** esqueletos `--sk1/--sk2` en las tres columnas (solo aquí).
- **Prompt fuera de presupuesto:** barra roja, botón GENERAR sigue activo pero
  con aviso "Supera 2,500 caracteres: recorta AMBIENTE o LUZ".

---

## 9. Cómo se genera realmente (para que el diseño no prometa de más)

Fase 1 (la que se diseña ahora): la vista arma y copia el prompt. La
generación ocurre en Higgsfield; el usuario vuelve y registra el resultado con
"+ Nueva generación" (sube el video/imagen o pega la URL, el prompt y las
piezas ya vienen precargadas del último "GENERAR"). Por eso el botón GENERAR
copia el prompt y crea la ficha "en cola" a la espera del archivo.

Fase 2 (futuro, no diseñar todavía): la misma ficha se llena sola desde la API.
El diseño de la fase 1 debe funcionar sin cambios cuando eso llegue.

---

## 10. Datos (para nombrar bien las cosas en el diseño)

Nueva tabla `gtahub_generaciones`: id, kind (video | imagen), variante,
modelo, prompt, piezas (lista de códigos), duracion, aspect, brand (ESP | PE),
srv, estado (cola | lista | fallida), media_url, thumb, parent_id (hilo),
elegida (bool), nota, created_by, created_at. Las piezas viven en la app como
biblioteca local (no se editan desde la UI en esta fase, salvo el chip "+
Propia", que solo afecta a esa generación).

---

## 11. Lo que NO quiero

- Otra paleta, otra tipografía, gradientes nuevos o glassmorphism. Solo los tokens de arriba.
- Modales centrados: todo detalle va en el drawer.
- Iconografía ilustrativa o emojis en la UI.
- Métricas, "likes" o contadores que no existen.
- Que el personaje o los thumbs de muestra parezcan personas reales: si Claude
  Design necesita imágenes de relleno, que sean bloques `--panel` con la
  relación correcta y el label del tipo, o el arte de GTA V / FiveM.
