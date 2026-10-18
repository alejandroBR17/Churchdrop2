import {mapDriveFiles, readDriveFiles} from './fileList.ts';
import type {DriveFile} from './fileList.ts';
import {uploadResumable} from './resumableUpload.ts';
import {appApi} from './appApi.ts';
import type {MediaItem} from '../types.ts';

// Only memory: borrowed devices must not retain the library after logout/reload.
let snapshot: DriveFile[] = [];
export interface PendingUpload {id: string; name: string; complete: boolean;}
let pendingSnapshot: PendingUpload[] = [];
let uploads = new WeakMap<File, {sessionUrl: string; id?: string}>();
export function clearLibraryCache() { snapshot = []; pendingSnapshot = []; }
export function getPendingUploads(): PendingUpload[] {return pendingSnapshot.map(file => ({...file}));}
/** Recovery after reload uses only server metadata, never a persisted upload capability or owner token. */
export async function publishPendingUpload(id: string, signal?: AbortSignal): Promise<void> {
  if (!pendingSnapshot.some(file => file.id === id && file.complete)) throw new Error('Atualize a biblioteca para verificar este envio.');
  const result = await appApi<{file: DriveFile}>('/api/media', {action: 'publishUpload', id, confirmShare: true}, {signal});
  if (!readDriveFiles([result.file]) || result.file.id !== id) throw new Error('Não foi possível confirmar a publicação. Atualize a biblioteca.');
  snapshot = [...snapshot.filter(file => file.id !== id), result.file];
  pendingSnapshot = pendingSnapshot.filter(file => file.id !== id);
}
export function clearOperatorData() {
  clearLibraryCache(); uploads = new WeakMap();
  try { localStorage.removeItem('churchdrop_files_cache'); } catch { /* Storage may be unavailable. */ }
}
export const getServiceName = (date = new Date()): string => {
  const names = ['Encontro com Deus', 'Prosperidade com Deus', 'Corrente dos 70', 'Escola da Fé Inteligente',
    'Terapia do Amor', 'Sessão do Descarrego', 'Jejum das Causas Impossíveis'];
  return `${names[date.getDay()]} - ${date.toLocaleDateString('pt-BR', {day: '2-digit', month: '2-digit'})}`;
};
export const getAlternativeNames = (date: Date): string[] => date.getDay() === 6 ? ['Encontro Jovem do Sábado'] : date.getDay() === 0 ? ['Encontro Jovem do Domingo'] : [];
export function groupItemsByEvent(items: MediaItem[]) {
  return items.reduce((groups, item) => {
    (groups[item.eventName || 'Geral'] ||= []).push(item); return groups;
  }, Object.create(null) as Record<string, MediaItem[]>);
}
export async function renameFileInScript(id: string, name: string) {
  const result = await appApi('/api/media', {action: 'rename', id, name});
  snapshot = snapshot.map(file => file.id === id ? {...file, name} : file);
  return result;
}
export async function deleteFileFromScript(id: string) {
  const result = await appApi('/api/media', {action: 'trash', id});
  snapshot = snapshot.filter(file => file.id !== id);
  return result;
}
export async function fetchTextContent(id: string): Promise<string> {
  const data = await appApi<{content: string}>('/api/media', {action: 'getText', id});
  if (typeof data.content !== 'string') throw new Error('O texto não está disponível.');
  return data.content;
}
/** Retains the same session across manual retries, including publication-only retries. */
export interface UploadStatus {
  phase: 'opening' | 'transferring' | 'publishing' | 'complete';
  confirmedBytes: number;
  totalBytes: number;
}
export async function uploadFileToScript(file: File, eventName = getServiceName(), onProgress?: (percent: number) => void,
  options: {signal?: AbortSignal; shareByLink: boolean; onStatus?: (status: UploadStatus) => void} = {shareByLink: false}) {
  if (!options.shareByLink) throw new Error('Confirme que o material pode ser compartilhado por link.');
  options.signal?.throwIfAborted();
  let current = uploads.get(file);
  const resume = Boolean(current);
  const status = (phase: UploadStatus['phase'], confirmedBytes = 0) => options.onStatus?.({phase, confirmedBytes, totalBytes: file.size});
  status('opening');
  if (!current) {
    const created = await appApi<{sessionUrl: string}>('/api/media', {action: 'beginUpload', name: file.name,
      mimeType: file.type || 'application/octet-stream', size: file.size, eventName, shareByLink: true}, options);
    current = {sessionUrl: created.sessionUrl}; uploads.set(file, current);
  }
  if (!current.id) {
    const result = await uploadResumable(current.sessionUrl, file, {signal: options.signal, resume,
      onProgress: (received, total) => {
        status('transferring', received);
        onProgress?.(Math.min(99, Math.floor(received / total * 100)));
      }});
    current.id = result.id;
  }
  status('publishing', file.size);
  const published = await appApi<{file: DriveFile}>('/api/media', {action: 'publishUpload', id: current.id, confirmShare: true}, options);
  if (!readDriveFiles([published.file])) throw new Error('Não foi possível confirmar a publicação. Tente novamente.');
  uploads.delete(file); onProgress?.(100);
  status('complete', file.size);
  return {status: 'success', file: published.file};
}
export async function fetchFilesFromScript(signal?: AbortSignal): Promise<MediaItem[]> {
  const all: DriveFile[] = [], pending: PendingUpload[] = [], cursors = new Set<string>();
  let cursor: string | undefined;
  for (let page = 0; page < 100; page++) {
    const result: {files: unknown; pendingUploads?: unknown; nextPageToken?: unknown} = await appApi('/api/media', undefined, {signal, cursor});
    const files = readDriveFiles(result.files);
    if (!files) throw new Error('A lista de arquivos retornada é inválida.');
    const pendingPage = result.pendingUploads ?? [];
    if (!Array.isArray(pendingPage) || pendingPage.some(file => !file || typeof file.id !== 'string' || !file.id ||
        typeof file.name !== 'string' || typeof file.complete !== 'boolean')) throw new Error('A lista de envios pendentes é inválida.');
    pending.push(...pendingPage);
    all.push(...files);
    if (!result.nextPageToken) {
      if (!readDriveFiles(all)) throw new Error('A lista contém arquivos duplicados. Atualize novamente.');
      const ids = new Set(all.map(file => file.id));
      for (const file of pending) {
        if (ids.has(file.id)) throw new Error('A lista contém envios duplicados. Atualize novamente.');
        ids.add(file.id);
      }
      snapshot = all; pendingSnapshot = pending; return mapDriveFiles(all);
    }
    if (typeof result.nextPageToken !== 'string' || result.nextPageToken.length > 2000 || cursors.has(result.nextPageToken)) break;
    cursor = result.nextPageToken; cursors.add(cursor);
  }
  throw new Error('Não foi possível carregar a biblioteca completa. Tente novamente.');
}
export function getCachedFiles(): MediaItem[] { return mapDriveFiles(snapshot); }
