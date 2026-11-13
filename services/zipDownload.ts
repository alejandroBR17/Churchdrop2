/** Limits bound browser memory, not the size of a direct Drive download. */
export const ZIP_LIMITS = {files: 20, perFile: 20 * 1048576, total: 50 * 1048576};
export interface ZipSource {name: string; downloadUrl: string; sizeBytes?: number; mimeType?: string}

export function zipEligibility(files: readonly ZipSource[]): {allowed: boolean; reason: string} {
  if (!files.length) return {allowed: false, reason: 'Selecione os arquivos.'};
  if (files.length > ZIP_LIMITS.files) return {allowed: false, reason: 'Selecione até 20 arquivos por ZIP.'};
  if (files.some(file => !Number.isSafeInteger(file.sizeBytes) || (file.sizeBytes ?? 0) <= 0)) {
    return {allowed: false, reason: 'O tamanho de alguns arquivos não está disponível. Baixe um por vez ou copie os links.'};
  }
  if (files.some(file => file.sizeBytes! > ZIP_LIMITS.perFile) || files.reduce((sum, file) => sum + file.sizeBytes!, 0) > ZIP_LIMITS.total) {
    return {allowed: false, reason: 'Para arquivos grandes, baixe um por vez ou copie os links. O ZIP aceita até 50 MB, com 20 MB por arquivo.'};
  }
  return {allowed: true, reason: ''};
}

function trustedDownload(value: string) {
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.port || url.username || url.password ||
      !(['drive.google.com', 'drive.usercontent.google.com'].includes(url.hostname) || url.hostname.endsWith('.googleusercontent.com'))) {
    throw new Error('O link de um dos arquivos não é um download do Drive.');
  }
  return url.href;
}

function archiveName(value: string, used: Set<string>) {
  const clean = value.normalize('NFC').replace(/[\x00-\x1f\x7f/\\<>:"|?*]/g, '_').replace(/^[.\s]+|[.\s]+$/g, '').slice(0, 200) || 'Arquivo';
  const dot = clean.lastIndexOf('.');
  const stem = dot > 0 ? clean.slice(0, dot) : clean;
  const extension = dot > 0 ? clean.slice(dot) : '';
  let candidate = clean, index = 2;
  while (used.has(candidate.toLocaleLowerCase('pt-BR'))) candidate = `${stem} (${index++})${extension}`;
  used.add(candidate.toLocaleLowerCase('pt-BR'));
  return candidate;
}

async function download(file: ZipSource, signal: AbortSignal | undefined, fetcher: typeof fetch, timeoutMs: number) {
  signal?.throwIfAborted();
  const controller = new AbortController();
  const abort = () => controller.abort(signal?.reason);
  signal?.addEventListener('abort', abort, {once: true});
  const timer = setTimeout(() => controller.abort(new Error('Um arquivo demorou para baixar. Tente baixar diretamente pelo Drive.')), timeoutMs);
  let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
  try {
    const response = await fetcher(trustedDownload(file.downloadUrl), {signal: controller.signal, credentials: 'omit',
      referrerPolicy: 'no-referrer', mode: 'cors', cache: 'no-store', redirect: 'follow'});
    reader = response.body?.getReader();
    if (!response.ok || response.type === 'opaque' || !reader) throw new Error('Um arquivo não pôde ser baixado. Use o download individual.');
    if (response.url) trustedDownload(response.url);
    const type = (response.headers.get('content-type') || '').split(';')[0].toLowerCase().trim();
    if (!type || type === 'text/html' || type === 'application/xhtml+xml' ||
        (type !== 'application/octet-stream' && file.mimeType && type !== file.mimeType.toLowerCase())) {
      throw new Error('O Drive retornou uma página ou um formato inesperado. Abra o download individual.');
    }
    if (Number(response.headers.get('content-length')) > file.sizeBytes!) throw new Error('O arquivo mudou de tamanho. Atualize a biblioteca.');
    const data = new Uint8Array(file.sizeBytes!); let bytes = 0;
    while (true) {
      controller.signal.throwIfAborted();
      const part = await reader.read();
      controller.signal.throwIfAborted();
      if (part.done) break;
      bytes += part.value.byteLength;
      if (bytes > file.sizeBytes! || bytes > ZIP_LIMITS.perFile) throw new Error('O arquivo ultrapassou o tamanho informado. Atualize a biblioteca.');
      data.set(part.value, bytes - part.value.byteLength);
    }
    if (bytes !== file.sizeBytes) throw new Error('Um arquivo veio incompleto. Nenhum ZIP foi salvo; tente novamente.');
    return data.buffer;
  } catch (error) {
    await reader?.cancel().catch(() => {});
    if (controller.signal.aborted) throw controller.signal.reason;
    throw error;
  } finally {clearTimeout(timer); reader?.releaseLock(); signal?.removeEventListener('abort', abort);}
}

/** All-or-nothing: errors and incomplete selections never become a successful partial ZIP. */
export async function createZipDownload(files: readonly ZipSource[], options: {
  signal?: AbortSignal; fetcher?: typeof fetch; onProgress?: (done: number, total: number) => void; timeoutMs?: number;
} = {}): Promise<Blob> {
  const eligible = zipEligibility(files);
  if (!eligible.allowed) throw new Error(eligible.reason);
  options.signal?.throwIfAborted();
  const {default: JSZip} = await import('jszip');
  const zip = new JSZip(), used = new Set<string>();
  for (let i = 0; i < files.length; i++) {
    const buffer = await download(files[i], options.signal, options.fetcher || fetch, options.timeoutMs ?? 60000);
    options.signal?.throwIfAborted();
    zip.file(archiveName(files[i].name, used), buffer);
    options.onProgress?.(i + 1, files.length);
  }
  options.signal?.throwIfAborted();
  const result = await zip.generateAsync({type: 'blob', compression: 'STORE', streamFiles: true});
  options.signal?.throwIfAborted();
  return result;
}
