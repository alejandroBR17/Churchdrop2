import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';

const source = readFileSync(new URL('../public/sw.js', import.meta.url), 'utf8');
const origin = 'https://univer.example.test';
const current = 'univer-midia-v11-static-only';
const address = input => typeof input === 'string' ? input : input.url;
function response(url, body = 'fixture', type = 'application/javascript', extra = {}) {
  const result = new Response(body, {status: extra.status || 200, headers: {'Content-Type': type, ...extra.headers}});
  Object.defineProperties(result, {url: {value: extra.url || url}, type: {value: 'basic'}, redirected: {value: extra.redirected || false}});
  return result;
}
function harness(responder = request => response(request.url), {quota = false} = {}) {
  const stores = new Map(), handlers = {}, calls = [], removed = [];
  let claimed = false, waiting = false;
  const cacheStorage = {
    keys: async () => [...stores.keys()],
    delete: async name => { removed.push(name); return stores.delete(name); },
    open: async name => {
      if (!stores.has(name)) stores.set(name, new Map());
      const data = stores.get(name);
      return {
        match: async key => data.get(address(key))?.clone(),
        put: async (key, value) => {
          if (quota) throw new Error('QuotaExceededError');
          data.set(address(key), value.clone());
        },
        keys: async () => [...data.keys()].map(url => new Request(url)),
        delete: async key => data.delete(address(key)),
      };
    },
  };
  const context = vm.createContext({
    URL, Request, Response, Set, caches: cacheStorage,
    self: {location: {origin}, addEventListener: (name, handler) => { handlers[name] = handler; },
      clients: {claim: async () => { claimed = true; }}, skipWaiting: async () => { waiting = true; }},
    fetch: async (request, options) => { calls.push({request, options}); return responder(request, options); },
  });
  vm.runInContext(source, context);
  async function request(path, options = {}) {
    const waits = []; let result; let responded = false; let open = true;
    handlers.fetch({request: new Request(new URL(path, origin), options),
      respondWith: value => { result = value; responded = true; },
      waitUntil: value => { assert.ok(open, 'waitUntil is registered during dispatch'); waits.push(value); },
    });
    open = false;
    const value = await result;
    await Promise.all(waits);
    return {response: value, responded};
  }
  async function lifecycle(name) {
    const waits = [];
    handlers[name]({waitUntil: value => waits.push(value)});
    await Promise.all(waits);
  }
  return {context, stores, calls, removed, request, lifecycle, cacheStorage,
    state: () => ({claimed, waiting})};
}

test('API, Drive, media, signed URLs, credentials and partial requests bypass the worker', async () => {
  const h = harness();
  for (const [url, settings] of [
    ['/api/session'], ['/api/files'], ['/media/video.mp4'], ['/files/private.txt'],
    ['https://script.google.com/macros/s/fixture/exec'], ['https://www.googleapis.com/upload/drive/v3/files'],
    ['/?_vercel_share=private'], ['/assets/index-abc.js?token=private'],
    ['/assets/index-abc.js', {headers: {Authorization: 'Bearer isolated'}}],
    ['/assets/index-abc.js', {headers: {Range: 'bytes=0-100'}}], ['/', {method: 'POST'}],
  ]) assert.equal((await h.request(url, settings)).responded, false, url);
  assert.equal(h.calls.length, 0);
  assert.equal(h.stores.size, 0);
});

test('only successful, public and matching static responses enter the cache', async () => {
  for (const extra of [{status: 401}, {status: 500}, {redirected: true}, {url: `${origin}/login`},
    {headers: {'Cache-Control': 'private, max-age=0'}}, {headers: {'Cache-Control': 'no-store'}}]) {
    const h = harness(request => response(request.url, 'not public', 'application/javascript', extra));
    await h.request('/assets/index-abc.js');
    assert.equal(h.stores.get(current)?.size || 0, 0);
  }
  const h = harness(request => response(request.url, '<html>Sign in</html>', 'text/html'));
  await h.request('/assets/index-abc.js');
  assert.equal(h.stores.get(current)?.size || 0, 0);
});

