import type { MediaItem } from '../types.ts';

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  date: string;
  downloadUrl?: string;
  thumbnailLink?: string;
  folderName?: string;
  sizeBytes?: number;
  preserved?: boolean;
}

/** Reject a malformed snapshot as a whole instead of hiding partially lost records. */
export function readDriveFiles(value: unknown): DriveFile[] | null {
  if (!Array.isArray(value)) return null;
  const ids = new Set<string>();
  for (const file of value) {
    if (!file || typeof file !== 'object' ||
        typeof file.id !== 'string' || !file.id || ids.has(file.id) ||
        typeof file.name !== 'string' || typeof file.mimeType !== 'string' ||
        typeof file.date !== 'string' || !Number.isFinite(Date.parse(file.date)) ||
        ['downloadUrl', 'thumbnailLink', 'folderName'].some(key => file[key] !== undefined && typeof file[key] !== 'string') ||
        (file.preserved !== undefined && typeof file.preserved !== 'boolean') ||
        (file.sizeBytes !== undefined && (!Number.isSafeInteger(file.sizeBytes) || file.sizeBytes < 0))) {
      return null;
    }
    ids.add(file.id);
  }
  return value as DriveFile[];
}

function httpUrl(value: string | undefined): string {
  try {
    const url = new URL(value || '');
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : '';
  } catch { return ''; }
}

export function mapDriveFiles(files: readonly DriveFile[]): MediaItem[] {
  return files.map(file => {
    const id = encodeURIComponent(file.id);
    const imageOrVideo = /image|video/.test(file.mimeType);
    return {
      id: file.id,
      name: file.name,
      url: httpUrl(file.thumbnailLink) || (imageOrVideo ? `https://lh3.googleusercontent.com/d/${id}=s1000` : ''),
      downloadUrl: httpUrl(file.downloadUrl) || `https://drive.google.com/uc?export=download&id=${id}`,
      type: file.mimeType.includes('video') ? 'video' : file.mimeType.includes('audio') ? 'audio' :
        file.mimeType.includes('pdf') ? 'pdf' : file.mimeType.includes('text') ? 'text' : 'image',
      size: file.sizeBytes === undefined ? 'Drive' : file.sizeBytes < 1048576 ? `${Math.ceil(file.sizeBytes / 1024)} KB` : `${(file.sizeBytes / 1048576).toFixed(1)} MB`,
      sizeBytes: file.sizeBytes,
      preserved: file.preserved === true,
      mimeType: file.mimeType,
      date: new Date(file.date),
      eventName: file.folderName || 'Geral',
    };
  });
}

interface ListOptions {
  signal?: AbortSignal;
  fetcher?: typeof fetch;
  timeoutMs?: number;
}

/** A successful empty list is authoritative. Failures must never look like an empty Drive. */
export async function fetchDriveFiles(url: string, {signal, fetcher = fetch, timeoutMs = 12_000}: ListOptions = {}): Promise<DriveFile[]> {
  const controller = new AbortController();
  let timedOut = false;
  const cancel = () => controller.abort();
  if (signal?.aborted) throw new DOMException('Leitura cancelada.', 'AbortError');
  signal?.addEventListener('abort', cancel, {once: true});
  const timer = setTimeout(() => {timedOut = true; controller.abort();}, timeoutMs);
  try {
    const response = await fetcher(url, {signal: controller.signal});
    if (!response.ok) throw new Error('Resposta indisponível.');
    const data: unknown = await response.json();
    if (controller.signal.aborted) throw new Error('Leitura interrompida.');
    if (!data || typeof data !== 'object' || !('status' in data) || data.status !== 'success' || !('files' in data)) {
      throw new Error('Resposta inválida.');
    }
    const files = readDriveFiles(data.files);
    if (!files) throw new Error('Lista inválida.');
    return files;
  } catch {
    if (signal?.aborted) throw new DOMException('Leitura cancelada.', 'AbortError');
    throw new Error(timedOut
      ? 'O servidor demorou para responder. Tente novamente.'
      : 'Não foi possível atualizar os arquivos. Tente novamente.');
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', cancel);
  }
}
