// Only the public app shell belongs here. Drive files, API data and sessions do not.
const CACHE_NAME = 'univer-midia-v11-static-only';
const LEGACY_CACHES = new Set(['univer-midia-v10-file-list', 'churchdrop-v9']);
const MAX_ENTRIES = 24;
const MAX_ENTRY_BYTES = 2 * 1024 * 1024;
const ORIGIN = self.location.origin;
let cacheWrites = Promise.resolve();

function routeKind(request) {
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== ORIGIN || url.search ||
      request.headers.has('Authorization') || request.headers.has('Range')) return null;
  if (url.pathname === '/' || url.pathname === '/index.html') return 'document';
  if (url.pathname === '/manifest.json') return 'manifest';
  if (/^\/assets\/[\w-]+\.(?:js|css)$/.test(url.pathname)) return 'asset';
  return null;
}

function canStore(request, response, kind) {
  if (response.status !== 200 || response.type !== 'basic' || response.redirected ||
      response.url !== request.url || /(?:no-store|private)/i.test(response.headers.get('Cache-Control') || '')) return false;
  const type = (response.headers.get('Content-Type') || '').split(';')[0].trim().toLowerCase();
  if (kind === 'document') return type === 'text/html';
  if (kind === 'manifest') return type === 'application/json' || type === 'application/manifest+json';
  return new URL(request.url).pathname.endsWith('.css')
    ? type === 'text/css'
    : type === 'text/javascript' || type === 'application/javascript';
}

function remember(request, response, kind) {
  if (!canStore(request, response, kind)) return Promise.resolve();
  // Clone while the response is unused. Cache failures must not break a valid request.
  const copy = response.clone();
  cacheWrites = cacheWrites.catch(() => {}).then(async () => {
    const declared = Number(copy.headers.get('Content-Length'));
    if (declared > MAX_ENTRY_BYTES) return;
    if ((await copy.clone().arrayBuffer()).byteLength > MAX_ENTRY_BYTES) return;
    const cache = await caches.open(CACHE_NAME);
    const key = kind === 'document' ? new URL('/', ORIGIN).href : request;
    await cache.put(key, copy);
    const keys = await cache.keys();
    const assets = keys.filter(item => new URL(item.url).pathname.startsWith('/assets/'));
    for (const stale of assets.slice(0, Math.max(0, keys.length - MAX_ENTRIES))) await cache.delete(stale);
  }).catch(() => {});
  return cacheWrites;
}

async function saved(request, kind) {
  try {
    const cache = await caches.open(CACHE_NAME);
    return await cache.match(kind === 'document' ? new URL('/', ORIGIN).href : request);
  } catch { return undefined; }
}

async function warmShell() {
  try {
    const request = new Request(new URL('/', ORIGIN).href, {credentials: 'same-origin', cache: 'no-cache'});
    const response = await fetch(request);
    if (!canStore(request, response, 'document')) return;
    const html = await response.clone().text();
    await remember(request, response, 'document');
    const assets = Array.from(html.matchAll(/(?:src|href)=["'](\/assets\/[\w-]+\.(?:js|css))["']/g), match => match[1]);
    const paths = [...new Set(['/manifest.json', ...assets])].slice(0, MAX_ENTRIES - 1);
    await Promise.all(paths.map(async path => {
      try {
        const asset = new Request(new URL(path, ORIGIN).href, {credentials: 'same-origin'});
        await remember(asset, await fetch(asset), routeKind(asset));
      } catch { /* A failed asset does not block the next online start. */ }
    }));
  } catch { /* Offline/protected install: do not cache login pages or fail registration. */ }
}

function offlinePage() {
  return new Response('<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Univer Mídia — sem conexão</title><h1>Sem conexão</h1><p>Conecte-se à internet e tente abrir o Univer Mídia novamente.</p><p>Os arquivos do Drive não são baixados automaticamente para uso offline.</p></html>', {
    status: 503, headers: {'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store'},
  });
}

self.addEventListener('install', event => {
  event.waitUntil(warmShell().then(() => self.skipWaiting()));
});

self.addEventListener('fetch', event => {
  const kind = routeKind(event.request);
  if (!kind) return;
  let writing = Promise.resolve();
  const response = (async () => {
    if (kind === 'asset') {
      const cached = await saved(event.request, kind);
      if (cached) return cached;
      const response = await fetch(event.request);
      writing = remember(event.request, response, kind);
      return response;
    }
    try {
      const response = await fetch(event.request, {cache: 'no-cache'});
      writing = remember(event.request, response, kind);
      return response;
    } catch {
      return await saved(event.request, kind) || (kind === 'document' ? offlinePage() : Response.error());
    }
  })();
  event.respondWith(response);
  // Register lifetime extension synchronously, before the fetch handler returns.
  event.waitUntil(response.then(() => writing).catch(() => {}));
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter(name => LEGACY_CACHES.has(name)).map(name => caches.delete(name)));
    await self.clients.claim();
  })());
});
