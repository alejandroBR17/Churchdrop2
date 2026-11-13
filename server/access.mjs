import {deviceHash, randomToken, deviceLabel, hasDeviceAccess, registerDevice, verifyDevice, deviceOperation, PAIR_TTL_MS} from './deviceAccess.mjs';
import {createHmac, scrypt, timingSafeEqual} from 'node:crypto';
import {promisify} from 'node:util';
import {getIronSession, webCookies} from 'iron-session';
import {callDrive} from './driveBridge.mjs';
import {HttpError, json, sameOriginWrite, readJson, errorResponse} from './http.mjs';
import {accessLinkOperation, linkedSessionHash, verifyLinkedSession} from './accessLinks.mjs';

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

export async function requireAccess(request, headers, {environment = process.env, now = Date.now, drive = callDrive} = {}) {
  if (environment.UNIVER_DRIVE_ENABLED !== 'true') throw new HttpError(503, 'A integração ainda está em preparação.');
  const session = await getIronSession(webCookies(request, headers), sessionOptions(environment));
  if (session.authorized !== true || !Number.isSafeInteger(session.expiresAt) || session.expiresAt <= now() || session.expiresAt > now() + MAX_TTL * 1000) {
    throw new HttpError(401, 'Entre com sua senha para continuar.');
  }
  if(session.deviceId) await verifyDevice(request,session,{environment,now,drive});
  else await verifyLinkedSession(request, session, {environment, now, drive});
  return session;
}

