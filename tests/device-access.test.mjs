import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';
import {readFileSync} from 'node:fs';import {createHmac,scryptSync} from 'node:crypto';
import {createAccessHandler} from '../server/access.mjs';import {requireAccess} from '../server/access.mjs';
const source=readFileSync(new URL('../backend/drive/Code.gs',import.meta.url),'utf8');
const code='TestOnly!',salt=Buffer.alloc(16,9),origin='https://devices.example';
const environment={UNIVER_DRIVE_ENABLED:'true',UNIVER_DRIVE_SERVER_SECRET:'isolated-devices-secret-012345678901234567890',UNIVER_ACCESS_CODE_HASH:`scrypt:${salt.toString('hex')}:${scryptSync(code,salt,64).toString('hex')}`};
function harness(){let time=Date.now();const properties=new Map();const context=vm.createContext({Date:class extends Date{static now(){return time;}},PropertiesService:{getScriptProperties:()=>({getProperty:k=>properties.get(k),setProperty:(k,v)=>properties.set(k,v)})},LockService:{getScriptLock:()=>({waitLock(){},releaseLock(){}})}});vm.runInContext(source,context);let ready=true;const calls=[];
const drive=async r=>{calls.push(r);if(r.action==='claimLoginAttempt')return {allowed:true};if(r.action==='deviceCapabilities')return ready?{version:1}:{};return context.dispatch_(r)};
const options={environment,drive,now:()=>time},handler=createAccessHandler(options);
function client(ua='Mozilla/5.0 Windows Chrome/120.0'){const jar=new Map();return {jar,async call(body,method='POST',extra={}){const request=new Request(origin+'/api/session',{method,headers:{origin,'content-type':'application/json','x-univer-request':'1','user-agent':ua,cookie:[...jar].map(([k,v])=>`${k}=${v}`).join('; '),...extra},...(body?{body:JSON.stringify(body)}:{})});const response=await handler(request);for(const c of response.headers.getSetCookie()){const [nameValue]=c.split(';'),index=nameValue.indexOf('=');if(/Max-Age=0/.test(c))jar.delete(nameValue.slice(0,index));else jar.set(nameValue.slice(0,index),nameValue.slice(index+1));}return {status:response.status,data:await response.json(),response}},async login(remember=true){const r=await this.call({code,remember});assert.equal(r.status,200);return r;}};}
return {client,properties,calls,options,advance:ms=>time+=ms,ready:value=>ready=value,resetCache:()=>time+=61000};}
const parts=url=>{const [id,token]=new URL(url).hash.split('=')[1].split('.');return {id,token}};

test('QR requires authenticated explicit approval and requester cookie; raw QR never grants access',async()=>{
 const h=harness(),phone=h.client('Mozilla iPhone Safari/17'),pc=h.client(),attacker=h.client();await phone.login();
 const qr=await pc.call({action:'pairCreate',remember:true});assert.equal(qr.status,200);const link=parts(qr.data.url);
 assert.equal((await attacker.call({action:'pairApprove',...link,confirm:true})).status,401);
 assert.equal((await attacker.call({action:'pairPoll',...link})).status,410);
 assert.equal((await phone.call({action:'pairApprove',...link})).status,400);
 assert.equal((await phone.call({action:'pairApprove',...link,confirm:true},'POST',{origin:'https://evil.example'})).status,403);
 assert.equal((await phone.call({action:'pairInspect',...link})).data.status,'pending');
 assert.equal((await phone.call({action:'pairApprove',...link,confirm:true})).data.status,'approved');
 const granted=await pc.call({action:'pairPoll'});assert.equal(granted.data.success,true);assert.ok(granted.response.headers.getSetCookie().some(c=>c.includes('__Host-univer-session=')&&c.includes('HttpOnly')&&c.includes('Secure')));
 assert.equal((await pc.call(undefined,'GET')).data.authenticated,true);assert.equal((await pc.call({action:'pairPoll'})).status,410);
 assert.ok(!JSON.stringify([...h.properties]).includes(link.token));assert.ok(!JSON.stringify(h.calls).includes(link.token));
});

test('reverse direction uses QR, joins once, and only its creator can approve',async()=>{
 const h=harness(),pc=h.client(),phone=h.client('Mozilla iPhone Safari/17'),other=h.client();await pc.login(false);await other.login();
 const invite=await pc.call({action:'pairInvite',remember:false}),link=parts(invite.data.url),approval={id:invite.data.id,token:invite.data.approvalToken};
 assert.equal((await phone.call({action:'pairJoin',...link,remember:true})).status,200);
 assert.equal((await other.call({action:'pairJoin',...link,remember:true})).status,401);
 assert.equal((await other.call({action:'pairApprove',...approval,confirm:true})).status,401);
 assert.equal((await pc.call({action:'pairInspect',...approval})).data.label,'iPhone · Safari');
 await pc.call({action:'pairApprove',...approval,confirm:true});const result=await phone.call({action:'pairPoll'});assert.equal(result.data.success,true);
 const devices=(await pc.call({action:'devices'})).data.devices;assert.equal(devices.length,3);const parent=devices.find(d=>d.current),child=devices.find(d=>d.label==='iPhone · Safari');assert.equal(child.expiresAt,parent.expiresAt,'child cannot outlive approving device');
});

