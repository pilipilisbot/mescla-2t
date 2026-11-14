const CACHE = 'mescla-2t-v6';
const ASSETS = ['./', './index.html', './styles.css', './app.js', './math.js', './manifest.webmanifest', './icons/icon.svg', './icons/icon-192.png', './icons/icon-512.png'];

function versionedUrl(url) {
  const fresh = new URL(url, self.registration.scope);
  fresh.searchParams.set('app-version', CACHE);
  return fresh;
}

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await Promise.all(ASSETS.map(async (asset) => {
      const response = await fetch(versionedUrl(asset), { cache: 'reload' });
      if (!response.ok) throw new Error(`Cannot cache ${asset}: ${response.status}`);
      await cache.put(new Request(asset), response);
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(Promise.all([
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))),
    self.clients.claim(),
  ]));
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== self.location.origin) return;

  event.respondWith((async () => {
    try {
      // Revalidate online: a previously installed app must not keep serving old files.
      const response = await fetch(versionedUrl(event.request.url), { cache: 'no-cache' });
      if (response.ok) {
        const cache = await caches.open(CACHE);
        await cache.put(event.request, response.clone());
      }
      return response;
    } catch (error) {
      const cached = await caches.match(event.request);
      if (cached) return cached;
      if (event.request.mode === 'navigate') {
        const offlinePage = await caches.match('./index.html');
        if (offlinePage) return offlinePage;
      }
      throw error;
    }
  })());
});
