# MASTER PROMPT MODULAR — Higgsfield / Kling 3.0 para GTAHUB

Un solo esqueleto con **slots** `{{ASÍ}}`. Cada slot se llena con una pieza de
`elementos.md` (o con texto propio siguiendo la misma forma). El esqueleto
cambia poco; lo que cambia de video a video son las piezas.

Reglas del esqueleto (justificadas en `investigacion.md`):

1. El orden importa: los modelos pesan más los primeros tokens. Por eso el
   style lock y la preservación de la fuente van **primero**, y el negativo al
   final.
2. En image-to-video **no se re-describe lo que ya está en la imagen**; se
   describe solo lo que cambia. Si describes la cara, el modelo la redibuja.
3. Una acción principal y un movimiento de cámara dominante por clip. Si hay
   dos, van secuenciados con tiempos o en shots distintos.
4. Verbos activos y observables; nada de "beautiful / epic / dynamic /
   cinematic lighting" sueltos. "Epic" se traduce a escala, formación y
   cámara baja; "cinematic" solo como *cinematic in-game footage*.
5. El clip cierra con un estado estable ("then settles", "holds the frame")
   para que la generación no quede a medias.
6. Aspect ratio, duración, resolución y modelo se fijan en la UI de
   Higgsfield, no dentro del prompt. Borrador a 720p, final a 1080p.

---

## 1. Slots

| Slot | Qué lleva | Presupuesto (caracteres) | Fuente en `elementos.md` |
|---|---|---|---|
| `{{STYLE_LOCK}}` | Declaración positiva de que esto es captura in-game GTA V / FiveM | 180–350 | STY-01 / STY-02 / STY-03 |
| `{{SOURCE}}` | Qué imagen manda y qué NO cambia (identidad, ropa, vehículo, escenario) | 120–260 | SRC-xx |
| `{{CHARACTER}}` | Quién actúa. En I2V: una referencia corta ("the woman from the source image"). En T2V o grupos: bloque de identidad | 0–300 | PJ-xx |
| `{{ACTION}}` | Beats en orden: first → then → finally, con microacciones y física explícita | 300–600 | ACT-xx + MIC-xx |
| `{{CAMERA}}` | Un movimiento dominante + encuadre + tiempos si hay fases | 100–250 | CAM-xx |
| `{{ENVIRONMENT}}` | 2–4 actividades lógicas del escenario que reaccionan o viven | 120–300 | AMB-xx / LOC-xx |
| `{{LIGHTING}}` | Fuentes de luz con posición, propias del mundo | 80–200 | LUZ-xx |
| `{{DIALOGUE}}` | Solo si hay diálogo: speaker, tono, línea exacta | 0–220 | DLG formato |
| `{{CONTINUITY}}` | Dirección de pantalla, ejes, lo que permanece fijo entre tomas | 80–200 | CON-xx |
| `{{ENDING}}` | Cómo termina y se estabiliza la toma | 50–120 | END-xx |
| `{{AVOID}}` | Negativo compacto pegado al lock positivo | 120–220 | NEG-01 / NEG-02 |

Total objetivo: **1,500–2,300 caracteres** para escena completa; **700–1,400**
para un single shot sencillo (Kling rinde mejor con 100–200 palabras cuando la
imagen ya carga el look). Tope duro: 2,500. Si sobra, recorta en este orden:
adjetivos → ENVIRONMENT → LIGHTING → etiquetas de sección → AVOID (nunca
STYLE_LOCK, SOURCE, ACTION, CAMERA, CONTINUITY).

Las etiquetas en mayúsculas (`STYLE:`, `ACTION:`…) se pueden quitar para
ahorrar caracteres; el orden de los bloques se conserva.

---

## 2. Variante A — Single shot, image-to-video (la más usada)

Entrada: 1 screenshot FiveM o 1 imagen generada (Nano Banana). Salida: 1 clip
de 5–10 s.

```
STYLE: {{STYLE_LOCK}}

SOURCE: Starting from the provided image as the first frame. {{SOURCE}}

ACTION: {{CHARACTER}} {{ACTION}}

CAMERA: {{CAMERA}}

ENVIRONMENT: {{ENVIRONMENT}}

LIGHTING: {{LIGHTING}}

{{DIALOGUE}}

CONTINUITY: {{CONTINUITY}}

ENDING: {{ENDING}}

AVOID: {{AVOID}}
```

