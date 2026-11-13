import {appApi} from './appApi';

// The inline bootstrap removes the fragment before external resources load.
type BootstrapWindow = Window & {__univerTakeAccessLink?: () => string | null};
const bootstrap = window as BootstrapWindow;
let pending = bootstrap.__univerTakeAccessLink?.() ?? null;
delete bootstrap.__univerTakeAccessLink;
let attempt: Promise<{success?:boolean;remembered?:boolean;expiresAt?:number}> | undefined;

export function hasAccessLink() {return pending !== null;}
export function clearAccessLink() {pending = null;attempt = undefined;}
export function usePendingAccessLink() {
  // React StrictMode must not exchange the same URL twice on mount.
  if (!attempt) attempt = appApi<{success?:boolean;remembered?:boolean;expiresAt?:number}>('/api/session',
    {action:'useLink', token:pending, remember:false}).then(result => {clearAccessLink();return result;}, error => {attempt=undefined;throw error;});
  return attempt;
}