test('static assets use the current named cache, never unrelated caches', async () => {
  const h = harness();
  const foreign = await h.cacheStorage.open('other-application');
  await foreign.put(`${origin}/assets/index-abc.js`, new Response('unrelated'));
  assert.equal(await (await h.request('/assets/index-abc.js')).response.text(), 'fixture');
  assert.equal(await (await h.request('/assets/index-abc.js')).response.text(), 'fixture');
  assert.equal(h.calls.length, 1);
});

test('activation removes only owned cache versions and preserves unrelated data', async () => {
  const h = harness();
  for (const name of [current, 'univer-midia-v10-file-list', 'churchdrop-v9', 'other-app', 'churchdrop-backup', 'univer-midia-downloads']) await h.cacheStorage.open(name);
  await h.lifecycle('activate');
  assert.deepEqual(h.removed.sort(), ['churchdrop-v9', 'univer-midia-v10-file-list']);
  assert.deepEqual([...h.stores.keys()].sort(), ['churchdrop-backup', 'other-app', 'univer-midia-downloads', current].sort());
  assert.equal(h.state().claimed, true);
});

test('offline document fallback uses only a validated canonical shell; online errors remain errors', async () => {
  let mode = 'online';
  const h = harness(request => {
    if (mode === 'offline') throw new Error('offline');
    return response(request.url, mode === 'online' ? '<html>app</html>' : 'Unauthorized', 'text/html', {status: mode === 'denied' ? 401 : 200});
  });
  await h.request('/index.html');
  mode = 'denied';
  assert.equal((await h.request('/')).response.status, 401);
  mode = 'offline';
  assert.equal(await (await h.request('/')).response.text(), '<html>app</html>');
  const empty = harness(() => { throw new Error('offline'); });
  const result = (await empty.request('/')).response;
  assert.equal(result.status, 503);
  assert.match(await result.text(), /Sem conexão/);
});

test('quota failure cannot turn a successful network response into failure', async () => {
  const h = harness(undefined, {quota: true});
  assert.equal(await (await h.request('/assets/index-abc.js')).response.text(), 'fixture');
});

test('cache entry count stays bounded under concurrent fetches and large assets are excluded', async () => {
  const h = harness(request => response(request.url, request.url.includes('huge') ? 'x'.repeat(2 * 1024 * 1024 + 1) : 'small'));
  const cache = await h.cacheStorage.open(current);
  await cache.put(`${origin}/`, new Response('shell'));
  await cache.put(`${origin}/manifest.json`, new Response('{}'));
  await Promise.all(Array.from({length: 35}, (_, index) => h.request(`/assets/chunk-${index}.js`)));
  assert.equal(h.stores.get(current).size, 24);
  await h.request('/assets/huge-asset.js');
  assert.equal(h.stores.get(current).size, 24);
  assert.equal(h.stores.get(current).has(`${origin}/assets/huge-asset.js`), false);
  assert.ok(h.stores.get(current).has(`${origin}/`) && h.stores.get(current).has(`${origin}/manifest.json`));
});

test('install preloads exact shell JS/CSS and manifest but no external resources or private links', async () => {
  const html = '<script src="/assets/index-abc.js"></script><link href="/assets/index-abc.css"><img src="https://private.example/file.png"><a href="/api/private">x</a>';
  const h = harness(request => response(request.url, request.url === `${origin}/` ? html : 'asset',
    request.url === `${origin}/` ? 'text/html' : request.url.endsWith('css') ? 'text/css' : request.url.endsWith('json') ? 'application/json' : 'application/javascript'));
  await h.lifecycle('install');
  assert.deepEqual(h.calls.map(call => new URL(call.request.url).pathname).sort(), ['/', '/assets/index-abc.css', '/assets/index-abc.js', '/manifest.json']);
  assert.equal(h.stores.get(current).size, 4);
  assert.equal(h.state().waiting, true);
});
