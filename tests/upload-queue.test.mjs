import test from 'node:test';
import assert from 'node:assert/strict';
import {runUploadQueue,SMALL_UPLOAD_LIMIT} from '../services/uploadQueue.ts';
const file=(name,size=100)=>({name,size});
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};};

test('two small files can reach the server concurrently, with the third waiting for that pair',async()=>{
 const files=[file('a'),file('b'),file('c')],started=[],gate=deferred();
 const done=runUploadQueue(files,async item=>{started.push(item.name);if(item!==files[2])await gate.promise;});
 await Promise.resolve();assert.deepEqual(started,['a','b']);gate.resolve();
 const result=await done;assert.deepEqual(started,['a','b','c']);assert.equal(result.completed.size,3);assert.equal(result.error,undefined);
});

test('large transfers never share the uplink, even when surrounded by small files',async()=>{
 const files=[file('photo'),file('video',SMALL_UPLOAD_LIMIT+1),file('doc'),file('audio')];
 let active=0,largeActive=false,maxActive=0;
 const result=await runUploadQueue(files,async item=>{
  if(item.size>SMALL_UPLOAD_LIMIT){assert.equal(active,0);largeActive=true;}else assert.equal(largeActive,false);
  active++;maxActive=Math.max(active,maxActive);await Promise.resolve();active--;if(item.size>SMALL_UPLOAD_LIMIT)largeActive=false;
 });
 assert.equal(maxActive,2);assert.equal(result.completed.size,4);
});

test('failure stops new uploads but preserves the successful in-flight sibling for retry accounting',async()=>{
 const files=[file('failed'),file('success'),file('not started')],started=[],gate=deferred(),error=new Error('Unavailable');
 const pending=runUploadQueue(files,async item=>{started.push(item.name);if(item===files[0])throw error;await gate.promise;});
 await Promise.resolve();gate.resolve();const result=await pending;
 assert.deepEqual(started,['failed','success']);assert.deepEqual([...result.completed],[files[1]]);assert.equal(result.error,error);
 const remaining=files.filter(item=>!result.completed.has(item));assert.deepEqual(remaining,[files[0],files[2]]);
});

test('pause stops the queue and retains only acknowledged completions',async()=>{
 const files=[file('a'),file('b'),file('c')],controller=new AbortController(),started=[];
 const result=await runUploadQueue(files,async item=>{started.push(item.name);if(item===files[0])return;controller.abort();throw controller.signal.reason;},controller.signal);
 assert.deepEqual(started,['a','b']);assert.deepEqual([...result.completed],[files[0]]);
 const aborted=new AbortController();aborted.abort();let count=0;
 assert.equal((await runUploadQueue(files,async()=>count++,aborted.signal)).completed.size,0);assert.equal(count,0);
});
