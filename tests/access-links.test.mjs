import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {createHmac, scryptSync} from 'node:crypto';
import {createAccessHandler} from '../server/access.mjs';
import {createMediaHandler} from '../server/mediaApi.mjs';
import {signedEnvelope} from '../server/driveBridge.mjs';

const source=readFileSync(new URL('../backend/drive/Code.gs',import.meta.url),'utf8');
const code='0123456789',salt=Buffer.alloc(16,3),origin='https://app.example';
const environment={UNIVER_DRIVE_ENABLED:'true',UNIVER_DRIVE_SERVER_SECRET:'isolated-link-secret-01234567890123456789',
  UNIVER_ACCESS_CODE_HASH:`scrypt:${salt.toString('hex')}:${scryptSync(code,salt,64).toString('hex')}`};
const request=(body,cookie,base=origin,method='POST',headers={})=>new Request(base+'/api/session',{
  method,headers:{Origin:base,'X-Univer-Request':'1','Content-Type':'application/json',...(cookie?{Cookie:cookie}:{}),...headers},
  ...(body?{body:JSON.stringify(body)}:{})});
const cookie=r=>r.headers.get('set-cookie').split(';')[0];

function harness() {
  let time=Date.now();
  const properties=new Map([['SERVER_SECRET',environment.UNIVER_DRIVE_SERVER_SECRET]]),nonces=new Map(),calls=[];
  const context=vm.createContext({Date:class extends Date{static now(){return time;}},
    PropertiesService:{getScriptProperties:()=>({getProperty:key=>properties.get(key),setProperty:(key,value)=>properties.set(key,value)})},
    Utilities:{Charset:{UTF_8:'utf8'},computeHmacSha256Signature:(message,key)=>[...createHmac('sha256',key).update(message).digest()]},
    LockService:{getScriptLock:()=>({waitLock(){},releaseLock(){}})},
    CacheService:{getScriptCache:()=>({get:key=>nonces.get(key),put:(key,value)=>nonces.set(key,value)})},
    ContentService:{MimeType:{JSON:'json'},createTextOutput:text=>({setMimeType:()=>JSON.parse(text)})},
    UrlFetchApp:{fetch(){throw Error('No remote file operation is allowed in link tests');}}});
  vm.runInContext(source,context);
  const drive=async input=>{
    calls.push(input);
    if(input.action==='list')return {files:[]};
    const result=context.doPost({postData:{contents:signedEnvelope(input,environment.UNIVER_DRIVE_SERVER_SECRET,{issuedAt:time})}});
    if(result.status!=='success')throw Error('Control plane rejected request');
    return result.data;
  };
  const handler=createAccessHandler({environment,drive,now:()=>time});
  const login=async()=>cookie(await handler(request({code,remember:true})));
  const create=async auth=>{
    const response=await handler(request({action:'createLink',code},auth));
    assert.equal(response.status,200);const result=await response.json();
    return {...result,token:new URL(result.url).hash.slice(8)};
  };
  return {handler,drive,properties,calls,login,create,advance:ms=>{time+=ms;},time:()=>time};
}

test('creation requires a valid session, same origin and freshly verified operator code',async()=>{
  const h=harness();
  assert.equal((await h.handler(request({action:'createLink',code}))).status,401);
  const auth=await h.login();
  assert.equal((await h.handler(request({action:'createLink'},auth))).status,400);
  assert.equal((await h.handler(request({action:'createLink',code:'9999999999'},auth))).status,403);
  assert.equal((await h.handler(request({action:'createLink',code},auth,origin,'POST',{Origin:'https://attacker.example'}))).status,403);
  assert.equal(h.calls.filter(c=>c.action==='createAccessLink').length,0);
  const link=await h.create(auth);
  assert.equal(link.token.length,64);assert.ok(!link.url.includes(code));
  assert.equal(link.expiresAt,h.time()+9*86400000);
  assert.ok(!JSON.stringify([...h.properties]).includes(link.token));
  assert.ok(!JSON.stringify(h.calls).includes(link.token));
  const status=await(await h.handler(request({action:'linkStatus'},auth))).json();
  assert.deepEqual(status,{active:true,expiresAt:link.expiresAt});
});