Ejemplo llenado (Cayo Perico, bienvenida) en `ejemplos.md` E-01.

---

## 3. Variante B — Multishot (Kling 3.0 Multishot / custom mode)

Entrada: 1 imagen de referencia (o @Elements) + secuencia. Salida: 1 clip de
hasta 15 s con hasta 4–6 cortes. Cada shot lleva su duración; la suma no pasa
de 15 s. Cada corte cambia tamaño de plano **y** carácter de cámara.

```
STYLE: {{STYLE_LOCK}}

SOURCE: {{SOURCE}} Same character, outfit, vehicle, location, time of day and
lighting in every shot. No teleporting between shots.

Shot 1 ({{S1_SEC}}s) — ESTABLISHING: {{S1_ACTION}} Camera: {{S1_CAMERA}}.
Shot 2 ({{S2_SEC}}s) — ACTION: {{S2_ACTION}} Camera: {{S2_CAMERA}}.
Shot 3 ({{S3_SEC}}s) — DETAIL: {{S3_ACTION}} Camera: {{S3_CAMERA}}.
Shot 4 ({{S4_SEC}}s) — HERO / PAYOFF: {{S4_ACTION}} Camera: {{S4_CAMERA}}.

ENVIRONMENT: {{ENVIRONMENT}}
LIGHTING: {{LIGHTING}}
{{DIALOGUE}}
CONTINUITY: {{CONTINUITY}} Screen direction stays the same across cuts.
ENDING: {{ENDING}}
AVOID: {{AVOID}}
```

Guía de duraciones para 15 s: 4 / 4 / 3 / 4. Para 10 s: 3 / 3 / 2 / 2. El
diálogo va dentro del shot donde se dice, con el speaker nombrado. Si Kling
soporta @Elements en tu plan, nombra al personaje como `@Nombre` en cada shot
donde aparece.

Ejemplo llenado (militares, llamada) en `ejemplos.md` E-02.

---

## 4. Variante C — Start frame → End frame

Entrada: IMAGE 1 = start, IMAGE 2 = end. Salida: el clip que las conecta.
Se describe **únicamente la transición física** entre A y B. Nada de acciones
extra. La cámara y el movimiento tienen que poder llegar al end frame.

```
STYLE: {{STYLE_LOCK}}

FRAMES: Image 1 is the start frame, image 2 is the end frame. Do not swap
them. {{SOURCE}}

TRANSITION: Starting exactly from image 1, {{CHARACTER}} {{TRANSITION_BEATS}}
so that the last frame matches image 2 in pose, position and framing.

CAMERA: {{CAMERA}} ending on the framing of image 2.

LIGHTING: {{LIGHTING}} Identical in both frames.

CONTINUITY: {{CONTINUITY}}

ENDING: The motion settles into the exact composition of image 2 and holds.

AVOID: {{AVOID}}
```

`{{TRANSITION_BEATS}}` responde a: ¿qué tendría que ocurrir físicamente para
pasar de A a B? (quién se mueve, con qué parte del cuerpo, hacia dónde, qué
queda en contacto con el suelo, quién avanza de frente y quién de espaldas).

Ejemplo llenado (Social HUB, teléfono) en `ejemplos.md` E-03.

---

## 5. Variante D — Imagen previa (Nano Banana) pensada para animar

Etapa 1 del flujo imagen → video. La imagen debe ser buena referencia para
animación: pose clara, anatomía legible, manos visibles si importan, objetos
importantes visibles, espacio para el movimiento futuro, iluminación
integrada.

```
{{STYLE_LOCK}} Single still frame, not a render, not key art.

SUBJECT: {{CHARACTER}}

POSE & STAGING: {{POSE}} Leave visible room {{ROOM_FOR_MOTION}} so the next
action can play out inside the frame. Hands visible. Face and outfit fully
readable.

LOCATION: {{LOCATION}} with {{ENVIRONMENT}}.

LIGHTING: {{LIGHTING}}

FRAMING: {{FRAMING}}, {{ASPECT}} composition, eye-level, natural in-game
depth of field.

AVOID: {{AVOID}} No text, no watermark, no UI overlay.
```

Si el video posterior tendrá al personaje sacando un objeto, la pose deja la
mano cerca de donde está el objeto. Si el video es un pull-back, la imagen se
compone con el personaje algo más grande de lo que quedará al final.

Para el estilo B (key art promocional, fondo blanco) NO se usa este master;
está en `elementos.md` STY-KEYART.

