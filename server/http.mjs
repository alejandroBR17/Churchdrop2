export class HttpError extends Error {
  constructor(status, message, retryAfter) { super(message); this.status = status; this.retryAfter = retryAfter; }
}

export function json(data, status = 200, headers = new Headers()) {
  headers.set('Cache-Control', 'private, no-store');
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('Vary', 'Cookie');
  return Response.json(data, {status, headers});
}

export function sameOriginWrite(request) {
  if (request.headers.get('origin') !== new URL(request.url).origin ||
      request.headers.get('sec-fetch-site') === 'cross-site' || request.headers.get('x-univer-request') !== '1') {
    throw new HttpError(403, 'Abra o app novamente para continuar.');
  }
}

export async function readJson(request, maximum = 16000) {
  if (!/^application\/json(?:;|$)/i.test(request.headers.get('content-type') || '') ||
      Number(request.headers.get('content-length')) > maximum || !request.body) throw new HttpError(400, 'Solicitação inválida.');
  const reader = request.body.getReader();
  const chunks = []; let bytes = 0;
  try {
    while (true) {
      const part = await reader.read(); if (part.done) break;
      bytes += part.value.byteLength;
      if (bytes > maximum) throw new Error('Too large');
      chunks.push(part.value);
    }
    const value = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid body');
    return value;
  } catch {
    await reader.cancel().catch(() => {});
    throw new HttpError(400, 'Solicitação inválida.');
  } finally { reader.releaseLock(); }
}

export function errorResponse(error, headers = new Headers()) {
  if (error instanceof HttpError) {
    if (error.retryAfter) headers.set('Retry-After', String(error.retryAfter));
    return json({error: error.message}, error.status, headers);
  }
  return json({error: 'Não foi possível concluir agora. Tente novamente.'}, 502, headers);
}
