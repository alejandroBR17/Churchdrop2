import test from 'node:test';
import assert from 'node:assert/strict';
import {uploadResumable} from '../services/resumableUpload.ts';

const url = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&upload_id=fixture';
const block = 256 * 1024;
const file = new Blob([new Uint8Array(block * 2 + 17)], {type: 'video/mp4'});
const incomplete = end => new Response(null, {status: 308, headers: end == null ? {} : {Range: `bytes=0-${end}`}});
const done = () => Response.json({id: 'isolated-file'});
const options = {chunkSize: block, retryDelayMs: 0};

test('binary chunks use confirmed offsets, bounded slices and no owner credentials', async () => {
  const calls = [], progress = [];
  const id = await uploadResumable(url, file, {...options,
    onProgress: bytes => progress.push(bytes), fetcher: async (_url, request) => {
      calls.push(request);
      return calls.length === 3 ? done() : incomplete(calls.length * block - 1);
    }});
  assert.deepEqual(id, {id: 'isolated-file'});
  assert.deepEqual(calls.map(c => c.body.size), [block, block, 17]);
  assert.deepEqual(calls.map(c => c.headers['Content-Range']),
    [`bytes 0-${block - 1}/${file.size}`, `bytes ${block}-${2 * block - 1}/${file.size}`, `bytes ${2 * block}-${file.size - 1}/${file.size}`]);
  assert.deepEqual(progress, [0, block, 2 * block, file.size]);
  assert.ok(calls.every(c => !c.headers.Authorization && !c.headers['Content-Length'] && c.credentials === 'omit' && c.redirect === 'error'));
});

test('network interruption queries Drive before resending and accepts partial acknowledgement', async () => {
  const ranges = [];
  await uploadResumable(url, file, {...options, fetcher: async (_url, request) => {
    ranges.push(request.headers['Content-Range']);
    switch (ranges.length) {
      case 1: throw new Error('offline');
      case 2: assert.equal(request.body, undefined); return incomplete(block / 2 - 1);
      case 3: return incomplete(block * 1.5 - 1);
      default: return done();
    }
  }});
  assert.equal(ranges[1], `bytes */${file.size}`);
  assert.equal(ranges[2], `bytes ${block / 2}-${block * 1.5 - 1}/${file.size}`);
  assert.equal(ranges[3], `bytes ${block * 1.5}-${file.size - 1}/${file.size}`);
});

test('resume first queries state and does not upload an already completed file again', async () => {
  let requests = 0;
  await uploadResumable(url, file, {...options, resume: true, fetcher: async (_url, request) => {
    requests++;
    assert.equal(request.headers['Content-Range'], `bytes */${file.size}`);
    assert.equal(request.body, undefined);
    return done();
  }});
  assert.equal(requests, 1);
});

test('308 acknowledging all bytes still requires a completion response', async () => {
  const progress = []; let calls = 0;
  await uploadResumable(url, new Blob(['short']), {...options,
    onProgress: bytes => progress.push(bytes), fetcher: async (_url, request) => {
      if (++calls === 1) return incomplete(4);
      assert.equal(request.headers['Content-Range'], 'bytes */5');
      assert.deepEqual(progress, [0]);
      return done();
    }});
  assert.deepEqual(progress, [0, 5]);
});

test('timeouts recover via status query; cancellation stops without retrying', async () => {
  let calls = 0;
  await uploadResumable(url, file, {...options, timeoutMs: 20, fetcher: async (_url, request) => {
    if (++calls === 1) return new Promise((_resolve, reject) => request.signal.addEventListener('abort', () => reject(request.signal.reason), {once: true}));
    if (calls === 2) return incomplete(block - 1);
    if (calls === 3) return incomplete(block * 2 - 1);
    return done();
  }});
  const controller = new AbortController(); let cancelledCalls = 0;
  const pending = uploadResumable(url, file, {...options, signal: controller.signal, fetcher: async (_url, request) => {
    cancelledCalls++;
    controller.abort();
    throw request.signal.reason;
  }});
  await assert.rejects(pending, {name: 'AbortError'});
  assert.equal(cancelledCalls, 1);
});

test('invalid, regressing or out-of-bounds offsets cannot skip data or loop forever', async () => {
  for (const range of ['bytes=1-10', 'bytes=0-not-a-number', `bytes=0-${block * 2}`]) {
    await assert.rejects(uploadResumable(url, file, {...options,
      fetcher: async () => new Response(null, {status: 308, headers: {Range: range}})}), /posição/);
  }
  let calls = 0;
  await assert.rejects(uploadResumable(url, file, {...options, fetcher: async () => ++calls === 1 ? incomplete(block - 1) : incomplete(null)}), /perdeu/);
  calls = 0;
  await assert.rejects(uploadResumable(url, file, {...options, maxRetries: 1, fetcher: async () => { calls++; return incomplete(null); }}), /não avançou/);
  assert.equal(calls, 2);
});

test('expiration, denial, exhausted recovery and premature success are explicit failures', async () => {
  for (const [status, message] of [[404, /expirou/], [403, /recusou/], [503, /Drive não confirmou/]]) {
    let calls = 0;
    await assert.rejects(uploadResumable(url, file, {...options, maxRetries: 1,
      fetcher: async () => { calls++; return new Response(null, {status}); }}), message);
    assert.equal(calls, status === 503 ? 2 : 1);
  }
  await assert.rejects(uploadResumable(url, file, {...options, fetcher: async () => done()}), /não confirmou/);
  await assert.rejects(uploadResumable(url, new Blob(['short']), {...options,
    fetcher: async () => Response.json({ok: true})}), /não confirmou/);
});

test('untrusted session URLs and invalid options fail before any transmission', async () => {
  let calls = 0;
  const fetcher = async () => { calls++; return done(); };
  for (const bad of ['https://evil.test/upload', url.replace('https:', 'http:'),
    url.replace('www.googleapis.com', 'www.googleapis.com.evil.test'), `${url}#secret`,
    url.replace('www.googleapis.com', 'user:pass@www.googleapis.com')]) {
    await assert.rejects(uploadResumable(bad, file, {fetcher}), /Sessão/);
  }
  for (const settings of [{chunkSize: 1}, {maxRetries: -1}, {timeoutMs: NaN}, {retryDelayMs: Infinity}]) {
    await assert.rejects(uploadResumable(url, file, {fetcher, ...settings}), /Configuração/);
  }
  await assert.rejects(uploadResumable(url, new Blob([]), {fetcher}), /vazio/);
  assert.equal(calls, 0);
});
