import {createHmac, scrypt, timingSafeEqual} from 'node:crypto';
import {promisify} from 'node:util';
import {getIronSession, webCookies} from 'iron-session';
import {callDrive} from './driveBridge.mjs';
import {HttpError, json, sameOriginWrite, readJson, errorResponse} from './http.mjs';

const derive = promisify(scrypt);
const MAX_TTL = 7 * 86400;

function sessionOptions(environment, remember) {
  const key = environment.UNIVER_DRIVE_SERVER_SECRET;
  const hash = environment.UNIVER_ACCESS_CODE_HASH;
  if (typeof key !== 'string' || key.length < 32 || !/^scrypt:[a-f0-9]{32}:[a-f0-9]{128}$/.test(hash || '')) {
    throw new HttpError(503, 'O acesso seguro ainda está sendo configurado.');
  }
  return {
    cookieName: '__Host-univer-session',
    password: createHmac('sha256', key).update(`univer-session-v1\n${hash}`).digest('hex'),
    ttl: remember === false ? 8 * 3600 : MAX_TTL,
    cookieOptions: {secure: true, httpOnly: true, sameSite: 'strict', path: '/', maxAge: remember === false ? undefined : MAX_TTL - 60},
  };
}

export async function requireAccess(request, headers, {environment = process.env, now = Date.now} = {}) {
  if (environment.UNIVER_DRIVE_ENABLED !== 'true') throw new HttpError(503, 'A integração ainda está em preparação.');
  const session = await getIronSession(webCookies(request, headers), sessionOptions(environment));
  if (session.authorized !== true || !Number.isSafeInteger(session.expiresAt) || session.expiresAt <= now() || session.expiresAt > now() + MAX_TTL * 1000) {
    throw new HttpError(401, 'Entre com seu código para continuar.');
  }
  return session;
}

export function createAccessHandler({environment = process.env, drive = callDrive, now = Date.now} = {}) {
  return async function handle(request) {
    const headers = new Headers();
    try {
      if (!['GET', 'POST', 'DELETE'].includes(request.method)) return json({error: 'Método não permitido.'}, 405, headers);
      if (environment.UNIVER_DRIVE_ENABLED !== 'true') return json({enabled: false, authenticated: false}, 200, headers);
      if (request.method === 'GET') {
        try {
          const session = await requireAccess(request, headers, {environment, now});
          const remembered = session.remembered === true || (session.remembered === undefined && session.expiresAt - now() > 8 * 3600000);
          return json({enabled: true, authenticated: true, remembered, expiresAt: session.expiresAt}, 200, headers);
        }
        catch (error) { if (error instanceof HttpError && error.status === 401) return json({enabled: true, authenticated: false}, 200, headers); throw error; }
      }
      sameOriginWrite(request);
      const session = await getIronSession(webCookies(request, headers), sessionOptions(environment));
      if (request.method === 'DELETE') { session.destroy(); return json({success: true}, 200, headers); }
      const input = await readJson(request, 2048);
      if (input.action === 'remember') {
        if (input.remember !== true) throw new HttpError(400, 'Confirme que deseja lembrar este aparelho.');
        await requireAccess(request, headers, {environment, now});
        session.updateConfig(sessionOptions(environment, true));
        session.remembered = true;
        session.expiresAt = now() + MAX_TTL * 1000;
        await session.save();
        return json({success: true, remembered: true, expiresAt: session.expiresAt}, 200, headers);
      }
      if (typeof input.code !== 'string' || !/^\d{10}$/.test(input.code) || typeof input.remember !== 'boolean') {
        throw new HttpError(400, 'Informe os 10 números do código de acesso.');
      }
      const budget = await drive({action: 'claimLoginAttempt'}, {environment, signal: request.signal});
      if (budget.allowed !== true) throw new HttpError(429, 'Muitas tentativas. Aguarde alguns minutos.', Math.min(600, Math.max(1, Number(budget.retryAfterSeconds) || 600)));
      const [, salt, expected] = environment.UNIVER_ACCESS_CODE_HASH.split(':');
      const actual = await derive(input.code, Buffer.from(salt, 'hex'), 64);
      if (!timingSafeEqual(actual, Buffer.from(expected, 'hex'))) throw new HttpError(401, 'O código não confere. Verifique e tente novamente.');
      session.updateConfig(sessionOptions(environment, input.remember));
      session.authorized = true;
      session.remembered = input.remember;
      session.expiresAt = now() + (input.remember ? MAX_TTL : 8 * 3600) * 1000;
      await session.save();
      return json({success: true, remembered: input.remember, expiresAt: session.expiresAt}, 200, headers);
    } catch (error) { return errorResponse(error, headers); }
  };
}
