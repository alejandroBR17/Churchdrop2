/**
 * Univer Mídia control plane. File bytes never pass through Apps Script.
 * Deploy only after reviewing scopes and configuring private Script Properties.
 * Not connected to the legacy service. No public GET, sharing, or permanent deletion.
 */
var APP_MARKER = 'univer-midia-v1';
var DRIVE_ROOT = 'https://www.googleapis.com/drive/v3/files';
var DRIVE_FIELDS = 'id,name,mimeType,size,parents,trashed,appProperties';

function doGet() {
  return json_({status: 'error', message: 'Acesso não autorizado.'});
}

function doPost(event) {
  try {
    var request = authenticate_(event);
    return json_({status: 'success', data: dispatch_(request)});
  } catch (error) {
    // Do not expose Drive responses, tokens, session URLs or exception stacks.
    return json_({status: 'error', message: 'Não foi possível concluir a solicitação.'});
  }
}

function json_(value) {
  return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON);
}

function properties_() { return PropertiesService.getScriptProperties(); }

function authenticate_(event) {
  var raw = event && event.postData && event.postData.contents;
  if (typeof raw !== 'string' || raw.length > 20000) throw new Error('Unauthorized');
  var envelope = JSON.parse(raw);
  var secret = properties_().getProperty('SERVER_SECRET');
  if (!secret || secret.length < 32 || !envelope ||
      !Number.isSafeInteger(envelope.issuedAt) || Math.abs(Date.now() - envelope.issuedAt) > 300000 ||
      typeof envelope.nonce !== 'string' || !/^[a-f0-9]{32,64}$/.test(envelope.nonce) ||
      typeof envelope.payload !== 'string' || typeof envelope.signature !== 'string' ||
      !/^[a-f0-9]{64}$/.test(envelope.signature)) throw new Error('Unauthorized');
  var message = envelope.issuedAt + '\n' + envelope.nonce + '\n' + envelope.payload;
  var signature = Utilities.computeHmacSha256Signature(message, secret, Utilities.Charset.UTF_8)
    .map(function (byte) { return ((byte + 256) % 256).toString(16).padStart(2, '0'); }).join('');
  var difference = 0;
  for (var i = 0; i < signature.length; i++) difference |= signature.charCodeAt(i) ^ envelope.signature.charCodeAt(i);
  if (difference !== 0) throw new Error('Unauthorized');
  var request = JSON.parse(envelope.payload);
  if (!request || Array.isArray(request) || typeof request !== 'object') throw new Error('Invalid request');
  var lock = LockService.getScriptLock();
  lock.waitLock(5000);
  try {
    var cache = CacheService.getScriptCache();
    var key = 'nonce:' + envelope.nonce;
    if (cache.get(key)) throw new Error('Replay');
    cache.put(key, '1', 600);
  } finally { lock.releaseLock(); }
  return request;
}

function dispatch_(request) {
  switch (request.action) {
    case 'list': return list_(request.pageToken);
    case 'beginUpload': return beginUpload_(request);
    case 'rename': return rename_(request.id, request.name);
    case 'trash': return trash_(request.id);
    case 'preserve': return preserve_(request.id, request.preserve);
    case 'retentionPreview': return retentionPreview_(request.days, request.pageToken);
    default: throw new Error('Unsupported action');
  }
}

function driveRequest_(url, method, body, extraHeaders) {
  var headers = {Authorization: 'Bearer ' + ScriptApp.getOAuthToken()};
  Object.keys(extraHeaders || {}).forEach(function (key) { headers[key] = extraHeaders[key]; });
  var options = {method: method, headers: headers, muteHttpExceptions: true, followRedirects: false};
  if (body !== undefined) { options.contentType = 'application/json'; options.payload = JSON.stringify(body); }
  var response = UrlFetchApp.fetch(url, options);
  if (response.getResponseCode() < 200 || response.getResponseCode() > 299) throw new Error('Drive request failed');
  return response;
}

function identifier_(id) {
  if (typeof id !== 'string' || !/^[a-zA-Z0-9_-]{5,200}$/.test(id)) throw new Error('Invalid id');
  return id;
}

function rootId_() { return identifier_(properties_().getProperty('ROOT_FOLDER_ID')); }

function ownedFile_(id) {
  var root = rootId_();
  var response = driveRequest_(DRIVE_ROOT + '/' + identifier_(id) + '?fields=' + encodeURIComponent(DRIVE_FIELDS), 'get');
  var file = JSON.parse(response.getContentText());
  if (file.trashed || !Array.isArray(file.parents) || file.parents.indexOf(root) === -1 ||
      !file.appProperties || file.appProperties.app !== APP_MARKER || file.appProperties.kind !== 'media') {
    throw new Error('Not an application file');
  }
  return file;
}