test('revoking a device blocks its requests and descendants, without touching another code login',async()=>{
 const h=harness(),phone=h.client('Mozilla iPhone Safari/17'),pc=h.client(),manager=h.client();await phone.login();await manager.login();
 const qr=await pc.call({action:'pairCreate',remember:false}),link=parts(qr.data.url);await phone.call({action:'pairApprove',...link,confirm:true});await pc.call({action:'pairPoll'});
 const parent=(await phone.call({action:'devices'})).data.devices.find(d=>d.current);assert.equal((await manager.call({action:'revokeDevice',id:parent.id})).data.revoked,true);
 assert.equal((await phone.call(undefined,'GET')).data.authenticated,false);assert.equal((await pc.call(undefined,'GET')).data.authenticated,false);assert.equal((await manager.call(undefined,'GET')).data.authenticated,true);
 assert.ok(h.calls.every(r=>!['trash','rename','beginUpload','publishUpload'].includes(r.action)));
});

test('expired, cancelled, rejected and cross-origin QR requests cannot create sessions',async()=>{
 for(const end of ['expire','cancel','reject']){const h=harness(),p=h.client(),r=h.client();await p.login();const qr=await r.call({action:'pairCreate',remember:false}),link=parts(qr.data.url);
 if(end==='expire')h.advance(301000);if(end==='cancel')await r.call({action:'pairCancel'});if(end==='reject')await p.call({action:'pairReject',...link});
 assert.notEqual((await p.call({action:'pairApprove',...link,confirm:true})).status,200);assert.notEqual((await r.call({action:'pairPoll'})).data.success,true);}
});

test('pre-upgrade cookie registers deterministically and cannot recreate itself after revocation',async()=>{
 const h=harness(),old=h.client(),manager=h.client();h.ready(false);await old.login();const original=[...old.jar];h.ready(true);h.resetCache();
 await old.call(undefined,'GET');await manager.login();const device=(await old.call({action:'devices'})).data.devices.find(d=>d.current);await manager.call({action:'revokeDevice',id:device.id});old.jar.clear();for(const [k,v] of original)old.jar.set(k,v);
 assert.equal((await old.call(undefined,'GET')).data.authenticated,false);
});

test('device registry outage fails closed for an already registered cookie',async()=>{
 const h=harness(),p=h.client();await p.login();const saved=[...h.properties];for(const [key] of saved)h.properties.set(key,'corrupt');
 assert.equal((await p.call(undefined,'GET')).status,502);
});

test('registered borrowed-device cookies remain non-persistent after GET and device management',async()=>{
 const h=harness(),p=h.client();await p.login(false);
 for(const r of [await p.call(undefined,'GET'),await p.call({action:'devices'})]){
  assert.equal(r.status,200);for(const header of r.response.headers.getSetCookie().filter(c=>c.startsWith('__Host-univer-session=')))assert.ok(!header.includes('Max-Age='));
 }
});

test('lost polling acknowledgement is idempotent and cancelling a racing grant revokes that grant',async()=>{
 const h=harness(),owner=h.client(),target=h.client();await owner.login();const qr=await target.call({action:'pairCreate',remember:false}),link=parts(qr.data.url),proof=[...target.jar];await owner.call({action:'pairApprove',...link,confirm:true});await target.call({action:'pairPoll'});
 const before=(await owner.call({action:'devices'})).data.devices.length;
 const retry=h.client();for(const [k,v]of proof)retry.jar.set(k,v);assert.equal((await retry.call({action:'pairPoll'})).data.success,true);assert.equal((await owner.call({action:'devices'})).data.devices.length,before);
 const cancel=h.client();for(const [k,v]of proof)cancel.jar.set(k,v);assert.equal((await cancel.call({action:'pairCancel'})).data.status,'cancelled');assert.equal((await target.call(undefined,'GET')).data.authenticated,false);
});

test('pending requests have a fixed bounded lifetime and cannot grow the registry without limit',async()=>{
 const h=harness();for(let i=0;i<4;i++)assert.equal((await h.client().call({action:'pairCreate',remember:false})).status,200);
 assert.equal((await h.client().call({action:'pairCreate',remember:false})).status,429);h.advance(301000);
 assert.equal((await h.client().call({action:'pairCreate',remember:false})).status,200);
});

test('a second browser tab cannot silently poll or cancel the first tab QR with a different pairing cookie',async()=>{
 const h=harness(),p=h.client();const first=await p.call({action:'pairCreate',remember:false});await p.call({action:'pairCreate',remember:false});
 assert.equal((await p.call({action:'pairPoll',id:first.data.id})).status,409);assert.equal((await p.call({action:'pairCancel',id:first.data.id})).status,409);
});
