# Despliegue automático (para Claude Code)

Objetivo: subir este repo a GitHub y publicarlo en una URL fija, sin pasos manuales.
Ejecuta estas fases en orden y al final entrega al usuario la URL funcionando.

## Fase 0 — Prerrequisitos (verifícalos, no los asumas)

1. `git status` — este directorio ya es un repo con commits en `main`.
2. `gh auth status` — si no hay sesión de GitHub CLI, corre `gh auth login`
   (flujo web) y espera a que el usuario lo complete. Si `gh` no está instalado:
   `brew install gh`.

## Fase 1 — Push a GitHub

```bash
git remote add origin https://github.com/EleevateMX/gtahub.git 2>/dev/null || true
git push -u origin main
```

Si el push falla por historia divergente (el repo remoto ya tiene commits),
haz `git pull --rebase origin main` y resuelve; si el remoto solo tiene un
README inicial, `git push --force-with-lease` es aceptable.

## Fase 2 — Publicar y obtener URL

### Opción A · GitHub Pages (sin cuentas extra) — inténtala primero

Solo funciona si el repo es **público** (o el plan lo permite):

```bash
gh repo view EleevateMX/gtahub --json visibility -q .visibility
# Si es privado, pregunta al usuario si lo hacemos público:
#   gh repo edit EleevateMX/gtahub --visibility public --accept-visibility-change-consequences
gh api repos/EleevateMX/gtahub/pages -X POST -f "source[branch]=main" -f "source[path]=/" \
  || gh api repos/EleevateMX/gtahub/pages -X PUT -f "source[branch]=main" -f "source[path]=/"
```

URL resultante: **https://eleevatemx.github.io/gtahub/**
(tarda 1-2 min el primer build; verifica con curl que responda 200).
Los assets usan rutas relativas, así que funciona bajo el subpath sin cambios.
Cada `git push` posterior republica solo.

### Opción B · Vercel (si Pages no aplica o quieren dominio propio)

```bash
npx vercel login          # flujo por navegador, una sola vez
npx vercel link --yes
npx vercel --prod --yes   # imprime la URL de producción
```

Y en vercel.com conectar el repo de GitHub para que cada push redeploya
(Add New → Project → importar EleevateMX/gtahub → Framework: Other).

## Fase 3 — Verificación y entrega

1. `curl -sI <URL>` debe dar 200 y `content-type: text/html`.
2. Abre la URL y confirma que carga la pantalla de login de GTAHUB
   (el login real requiere la base de Supabase activa).
3. Entrega al usuario: la URL final, y recuérdale que en iPhone se instala con
   Safari → Compartir → «Agregar a pantalla de inicio», y en PC con el icono
   de instalar de Chrome/Edge.

## Nota de seguridad

Nunca subas llaves service_role ni credenciales en claro. El archivo ya solo
contiene la llave publishable (anon), que es la pensada para el navegador.
El contexto completo del proyecto está en `CLAUDE.md`.
