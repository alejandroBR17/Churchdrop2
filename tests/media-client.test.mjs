import test from 'node:test';
import assert from 'node:assert/strict';
import {appApi} from '../services/appApi.ts';
import {fetchFilesFromScript, getCachedFiles, clearOperatorData, renameFileInScript,
  deleteFileFromScript, uploadFileToScript, groupItemsByEvent, getPendingUploads, publishPendingUpload, reviewOlderFiles, setFilePreservation} from '../services/churchService.ts';

const file = {id: 'isolated-file', name: 'Aviso.txt', mimeType: 'text/plain', date: '2026-10-17T12:00:00Z'};
const json = (data, status = 200) => Response.json(data, {status});

test('preservation updates only after matching acknowledgement and failures are not retried',async()=>{
  let mode='failure',writes=0;
  await withFetch(async(_path,init)=>{
    if(init.method==='GET')return json({files:[{...file,preserved:false}]});
    writes++;const input=JSON.parse(init.body);assert.equal(input.action,'preserve');
    if(mode==='failure')return json({error:'Unavailable'},502);
    if(mode==='mismatch')return json({id:'wrong-file',preserved:input.preserve});
    return json({id:file.id,preserved:input.preserve});
  },async()=>{
    await fetchFilesFromScript();
    await assert.rejects(setFilePreservation(file.id,true));assert.equal(writes,1);assert.equal(getCachedFiles()[0].preserved,false);
    mode='mismatch';await assert.rejects(setFilePreservation(file.id,true));assert.equal(getCachedFiles()[0].preserved,false);
    mode='success';await setFilePreservation(file.id,true);assert.equal(getCachedFiles()[0].preserved,true);
    await setFilePreservation(file.id,false);assert.equal(getCachedFiles()[0].preserved,false);
  });
});

test('cancelled preservation cannot restore metadata after leaving the session',async()=>{
  const controller=new AbortController();
  await withFetch(async()=>{clearOperatorData();controller.abort();return json({id:file.id,preserved:true});},async()=>{
    await assert.rejects(setFilePreservation(file.id,true,controller.signal),error=>error.name==='AbortError');
    assert.deepEqual(getCachedFiles(),[]);
  });
});

test('age review traverses empty filtered pages and never replaces the library or changes a file', async () => {
  const operations=[];
  await withFetch(async (_path, init)=>{
    if(init.method==='GET')return json({files:[file]});
    const body=JSON.parse(init.body); operations.push(body);
    return body.cursor ? json({files:[{...file,id:'older-file'}]}) : json({files:[],nextPageToken:'page/+='});
  },async()=>{
    await fetchFilesFromScript();
    const result=await reviewOlderFiles(14);
    assert.equal(result[0].id,'older-file');
    assert.deepEqual(operations,[{action:'retentionPreview',days:14},{action:'retentionPreview',days:14,cursor:'page/+='}]);
    assert.deepEqual(getCachedFiles().map(item=>item.id),[file.id]);
  });
});

test('age review refuses invalid periods, repeated pages and partial failures without claiming an empty result', async () => {
  let mode='loop',calls=0;
  await withFetch(async()=>{
    calls++;
    if(mode==='loop')return json({files:[],nextPageToken:'same'});
    if(mode==='duplicate')return json({files:[file,file]});
    return json({error:'Unavailable'},503);
  },async()=>{
    await assert.rejects(reviewOlderFiles(1)); assert.equal(calls,0);
    await assert.rejects(reviewOlderFiles(7)); assert.equal(calls,2);
    mode='duplicate';await assert.rejects(reviewOlderFiles(7));
    mode='failure';calls=0;await assert.rejects(reviewOlderFiles(14),/Unavailable/);assert.equal(calls,1);
  });
});

test('cancellation discards age-review results after the modal closes', async()=>{
  const controller=new AbortController();
  await withFetch(async()=>{controller.abort();return json({files:[file]});},async()=>{
    await assert.rejects(reviewOlderFiles(14,controller.signal),error=>error.name==='AbortError');
  });
});

test('pending metadata survives pagination atomically without persisting upload capabilities', async () => {
  let fail = false;
  const pending = {id:'pending-complete',name:'Aviso.txt',complete:true};
  await withFetch(async path => path.includes('cursor=')
    ? json({files:fail ? [file, file] : [file],pendingUploads:[pending]})
    : json({files:[],pendingUploads:[{...pending,id:'pending-incomplete',complete:false}],nextPageToken:'second'}), async () => {
    await fetchFilesFromScript();
    assert.equal(getPendingUploads().length,2);
    const copy=getPendingUploads(); copy[0].name='Changed locally';
    assert.equal(getPendingUploads()[0].name,'Aviso.txt');
    fail=true; await assert.rejects(fetchFilesFromScript());
    assert.equal(getPendingUploads().length,2); assert.equal(getCachedFiles().length,1);
    clearOperatorData(); assert.equal(getPendingUploads().length,0);
  });
});

