/** Guards real readiness, failures and cancellation before route commit; depends on deferred reads and isolated presentation owners. */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const services = vi.hoisted(() => ({ prepare: vi.fn(), exit: vi.fn(), absorb: vi.fn() }));
vi.mock('./collectionPreparation', () => ({ prepareCollection: services.prepare }));
vi.mock('./pageJourneyMotion', () => ({ exitPage: services.exit }));
vi.mock('./categoryFolderMotion', () => ({ absorbCategoryFolder: services.absorb }));
import { navigatePreparedCollection } from './collectionNavigation';
import { categories, categoryPath } from './workflows';

function fixture(folder?: HTMLElement, beforeNavigate?: () => void) {
  let resolve!: () => void;
  let reject!: (error: Error) => void;
  const loading = new Promise<void>((done, fail) => {
    resolve = done;
    reject = fail;
  });
  services.prepare.mockReturnValue(loading);
  const attributes = new Map<string, string>();
  const scope = {
    inert: false,
    getAttribute: (name: string) => attributes.get(name) ?? null,
    setAttribute: (name: string, value: string) => attributes.set(name, value),
    removeAttribute: (name: string) => attributes.delete(name),
    querySelectorAll: () => [],
  } as unknown as HTMLElement;
  const island = { dataset: {} as Record<string, string>, append: vi.fn() };
  const announcement = { className: '', textContent: '', setAttribute: vi.fn(), remove: vi.fn() };
  vi.stubGlobal('document', { querySelector: () => island, createElement: () => announcement });
  vi.stubGlobal('window', new EventTarget());
  const navigate = vi.fn();
  const pending = vi.fn();
  const error = vi.fn();
  const stop = navigatePreparedCollection({
    category: categories[0],
    scope,
    folder,
    beforeNavigate,
    navigate,
    onPending: pending,
    onError: error,
  });
  const ready = async () => {
    resolve();
    await Promise.resolve();
  };
  return { ready, reject, scope, island, announcement, navigate, pending, error, stop };
}
beforeEach(() => {
  vi.clearAllMocks();
  services.exit.mockReturnValue(vi.fn());
  services.absorb.mockReturnValue(vi.fn());
});
afterEach(() => vi.unstubAllGlobals());

describe('prepared collection navigation', () => {
  it('defers source cleanup until the exit is complete and retains the page if cleanup fails', async () => {
    const beforeNavigate = vi.fn(() => {
      throw new Error('Still saving');
    });
    const view = fixture(undefined, beforeNavigate);
    await view.ready();
    expect(beforeNavigate).not.toHaveBeenCalled();
    services.exit.mock.calls[0][1]();
    expect(beforeNavigate).toHaveBeenCalledOnce();
    expect(view.navigate).not.toHaveBeenCalled();
    expect(view.error).toHaveBeenCalledWith(expect.objectContaining({ message: 'Still saving' }));
    expect(view.scope.inert).toBe(false);
  });
  it('restores the original interaction state after cancelling an exit that locked its source', async () => {
    services.exit.mockImplementation((scope: HTMLElement) => () => {
      scope.inert = true;
    });
    const view = fixture();
    await view.ready();
    view.stop();
    expect(view.scope.inert).toBe(false);
    expect(view.navigate).not.toHaveBeenCalled();
  });
  it('keeps the source visible until data is ready and commits only after its exit finishes', async () => {
    const view = fixture();
    expect(view.scope.inert).toBe(false);
    expect(view.island.dataset.collectionLoading).toBe('true');
    expect(services.exit).not.toHaveBeenCalled();
    expect(view.navigate).not.toHaveBeenCalled();
    await view.ready();
    expect(view.scope.inert).toBe(true);
    expect(view.island.dataset.collectionLoading).toBeUndefined();
    expect(view.navigate).not.toHaveBeenCalled();
    services.exit.mock.calls[0][1]();
    expect(view.navigate).toHaveBeenCalledWith(categoryPath(categories[0].type), {
      ejectFolders: true,
    });
    expect(view.scope.inert).toBe(false);
    expect(view.pending).toHaveBeenLastCalledWith(false);
  });
  it.each(['popstate', 'pagehide', 'Escape'])('ignores late readiness after %s', async (event) => {
    const view = fixture();
    const signal = services.prepare.mock.calls[0][1] as AbortSignal;
    window.dispatchEvent(
      Object.assign(new Event(event === 'Escape' ? 'keydown' : event), { key: event }),
    );
    await view.ready();
    expect(signal.aborted).toBe(true);
    expect(services.exit).not.toHaveBeenCalled();
    expect(view.navigate).not.toHaveBeenCalled();
    expect(view.scope.getAttribute('aria-busy')).toBeNull();
  });
  it('retains the source and reports a failed read without an exit or route change', async () => {
    const view = fixture();
    view.reject(new Error('Offline'));
    await Promise.resolve();
    await Promise.resolve();
    expect(view.error).toHaveBeenCalledWith(expect.objectContaining({ message: 'Offline' }));
    expect(view.scope.inert).toBe(false);
    expect(view.navigate).not.toHaveBeenCalled();
    expect(services.exit).not.toHaveBeenCalled();
    expect(view.island.dataset.collectionLoading).toBeUndefined();
  });
  it('absorbs a category folder only after preparation and restores interaction on cancellation', async () => {
    const folder = {} as HTMLElement;
    const view = fixture(folder);
    await view.ready();
    expect(services.absorb).toHaveBeenCalledWith(
      folder,
      [],
      expect.anything(),
      expect.any(Function),
      expect.any(Function),
      view.scope,
    );
    view.stop();
    expect(services.absorb.mock.results[0].value).toHaveBeenCalledOnce();
    expect(view.scope.inert).toBe(false);
    expect(view.navigate).not.toHaveBeenCalled();
  });
});