---

## 6. Variante E — Motion Control (Kling 3.0 Motion Control)

Entrada: imagen del personaje GTAHUB + video de referencia con el movimiento.
El clip de referencia manda el movimiento: **no lo describas**. Describe
contexto, escenario, luz y qué preservar.

```
STYLE: {{STYLE_LOCK}}

SOURCE: The character is the one in the reference image; keep face, hair,
outfit, tattoos and GTA V / FiveM proportions exactly. Motion, timing and
camera come from the reference video.

CONTEXT: {{LOCATION}} {{ENVIRONMENT}}

LIGHTING: {{LIGHTING}}

AVOID: {{AVOID}}
```

---

## 7. Variante F — Text-to-video (sin imagen)

Úsala solo cuando no hay referencia. El lock y el personaje pesan más porque
no hay imagen que cargue el look. Presupuesto: STYLE_LOCK largo (STY-03) +
CHARACTER completo (PJ-01 largo).

```
{{STYLE_LOCK}}

CHARACTER: {{CHARACTER}}

SCENE: {{LOCATION}} {{ENVIRONMENT}}

ACTION: {{ACTION}}

CAMERA: {{CAMERA}}

LIGHTING: {{LIGHTING}}

{{DIALOGUE}}

ENDING: {{ENDING}}

AVOID: {{AVOID}}
```

---

## 8. Diagnóstico: síntoma → slot que se toca

Cambiar **una variable por regeneración**. Si el fallo se repite igual en
cada tirada es sistemático (toca el prompt); si varía, deja el prompt y tira
2–3 veces más.

| El usuario dice | Causa habitual | Slot que se ajusta |
|---|---|---|
| "se convirtió en persona real" / "no se ve GTA" | lock débil o palabras como realistic / photorealistic / skin | `{{STYLE_LOCK}}` → STY-03, quitar esas palabras, `{{AVOID}}` → NEG-01 |
| "cambió el personaje" | el prompt describe rasgos que la imagen ya tiene | borrar descripción de apariencia en `{{CHARACTER}}`; reforzar `{{SOURCE}}` |
| "parece estudio" | adjetivos de luz genéricos, "cinematic lighting" | `{{LIGHTING}}` con fuente y posición (LUZ-xx); quitar "rim light", "beauty" |
| "jala para el lado incorrecto" | dirección no escrita en términos de pantalla | `{{CONTINUITY}}` con "screen-left → screen-right"; `{{ACTION}}` con quién avanza de frente |
| "está congelado" / "solo mueve los labios" | acción sin beats ni microacciones | `{{ACTION}}` con first/then/finally + MIC-xx; `{{ENVIRONMENT}}` con movimiento ambiental |
| "los pies patinan" | falta de consecuencia física | `{{ACTION}}`: "each step plants on the pavement", polvo, peso, suspensión |
| "la cámara hace de todo" | más de un movimiento | `{{CAMERA}}` a un solo movimiento o secuenciado con tiempos |
| "no llega al end frame" | transición imposible o beats extra | `{{TRANSITION_BEATS}}` solo lo necesario; cámara termina en encuadre de image 2 |
| "en el multishot se teletransporta" | escenario/hora no fijados por shot | `{{SOURCE}}` de la variante B; cada shot nombra lugar y dirección |
| "se ve genérico / plano" | look sin anclaje | `{{LIGHTING}}` + `{{ENVIRONMENT}}` concretos; no más adjetivos |

---

## 9. Checklist antes de entregar

- [ ] Empieza con el style lock GTA V / FiveM y la preservación de la fuente.
- [ ] No re-describe lo que la imagen ya muestra.
- [ ] Una acción principal, con beats en orden y microacciones.
- [ ] Un movimiento de cámara dominante (o secuenciado con tiempos).
- [ ] Dirección de movimiento en términos de pantalla.
- [ ] Luz con fuente y posición, nada de estudio.
- [ ] Diálogo exacto, con speaker y tono, en español si se pidió.
- [ ] Cierre estable.
- [ ] Ninguna palabra prohibida (photorealistic human, live-action, MetaHuman, Unreal, GTA VI, Hollywood).
- [ ] Entre 1,500 y 2,300 caracteres (o 700–1,400 si es single shot corto). Nunca más de 2,500.
- [ ] Nota corta de UI al final: modelo, duración, resolución, qué imagen en qué slot.
