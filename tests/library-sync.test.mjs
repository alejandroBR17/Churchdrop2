import test from 'node:test';
import assert from 'node:assert/strict';
import {startLibrarySync} from '../services/librarySync.ts';
const flush=async()=>{await Promise.resolve();await Promise.resolve();};
function harness(t,refresh=async()=>true){
 t.mock.timers.enable({apis:['setTimeout','Date'],now:0});
 const state={visible:true,online:true,blocked:false,calls:0};
 const window=new EventTarget(),document=new EventTarget();
 const stop=startLibrarySync({refresh:()=>{state.calls++;return refresh();},blocked:()=>state.blocked,visible:()=>state.visible,online:()=>state.online,window,document});
 t.after(stop);
 return {state,window,document,stop,tick:async ms=>{t.mock.timers.tick(ms);await flush();}};
}
test('periodic refresh waits twenty seconds and repeats after a successful read',async t=>{
 const h=harness(t);await h.tick(19999);assert.equal(h.state.calls,0);await h.tick(1);assert.equal(h.state.calls,1);await h.tick(20000);assert.equal(h.state.calls,2);
});
test('foreground events coalesce and never overlap an in-flight refresh',async t=>{
 let resolve;const pending=new Promise(r=>resolve=r);const h=harness(t,()=>pending);
 await h.tick(20000);h.window.dispatchEvent(new Event('focus'));h.document.dispatchEvent(new Event('visibilitychange'));assert.equal(h.state.calls,1);
 resolve(true);await flush();h.window.dispatchEvent(new Event('focus'));h.document.dispatchEvent(new Event('visibilitychange'));await h.tick(4999);assert.equal(h.state.calls,1);await h.tick(1);assert.equal(h.state.calls,2);
});
test('hidden or offline tabs stop polling and resume when visible or online',async t=>{
 const h=harness(t);await h.tick(20000);h.state.visible=false;h.document.dispatchEvent(new Event('visibilitychange'));await h.tick(100000);assert.equal(h.state.calls,1);
 h.state.visible=true;h.document.dispatchEvent(new Event('visibilitychange'));h.window.dispatchEvent(new Event('focus'));await flush();assert.equal(h.state.calls,2);
 h.state.online=false;h.window.dispatchEvent(new Event('offline'));await h.tick(60000);assert.equal(h.state.calls,2);h.state.online=true;h.window.dispatchEvent(new Event('online'));await flush();assert.equal(h.state.calls,3);
});
test('uploads, writes and existing reads block automatic refresh until a later interval',async t=>{
 const h=harness(t);h.state.blocked=true;await h.tick(20000);assert.equal(h.state.calls,0);h.state.blocked=false;await h.tick(20000);assert.equal(h.state.calls,1);
});
test('failed reads back off up to two minutes and recover the normal interval after success',async t=>{
 let attempt=0;const h=harness(t,async()=>++attempt>=4);
 await h.tick(20000);assert.equal(h.state.calls,1);await h.tick(39999);assert.equal(h.state.calls,1);await h.tick(1);assert.equal(h.state.calls,2);
 await h.tick(80000);assert.equal(h.state.calls,3);await h.tick(120000);assert.equal(h.state.calls,4);await h.tick(20000);assert.equal(h.state.calls,5);
});
test('cleanup removes listeners and stops future timers even when a read finishes after logout',async t=>{
 let resolve;const pending=new Promise(r=>resolve=r);const h=harness(t,()=>pending);await h.tick(20000);assert.equal(h.state.calls,1);h.stop();resolve(true);await flush();h.window.dispatchEvent(new Event('focus'));h.document.dispatchEvent(new Event('visibilitychange'));await h.tick(120000);assert.equal(h.state.calls,1);
});
