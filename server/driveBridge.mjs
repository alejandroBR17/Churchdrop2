import {createHmac, randomBytes} from 'node:crypto';

/** Server-only transport. Never import into React or expose the signing secret. */
export class DriveBridgeError extends Error {
  constructor(message = 'Não foi possível acessar o armazenamento agora.') {
    super(message);
    this.name = 'DriveBridgeError';
  }
}

function configuration(environment) {
  if (environment.UNIVER_DRIVE_ENABLED !== 'true') throw new DriveBridgeError('A integração privada ainda não está ativada.');
  const secret = environment.UNIVER_DRIVE_SERVER_SECRET;
  let url;
  try { url = new URL(environment.UNIVER_DRIVE_SCRIPT_URL); } catch { throw new DriveBridgeError(); }
  if (url.protocol !== 'https:' || url.hostname !== 'script.google.com' || url.port || url.username ||
      url.password || url.search || url.hash || !/^\/macros\/s\/[\w-]+\/exec$/.test(url.pathname) ||
      typeof secret !== 'string' || secret.length < 32 || secret.length > 1024) throw new DriveBridgeError();
  return {url: url.href, secret};
}

export function signedEnvelope(request, secret, {issuedAt = Date.now(), nonce = randomBytes(24).toString('hex')} = {}) {
  const payload = JSON.stringify(request);
  if (typeof payload !== 'string' || !request || typeof request !== 'object' || Array.isArray(request) ||
      typeof secret !== 'string' || secret.length < 32 || !Number.isSafeInteger(issuedAt) ||
      !/^[a-f0-9]{32,64}$/.test(nonce)) throw new DriveBridgeError();
  const signature = createHmac('sha256', secret).update(`${issuedAt}\n${nonce}\n${payload}`, 'utf8').digest('hex');
  const envelope = JSON.stringify({issuedAt, nonce, payload, signature});
  if (Buffer.byteLength(envelope, 'utf8') > 20000) throw new DriveBridgeError('A solicitação ultrapassa o limite de metadados.');
  return envelope;
}

async function readResponse(response, signal) {
  const maximum = 1024 * 1024;
  if (!response.body || Number(response.headers.get('Content-Length')) > maximum) throw new DriveBridgeError();
  const reader = response.body.getReader();
  const chunks = [];
  let bytes = 0;
  try {
    while (true) {
      signal.throwIfAborted();
      const part = await reader.read();
      if (part.done) break;
      bytes += part.value.byteLength;
      if (bytes > maximum) throw new DriveBridgeError();
      chunks.push(part.value);
    }
    signal.throwIfAborted();
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    await reader.cancel().catch(() => {});
    throw new DriveBridgeError();
  } finally { reader.releaseLock(); }
}

/**
 * Only call from an authenticated API handler, after validating action and input.
 * No automatic write retries: a lost response does not prove the operation failed.
 * GAS ContentService redirects are followed as GET to its exact Google content host.
 */
export async function callDrive(request, {
  environment = process.env, fetcher = fetch, timeoutMs = 15000, signal,
} = {}) {
  const {url, secret} = configuration(environment);
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0 || timeoutMs > 60000) throw new DriveBridgeError();
  signal?.throwIfAborted();
  const body = signedEnvelope(request, secret);
  const controller = new AbortController();
  const abort = () => controller.abort(signal?.reason);
  signal?.addEventListener('abort', abort, {once: true});
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const common = {signal: controller.signal, credentials: 'omit', cache: 'no-store', redirect: 'manual', referrerPolicy: 'no-referrer'};
  try {
    let response = await fetcher(url, {...common, method: 'POST', body, headers: {'Content-Type': 'text/plain; charset=utf-8'}});
    if (response.status === 302 || response.status === 303) {
      const location = response.headers.get('Location');
      const target = new URL(location);
      if (target.protocol !== 'https:' || target.hostname !== 'script.googleusercontent.com' || target.port ||
          target.username || target.password || target.pathname !== '/macros/echo' || target.hash) throw new DriveBridgeError();
      await response.body?.cancel();
      response = await fetcher(target.href, {...common, method: 'GET'});
    }
    if (!response.ok) throw new DriveBridgeError();
    const data = await readResponse(response, controller.signal);
    if (!data || data.status !== 'success' || !data.data || typeof data.data !== 'object' || Array.isArray(data.data)) throw new DriveBridgeError();
    return data.data;
  } catch {
    signal?.throwIfAborted();
    throw new DriveBridgeError();
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', abort);
  }
}
