const CACHE = 'mc-tools-v10';
const CORE_ASSETS = ['./index.html', './manifest.json', './icon.svg'];
const OPTIONAL_ASSETS = [
  'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/prism.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-json.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-javascript.min.js'
];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await cache.addAll(CORE_ASSETS);
    await Promise.all(OPTIONAL_ASSETS.map(async url => {
      try {
        const response = await fetch(url, { mode: 'no-cors', cache: 'reload' });
        if (response) await cache.put(url, response);
      } catch {}
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith('mc-tools-') && key !== CACHE).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET') return;

  if (url.origin !== self.location.origin) {
    if (OPTIONAL_ASSETS.includes(url.href)) {
      event.respondWith((async () => {
        const cached = await caches.match(url.href);
        if (cached) return cached;
        try { return await fetch(request); }
        catch { return new Response('Library unavailable offline. Reconnect and reload to use this feature.', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } }); }
      })());
    }
    return;
  }

  if (request.mode === 'navigate' || url.pathname.endsWith('/index.html') || url.pathname === '/Studio-Minecraft/') {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(request, { cache: 'no-cache' });
        if (fresh.ok) {
          const cache = await caches.open(CACHE);
          await cache.put('./index.html', fresh.clone());
        }
        return fresh;
      } catch {
        return (await caches.match('./index.html')) || Response.error();
      }
    })());
    return;
  }

  event.respondWith((async () => {
    const cached = await caches.match(request);
    if (cached) return cached;
    try {
      const response = await fetch(request);
      if (response.ok) {
        const cache = await caches.open(CACHE);
        await cache.put(request, response.clone());
      }
      return response;
    } catch {
      return (await caches.match('./index.html')) || Response.error();
    }
  })());
});