/**
 * Checks direct settings links, browser-history changes and keyboard focus without a browser.
 * Depends on an isolated hook harness and EventTarget; no settings or hardware API is invoked.
 */
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

const hooks = vi.hoisted(() => ({
  state: undefined as string | undefined,
  focusRequest: undefined as { current: boolean } | undefined,
  effects: [] as (() => void | (() => void))[],
  setState: vi.fn(),
}));

vi.mock('react', () => ({
  useState: (initial: () => string) => {
    hooks.state ??= initial();
    return [
      hooks.state,
      (value: string) => {
        hooks.state = value;
        hooks.setState(value);
      },
    ];
  },
  useRef: (initial: boolean) => (hooks.focusRequest ??= { current: initial }),
  useEffect: (effect: () => void | (() => void)) => hooks.effects.push(effect),
}));

import { useSettingsSection } from './useSettingsSection';

const sectionIds = ['operation-settings-title', 'lighting-settings-title', 'settings-guide-title'];
const heading = { tabIndex: 0, focus: vi.fn() };
const page = {
  current: {
    contains: vi.fn(() => true),
    scrollTo: vi.fn(),
  } as unknown as HTMLDivElement,
};
let cleanups: (() => void)[] = [];

function renderSection() {
  cleanups.forEach((cleanup) => cleanup());
  cleanups = [];
  hooks.effects = [];
  const active = useSettingsSection(sectionIds, page);
  for (const effect of hooks.effects) {
    const cleanup = effect();
    if (cleanup) cleanups.push(cleanup);
  }
  return active;
}

beforeEach(() => {
  vi.clearAllMocks();
  hooks.state = undefined;
  hooks.focusRequest = undefined;
  heading.tabIndex = 0;
  page.current!.contains = vi.fn(() => true);
  vi.stubGlobal('window', Object.assign(new EventTarget(), { location: { hash: '' } }));
  vi.stubGlobal('document', { getElementById: vi.fn(() => heading) });
});

afterEach(() => {
  cleanups.forEach((cleanup) => cleanup());
  cleanups = [];
  vi.unstubAllGlobals();
});

it('opens the default section without stealing focus from the page title', () => {
  expect(renderSection()).toBe('operation-settings-title');
  expect(heading.focus).not.toHaveBeenCalled();
});

it('opens a direct guide link and focuses the revealed heading', () => {
  window.location.hash = '#settings-guide-title';
  expect(renderSection()).toBe('settings-guide-title');
  expect(heading.tabIndex).toBe(-1);
  expect(heading.focus).toHaveBeenCalledWith({ preventScroll: true });
  expect(page.current!.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'instant' });
});

it('follows section links and browser Back to the default section', () => {
  renderSection();
  for (const [hash, expected] of [
    ['#lighting-settings-title', 'lighting-settings-title'],
    ['#settings-guide-title', 'settings-guide-title'],
    ['', 'operation-settings-title'],
  ]) {
    window.location.hash = hash;
    window.dispatchEvent(new Event('hashchange'));
    expect(renderSection()).toBe(expected);
  }
  expect(heading.focus).toHaveBeenCalledTimes(3);
});

it('falls back for unknown fragments and never focuses an element outside settings', () => {
  window.location.hash = '#unrelated-heading';
  expect(renderSection()).toBe('operation-settings-title');
  expect(heading.focus).not.toHaveBeenCalled();
  page.current!.contains = vi.fn(() => false);
  window.location.hash = '#lighting-settings-title';
  window.dispatchEvent(new Event('hashchange'));
  expect(renderSection()).toBe('lighting-settings-title');
  expect(heading.focus).not.toHaveBeenCalled();
});

it('removes the history listener when settings unmounts', () => {
  renderSection();
  cleanups.forEach((cleanup) => cleanup());
  cleanups = [];
  window.location.hash = '#lighting-settings-title';
  window.dispatchEvent(new Event('hashchange'));
  expect(hooks.setState).not.toHaveBeenCalled();
});