/** Run once manually after configuring SERVER_SECRET and approving the two scopes. */
function initializeStorage() {
  var lock = LockService.getScriptLock();
  lock.waitLock(5000);
  try {
    var properties = properties_();
    if (properties.getProperty('ROOT_FOLDER_ID')) return; // Never recreate or move an existing root.
    var secret = properties.getProperty('SERVER_SECRET');
    if (!secret || secret.length < 32) throw new Error('Configure SERVER_SECRET privately first.');
    var response = driveRequest_(DRIVE_ROOT + '?fields=id', 'post', {
      name: 'Univer Mídia', mimeType: 'application/vnd.google-apps.folder',
      appProperties: {app: APP_MARKER, kind: 'root'},
    });
    var id = identifier_(JSON.parse(response.getContentText()).id);
    properties.setProperty('ROOT_FOLDER_ID', id);
  } finally { lock.releaseLock(); }
}

function list_(pageToken) {
  var root = rootId_();
  var query = "'" + root + "' in parents and trashed = false and appProperties has { key='app' and value='" + APP_MARKER + "' } and appProperties has { key='kind' and value='media' }";
  var url = DRIVE_ROOT + '?pageSize=100&orderBy=createdTime%20desc&q=' + encodeURIComponent(query) +
    '&fields=' + encodeURIComponent('nextPageToken,files(' + DRIVE_FIELDS + ')');
  if (pageToken !== undefined && pageToken !== null) {
    if (typeof pageToken !== 'string' || pageToken.length > 2000) throw new Error('Invalid page');
    url += '&pageToken=' + encodeURIComponent(pageToken);
  }
  var data = JSON.parse(driveRequest_(url, 'get').getContentText());
  return {files: data.files || [], nextPageToken: data.nextPageToken || null};
}

function validName_(value) {
  if (typeof value !== 'string' || !value.trim() || value.length > 240 || /[\x00-\x1f\x7f]/.test(value)) throw new Error('Invalid name');
  return value.trim();
}

function beginUpload_(request) {
  var root = rootId_();
  var name = validName_(request.name);
  if (!Number.isSafeInteger(request.size) || request.size <= 0) throw new Error('Invalid size');
  var mimeType = request.mimeType || 'application/octet-stream';
  if (typeof mimeType !== 'string' || !/^[\w.+-]+\/[\w.+-]+$/.test(mimeType)) throw new Error('Invalid type');
  // The server configuration may lower the per-file cap without trusting client claims.
  var maximum = Number(properties_().getProperty('MAX_FILE_BYTES') || 2147483648);
  if (!Number.isSafeInteger(maximum) || maximum <= 0 || request.size > maximum) throw new Error('File too large');
  var eventName = request.eventName === undefined ? '' : request.eventName;
  if (typeof eventName !== 'string' || eventName.length > 100) throw new Error('Invalid event');
  var response = driveRequest_('https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields=id', 'post', {
    name: name, mimeType: mimeType, parents: [root],
    appProperties: {app: APP_MARKER, kind: 'media', uploadedAt: new Date().toISOString(), eventName: eventName, preserve: '0'},
  }, {'X-Upload-Content-Type': mimeType, 'X-Upload-Content-Length': String(request.size)});
  var headers = response.getAllHeaders();
  var header = Object.keys(headers).find(function (key) { return key.toLowerCase() === 'location'; });
  var session = header && headers[header];
  if (typeof session !== 'string' || !/^https:\/\/www\.googleapis\.com\/upload\/drive\/v3\/files\?/.test(session)) throw new Error('Missing session');
  return {sessionUrl: session};
}

function rename_(id, name) {
  ownedFile_(id);
  return JSON.parse(driveRequest_(DRIVE_ROOT + '/' + identifier_(id) + '?fields=id,name', 'patch', {name: validName_(name)}).getContentText());
}

function trash_(id) {
  ownedFile_(id);
  return JSON.parse(driveRequest_(DRIVE_ROOT + '/' + identifier_(id) + '?fields=id,trashed', 'patch', {trashed: true}).getContentText());
}

function preserve_(id, preserve) {
  ownedFile_(id);
  if (typeof preserve !== 'boolean') throw new Error('Invalid preservation');
  return JSON.parse(driveRequest_(DRIVE_ROOT + '/' + identifier_(id) + '?fields=id,appProperties', 'patch', {
    appProperties: {preserve: preserve ? '1' : '0'},
  }).getContentText());
}

/** Preview only: intentionally no scheduled or bulk deletion until the UI is reviewed. */
function retentionPreview_(days, pageToken) {
  if (days !== 7 && days !== 14) throw new Error('Invalid retention');
  var page = list_(pageToken);
  var cutoff = Date.now() - days * 86400000;
  return {files: page.files.filter(function (file) {
    var properties = file.appProperties || {};
    var uploaded = Date.parse(properties.uploadedAt);
    return properties.app === APP_MARKER && properties.kind === 'media' && properties.preserve === '0' &&
      Array.isArray(file.parents) && file.parents.indexOf(rootId_()) !== -1 && !file.trashed &&
      Number.isFinite(uploaded) && uploaded <= cutoff;
  }), nextPageToken: page.nextPageToken};
}
