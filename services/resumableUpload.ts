/** Drive's session URL is a credential. Keep it in memory; never log or cache it. */
export interface UploadOptions {
  signal?: AbortSignal;
  onProgress?: (receivedBytes: number, totalBytes: number) => void;
  resume?: boolean;
  chunkSize?: number;
  timeoutMs?: number;
  maxRetries?: number;
  retryDelayMs?: number;
  fetcher?: typeof fetch;
}

export interface UploadedFile { id: string }

const BLOCK_SIZE = 256 * 1024;

function validateSession(value: string): string {
  let url: URL;
  try { url = new URL(value); } catch { throw new Error('Sessão de envio inválida.'); }
  if (url.protocol !== 'https:' || url.hostname !== 'www.googleapis.com' || url.port ||
      url.username || url.password || url.hash || url.pathname !== '/upload/drive/v3/files' ||
      url.searchParams.get('uploadType') !== 'resumable' || !url.searchParams.get('upload_id')) {
    throw new Error('Sessão de envio inválida.');
  }
  return url.href;
}

function receivedOffset(response: Response, limit: number): number {
  const range = response.headers.get('Range');
  if (range === null) return 0;
  const match = /^bytes=0-(\d+)$/.exec(range);
  const next = match ? Number(match[1]) + 1 : NaN;
  if (!Number.isSafeInteger(next) || next <= 0 || next > limit) {
    throw new Error('O Drive retornou uma posição de envio inválida.');
  }
  return next;
}

function pause(ms: number, signal?: AbortSignal): Promise<void> {
  signal?.throwIfAborted();
  return new Promise((resolve, reject) => {
    const stop = () => { clearTimeout(timer); signal?.removeEventListener('abort', stop); reject(signal?.reason); };
    const timer = setTimeout(() => { signal?.removeEventListener('abort', stop); resolve(); }, ms);
    signal?.addEventListener('abort', stop, {once: true});
  });
}

/**
 * Sends bounded binary chunks directly to a server-created Drive session.
 * Recovers the acknowledged offset after interruptions instead of duplicating a chunk.
 * This transport does not create sessions, expose owner OAuth, or authorize users.
 */
export async function uploadResumable(
  sessionUrl: string, file: Blob, options: UploadOptions = {},
): Promise<UploadedFile> {
  const url = validateSession(sessionUrl);
  const {signal, onProgress, fetcher = fetch, resume = false,
    chunkSize = 4 * 1024 * 1024, timeoutMs = 90_000,
    maxRetries = 3, retryDelayMs = 1_000} = options;
  if (!Number.isSafeInteger(file.size) || file.size <= 0) throw new Error('O arquivo está vazio ou é grande demais.');
  if (!Number.isSafeInteger(chunkSize) || chunkSize < BLOCK_SIZE || chunkSize % BLOCK_SIZE !== 0 ||
      chunkSize > 32 * 1024 * 1024 || !Number.isFinite(timeoutMs) || timeoutMs <= 0 ||
      !Number.isInteger(maxRetries) || maxRetries < 0 || maxRetries > 5 ||
      !Number.isFinite(retryDelayMs) || retryDelayMs < 0 || retryDelayMs > 60_000) {
    throw new Error('Configuração de envio inválida.');
  }

  let offset = 0;
  let probe = resume;
  let failures = 0;
  let stalls = 0;
  // A fresh resume probe may discover bytes sent by a previous invocation.
  let sentThrough = resume ? file.size : 0;
  signal?.throwIfAborted();
  onProgress?.(0, file.size);

  while (true) {
    signal?.throwIfAborted();
    const end = Math.min(offset + chunkSize, file.size);
    if (!probe) sentThrough = Math.max(sentThrough, end);
    const controller = new AbortController();
    const abort = () => controller.abort(signal?.reason);
    signal?.addEventListener('abort', abort, {once: true});
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    let response: Response | undefined;
    let result: unknown;
    let interrupted = false;
    try {
      response = await fetcher(url, {
        method: 'PUT', signal: controller.signal, credentials: 'omit', cache: 'no-store',
        redirect: 'error', referrerPolicy: 'no-referrer', mode: 'cors',
        headers: probe ? {'Content-Range': `bytes */${file.size}`} : {
          'Content-Type': file.type || 'application/octet-stream',
          'Content-Range': `bytes ${offset}-${end - 1}/${file.size}`,
        },
        // The browser sets Content-Length. Never convert the whole file to base64.
        body: probe ? undefined : file.slice(offset, end),
      });
      if (response.status === 200 || response.status === 201) result = await response.json();
      controller.signal.throwIfAborted();
    } catch {
      signal?.throwIfAborted();
      interrupted = true;
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener('abort', abort);
    }

    if (interrupted || response!.status === 429 || response!.status >= 500) {
      if (++failures > maxRetries) {
        throw new Error('O Drive não confirmou a transferência. Tente novamente.');
      }
      await pause(retryDelayMs * 2 ** (failures - 1), signal);
      probe = true;
      continue;
    }
    signal?.throwIfAborted();
    if (response!.status === 200 || response!.status === 201) {
      if (sentThrough !== file.size || !result || typeof result !== 'object' ||
          !('id' in result) || typeof result.id !== 'string' || !result.id.trim()) {
        throw new Error('O Drive não confirmou a conclusão do arquivo.');
      }
      onProgress?.(file.size, file.size);
      return {id: result.id};
    }
    if (response!.status === 404 || response!.status === 410) {
      throw new Error('A sessão de envio expirou. Inicie o envio novamente.');
    }
    if (response!.status !== 308) throw new Error('O Drive recusou o envio. Verifique o acesso e tente novamente.');

    const next = receivedOffset(response!, sentThrough);
    if (next < offset) throw new Error('O Drive perdeu a posição confirmada. Inicie o envio novamente.');
    if (next === offset && !probe && ++stalls > maxRetries) {
      throw new Error('O envio não avançou. Tente retomar o arquivo.');
    }
    if (next > offset) { failures = 0; stalls = 0; }
    offset = next;
    // 308 is not completion, even when the Range contains every byte.
    if (offset < file.size) onProgress?.(offset, file.size);
    probe = offset === file.size;
    if (probe && ++stalls > maxRetries + 1) throw new Error('O Drive não confirmou a conclusão do arquivo.');
  }
}
