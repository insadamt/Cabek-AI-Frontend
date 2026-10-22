import { useSyncExternalStore } from 'react';

function subscribe(listener: () => void) {
  window.addEventListener('popstate', listener);
  return () => window.removeEventListener('popstate', listener);
}

function currentLocation() {
  return window.location.pathname + window.location.search;
}

const scrollPositions = new Map<string, number>();

export function navigate(path: string) {
  const previousPathname = window.location.pathname;
  scrollPositions.set(currentLocation(), window.scrollY);
  window.history.pushState({}, '', path);
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
