# INVESTIGACIÓN — Qué responde bien Higgsfield / Kling 3.0 (sep 2026)

Resumen de lo que se encontró y cómo se tradujo al master prompt. Las fuentes
marcadas con (*) se leyeron completas; las demás solo por extractos de
búsqueda, porque el proxy de la sesión bloquea higgsfield.ai, fal.ai,
kling.ai y varios blogs. Conviene verificar contra la doc oficial de
Higgsfield cuando se pueda.

## Hallazgos y cómo se aplicaron

| Hallazgo | Fuente | Aplicación en el master |
|---|---|---|
| Separar imagen, identidad y movimiento en instrucciones claras; no mezclar cámara, personaje y acción en un solo bloque. Comandos cortos y precisos. | Higgsfield (extracto), OSideMedia (*) | Bloques etiquetados STYLE / SOURCE / ACTION / CAMERA… en orden fijo. |
| Kling 3.0: orden recomendado Scene → Characters → Action → Camera → Audio & Style; 100–200 palabras óptimas; tratar el prompt como guion de producción. | fal.ai (extracto), OSideMedia MODELS-DEEP-REFERENCE (*) | Presupuesto por slot; single shot en 700–1,400 caracteres, escena completa en 1,500–2,300; el style lock va primero porque en GTAHUB el estilo es la instrucción crítica. |
| Image-to-video: "Starting from the provided image as the first frame. Describe ONLY what changes or moves — never re-describe static elements." | OSideMedia higgsfield-prompt (*) | Variante A empieza con esa frase; `{{CHARACTER}}` en I2V es una referencia corta, no una descripción. |
| Si el personaje no coincide con la referencia: borrar primero el texto que la contradice; en I2V eliminar toda descripción de apariencia y dejar solo movimiento y cámara. | OSideMedia troubleshoot (*) | Tabla de diagnóstico "cambió el personaje". |
| Un movimiento de cámara dominante por clip (One-Move Rule); nunca Dolly In + Dolly Out; secuenciar con tiempos "pans 0–3s, holds, pushes in 4–8s". Distinguir "stays and pans" de "glides alongside". | OSideMedia camera (*), Higgsfield Cinema Studio (extracto) | CAM-xx con un solo movimiento; CAM-15 secuenciado; regla en SKILL §10. |
| Cada corte cambia tamaño de plano y carácter de cámara (double-contrast). ≤3 personajes seguidos entre cortes. Un personaje que sale de cuadro está "fuera" por el resto del shot. | OSideMedia (*) | Variante B: establishing → action → detail → hero con cámaras distintas. |
| Multishot Kling 3.0: formato `Shot N (Xs): … Camera: …`, hasta 6 cortes (5 en custom mode según UI), total ≤ 15 s. | OSideMedia (*), chaseai / atlabs / kling.ai (extractos) | Variante B con duraciones por shot y guía 4/4/3/4. |
| Diálogo entre comillas con speaker y tono: `Close-up of woman, concerned tone: "…"`. ~25–30 palabras habladas caben en 15 s. Kling 3.0 genera audio nativo multilingüe, español incluido. | atlabs (extracto), OSideMedia (*) | Formato DLG con speaker y tone; presupuesto de palabras en SKILL §17. |
| @Elements para fijar identidad entre shots ("@Image1's character"). | OSideMedia (*), magichour (extracto) | Variante B sugiere `@Nombre` cuando el plan lo soporte. |
| Secuencias con "first / then / finally"; cerrar con "returns to starting position" o "then settles" para evitar generaciones colgadas. | OSideMedia (*) | ACT-xx escritas así; slot ENDING obligatorio. |
| Start/End frame: el modelo genera exactamente la transición; si el movimiento descrito no puede llegar al end frame, el resultado deriva. | Higgsfield (extracto), OSideMedia (*) | Variante C describe solo la transición y termina "into the exact composition of image 2". |
| Motion Control: el clip de referencia manda el movimiento; describir contexto y cámara, no el movimiento. | OSideMedia (*) | Variante E. |
| Negativos: Kling los acepta, pero "say what you want, not what you avoid"; los bans funcionan solo cuando el modelo tiende por defecto a ese fallo. Cinema Studio 3.0 no acepta negativos y tiene tope de 512 caracteres. | OSideMedia negative-constraints (*) | Style lock positivo primero; NEG-01 compacto al final porque la deriva a foto-realismo SÍ es el comportamiento por defecto. Para Cinema Studio: quitar AVOID y usar STY-01. |
| Anti-slop: "beautiful", "epic", "dynamic", "cinematic lighting" no aportan; nombrar luz por fuente y posición, movimiento por nombre. Emociones descompuestas en gestos observables. | OSideMedia (*) | LUZ-xx con fuente y posición; MIC-xx; SKILL §5 y §33. |
| Iterar una sola variable por regeneración; distinguir fallo sistemático (cambiar prompt) de estocástico (repetir tirada). Frozen character → decir qué cambia, añadir cámara y movimiento ambiental. Sliding feet → consecuencias físicas. Screen direction → escribir "screen-left to screen-right". | OSideMedia troubleshoot (*) | Tabla de diagnóstico en `master-prompt.md` §8. |
| Draft a 720p, fijar prompt, y rerun final a la resolución deseada. Aspect ratio y duración van en la UI, no en el prompt. | Higgsfield (extracto), OSideMedia (*) | Nota de UI al final de cada entrega; checklist. |
| Nano Banana Pro: hasta 14 referencias, 4K, "thinking mode"; puede dar textura plástica y perder relación espacial con muchas referencias. | OSideMedia (*) | Variante D pide "single still frame, not a render"; una o dos referencias, no catorce. |

