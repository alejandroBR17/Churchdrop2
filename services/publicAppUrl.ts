const PUBLIC_APP_URL = 'https://churchdrop2.vercel.app/';

// Deployment links may require Vercel SSO. Share the public address instead,
// without login parameters, fragments or credentials from the current tab.
export function publicAppUrl(location: string): string {
  try {
    const url = new URL(location);
    if (!['http:', 'https:'].includes(url.protocol)) return PUBLIC_APP_URL;
    if (url.hostname.endsWith('.vercel.app')) return PUBLIC_APP_URL;
    return url.origin + url.pathname;
  } catch { return PUBLIC_APP_URL; }
}
