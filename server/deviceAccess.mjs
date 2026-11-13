import {createHmac, randomBytes} from 'node:crypto';
import {HttpError} from './http.mjs';

const capabilityStores = new WeakMap();
export const PAIR_TTL_MS = 5 * 60000;
export function deviceScope(request, environment) {
  return createHmac('sha256', environment.UNIVER_DRIVE_SERVER_SECRET)
    .update(`univer-link-scope-v1\n${environment.UNIVER_ACCESS_CODE_HASH}\n${new URL(request.url).origin}`).digest('hex');
}
export function deviceHash(value, environment) {
  return createHmac('sha256', environment.UNIVER_DRIVE_SERVER_SECRET).update(`univer-device-v1\n${value}`).digest('hex');
}
export function randomToken(bytes = 32) {return randomBytes(bytes).toString('hex');}
export function deviceLabel(request) {
  const ua = request.headers.get('user-agent') || '';
  const device = /iPhone/.test(ua) ? 'iPhone' : /iPad/.test(ua) ? 'iPad' : /Android/.test(ua) ? 'Android' : /Windows/.test(ua) ? 'PC Windows' : /Macintosh/.test(ua) ? 'Mac' : /Linux/.test(ua) ? 'Computador Linux' : 'Aparelho';
  const browser = /Edg\//.test(ua) ? 'Edge' : /(?:Chrome|CriOS)\//.test(ua) ? 'Chrome' : /(?:Firefox|FxiOS)\//.test(ua) ? 'Firefox' : /Safari\//.test(ua) ? 'Safari' : 'Navegador';
  return `${device} · ${browser}`;
}
export async function hasDeviceAccess(request, {environment, drive, now}) {
  let capabilities=capabilityStores.get(drive);
  if(!capabilities){capabilities=new Map();capabilityStores.set(drive,capabilities);}
  const key = deviceScope(request,environment);
  const cached = capabilities.get(key);
  if (cached && cached.until > now()) return cached.available;
  let available = false;
  try {available = (await drive({action:'deviceCapabilities'}, {environment,signal:request.signal})).version === 1;}
  catch { /* Existing Apps Script versions keep password access working. */ }
  if(capabilities.size>32)capabilities.clear();
  capabilities.set(key,{available,until:now()+60000});
  return available;
}
export async function deviceOperation(operation, request, options) {
  const data = await options.drive({action:'deviceAccess',scope:deviceScope(request,options.environment),...operation}, {environment:options.environment,signal:request.signal});
  if (!data || typeof data !== 'object') throw new Error('Invalid device response');
  if(data.error)throw new HttpError(data.error==='limit'?429:data.error==='expired'?410:data.error==='conflict'?409:401,
    data.error==='limit'?'Limite de solicitações ou aparelhos atingido. Aguarde e tente novamente.':data.error==='expired'?'Este QR Code venceu. Gere outro.':data.error==='conflict'?'Este QR Code já foi utilizado. Gere outro.':'Este acesso foi encerrado ou não está disponível.');
  return data;
}
export async function registerDevice(request, session, options) {
  if(session.deviceId)return true;
  if (!await hasDeviceAccess(request,options)) return false;
  // A replay of a pre-upgrade cookie resolves to the same revocable record.
  const oldCookie = (request.headers.get('cookie') || '').split(';').map(p=>p.trim()).find(p=>p.startsWith('__Host-univer-session=')) || '';
  const id = session.deviceId || deviceHash(session.deviceSeed || oldCookie, options.environment);
  const result = await deviceOperation({op:'register',id,label:deviceLabel(request),expiresAt:session.expiresAt,
    ...(session.linkHash?{linkHash:session.linkHash,linkExpiresAt:session.linkExpiresAt}:{})},request,options);
  if(result.active!==true||!Number.isSafeInteger(result.expiresAt))throw new Error('Device was not registered');
  session.deviceId=id;session.expiresAt=result.expiresAt;
  delete session.deviceSeed;
  return true;
}
export async function verifyDevice(request, session, options) {
  if(!/^[a-f0-9]{64}$/.test(session.deviceId||''))throw new HttpError(401,'Entre novamente.');
  const result=await deviceOperation({op:'verify',id:session.deviceId},request,options);
  if(result.active!==true||!Number.isSafeInteger(result.expiresAt)||result.expiresAt<session.expiresAt)throw new HttpError(401,'O acesso deste aparelho foi encerrado. Entre novamente.');
}
