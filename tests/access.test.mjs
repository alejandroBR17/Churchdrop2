import test from 'node:test';
import assert from 'node:assert/strict';
import {scryptSync} from 'node:crypto';
import {createAccessHandler, requireAccess} from '../server/access.mjs';
import {createMediaHandler} from '../server/mediaApi.mjs';

const code = '0123456789', salt = Buffer.alloc(16, 3);
const environment = {UNIVER_DRIVE_ENABLED: 'true', UNIVER_DRIVE_SERVER_SECRET: 'isolated-session-test-secret-0123456789',
  UNIVER_ACCESS_CODE_HASH: `scrypt:${salt.toString('hex')}:${scryptSync(code, salt, 64).toString('hex')}`};
function request(path = '/api/session', method = 'GET', body, extra = {}) {
  return new Request('https://app.example' + path, {method, headers: {origin: 'https://app.example',
    'x-univer-request': '1', 'content-type': 'application/json', ...extra}, ...(body === undefined ? {} : {body: JSON.stringify(body)})});
}
const cookie = response => response.headers.get('set-cookie').split(';')[0];

test('disabled or incomplete setup never admits a visitor', async () => {
  let calls = 0;
  const disabled = createAccessHandler({environment: {}, drive: async () => {calls++;}});
  assert.deepEqual(await (await disabled(request())).json(), {enabled: false, authenticated: false});
  const missing = createAccessHandler({environment: {UNIVER_DRIVE_ENABLED: 'true'}});
  assert.equal((await missing(request())).status, 503);
  assert.equal(calls, 0);
  await assert.rejects(requireAccess(request(), new Headers(), {environment}), error => error.status === 401);
});

test('borrowed-device session is encrypted, secure, short lived and revocable by code rotation', async () => {
  let claims = 0;
  const handler = createAccessHandler({environment, drive: async input => {assert.equal(input.action, 'claimLoginAttempt'); claims++; return {allowed: true};}});
  const response = await handler(request(undefined, 'POST', {code, remember: false}));
  assert.equal(response.status, 200);
  const setCookie = response.headers.get('set-cookie');
  for (const attribute of ['__Host-univer-session=', 'HttpOnly', 'Secure', 'SameSite=Strict', 'Path=/']) assert.ok(setCookie.includes(attribute));
  assert.ok(!setCookie.includes('Max-Age='));
  assert.ok(!setCookie.includes(code));
  const authenticated = request(undefined, 'GET', undefined, {cookie: cookie(response)});
  assert.equal((await (await handler(authenticated)).json()).authenticated, true);
  await assert.rejects(requireAccess(authenticated, new Headers(), {environment, now: () => Date.now() + 9 * 3600000}), error => error.status === 401);
  await assert.rejects(requireAccess(authenticated, new Headers(), {environment: {...environment, UNIVER_DRIVE_SERVER_SECRET: 'rotated-session-secret-that-is-at-least-32-chars'}}), error => error.status === 401);
  const logout = await handler(request(undefined, 'DELETE', undefined, {cookie: cookie(response)}));
  assert.equal(logout.status, 200);
  assert.ok(logout.headers.get('set-cookie').includes('Max-Age=0'));
  assert.equal(claims, 1);
});

test('remembered sessions persist; wrong codes and exhausted budget cannot issue a session', async () => {
  const handler = createAccessHandler({environment, drive: async () => ({allowed: true})});
  const good = await handler(request(undefined, 'POST', {code, remember: true}));
  assert.equal(good.status, 200);
  assert.ok(good.headers.get('set-cookie').includes('Max-Age=604740'));
  const bad = await handler(request(undefined, 'POST', {code: '9999999999', remember: true}));
  assert.equal(bad.status, 401); assert.equal(bad.headers.get('set-cookie'), null);
  const locked = createAccessHandler({environment, drive: async () => ({allowed: false, retryAfterSeconds: 123})});
  const denied = await locked(request(undefined, 'POST', {code, remember: false}));
  assert.equal(denied.status, 429); assert.equal(denied.headers.get('retry-after'), '123');
  assert.equal(denied.headers.get('set-cookie'), null);
});

test('cross-site writes, invalid codes and oversized bodies do not consume the Drive login budget', async () => {
  let calls = 0;
  const handler = createAccessHandler({environment, drive: async () => {calls++; return {allowed: true};}});
  for (const headers of [{origin: 'https://attacker.example'}, {'x-univer-request': ''}, {'sec-fetch-site': 'cross-site'}]) {
    assert.equal((await handler(request(undefined, 'POST', {code, remember: false}, headers))).status, 403);
  }
  for (const body of [{code: '123', remember: false}, {code}, {code, remember: false, padding: 'x'.repeat(3000)}]) {
    assert.equal((await handler(request(undefined, 'POST', body))).status, 400);
  }
  assert.equal(calls, 0);
});

test('media API requires authentication before any Drive action, never caching responses', async () => {
  let calls = 0;
  const handler = createMediaHandler({environment, drive: async () => {calls++;}});
  const response = await handler(request('/api/media'));
  assert.equal(response.status, 401); assert.equal(calls, 0);
  assert.equal(response.headers.get('cache-control'), 'private, no-store');
});

test('media listing hides unfinished uploads and owner metadata; mutations require explicit share confirmation', async () => {
  const operations = [];
  const base = {id: 'file-123', name: 'Aviso.mp4', mimeType: 'video/mp4', size: '1024', parents: ['private-root'],
    appProperties: {sharing: 'link', uploadedAt: '2026-10-17T12:00:00Z', eventName: 'Sábado'}};
  const handler = createMediaHandler({environment, authorize: async () => {}, drive: async input => {
    operations.push(input); return {files: [base, {...base, id: 'pending-123', appProperties: {...base.appProperties, sharing: 'pending'}}]};
  }});
  const list = await (await handler(request('/api/media'))).json();
  assert.equal(list.files.length, 1); assert.equal(list.pendingUploads.length, 1);
  assert.equal(list.files[0].parents, undefined); assert.equal(list.files[0].appProperties, undefined);
  for (const body of [{action: 'publishUpload', id: 'file-123'}, {action: 'beginUpload', name: 'A.mp4', size: 10, mimeType: 'video/mp4', eventName: ''},
    {action: 'delete', id: 'file-123'}, {action: 'retentionPreview', days: 1}]) {
    assert.equal((await handler(request('/api/media', 'POST', body))).status, 400);
  }
  assert.equal(operations.length, 1);
});

test('upload origin comes from the authenticated API URL, never from caller JSON', async () => {
  let operation;
  const handler = createMediaHandler({environment, authorize: async () => {}, drive: async input => {operation = input; return {sessionUrl: 'isolated-session'};}});
  const response = await handler(request('/api/media', 'POST', {action: 'beginUpload', name: 'Aviso.png', size: 12,
    mimeType: 'image/png', eventName: '', shareByLink: true, origin: 'https://attacker.example'}));
  assert.equal(response.status, 200);
  assert.equal(operation.origin, 'https://app.example');
});
