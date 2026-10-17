import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {createHmac, randomBytes} from 'node:crypto';

const source = readFileSync(new URL('../backend/drive/Code.gs', import.meta.url), 'utf8');
const secret = 'isolated-secret-never-used-outside-tests-0123456789';
const root = 'isolated-root';
const marker = 'univer-midia-v1';
const owned = {id: 'owned-file', name: 'Aviso.mp4', parents: [root],
  appProperties: {app: marker, kind: 'media', sharing: 'link', uploadedAt: new Date().toISOString(), preserve: '0'}};
function harness(responder = () => ({})) {
  const properties = new Map([['SERVER_SECRET', secret], ['ROOT_FOLDER_ID', root]]);
  const nonces = new Map(), calls = [];
  const context = vm.createContext({
    PropertiesService: {getScriptProperties: () => ({getProperty: key => properties.get(key), setProperty: (key, value) => properties.set(key, value)})},
    Utilities: {Charset: {UTF_8: 'utf8'}, computeHmacSha256Signature: (message, key) => [...createHmac('sha256', key).update(message).digest()]},
    LockService: {getScriptLock: () => ({waitLock() {}, releaseLock() {}})},
    CacheService: {getScriptCache: () => ({get: key => nonces.get(key), put: (key, value) => nonces.set(key, value)})},
    ContentService: {MimeType: {JSON: 'json'}, createTextOutput: text => ({setMimeType: () => JSON.parse(text)})},
    ScriptApp: {getOAuthToken: () => 'isolated-owner-token'},
    UrlFetchApp: {fetch: (url, options) => {
      calls.push({url, options});
      const result = responder(url, options, calls.length);
      return {getResponseCode: () => result.code || 200, getContentText: () => JSON.stringify(result.body || result), getAllHeaders: () => result.headers || {}};
    }},
  });
  vm.runInContext(source, context);
  function envelope(request, overrides = {}) {
    const value = {issuedAt: Date.now(), nonce: randomBytes(16).toString('hex'), payload: JSON.stringify(request), ...overrides};
    value.signature = createHmac('sha256', secret).update(`${value.issuedAt}\n${value.nonce}\n${value.payload}`).digest('hex');
    return {postData: {contents: JSON.stringify(value)}};
  }
  return {context, calls, properties, envelope, post: request => context.doPost(envelope(request))};
}

test('anonymous GET, unsigned/tampered/stale requests never reach Drive', () => {
  const h = harness();
  const valid = h.envelope({action: 'list'});
  const tampered = JSON.parse(valid.postData.contents);
  tampered.payload = JSON.stringify({action: 'trash', id: 'owned-file'});
  const bad = [undefined, {postData: {contents: '{}'}}, {postData: {contents: 'x'.repeat(20001)}},
    h.envelope({action: 'list'}, {issuedAt: Date.now() - 600000}),
    h.envelope({action: 'list'}, {issuedAt: Date.now() + 600000}),
    {postData: {contents: JSON.stringify(tampered)}}];
  assert.equal(h.context.doGet().status, 'error');
  bad.forEach(request => assert.equal(h.context.doPost(request).status, 'error'));
  assert.equal(h.calls.length, 0);
});

test('signed requests are accepted once and output never contains the owner token', () => {
  const h = harness(() => ({files: []}));
  const envelope = h.envelope({action: 'list'});
  assert.equal(h.context.doPost(envelope).status, 'success');
  assert.equal(h.context.doPost(envelope).status, 'error');
  assert.equal(h.calls.length, 1);
  const query = new URL(h.calls[0].url).searchParams.get('q');
  assert.ok(query.includes(`'${root}' in parents`) && query.includes(marker) && query.includes('trashed = false'));
  assert.ok(!JSON.stringify(h.context.doPost(h.envelope({action: 'list'}))).includes('isolated-owner-token'));
});

test('rename, trash and preserve reject files outside the app folder or without ownership markers', () => {
  for (const foreign of [{...owned, parents: ['other-root']}, {...owned, appProperties: {}},
    {...owned, appProperties: {...owned.appProperties, kind: 'root'}}, {...owned, trashed: true}]) {
    for (const action of ['rename', 'trash', 'preserve']) {
      const h = harness(() => foreign);
      assert.equal(h.post({action, id: owned.id, name: 'Novo.mp4', preserve: true}).status, 'error');
      assert.ok(h.calls.every(call => call.options.method === 'get'));
    }
  }
});