test('recover publication sends no bytes, rejects incomplete files and keeps failed publication available', async () => {
  let calls=0, fail=true;
  await withFetch(async (_path,init) => {
    if(init.method==='GET')return json({files:[],pendingUploads:[{id:file.id,name:file.name,complete:true},{id:'incomplete-file',name:'Outro',complete:false}]});
    calls++; assert.deepEqual(JSON.parse(init.body),{action:'publishUpload',id:file.id,confirmShare:true});
    return fail ? json({error:'Publication unavailable'},502) : json({file});
  },async()=>{
    await fetchFilesFromScript();
    await assert.rejects(publishPendingUpload('incomplete-file')); assert.equal(calls,0);
    await assert.rejects(publishPendingUpload(file.id),/Publication unavailable/); assert.equal(calls,1);
    assert.equal(getPendingUploads().length,2); assert.equal(getCachedFiles().length,0);
    fail=false; await publishPendingUpload(file.id); assert.equal(calls,2);
    assert.equal(getPendingUploads().length,1); assert.equal(getCachedFiles()[0].id,file.id);
  });
});

test('pending duplicate or malformed metadata cannot replace a valid snapshot', async () => {
  let pending=[];
  await withFetch(async()=>json({files:[file],pendingUploads:pending}),async()=>{
    await fetchFilesFromScript();
    for(const bad of [[{id:file.id,name:'Duplicate',complete:true}],[{id:'pending-file',name:'Bad',complete:'true'}]]) {
      pending=bad; await assert.rejects(fetchFilesFromScript());
      assert.equal(getCachedFiles().length,1); assert.equal(getPendingUploads().length,0);
    }
  });
});

test('library retries a transient gateway or transport failure once, keeping the same cursor', async () => {
  for (const failure of [() => new Response('Gateway unavailable', {status: 502}), () => {throw new TypeError('Failed to fetch');}]) {
    let calls = 0;
    const result = await appApi('/api/media', undefined, {cursor: 'page/2', fetcher: async (path) => {
      assert.equal(path, '/api/media?cursor=page%2F2');
      if (++calls === 1) return failure();
      return json({files: [file]});
    }});
    assert.deepEqual(result.files, [file]); assert.equal(calls, 2);
  }
});

test('unavailable library stops after one retry; auth, throttling and malformed success never retry', async () => {
  for (const status of [503, 401, 403, 429]) {
    let calls = 0;
    await assert.rejects(appApi('/api/media', undefined, {fetcher: async () => {calls++; return json({error:'Unavailable'}, status);}}), /Unavailable/);
    assert.equal(calls, status === 503 ? 2 : 1);
  }
  let calls = 0;
  await assert.rejects(appApi('/api/media', undefined, {fetcher: async () => {calls++; return new Response('Invalid JSON');}}), SyntaxError);
  assert.equal(calls, 1);
});

test('mutations and session requests never repeat after a lost acknowledgement', async () => {
  for (const [path, body, method] of [['/api/media', {action:'beginUpload'}, 'POST'], ['/api/session', undefined, 'GET'], ['/api/session', undefined, 'DELETE']]) {
    let calls = 0;
    await assert.rejects(appApi(path, body, {method, fetcher: async () => {calls++; throw new TypeError('Connection lost');}}), /Connection lost/);
    assert.equal(calls, 1);
  }
});

test('cancellation during retry backoff prevents a second request', async () => {
  const controller = new AbortController();
  let calls = 0;
  await assert.rejects(appApi('/api/media', undefined, {signal:controller.signal, fetcher:async () => {
    calls++; setTimeout(() => controller.abort(), 20); return json({error:'Unavailable'}, 504);
  }}), error => error.name === 'AbortError');
  assert.equal(calls, 1);
});
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

test('upload reports acknowledged bytes separately from preparing and publishing, without invented progress', async () => {
  const size = 5 * 1024 * 1024;
  const source = new File([new Uint8Array(size)], 'Isolado.mp4', {type: 'video/mp4'});
  const statuses = [];
  let releaseTransfer, releasePublication, chunks = 0;
  const transfer = new Promise(resolve => {releaseTransfer = resolve;});
  const publication = new Promise(resolve => {releasePublication = resolve;});
  await withFetch(async (_path, init) => {
    if (init.method === 'PUT') {
      if (++chunks === 1) return new Response(null, {status: 308, headers: {Range: 'bytes=0-4194303'}});
      await transfer;
      return json({id: file.id});
    }
    const input = JSON.parse(init.body);
    if (input.action === 'beginUpload') return json({sessionUrl: 'https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&upload_id=isolated'});
    await publication;
    return json({file});
  }, async () => {
    const pending = uploadFileToScript(source, 'Isolado', undefined, {shareByLink: true, onStatus: value => statuses.push(value)});
    while(chunks < 2) await new Promise(resolve => setImmediate(resolve));
    assert.deepEqual(statuses.at(-1), {phase:'transferring',confirmedBytes:4194304,totalBytes:size});
    assert.ok(!statuses.some(value=>value.phase==='complete'));
    releaseTransfer();
    while(statuses.at(-1).phase !== 'publishing') await new Promise(resolve => setImmediate(resolve));
    assert.deepEqual(statuses.at(-1), {phase:'publishing',confirmedBytes:size,totalBytes:size});
    assert.ok(!statuses.some(value=>value.phase==='complete'));
    releasePublication(); await pending;
    assert.deepEqual(statuses.at(-1), {phase:'complete',confirmedBytes:size,totalBytes:size});
    assert.equal(statuses[0].phase, 'opening');
  });
});
