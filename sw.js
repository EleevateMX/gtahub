/* GTAHUB Content Hub — service worker de retiro.
 *
 * La versión anterior del hub registraba un service worker con caché propia
 * (`gtahub-v2`). Este rediseño ya no usa service worker, pero los navegadores
 * que visitaron el sitio viejo siguen con aquél instalado y podrían servir el
 * shell antiguo desde caché. Este archivo lo sustituye: borra todas las cachés
 * y se da de baja solo. Una vez que el equipo haya entrado al menos una vez,
 * se puede borrar este archivo.
 */
self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', ev => {
  ev.waitUntil((async () => {
    const claves = await caches.keys();
    await Promise.all(claves.map(k => caches.delete(k)));
    await self.registration.unregister();
    const clientes = await self.clients.matchAll({ type: 'window' });
    clientes.forEach(c => c.navigate(c.url));
  })());
});