test('trash is reversible and rename/preservation do not reset upload age or change sharing', () => {
  for (const request of [{action: 'trash', id: owned.id}, {action: 'rename', id: owned.id, name: ' Novo.mp4 '},
    {action: 'preserve', id: owned.id, preserve: true}]) {
    const h = harness((_url, _options, count) => count === 1 ? owned : {id: owned.id});
    assert.equal(h.post(request).status, 'success');
    assert.equal(h.calls.length, 2);
    const mutation = h.calls[1];
    assert.equal(mutation.options.method, 'patch');
    const body = JSON.parse(mutation.options.payload);
    assert.deepEqual(body, request.action === 'trash' ? {trashed: true} : request.action === 'rename' ? {name: 'Novo.mp4'} : {appProperties: {preserve: '1'}});
    assert.ok(!mutation.url.includes('permissions'));
  }
});

test('resumable session initialization sends only metadata and constrains folder, type and size', () => {
  const session = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&upload_id=isolated';
  const h = harness(() => ({headers: {Location: session}}));
  const result = h.post({action: 'beginUpload', name: 'Vídeo.mp4', size: 1024, mimeType: 'video/mp4', eventName: 'Sábado', shareByLink: true});
  assert.equal(result.status, 'success');
  assert.equal(result.data.sessionUrl, session);
  const metadata = JSON.parse(h.calls[0].options.payload);
  assert.deepEqual(metadata.parents, [root]);
  assert.equal(metadata.appProperties.app, marker);
  assert.equal(metadata.appProperties.sharing, 'pending');
  assert.equal(metadata.appProperties.expectedSize, '1024');
  assert.ok(Number.isFinite(Date.parse(metadata.appProperties.uploadedAt)));
  assert.equal(h.calls[0].options.headers['X-Upload-Content-Length'], '1024');
  assert.equal(metadata.bytes, undefined);
  const invalid = harness();
  for (const value of [{size: 0}, {size: 2147483649}, {mimeType: 'video/mp4\r\nInjected: yes'}, {name: '\n'}, {shareByLink: false}]) {
    assert.equal(invalid.post({action: 'beginUpload', name: 'Vídeo.mp4', size: 1024, mimeType: 'video/mp4', shareByLink: true, ...value}).status, 'error');
  }
  assert.equal(invalid.calls.length, 0);
});

test('retention preview includes only expired app files and never changes Drive data', () => {
  const dated = days => ({...owned, id: `days-${days}`, appProperties: {...owned.appProperties, uploadedAt: new Date(Date.now() - days * 86400000).toISOString()}});
  const old = dated(15);
  const files = [old, dated(8), dated(1), {...old, id: 'pinned', appProperties: {...old.appProperties, preserve: '1'}},
    {...old, id: 'foreign', parents: ['other-root']}, {...old, id: 'unknown-date', appProperties: {...old.appProperties, uploadedAt: 'invalid'}},
    {...old, id: 'no-preservation', appProperties: {app: marker, kind: 'media', uploadedAt: old.appProperties.uploadedAt}}];
  const h = harness(() => ({files}));
  assert.deepEqual(Array.from(h.post({action: 'retentionPreview', days: 14}).data.files, f => f.id), ['days-15']);
  assert.deepEqual(Array.from(h.post({action: 'retentionPreview', days: 7}).data.files, f => f.id), ['days-15', 'days-8']);
  assert.equal(h.post({action: 'retentionPreview', days: 1}).status, 'error');
  assert.ok(h.calls.every(call => call.options.method === 'get'));
});

test('setup is idempotent and unavailable configuration cannot operate in another folder', () => {
  const h = harness();
  h.context.initializeStorage();
  assert.equal(h.calls.length, 0);
  h.properties.delete('ROOT_FOLDER_ID');
  assert.equal(h.post({action: 'list'}).status, 'error');
  assert.equal(h.calls.length, 0);
  h.properties.delete('SERVER_SECRET');
  assert.throws(() => h.context.initializeStorage(), /Configure/);
  assert.equal(h.calls.length, 0);
});

