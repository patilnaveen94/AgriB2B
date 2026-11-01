const CACHE_NAME = 'balaji-shell-v2';
const APP_SHELL = '/';

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const shellResponse = await fetch(APP_SHELL);
      if (!shellResponse.ok) {
        throw new Error(`Unable to precache app shell: ${shellResponse.status}`);
      }

      const html = await shellResponse.clone().text();
      const appAssets = Array.from(
        html.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g),
        (match) => match[1],
      );
      const cache = await caches.open(CACHE_NAME);
      await cache.put(APP_SHELL, shellResponse);
      await cache.addAll([
        '/manifest.webmanifest',
        '/balaji-logo.svg',
        '/favicon.svg',
        '/icon-192.png',
        '/icon-512.png',
        ...appAssets,
      ]);
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter(
              (key) =>
                (key.startsWith('agriflow-shell-') ||
                  key.startsWith('balaji-shell-')) &&
                key !== CACHE_NAME,
            )
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET' || url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(async () => {
        const shell = await caches.match(APP_SHELL);
        return shell ?? Response.error();
      }),
    );
    return;
  }

  const isStaticAsset =
    url.pathname.startsWith('/assets/') ||
    url.pathname === '/favicon.svg' ||
    url.pathname === '/manifest.webmanifest' ||
    url.pathname === '/balaji-logo.svg' ||
    url.pathname === '/icon-192.png' ||
    url.pathname === '/icon-512.png';
  if (!isStaticAsset) return;

  event.respondWith(
    caches.match(request).then(async (cached) => {
      if (cached) return cached;

      const response = await fetch(request);
      if (response.ok) {
        const cache = await caches.open(CACHE_NAME);
        await cache.put(request, response.clone());
      }
      return response;
    }),
  );
});
