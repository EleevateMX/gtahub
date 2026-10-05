/* GTAHUB Content Hub — service worker.
 *
 * Por qué existe: Chrome solo ofrece «Instalar» si hay un service worker
 * con manejador de 'fetch'. El archivo anterior era de retiro (borraba
 * cachés y se daba de baja), así que el hub nunca fue instalable.
 *
 * Estrategia: red primero, caché de respaldo. El equipo siempre ve la
 * versión publicada más reciente; la caché solo entra si no hay red, para
 * que la app instalada abra el shell en vez de la página de error del
 * navegador. Los datos no se cachean: Supabase es otro origen y este SW
 * no toca ninguna petición fuera del suyo.
 *
 * Al publicar cambios en el shell, sube VERSION: 'activate' borra las
 * cachés que no coincidan, incluida la 'gtahub-v2' del hub viejo.
 */
const VERSION = '2026-10-05.3';
const CACHE = 'gtahub-hub-' + VERSION;

/* Lo mínimo para abrir sin red: shell, estilos, scripts, logo y el arte
   del login. El resto del arte entra a la caché la primera vez que se usa. */
const SHELL = [
  './',
  'index.html',
  'hub-app.css',
  'hub-data.js',
  'hub-api.js',
  'hub-app.js',
  'manifest.json',
  'assets/logoGtahub.png',
  'icon-192.png',
  'icon-512.png',
  'icon-maskable-512.png',
  'favicon-32.png',
  'hub-art/bg-inicio.jpg',
  'hub-art/char-business.png'
];

/* skipWaiting: hay navegadores del equipo con el SW de retiro todavía
   registrado. Sin esto, el nuevo esperaría a que se cerraran todas las
   pestañas para tomar el control. */
self.addEventListener('install', ev => {
  ev.waitUntil((async () => {
    const c = await caches.open(CACHE);
    // cache:'reload' salta la caché HTTP de GitHub Pages (max-age=600).
    await c.addAll(SHELL.map(u => new Request(u, { cache: 'reload' })));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', ev => {
  ev.waitUntil((async () => {
    const claves = await caches.keys();
    await Promise.all(claves.filter(k => k !== CACHE).map(k => caches.delete(k)));
    if (self.registration.navigationPreload) await self.registration.navigationPreload.enable();
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', ev => {
  const req = ev.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // Otro origen (Supabase, Google Fonts): directo a la red, sin pasar por aquí.
  if (url.origin !== self.location.origin) return;

  ev.respondWith((async () => {
    try {
      const res = (req.mode === 'navigate' && await ev.preloadResponse) || await fetch(req);
      if (res.ok && res.type === 'basic') {
        const copia = res.clone();
        ev.waitUntil(caches.open(CACHE).then(c => c.put(req, copia)));
      }
      return res;
    } catch (e) {
      const enCache = await caches.match(req, { ignoreSearch: true });
      if (enCache) return enCache;
      if (req.mode === 'navigate') return (await caches.match('index.html')) || Response.error();
      return Response.error();
    }
  })());
});
