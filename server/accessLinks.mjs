import {createHmac, randomBytes} from 'node:crypto';
import {HttpError} from './http.mjs';

export const LINK_TTL_MS = 9 * 86400000;
const tokenPattern = /^[a-f0-9]{64}$/;

function scope(request, environment) {
  return createHmac('sha256', environment.UNIVER_DRIVE_SERVER_SECRET)
    .update(`univer-link-scope-v1\n${environment.UNIVER_ACCESS_CODE_HASH}\n${new URL(request.url).origin}`).digest('hex');
}

function digest(token, environment) {
  // Code/key rotation invalidates links as well as ordinary sessions.
  return createHmac('sha256', environment.UNIVER_DRIVE_SERVER_SECRET)
    .update(`univer-access-link-v1\n${environment.UNIVER_ACCESS_CODE_HASH}\n${token}`).digest('hex');
}

export async function accessLinkOperation(action, request, {environment, drive, now}, token) {
  const operation = {action, scope: scope(request, environment)};
  if (action === 'createAccessLink') operation.hash = digest(token = randomBytes(32).toString('hex'), environment);
  if (action === 'verifyAccessLink') {
    if (typeof token !== 'string' || !tokenPattern.test(token)) throw new HttpError(401, 'Este link não é válido. Use o código de acesso.');
    operation.hash = digest(token, environment);
  }
  const result = await drive(operation, {environment, signal: request.signal});
  if (action === 'revokeAccessLink') {
    if (result.revoked !== true) throw new Error('Invalid revocation response');
    return {revoked: true};
  }
  const active = result.active === true;
  if (active && (!Number.isSafeInteger(result.expiresAt) || result.expiresAt <= now() || result.expiresAt > now() + LINK_TTL_MS + 60000)) throw new Error('Invalid link expiry');
  if (action === 'verifyAccessLink' && !active) throw new HttpError(401, 'Este link venceu ou foi cancelado. Use o código de acesso.');
  if (action === 'createAccessLink' && !active) throw new Error('Link was not created');
  return {active, ...(active ? {expiresAt: result.expiresAt} : {}), ...(action === 'createAccessLink' ? {url: `${new URL(request.url).origin}/#access=${token}`} : {})};
}

export async function verifyLinkedSession(request, session, options) {
  if (!session.linkHash) return;
  if (!tokenPattern.test(session.linkHash)) throw new HttpError(401, 'Entre novamente.');
  const result = await options.drive({action:'verifyAccessLink', scope:scope(request,options.environment), hash:session.linkHash}, {environment:options.environment, signal:request.signal});
  if (result.active !== true || !Number.isSafeInteger(result.expiresAt) || result.expiresAt <= options.now() || result.expiresAt !== session.linkExpiresAt) throw new HttpError(401, 'Seu link venceu ou foi cancelado. Entre com o código.');
}

export function linkedSessionHash(token, environment) { return digest(token, environment); }
