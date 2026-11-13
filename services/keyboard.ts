export function isTextEntry(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && (target.isContentEditable || Boolean(target.closest('input, textarea, select, [role="textbox"]')));
}

export function isInteractiveTarget(target: EventTarget | null): boolean {
  return isTextEntry(target) || (target instanceof Element && Boolean(target.closest('button, a, summary, audio, video, [role="button"], [role="slider"]')));
}
