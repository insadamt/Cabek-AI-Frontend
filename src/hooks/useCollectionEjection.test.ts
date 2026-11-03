/** Reproduces React Strict Mode setup/cleanup/setup so category handoff cannot disappear before the three-folder ejection. */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const hooks = vi.hoisted(() => ({
  effect: undefined as (() => void | (() => void)) | undefined,
  scope: {} as HTMLElement,
  complete: undefined as (() => void) | undefined,
  cancel: vi.fn(),
  eject: vi.fn(),
}));
vi.mock('react', () => ({
  useRef: () => ({ current: hooks.scope }),
  useLayoutEffect: (effect: () => void | (() => void)) => {
    hooks.effect = effect;
  },
}));
vi.mock('../lib/collectionEjectionMotion', () => ({ ejectCollectionFolders: hooks.eject }));
import { useCollectionEjection } from './useCollectionEjection';
beforeEach(() => {
  vi.clearAllMocks();
  hooks.effect = undefined;
  hooks.complete = undefined;
  const history = {
    state: { ejectFolders: true, retained: 'selection' },
    replaceState: vi.fn((state) => {
      history.state = state;
    }),
  };
  vi.stubGlobal('window', {
    history,
    location: { pathname: '/categories/forfait-expertise', search: '' },
  });
  vi.stubGlobal('document', { querySelector: () => ({}) });
  hooks.eject.mockImplementation((_scope, _island, complete) => {
    hooks.complete = complete;
    return hooks.cancel;
  });
});
afterEach(() => vi.unstubAllGlobals());
describe('collection handoff ownership', () => {
  it('survives Strict Mode cleanup, consumes the cue after completion, and never replays after completion', () => {
    useCollectionEjection(12);
    const firstCleanup = hooks.effect?.();
    expect(window.history.state.ejectFolders).toBe(true);
    expect(window.history.replaceState).not.toHaveBeenCalled();
    if (typeof firstCleanup === 'function') firstCleanup();
    expect(hooks.cancel).toHaveBeenCalledOnce();
    expect(window.history.state.ejectFolders).toBe(true);
    hooks.effect?.();
    expect(hooks.eject).toHaveBeenCalledTimes(2);
    hooks.complete?.();
    expect(window.history.replaceState).toHaveBeenCalledWith(
      { ejectFolders: false, retained: 'selection' },
      '',
    );
    hooks.effect?.();
    expect(hooks.eject).toHaveBeenCalledTimes(2);
  });
  it('waits for real fetched folders before beginning the ejection', () => {
    useCollectionEjection(0);
    hooks.effect?.();
    expect(hooks.eject).not.toHaveBeenCalled();
    expect(window.history.state.ejectFolders).toBe(true);
    useCollectionEjection(12);
    hooks.effect?.();
    expect(hooks.eject).toHaveBeenCalledOnce();
  });
  it('does not consume a handoff when the island is missing', () => {
    vi.stubGlobal('document', { querySelector: () => null });
    useCollectionEjection(3);
    hooks.effect?.();
    expect(hooks.eject).not.toHaveBeenCalled();
    expect(window.history.state.ejectFolders).toBe(true);
  });
  it('never overwrites the history state of a different route', () => {
    useCollectionEjection(3);
    hooks.effect?.();
    window.location.pathname = '/dossiers/ANOTHER';
    hooks.complete?.();
    expect(window.history.replaceState).not.toHaveBeenCalled();
  });
});
