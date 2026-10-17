import test from 'node:test';
import assert from 'node:assert/strict';
import {appApi} from '../services/appApi.ts';
import {fetchFilesFromScript, getCachedFiles, clearOperatorData, renameFileInScript,
  deleteFileFromScript, uploadFileToScript, groupItemsByEvent} from '../services/churchService.ts';

const file = {id: 'isolated-file', name: 'Aviso.txt', mimeType: 'text/plain', date: '2026-10-17T12:00:00Z'};
const json = (data, status = 200) => Response.json(data, {status});
async function withFetch(fetcher, run) {
  const original = globalThis.fetch; globalThis.fetch = fetcher;
  try {clearOperatorData(); await run();} finally {globalThis.fetch = original; clearOperatorData();}
}

test('API metadata stays on the same origin with cookies, CSRF header and no caching', async () => {
  let called = 0;
  const result = await appApi('/api/media', {action: 'rename', id: file.id, name: 'Novo.txt'}, {fetcher: async (path, init) => {
    assert.equal(path, '/api/media'); assert.equal(init.credentials, 'same-origin');
    assert.equal(init.cache, 'no-store'); assert.equal(init.redirect, 'error');
    assert.equal(init.headers['X-Univer-Request'], '1');
    assert.deepEqual(JSON.parse(init.body), {action: 'rename', id: file.id, name: 'Novo.txt'});
    called++; return json({status: 'success'});
  }});
  assert.equal(result.status, 'success'); assert.equal(called, 1);
  await assert.rejects(appApi('/api/media', undefined, {fetcher: async () => json({error: 'Entre novamente'}, 401)}), /Entre novamente/);
});

test('pagination uses encoded GET cursors and only commits a complete validated snapshot', async () => {
  let calls = 0;
  await withFetch(async (path, init) => {
    assert.equal(init.method, 'GET'); assert.equal(init.body, undefined);
    if (calls++ === 0) {assert.equal(path, '/api/media'); return json({files: [file], nextPageToken: 'next/+='});}
    assert.equal(path, '/api/media?cursor=next%2F%2B%3D');
    return json({files: [{...file, id: 'second-file'}], nextPageToken: null});
  }, async () => {
    assert.equal((await fetchFilesFromScript()).length, 2);
    assert.equal(getCachedFiles().length, 2);
    clearOperatorData(); assert.equal(getCachedFiles().length, 0);
  });
});

test('duplicates, cursor loops and partial-list failures never replace the last valid snapshot', async () => {
  let mode = 'valid', count = 0;
  await withFetch(async () => {
    count++;
    if (mode === 'valid') return json({files: [file]});
    if (mode === 'duplicate') return json({files: [file, file]});
    if (mode === 'loop') return json({files: [], nextPageToken: 'same'});
    if (count % 2) return json({files: [{...file, id: 'partial'}], nextPageToken: 'next'});
    return json({error: 'Offline'}, 503);
  }, async () => {
    await fetchFilesFromScript();
    for (const value of ['duplicate', 'loop', 'partial']) {
      mode = value; count = 0;
      await assert.rejects(fetchFilesFromScript());
      assert.deepEqual(getCachedFiles().map(item => item.id), [file.id]);
    }
  });
});

test('failed mutations preserve the snapshot; successful rename/trash update it after acknowledgement', async () => {
  let fail = true;
  await withFetch(async (_path, init) => {
    if (init.method === 'GET') return json({files: [file]});
    return fail ? json({error: 'Unavailable'}, 502) : json({status: 'success'});
  }, async () => {
    await fetchFilesFromScript();
    await assert.rejects(renameFileInScript(file.id, 'Novo.txt'));
    await assert.rejects(deleteFileFromScript(file.id));
    assert.equal(getCachedFiles()[0].name, file.name);
    fail = false; await renameFileInScript(file.id, 'Novo.txt');
    assert.equal(getCachedFiles()[0].name, 'Novo.txt');
    await deleteFileFromScript(file.id); assert.equal(getCachedFiles().length, 0);
  });
});

test('upload requires consent and a failed publication retries only publication without duplicate bytes', async () => {
  const source = new File(['isolated fixture'], 'Aviso.txt', {type: 'text/plain'});
  let begins = 0, chunks = 0, publishes = 0;
  const progress = [];
  await withFetch(async (path, init) => {
    if (init.method === 'PUT') {chunks++; assert.ok(init.body instanceof Blob); return json({id: file.id}, 200);}
    assert.equal(path, '/api/media');
    const input = JSON.parse(init.body);
    if (input.action === 'beginUpload') {
      begins++; assert.equal(input.shareByLink, true); assert.equal(input.size, source.size);
      assert.equal(input.bytes, undefined);
      return json({sessionUrl: 'https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&upload_id=isolated'});
    }
    assert.equal(input.action, 'publishUpload'); assert.equal(input.confirmShare, true);
    publishes++;
    return publishes === 1 ? json({error: 'Publication unavailable'}, 502) : json({file});
  }, async () => {
    await assert.rejects(uploadFileToScript(source), /Confirme/); assert.equal(begins, 0);
    await assert.rejects(uploadFileToScript(source, 'Sábado', pct => progress.push(pct), {shareByLink: true}), /Publication unavailable/);
    assert.ok(!progress.includes(100));
    await uploadFileToScript(source, 'Sábado', pct => progress.push(pct), {shareByLink: true});
    assert.equal(begins, 1); assert.equal(chunks, 1); assert.equal(publishes, 2);
    assert.equal(progress.at(-1), 100);
  });
});

test('event labels cannot collide with prototype properties', () => {
  const groups = groupItemsByEvent([{eventName: '__proto__', id: 'safe'}]);
  assert.equal(groups.__proto__[0].id, 'safe');
  assert.equal(Object.getPrototypeOf(groups), null);
});

test('a response completed after cancellation cannot restore a closed session snapshot', async () => {
  const controller = new AbortController();
  await assert.rejects(appApi('/api/media', undefined, {signal: controller.signal,
    fetcher: async () => ({ok: true, status: 200, json: async () => {controller.abort(); return {files: [file]};}})}), error => error.name === 'AbortError');
});
