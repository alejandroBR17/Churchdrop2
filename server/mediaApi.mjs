import {callDrive} from './driveBridge.mjs';
import {requireAccess} from './access.mjs';
import {HttpError, json, sameOriginWrite, readJson, errorResponse} from './http.mjs';

function id(value) {
  if (typeof value !== 'string' || !/^[\w-]{5,200}$/.test(value)) throw new HttpError(400, 'Arquivo inválido.');
  return value;
}

function name(value) {
  if (typeof value !== 'string' || !value.trim() || value.length > 240 || /[\x00-\x1f\x7f]/.test(value)) throw new HttpError(400, 'Informe um nome de até 240 caracteres.');
  return value.trim();
}

function fileDto(file) {
  const fileId = id(file.id);
  const properties = file.appProperties || {};
  if (typeof file.mimeType !== 'string' || !Number.isFinite(Date.parse(properties.uploadedAt))) throw new Error('Invalid metadata');
  const download = new URL('https://drive.google.com/uc');
  download.searchParams.set('export', 'download'); download.searchParams.set('id', fileId);
  if (typeof file.resourceKey === 'string') download.searchParams.set('resourcekey', file.resourceKey);
  return {id: fileId, name: name(file.name), mimeType: file.mimeType, date: properties.uploadedAt,
    sizeBytes: Number(file.size) || 0, folderName: properties.eventName || 'Geral',
    downloadUrl: download.href, thumbnailLink: typeof file.thumbnailLink === 'string' ? file.thumbnailLink : undefined,
    preserved: properties.preserve === '1'};
}

export function createMediaHandler({environment = process.env, drive = callDrive, authorize = requireAccess} = {}) {
  return async function handle(request) {
    const headers = new Headers();
    try {
      await authorize(request, headers, {environment});
      if (request.method === 'GET') {
        const cursor = new URL(request.url).searchParams.get('cursor');
        if (cursor && cursor.length > 2000) throw new HttpError(400, 'Página inválida.');
        const result = await drive({action: 'list', ...(cursor ? {pageToken: cursor} : {})}, {environment, signal: request.signal});
        if (!Array.isArray(result.files)) throw new Error('Invalid list');
        return json({status: 'success', files: result.files.filter(file => file.appProperties?.sharing === 'link').map(fileDto),
          pendingUploads: result.files.filter(file => file.appProperties?.sharing === 'pending').map(file => ({id: id(file.id), name: name(file.name)})),
          nextPageToken: result.nextPageToken || null}, 200, headers);
      }
      if (request.method !== 'POST') return json({error: 'Método não permitido.'}, 405, headers);
      sameOriginWrite(request);
      const input = await readJson(request);
      let operation;
      switch (input.action) {
        case 'beginUpload':
          if (!Number.isSafeInteger(input.size) || input.size <= 0 || input.size > 2147483648 ||
              typeof input.mimeType !== 'string' || !/^[\w.+-]+\/[\w.+-]+$/.test(input.mimeType) ||
              typeof input.eventName !== 'string' || input.eventName.length > 100 || input.shareByLink !== true) {
            throw new HttpError(400, 'Confirme o compartilhamento por link e confira o arquivo (até 2 GB).');
          }
          operation = {action: input.action, name: name(input.name), size: input.size, mimeType: input.mimeType,
            eventName: input.eventName, shareByLink: true, origin: new URL(request.url).origin}; break;
        case 'publishUpload':
          if (input.confirmShare !== true) throw new HttpError(400, 'Confirme o compartilhamento por link.');
          operation = {action: input.action, id: id(input.id), confirmShare: true}; break;
        case 'rename': operation = {action: 'rename', id: id(input.id), name: name(input.name)}; break;
        case 'trash': case 'getText': operation = {action: input.action, id: id(input.id)}; break;
        case 'preserve':
          if (typeof input.preserve !== 'boolean') throw new HttpError(400, 'Opção inválida.');
          operation = {action: 'preserve', id: id(input.id), preserve: input.preserve}; break;
        case 'retentionPreview':
          if (![7, 14].includes(input.days)) throw new HttpError(400, 'Escolha 7 ou 14 dias.');
          operation = {action: 'retentionPreview', days: input.days}; break;
        default: throw new HttpError(400, 'Operação inválida.');
      }
      const result = await drive(operation, {environment, signal: request.signal});
      if (input.action === 'publishUpload') return json({status: 'success', file: fileDto(result)}, 200, headers);
      if (input.action === 'retentionPreview') return json({status: 'success', files: result.files.map(fileDto), nextPageToken: result.nextPageToken || null}, 200, headers);
      return json({status: 'success', ...result}, 200, headers);
    } catch (error) { return errorResponse(error, headers); }
  };
}
