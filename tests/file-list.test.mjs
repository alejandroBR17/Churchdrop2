import test from 'node:test';
import assert from 'node:assert/strict';
import {fetchDriveFiles, readDriveFiles, mapDriveFiles} from '../services/fileList.ts';

const file = {id:'drive-id',name:'Aviso.png',mimeType:'image/png',date:'2026-10-17T12:00:00Z'};
const response = data => async () => new Response(JSON.stringify(data), {status:200});

test('preservation is a validated boolean and survives library mapping',()=>{
  assert.equal(mapDriveFiles([{...file,preserved:true}])[0].preserved,true);
  assert.equal(mapDriveFiles([file])[0].preserved,false);
  assert.equal(readDriveFiles([{...file,preserved:'true'}]),null);
});

test('successful empty list is distinct from transport failure and malformed server output', async () => {
  assert.deepEqual(await fetchDriveFiles('https://example.test', {fetcher:response({status:'success',files:[]})}), []);
  for (const fetcher of [async()=>{throw Error('offline');},async()=>new Response('HTML'),
    response({status:'error',files:[]}), response({status:'success',files:[{id:'incomplete'}]}),
    async()=>new Response('denied',{status:403})]) {
    await assert.rejects(fetchDriveFiles('https://example.test',{fetcher}), /Não foi possível atualizar/);
  }
});

test('invalid dates, duplicate IDs and corrupted cache are rejected atomically', () => {
  assert.deepEqual(readDriveFiles([file]), [file]);
  for (const bad of [null,{},[file,file],[{...file,date:'not-a-date'}],[{...file,mimeType:null}]]) {
    assert.equal(readDriveFiles(bad),null);
  }
});

test('mapped files keep real metadata and never expose script or data URLs as links', () => {
  const [item]=mapDriveFiles([{...file,thumbnailLink:'javascript:alert(1)',downloadUrl:'data:text/html,unsafe',folderName:'Sábado'}]);
  assert.equal(item.id,file.id);
  assert.equal(item.eventName,'Sábado');
  assert.equal(item.date.toISOString(),file.date.replace('00Z','00.000Z'));
  assert.match(item.url,/^https:\/\/lh3.googleusercontent.com/);
  assert.match(item.downloadUrl,/^https:\/\/drive.google.com/);
});

test('deadline and cancellation release stalled requests without pretending success', async () => {
  const stalled=(_url,{signal})=>new Promise((_resolve,reject)=>signal.addEventListener('abort',()=>reject(new DOMException('Aborted','AbortError')),{once:true}));
  await assert.rejects(fetchDriveFiles('https://example.test',{fetcher:stalled,timeoutMs:10}),/demorou/);
  const controller=new AbortController();
  const pending=fetchDriveFiles('https://example.test',{fetcher:stalled,signal:controller.signal});
  controller.abort();
  await assert.rejects(pending,{name:'AbortError'});
});
