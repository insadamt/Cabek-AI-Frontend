/** Browser history store shared by routes and filters; replacements keep successful creation out of Back history. */
import { useSyncExternalStore } from 'react';

function subscribe(listener: () => void) {
  window.addEventListener('popstate', listener);
  return () => window.removeEventListener('popstate', listener);
}

function currentLocation() {
  return window.location.pathname + window.location.search;
}

const scrollPositions = new Map<string, number>();

export function navigate(path: string, state: Record<string, unknown> = {}, replace = false) {
  const previousPathname = window.location.pathname;
  scrollPositions.set(currentLocation(), window.scrollY);
  if (replace) window.history.replaceState(state, '', path);
  else window.history.pushState(state, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
  // Filtering changes the URL in place; only a new screen should reset the page scroll.

  if (previousPathname !== window.location.pathname)
    window.scrollTo({ top: 0, behavior: 'instant' });
}

export function restoreScrollPosition() {
  const position = scrollPositions.get(currentLocation());
  if (position != null)
    requestAnimationFrame(() => window.scrollTo({ top: position, behavior: 'instant' }));
}

export function useNavigation() {
  const location = useSyncExternalStore(subscribe, currentLocation);
  const url = new URL(location, window.location.origin);
  return { pathname: url.pathname, searchParams: url.searchParams, location, navigate };
}
