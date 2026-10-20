/** Browser-native downloads keep large video bytes out of JS memory and Vercel. */
export function browserDownloadUrl(value: string): string {
  let url: URL;
  try {url = new URL(value);} catch {throw new Error('O link de download não está disponível.');}
  const accepted = (url.hostname === 'drive.google.com' && url.pathname === '/uc') ||
    (url.hostname === 'drive.usercontent.google.com' && url.pathname === '/download');
  if (!accepted || url.protocol !== 'https:' || url.port || url.username || url.password || url.hash ||
      !/^[\w-]{5,200}$/.test(url.searchParams.get('id') || '') || url.searchParams.get('export') !== 'download') {
    throw new Error('O link não é um download direto do arquivo. Atualize a biblioteca.');
  }
  return url.href;
}

const active = new Set<() => void>();
export function clearNativeDownloads() {for(const cleanup of [...active]) cleanup();}

/** Requests a download; browsers do not expose whether the user saved or cancelled it. */
export function requestNativeDownload(value: string, name = 'Arquivo') {
  const url = browserDownloadUrl(value);
  const frame = document.createElement('iframe');
  frame.hidden = true;
  frame.name = `univer-download-${crypto.randomUUID()}`;
  frame.title = 'Transferência de arquivo';
  frame.referrerPolicy = 'no-referrer';
  frame.sandbox.add('allow-same-origin', 'allow-scripts', 'allow-downloads');
  document.body.appendChild(frame);
  const timer = setTimeout(cleanup, 300000);
  function cleanup() {clearTimeout(timer);frame.remove();active.delete(cleanup);}
  active.add(cleanup);
  const anchor = document.createElement('a');
  anchor.href = url; anchor.target = frame.name; anchor.download = name;
  anchor.referrerPolicy = 'no-referrer';
  try {document.body.appendChild(anchor);anchor.click();} catch(error) {cleanup();throw error;}
  finally {anchor.remove();}
}
