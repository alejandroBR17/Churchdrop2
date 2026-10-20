import test from 'node:test';
import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
import {callDrive, signedEnvelope} from '../server/driveBridge.mjs';

const secret = 'isolated-bridge-secret-never-used-in-production';
const environment = {UNIVER_DRIVE_ENABLED: 'true', UNIVER_DRIVE_SCRIPT_URL: 'https://script.google.com/macros/s/isolated/exec', UNIVER_DRIVE_SERVER_SECRET: secret};
const ok = () => Response.json({status: 'success', data: {files: []}});

test('envelope signs the exact UTF-8 payload expected by the Apps Script', () => {
  const request = {action: 'rename', id: 'isolated-file', name: 'Reunião 🎵'};
  const value = JSON.parse(signedEnvelope(request, secret, {issuedAt: 123, nonce: 'a'.repeat(48)}));
  assert.deepEqual(JSON.parse(value.payload), request);
  assert.equal(value.signature, createHmac('sha256', secret).update(`123\n${value.nonce}\n${value.payload}`, 'utf8').digest('hex'));
  assert.equal(JSON.stringify(value).includes(secret), false);
  assert.throws(() => signedEnvelope({large: 'á'.repeat(15000)}, secret), /metadados/);
});

test('disabled or invalid config fails closed before sending any request', async () => {
  let calls = 0; const fetcher = async () => { calls++; return ok(); };
  for (const settings of [{UNIVER_DRIVE_ENABLED: 'false'}, {UNIVER_DRIVE_SERVER_SECRET: ''},
    {UNIVER_DRIVE_SCRIPT_URL: 'https://evil.example/exec'},
    {UNIVER_DRIVE_SCRIPT_URL: `${environment.UNIVER_DRIVE_SCRIPT_URL}?token=private`},
    {UNIVER_DRIVE_SCRIPT_URL: environment.UNIVER_DRIVE_SCRIPT_URL.replace('https:', 'http:')}]) {
    await assert.rejects(callDrive({action: 'list'}, {environment: {...environment, ...settings}, fetcher}));
  }
  assert.equal(calls, 0);
});

test('Google content redirect is followed once as GET, without the signed body or secret', async () => {
  const calls = [];
  const data = await callDrive({action: 'list'}, {environment, fetcher: async (url, options) => {
    calls.push({url, options});
    if (calls.length === 1) return new Response(null, {status: 302, headers: {Location: 'https://script.googleusercontent.com/macros/echo?isolated=1'}});
    return ok();
  }});
  assert.deepEqual(data, {files: []});
  assert.equal(calls[0].options.method, 'POST');
  assert.equal(calls[1].options.method, 'GET');
  assert.equal(calls[1].options.body, undefined);
  assert.equal(calls[1].options.headers, undefined);
  assert.ok(calls.every(call => call.options.redirect === 'manual' && call.options.credentials === 'omit'));
});

test('untrusted redirects never receive signed metadata', async () => {
  for (const location of ['https://evil.example/macros/echo', 'https://script.googleusercontent.com.evil.example/macros/echo',
    'https://accounts.google.com/signin', 'http://script.googleusercontent.com/macros/echo',
    'https://script.googleusercontent.com/other', 'https://user:pass@script.googleusercontent.com/macros/echo']) {
    let calls = 0;
    await assert.rejects(callDrive({action: 'list'}, {environment, fetcher: async () => {
      calls++; return new Response(null, {status: 302, headers: {Location: location}});
    }}), {name: 'DriveBridgeError'});
    assert.equal(calls, 1);
  }
});

test('upstream errors and malformed/oversized output do not leak details or become success', async () => {
  for (const fetcher of [async () => new Response('private upstream', {status: 403}), async () => new Response('<html>login</html>'),
    async () => Response.json({status: 'error', message: secret}), async () => Response.json({status: 'success'}),
    async () => new Response('x'.repeat(1024 * 1024 + 1)),
    async () => { throw new Error(`private ${secret}`); }]) {
    await assert.rejects(callDrive({action: 'list'}, {environment, fetcher}), error => error.name === 'DriveBridgeError' && !error.message.includes(secret) && !error.message.includes('private'));
  }
});

test('interrupted write is not retried blindly and timeout/cancellation release the request', async () => {
  let calls = 0;
  await assert.rejects(callDrive({action: 'rename'}, {environment, timeoutMs: 10, fetcher: async (_url, options) => {
    calls++;
    return new Promise((_resolve, reject) => options.signal.addEventListener('abort', () => reject(options.signal.reason), {once: true}));
  }}), {name: 'DriveBridgeError'});
  assert.equal(calls, 1);
  const controller = new AbortController(); controller.abort();
  await assert.rejects(callDrive({action: 'list'}, {environment, signal: controller.signal}), {name: 'AbortError'});
});
