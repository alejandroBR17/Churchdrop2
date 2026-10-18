/** Wait without keeping a cancelled library request alive. */
function waitForReadRetry(signal: AbortSignal): Promise<void> {
  signal.throwIfAborted();
  return new Promise((resolve, reject) => {
    const abort = () => {clearTimeout(timer); reject(signal.reason);};
    const timer = setTimeout(() => {signal.removeEventListener('abort', abort); resolve();}, 500);
    signal.addEventListener('abort', abort, {once: true});
  });
}

/** Same-origin metadata only. Never send file bytes or Google credentials here. */
export async function appApi<T>(path: '/api/session' | '/api/media', body?: object,
  options: {signal?: AbortSignal; method?: 'GET' | 'POST' | 'DELETE'; fetcher?: typeof fetch; cursor?: string} = {}): Promise<T> {
  const controller = new AbortController();
  const abort = () => controller.abort(options.signal?.reason);
  options.signal?.throwIfAborted();
  options.signal?.addEventListener('abort', abort, {once: true});
  const timer = setTimeout(() => controller.abort(new Error('O servidor demorou para responder. Tente novamente.')), 20000);
  const method = options.method || (body ? 'POST' : 'GET');
  // Only library reads are safe to repeat. A lost acknowledgement must never duplicate a mutation.
  const canRetry = path === '/api/media' && method === 'GET' && !body;
  try {
    for (let attempt = 0; ; attempt++) {
      let response: Response;
      try {
        response = await (options.fetcher || fetch)(options.cursor ? `${path}?cursor=${encodeURIComponent(options.cursor)}` : path, {
          method, credentials: 'same-origin', cache: 'no-store',
          redirect: 'error', signal: controller.signal,
          headers: {'Content-Type': 'application/json', 'X-Univer-Request': '1'},
          ...(body ? {body: JSON.stringify(body)} : {}),
        });
      } catch (error) {
        controller.signal.throwIfAborted();
        if (!canRetry || attempt > 0 || !(error instanceof TypeError)) throw error;
        await waitForReadRetry(controller.signal);
        continue;
      }
      controller.signal.throwIfAborted();
      if (canRetry && attempt === 0 && [502, 503, 504].includes(response.status)) {
        // Gateway failures may return HTML rather than JSON. Release the body before retrying.
        await response.body?.cancel();
        await waitForReadRetry(controller.signal);
        continue;
      }
      const value = await response.json();
      controller.signal.throwIfAborted();
      if (response.status === 401 && typeof window !== 'undefined') window.dispatchEvent(new Event('univer-session-expired'));
      if (!response.ok || !value || typeof value !== 'object' || value.status === 'error') {
        throw new Error(typeof value?.error === 'string' ? value.error : 'Não foi possível concluir. Tente novamente.');
      }
      return value as T;
    }
  } finally { clearTimeout(timer); options.signal?.removeEventListener('abort', abort); }
}