## Puntos donde el master se aparta de la guía general (a propósito)

- Las guías genéricas piden "photorealistic, physically accurate" para ganar
  realismo. Para GTAHUB eso es veneno: el realismo se pide como iluminación,
  física y cámara, nunca como piel o humanos reales (SKILL §3–4).
- Las guías ponen el estilo al final ("Audio & Style"). Aquí va al principio
  porque los primeros tokens pesan más y el estilo es la instrucción más
  crítica del proyecto.
- El negativo se mantiene aunque la guía lo desaconseje en general, porque
  cumple la condición en la que sí funciona: el modelo deriva por defecto a
  humano real.

## Límite de caracteres

No se encontró documentación oficial pública del tope de 2,500 caracteres en
Higgsfield para Kling (sí el de 512 en Cinema Studio). Se conserva el 2,500
como tope operativo porque coincide con la experiencia del equipo.

## Fuentes

- (*) OSideMedia, *higgsfield-ai-prompt-skill* (MIT), v3.40.0, 2026-09-26: https://github.com/OSideMedia/higgsfield-ai-prompt-skill — archivos leídos: `skills/higgsfield-prompt/SKILL.md`, `skills/higgsfield-camera/SKILL.md`, `skills/shared/negative-constraints.md`, `skills/higgsfield-models/MODELS-DEEP-REFERENCE.md`, `skills/higgsfield-troubleshoot/SKILL.md`, `vocab.md`, `README.md`.
- Higgsfield, *Kling 3.0 on Higgsfield: User Guide*: https://higgsfield.ai/blog/Kling-3.0-is-on-Higgsfield-User-Guide-AI-Video-Generation (extracto)
- Higgsfield, *Cinema Studio Prompt Guide*: https://higgsfield.ai/blog/cinema-studio-3.0 (extracto)
- fal.ai, *Kling 3.0 Prompting Guide*: https://blog.fal.ai/kling-3-0-prompting-guide/ (extracto)
- Kling, *Kling VIDEO 3.0 Multi-Shot*: https://kling.ai/blog/kling-video-3-multi-shot-guide (extracto)
- Atlabs, *Kling 3.0 Prompting Guide* y *16 Kling 3.0 Prompt Examples*: https://www.atlabs.ai/blog/kling-3-0-prompting-guide-master-ai-video-generation · https://www.atlabs.ai/blog/kling-3-prompt-examples-templates (extractos)
- Chase AI, *Kling 3.0 Guide: Multi-Shots & Prompts*: https://www.chaseai.io/blog/kling-3-0-guide-prompting-multi-shots (extracto)
- Magic Hour, *Kling 3.0 Reference Guide*: https://magichour.ai/blog/kling-30-reference-guide (extracto)
- Segmind, *Higgsfield AI Prompt Format Guide*: https://blog.segmind.com/higgsfield-ai-prompt-guide-video-creation/ (extracto)
- Memons, *Higgsfield Prompt Cheat Sheet (2026)*: https://memons.ai/higgsfield-prompt-cheat-sheet (extracto)