export function createAccessHandler({environment = process.env, drive = callDrive, now = Date.now} = {}) {
  async function verifyCode(input, request, status = 401) {
    if (typeof input.code !== 'string' || (input.code.length < 6 || input.code.length > 64)) throw new HttpError(400, 'Informe uma senha de 6 a 64 caracteres.');
    const budget = await drive({action:'claimLoginAttempt'}, {environment, signal:request.signal});
    if (budget.allowed !== true) throw new HttpError(429, 'Muitas tentativas. Aguarde alguns minutos.', Math.min(600, Math.max(1, Number(budget.retryAfterSeconds) || 600)));
    const [, salt, expected] = environment.UNIVER_ACCESS_CODE_HASH.split(':');
    const actual = await derive(input.code, Buffer.from(salt, 'hex'), 64);
    if (!timingSafeEqual(actual, Buffer.from(expected, 'hex'))) throw new HttpError(status, 'A senha não confere. Verifique e tente novamente.');
  }
  return async function handle(request) {
    const headers = new Headers();
    try {
      if (!['GET', 'POST', 'DELETE'].includes(request.method)) return json({error: 'Método não permitido.'}, 405, headers);
      if (environment.UNIVER_DRIVE_ENABLED !== 'true') return json({enabled: false, authenticated: false}, 200, headers);
      if (request.method === 'GET') {
        try {
          const session = await requireAccess(request, headers, {environment, now, drive});
          const remembered = session.remembered === true || (session.remembered === undefined && session.expiresAt - now() > 8 * 3600000);
          session.remembered=remembered;
          const deviceAccess = await registerDevice(request,session,{environment,now,drive});
          if(deviceAccess){session.updateConfig(sessionOptions(environment,remembered));await session.save();}
          return json({enabled: true, authenticated: true, remembered, expiresAt: session.expiresAt, deviceAccess}, 200, headers);
        }
        catch (error) { if (error instanceof HttpError && error.status === 401) return json({enabled: true, authenticated: false, deviceAccess:await hasDeviceAccess(request,{environment,now,drive})}, 200, headers); throw error; }
      }
      sameOriginWrite(request);
      const session = await getIronSession(webCookies(request, headers), sessionOptions(environment));
      if (request.method === 'DELETE') {
        if(session.deviceId) await deviceOperation({op:'revoke',actorId:session.deviceId,id:session.deviceId},request,{environment,now,drive});
        session.destroy(); return json({success: true}, 200, headers);
      }
      const input = await readJson(request, 2048);
      const linkOptions = {environment, drive, now};
      if (['devices','revokeDevice','pairCreate','pairInvite','pairJoin','pairInspect','pairApprove','pairReject','pairPoll','pairCancel'].includes(input.action)) {
        if(!await hasDeviceAccess(request,linkOptions))throw new HttpError(503,'A autorização entre aparelhos ainda está sendo preparada. Use sua senha por enquanto.');
        const authActions=['devices','revokeDevice','pairInvite','pairInspect','pairApprove','pairReject'];
        if(authActions.includes(input.action)){
          await requireAccess(request,headers,linkOptions);
          await registerDevice(request,session,linkOptions);
          session.updateConfig(sessionOptions(environment,session.remembered===true));await session.save();
        }
        if(input.action==='devices')return json(await deviceOperation({op:'list',actorId:session.deviceId},request,linkOptions),200,headers);
        if(input.action==='revokeDevice'){
          if(!/^[a-f0-9]{64}$/.test(input.id||''))throw new HttpError(400,'Aparelho inválido.');
          const result=await deviceOperation({op:'revoke',actorId:session.deviceId,id:input.id},request,linkOptions);
          if(input.id===session.deviceId)session.destroy();
          return json(result,200,headers);
        }
        const pairOptions={...sessionOptions(environment,false),cookieName:'__Host-univer-pairing',ttl:PAIR_TTL_MS/1000,
          cookieOptions:{secure:true,httpOnly:true,sameSite:'strict',path:'/',maxAge:PAIR_TTL_MS/1000}};
        const pairing=await getIronSession(webCookies(request,headers),pairOptions);
        if(['pairCreate','pairInvite','pairJoin'].includes(input.action)){
          if(typeof input.remember!=='boolean')throw new HttpError(400,'Escolha se este aparelho é seu.');
          if(input.action!=='pairInvite'){
            const budget=await drive({action:'claimLoginAttempt'},{environment,signal:request.signal});
            if(budget.allowed!==true)throw new HttpError(429,'Aguarde alguns minutos para gerar outro acesso.');
          }
          const id=input.action==='pairJoin'?input.id:randomToken(16), approval= randomToken(), proof=randomToken(), join=randomToken();
          if(!/^[a-f0-9]{32}$/.test(id||'') || input.action==='pairJoin'&&!/^[a-f0-9]{64}$/.test(input.token||''))throw new HttpError(400,'QR Code inválido.');
          const invite=input.action==='pairInvite';
          const result=await deviceOperation({op:invite?'invite':input.action==='pairJoin'?'join':'create',id,label:deviceLabel(request),remember:input.remember,
            actorId:session.deviceId,approvalHash:deviceHash(approval,environment),requestHash:deviceHash(proof,environment),joinHash:deviceHash(input.action==='pairJoin'?input.token:join,environment)},request,linkOptions);
          if(!invite){pairing.id=id;pairing.proof=proof;pairing.until=result.expiresAt;await pairing.save();}
          return json({...result,id,...(invite?{approvalToken:approval}:{}),...(input.action==='pairJoin'?{}:{url:`${new URL(request.url).origin}/#${invite?'join':'pair'}=${id}.${invite?join:approval}`})},200,headers);
        }
        if(['pairInspect','pairApprove','pairReject'].includes(input.action)){
          if(!/^[a-f0-9]{32}$/.test(input.id||'')||!/^[a-f0-9]{64}$/.test(input.token||''))throw new HttpError(400,'QR Code inválido.');
          if(input.action==='pairApprove'&&input.confirm!==true)throw new HttpError(400,'Confirme o aparelho que deseja autorizar.');
          return json(await deviceOperation({op:{pairInspect:'inspect',pairApprove:'approve',pairReject:'reject'}[input.action],id:input.id,approvalHash:deviceHash(input.token,environment),actorId:session.deviceId},request,linkOptions),200,headers);
        }
        if(!/^[a-f0-9]{32}$/.test(pairing.id||'')||!/^[a-f0-9]{64}$/.test(pairing.proof||'')||pairing.until<=now())throw new HttpError(410,'Este QR Code venceu. Gere outro.');
        if(input.id&&input.id!==pairing.id)throw new HttpError(409,'Outra solicitação foi aberta neste navegador. Gere um novo QR nesta janela.');
        const result=await deviceOperation({op:input.action==='pairCancel'?'cancel':'poll',id:pairing.id,requestHash:deviceHash(pairing.proof,environment),deviceId:randomToken()},request,linkOptions);
        if(input.action==='pairCancel'){pairing.destroy();return json(result,200,headers);}
        if(result.status==='consumed'){
          if(!/^[a-f0-9]{64}$/.test(result.deviceId||'')||!Number.isSafeInteger(result.expiresAt)||result.expiresAt<=now()||result.expiresAt>now()+MAX_TTL*1000||typeof result.remember!=='boolean')throw new Error('Invalid pairing grant');
          session.updateConfig(sessionOptions(environment,result.remember));
          session.authorized=true;session.remembered=result.remember;session.expiresAt=result.expiresAt;session.deviceId=result.deviceId;
          delete session.linkHash;delete session.linkExpiresAt;delete session.deviceSeed;
          await session.save();pairing.destroy();
          return json({success:true,remembered:result.remember,expiresAt:result.expiresAt},200,headers);
        }
        return json(result,200,headers);
      }

      if (['linkStatus', 'createLink', 'revokeLink'].includes(input.action)) {
        await requireAccess(request, headers, linkOptions);
        if (input.action !== 'linkStatus') {
          await verifyCode(input, request, 403);
          // Fresh code authentication keeps the managing device usable when its
          // previous link is replaced. Other link-derived sessions stay revocable.
          if (session.linkHash || session.deviceId) {
            delete session.linkHash;delete session.linkExpiresAt;
            delete session.deviceId;session.deviceSeed=randomToken();
            session.updateConfig(sessionOptions(environment, session.remembered));
            session.expiresAt = now() + (session.remembered ? MAX_TTL : 8 * 3600) * 1000;
            await registerDevice(request,session,linkOptions);
            await session.save();
          }
        }
        return json(await accessLinkOperation({linkStatus:'accessLinkStatus', createLink:'createAccessLink', revokeLink:'revokeAccessLink'}[input.action], request, linkOptions), 200, headers);
      }
      if (input.action === 'useLink') {
        if (typeof input.remember !== 'boolean') throw new HttpError(400, 'Escolha se este aparelho é seu.');
        const link = await accessLinkOperation('verifyAccessLink', request, linkOptions, input.token);
        session.updateConfig(sessionOptions(environment, input.remember));
        session.authorized = true;
        delete session.deviceId;session.deviceSeed=randomToken();
        session.remembered = input.remember;
        session.linkHash = linkedSessionHash(input.token, environment);
        session.linkExpiresAt = link.expiresAt;
        session.expiresAt = Math.min(link.expiresAt, now() + (input.remember ? MAX_TTL : 8 * 3600) * 1000);
        await registerDevice(request,session,linkOptions);
        await session.save();
        return json({success:true, remembered:input.remember, expiresAt:session.expiresAt}, 200, headers);
      }
      if (input.action === 'remember') {
        if (input.remember !== true) throw new HttpError(400, 'Confirme que deseja lembrar este aparelho.');
        await requireAccess(request, headers, linkOptions);
        session.updateConfig(sessionOptions(environment, true));
        session.remembered = true;
        session.expiresAt = Math.min(session.linkHash ? session.linkExpiresAt : Infinity, now() + MAX_TTL * 1000);
        if(session.deviceId){const device=await deviceOperation({op:'extend',id:session.deviceId,expiresAt:session.expiresAt},request,linkOptions);session.expiresAt=device.expiresAt;}
        await session.save();
        return json({success: true, remembered: true, expiresAt: session.expiresAt}, 200, headers);
      }
      if (typeof input.code !== 'string' || (input.code.length < 6 || input.code.length > 64) || typeof input.remember !== 'boolean') {
        throw new HttpError(400, 'Informe uma senha de 6 a 64 caracteres.');
      }
      await verifyCode(input, request);
      session.updateConfig(sessionOptions(environment, input.remember));
      session.authorized = true;
      delete session.deviceId;session.deviceSeed=randomToken();
      delete session.linkHash;
      delete session.linkExpiresAt;
      session.remembered = input.remember;
      session.expiresAt = now() + (input.remember ? MAX_TTL : 8 * 3600) * 1000;
      await registerDevice(request,session,linkOptions);
      await session.save();
      return json({success: true, remembered: input.remember, expiresAt: session.expiresAt}, 200, headers);
    } catch (error) { return errorResponse(error, headers); }
  };
}