test('unsupported actions and upstream failures are generic and cannot purge files', () => {
  const h = harness(() => ({code: 403, body: {error: 'private upstream response'}}));
  for (const action of ['delete', 'purge', 'share', 'list']) {
    const result = h.post({action});
    assert.equal(result.status, 'error');
    assert.ok(!JSON.stringify(result).includes('private upstream'));
  }
  assert.ok(h.calls.every(call => call.options.method === 'get'));
});

test('publishing requires explicit confirmation, completed bytes and app ownership', () => {
  const pending = {...owned, size: '1024', appProperties: {...owned.appProperties, sharing: 'pending', expectedSize: '1024'}};
  const denied = harness(() => pending);
  assert.equal(denied.post({action: 'publishUpload', id: owned.id}).status, 'error');
  assert.equal(denied.calls.length, 0);
  for (const invalid of [{...pending, size: '1023'}, {...pending, parents: ['another-folder']},
    {...pending, appProperties: {...pending.appProperties, kind: 'root'}},
    {...pending, appProperties: {...pending.appProperties, expectedSize: undefined}}]) {
    const h = harness(() => invalid);
    assert.equal(h.post({action: 'publishUpload', id: owned.id, confirmShare: true}).status, 'error');
    assert.equal(h.calls.length, 1);
    assert.equal(h.calls[0].options.method, 'get');
  }
});

test('publishing grants only reader access to the individual file and retry is idempotent', () => {
  const pending = {...owned, size: '1024', appProperties: {...owned.appProperties, sharing: 'pending', expectedSize: '1024'}};
  let current = pending;
  const h = harness((url, options) => {
    if (url.includes('/permissions')) return options.method === 'get' ? {permissions: []} : {id: 'permission'};
    if (options.method === 'patch') { current = {...current, appProperties: JSON.parse(options.payload).appProperties}; return {id: owned.id}; }
    return current;
  });
  assert.equal(h.post({action: 'publishUpload', id: owned.id, confirmShare: true}).status, 'success');
  const grant = h.calls.find(call => call.options.method === 'post');
  assert.ok(grant.url.includes('/owned-file/permissions'));
  assert.deepEqual(JSON.parse(grant.options.payload), {type: 'anyone', role: 'reader', allowFileDiscovery: false});
  assert.ok(h.calls.every(call => !call.url.includes('/' + root + '/')));
  const savedDate = current.appProperties.uploadedAt, previous = h.calls.length;
  assert.equal(h.post({action: 'publishUpload', id: owned.id, confirmShare: true}).status, 'success');
  assert.equal(h.calls.length, previous + 1);
  assert.equal(current.appProperties.uploadedAt, savedDate);
});

test('login budget survives nonce-cache changes, expires, and fails closed for corrupt state', () => {
  const h = harness();
  for (let n = 0; n < 10; n++) assert.equal(h.post({action: 'claimLoginAttempt'}).data.allowed, true);
  assert.equal(h.post({action: 'claimLoginAttempt'}).data.allowed, false);
  const state = JSON.parse(h.properties.get('LOGIN_ATTEMPT_WINDOW'));
  assert.equal(state.count, 10);
  h.properties.set('LOGIN_ATTEMPT_WINDOW', JSON.stringify({...state, start: Date.now() - 600001}));
  assert.equal(h.post({action: 'claimLoginAttempt'}).data.allowed, true);
  for (const invalid of ['invalid', '{"start":0,"count":-1}', JSON.stringify({start: Date.now() + 60000, count: 0})]) {
    h.properties.set('LOGIN_ATTEMPT_WINDOW', invalid);
    assert.equal(h.post({action: 'claimLoginAttempt'}).status, 'error');
  }
  assert.equal(h.calls.length, 0);
});

test('text retrieval refuses pending, oversized and non-text files before reading bytes', () => {
  for (const file of [{...owned, mimeType: 'video/mp4', size: '10'}, {...owned, mimeType: 'text/plain', size: '262145'},
    {...owned, mimeType: 'text/plain', size: '10', appProperties: {...owned.appProperties, sharing: 'pending'}}]) {
    const h = harness(() => file);
    assert.equal(h.post({action: 'getText', id: owned.id}).status, 'error');
    assert.equal(h.calls.length, 1);
  }
});