test('a private link opens a fresh device without code and survives a new deployment',async()=>{
  const h=harness(),auth=await h.login(),link=await h.create(auth);
  const claims=h.calls.filter(c=>c.action==='claimLoginAttempt').length;
  const response=await h.handler(request({action:'useLink',token:link.token,remember:false}));
  assert.equal(response.status,200);
  assert.ok(!response.headers.get('set-cookie').includes('Max-Age='));
  assert.equal((await response.clone().json()).expiresAt,h.time()+8*3600000);
  assert.ok(!JSON.stringify(await response.json()).includes(link.token));
  const handler=createAccessHandler({environment:{...environment,VERCEL_URL:'new-deployment.example'},drive:h.drive,now:h.time});
  assert.equal((await(await handler(request(undefined,cookie(response),origin,'GET'))).json()).authenticated,true);
  assert.equal(h.calls.filter(c=>c.action==='claimLoginAttempt').length,claims);
  assert.equal((await handler(request({action:'useLink',token:link.token,remember:true},undefined,'https://preview.example'))).status,401);
});

test('revocation blocks the URL and linked cookies, but preserves code sessions and media',async()=>{
  const h=harness(),auth=await h.login(),link=await h.create(auth);
  const linked=cookie(await h.handler(request({action:'useLink',token:link.token,remember:true})));
  const media=createMediaHandler({environment,drive:h.drive});
  assert.equal((await media(request(undefined,linked,origin,'GET'))).status,200);
  assert.equal((await h.handler(request({action:'revokeLink',code:'9999999999'},auth))).status,403);
  assert.equal((await h.handler(request({action:'revokeLink',code},auth))).status,200);
  assert.equal((await h.handler(request({action:'useLink',token:link.token,remember:true}))).status,401);
  assert.equal((await media(request(undefined,linked,origin,'GET'))).status,401);
  assert.equal((await h.handler(request({action:'remember',remember:true},linked))).status,401);
  assert.equal((await(await h.handler(request(undefined,auth,origin,'GET'))).json()).authenticated,true);
  assert.ok(h.calls.every(c=>!['trash','rename','preserve','beginUpload','publishUpload'].includes(c.action)));
});

test('replacing a link invalidates its sessions; new links are random and expire without renewal',async()=>{
  const h=harness(),auth=await h.login(),first=await h.create(auth);
  const linked=cookie(await h.handler(request({action:'useLink',token:first.token,remember:false})));
  const second=await h.create(auth);assert.notEqual(second.token,first.token);
  assert.equal((await h.handler(request({action:'useLink',token:first.token,remember:false}))).status,401);
  assert.equal((await(await h.handler(request(undefined,linked,origin,'GET'))).json()).authenticated,false);
  h.advance(9*86400000-3600000);
  const last=await h.handler(request({action:'useLink',token:second.token,remember:true}));
  assert.equal((await last.clone().json()).expiresAt,second.expiresAt);
  const remembered=await h.handler(request({action:'remember',remember:true},cookie(last)));
  assert.equal((await remembered.json()).expiresAt,second.expiresAt);
  h.advance(3600001);
  assert.equal((await h.handler(request({action:'useLink',token:second.token,remember:false}))).status,401);
});

test('fresh code authentication preserves the managing device while revoking its old link session',async()=>{
  const h=harness(),auth=await h.login(),link=await h.create(auth);
  const linked=cookie(await h.handler(request({action:'useLink',token:link.token,remember:false})));
  const replaced=await h.handler(request({action:'createLink',code},linked));
  assert.equal(replaced.status,200);
  assert.equal((await(await h.handler(request(undefined,linked,origin,'GET'))).json()).authenticated,false);
  assert.equal((await(await h.handler(request(undefined,cookie(replaced),origin,'GET'))).json()).authenticated,true);
});

test('invalid secrets, rotated credentials and unavailable or corrupt registry fail closed',async()=>{
  const h=harness(),auth=await h.login(),link=await h.create(auth);
  for(const token of [undefined,123,'x'.repeat(64),'a'.repeat(63),link.token+'x'])
    assert.equal((await h.handler(request({action:'useLink',token,remember:false}))).status,401);
  const rotated=createAccessHandler({environment:{...environment,UNIVER_ACCESS_CODE_HASH:environment.UNIVER_ACCESS_CODE_HASH.replace(/.$/,'0')},drive:h.drive,now:h.time});
  assert.equal((await rotated(request({action:'useLink',token:link.token,remember:false}))).status,401);
  const down=createAccessHandler({environment,drive:async()=>{throw Error('offline');},now:h.time});
  assert.equal((await down(request({action:'useLink',token:link.token,remember:false}))).status,502);
  const key=[...h.properties.keys()].find(key=>key.startsWith('ACCESS_LINK_V1_'));
  h.properties.set(key,'malformed');
  assert.equal((await h.handler(request({action:'useLink',token:link.token,remember:false}))).status,502);
});
