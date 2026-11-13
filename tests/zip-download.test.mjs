import test from 'node:test';
import assert from 'node:assert/strict';
import JSZip from 'jszip';
import {createZipDownload, zipEligibility, ZIP_LIMITS} from '../services/zipDownload.ts';
import {readDriveFiles, mapDriveFiles} from '../services/fileList.ts';

const file = {name: 'Aviso.txt', downloadUrl: 'https://drive.google.com/uc?export=download&id=isolated-file', sizeBytes: 3, mimeType: 'text/plain'};
const response = (text='abc', type='text/plain', status=200) => new Response(text, {status, headers:{'content-type':type}});

test('ZIP rejects unknown/oversized selections before fetching; direct download is a separate path', async () => {
  for (const selection of [[], [{...file,sizeBytes:undefined}], [{...file,sizeBytes:0}], [{...file,sizeBytes:Infinity}],
    [{...file,sizeBytes:ZIP_LIMITS.perFile+1}], Array(21).fill(file), Array(3).fill({...file,sizeBytes:ZIP_LIMITS.perFile})]) {
    assert.equal(zipEligibility(selection).allowed,false);
    let called=false;
    await assert.rejects(createZipDownload(selection,{fetcher:async()=>{called=true;return response();}}));
    assert.equal(called,false);
  }
  assert.equal(zipEligibility([file]).allowed,true);
});

test('ZIP preserves colliding names and strips path traversal without silently overwriting files', async () => {
  const selections=[file,{...file,name:'aviso.txt'},{...file,name:'../Aviso.txt'}];
  const progress=[];
  const blob=await createZipDownload(selections,{fetcher:async(_url,init)=>{
    assert.equal(init.credentials,'omit');assert.equal(init.referrerPolicy,'no-referrer');assert.equal(init.cache,'no-store');
    return response();
  },onProgress:(done,total)=>progress.push([done,total])});
  const zip=await JSZip.loadAsync(await blob.arrayBuffer());
  const names=Object.keys(zip.files);
  assert.equal(names.length,3);assert.ok(names.includes('aviso (2).txt'));
  assert.ok(names.every(name=>!name.includes('/')&&!name.includes('\\')));
  for(const name of names)assert.equal(await zip.file(name).async('string'),'abc');
  assert.deepEqual(progress,[[1,3],[2,3],[3,3]]);
});

test('HTTP failures, HTML warning pages, missing types and wrong formats never become ZIP entries', async () => {
  for(const [type,status] of [['text/plain',503],['text/html',200],['application/xhtml+xml',200],['image/png',200],['',200]]) {
    let calls=0;
    await assert.rejects(createZipDownload([file,file],{fetcher:async()=>++calls===1?response():response('abc',type,status)}));
    assert.equal(calls,2);
  }
});

test('declared and streamed overflows cancel the response; truncated bodies are rejected', async () => {
  for(const advertised of [true,false]) {
    let cancelled=false;
    const stream=new ReadableStream({start(c){c.enqueue(new Uint8Array(4));},cancel(){cancelled=true;}});
    const headers={'content-type':'text/plain',...(advertised?{'content-length':'4'}:{})};
    await assert.rejects(createZipDownload([file],{fetcher:async()=>new Response(stream,{headers})}),/tamanho/);
    assert.equal(cancelled,true);
  }
  await assert.rejects(createZipDownload([file],{fetcher:async()=>response('ab')}),/incompleto/);
});

test('cancellation prevents fetching the next file and no partial archive is returned', async () => {
  const controller=new AbortController();let calls=0;
  await assert.rejects(createZipDownload([file,file],{signal:controller.signal,fetcher:async()=>{calls++;return response();},
    onProgress:()=>controller.abort()}),error=>error.name==='AbortError');
  assert.equal(calls,1);
});

test('stalled downloads stop on timeout without leaving a reader active', async () => {
  let ended=false;
  await assert.rejects(createZipDownload([file],{timeoutMs:10,fetcher:async(_url,init)=>new Response(new ReadableStream({
    start(c){init.signal.addEventListener('abort',()=>{ended=true;c.error(init.signal.reason);},{once:true});}
  }),{headers:{'content-type':'text/plain'}})}),/demorou/);
  assert.equal(ended,true);
});

test('non-Drive URLs are refused and metadata retains validated byte counts for eligibility', async () => {
  let called=false;
  for(const url of ['https://drive.google.com.attacker.test/file','http://drive.google.com/uc','https://user:secret@drive.google.com/uc']) {
    await assert.rejects(createZipDownload([{...file,downloadUrl:url}],{fetcher:async()=>{called=true;return response();}}));
  }
  assert.equal(called,false);
  const metadata={id:'isolated',name:'Aviso.txt',mimeType:'text/plain',date:'2026-10-17T12:00:00Z',sizeBytes:3};
  for(const sizeBytes of [-1,NaN,Infinity,1.5,'3'])assert.equal(readDriveFiles([{...metadata,sizeBytes}]),null);
  const mapped=mapDriveFiles(readDriveFiles([metadata]));
  assert.equal(mapped[0].sizeBytes,3);assert.equal(mapped[0].mimeType,'text/plain');assert.equal(mapped[0].size,'1 KB');
});
