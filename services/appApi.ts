/** Same-origin metadata only. Never send file bytes or Google credentials here. */
export async function appApi<T>(path: '/api/session' | '/api/media', body?: object,
  options: {signal?: AbortSignal; method?: 'GET' | 'POST' | 'DELETE'; fetcher?: typeof fetch; cursor?: string} = {}): Promise<T> {
  const controller = new AbortController();
  const abort = () => controller.abort(options.signal?.reason);
  options.signal?.throwIfAborted();
  options.signal?.addEventListener('abort', abort, {once: true});
  const timer = setTimeout(() => controller.abort(new Error('O servidor demorou para responder. Tente novamente.')), 20000);
  try {
    const response = await (options.fetcher || fetch)(options.cursor ? `${path}?cursor=${encodeURIComponent(options.cursor)}` : path, {
      method: options.method || (body ? 'POST' : 'GET'), credentials: 'same-origin', cache: 'no-store',
      redirect: 'error', signal: controller.signal,
      headers: {'Content-Type': 'application/json', 'X-Univer-Request': '1'},
      ...(body ? {body: JSON.stringify(body)} : {}),
    });
    const value = await response.json();
    controller.signal.throwIfAborted();
    if (response.status === 401 && typeof window !== 'undefined') window.dispatchEvent(new Event('univer-session-expired'));
    if (!response.ok || !value || typeof value !== 'object' || value.status === 'error') {
      throw new Error(typeof value?.error === 'string' ? value.error : 'Não foi possível concluir. Tente novamente.');
    }
    return value as T;
  } finally { clearTimeout(timer); options.signal?.removeEventListener('abort', abort); }
}
