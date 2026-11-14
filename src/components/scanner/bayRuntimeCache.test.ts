/**
 * Guards retained studio ownership across route remounts, pending loads, errors and app teardown.
 * Depends on the real cache service with DOM/runtime adapters; GPU rendering remains manual verification.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createBayRuntimeCache } from './bayRuntimeCache';
import type { createBayRuntime } from './bayRuntime';

type RuntimeOptions = Parameters<typeof createBayRuntime>[1];

class CanvasAdapter {
  className = '';
  tabIndex = 0;
  attributes = new Map<string, string>();
  parent?: HostAdapter;
  setAttribute(name: string, value: string) {
    this.attributes.set(name, value);
  }
  remove() {
    if (this.parent) this.parent.children = this.parent.children.filter((child) => child !== this);
    this.parent = undefined;
  }
}

class HostAdapter {
  children: CanvasAdapter[] = [];
  appendChild(canvas: CanvasAdapter) {
    canvas.remove();
    this.children.push(canvas);
    canvas.parent = this;
    return canvas;
  }
}

function createRuntimeAdapter() {
  return {
    enter: vi.fn(),
    setCaptureLight: vi.fn(),
    setVisualSettings: vi.fn(),
    skipIntro: vi.fn(),
    resetCamera: vi.fn(),
    setWaitingOutside: vi.fn(),
    setCameraInteractive: vi.fn(),
    setPalette: vi.fn(),
    setReducedMotion: vi.fn(),
    setActive: vi.fn(),
    dispose: vi.fn(),
  };
}

const caches: ReturnType<typeof createBayRuntimeCache>[] = [];
function createSession() {
  const runtimes: ReturnType<typeof createRuntimeAdapter>[] = [];
  const options: RuntimeOptions[] = [];
  const createRuntime = vi.fn((_canvas: HTMLCanvasElement, runtimeOptions: RuntimeOptions) => {
    const runtime = createRuntimeAdapter();
    runtimes.push(runtime);
    options.push(runtimeOptions);
    return runtime as unknown as ReturnType<typeof createBayRuntime>;
  });
  const loadRuntime = vi.fn(async () => ({ createBayRuntime: createRuntime }));
  const cache = createBayRuntimeCache(loadRuntime);
  caches.push(cache);
  const palette = { primary: '#b8db80', secondary: '#e5edcf' };

  function attach(initiallyParked = false, waitingOutside = false) {
    const host = new HostAdapter();
    const onStatusChange = vi.fn();
    const onIntroComplete = vi.fn();
    const connection = cache.attach({
      host: host as unknown as HTMLElement,
      initiallyParked,
      waitingOutside,
      palette,
      reducedMotion: false,
      onStatusChange,
      onIntroComplete,
    });
    return { host, connection, onStatusChange, onIntroComplete };
  }

  return { cache, attach, runtimes, options, createRuntime, loadRuntime, palette };
}

beforeEach(() => {
  vi.stubGlobal('document', { createElement: vi.fn(() => new CanvasAdapter()) });
});
afterEach(() => {
  caches.splice(0).forEach((cache) => cache.dispose());
  vi.unstubAllGlobals();
});

describe('persistent studio runtime cache', () => {
  it('starts each scene visit locked and forwards explicit unlock and lock actions', async () => {
    const session = createSession();
    const first = session.attach(true, true);
    await Promise.resolve();
    session.options[0].onReady();
    const runtime = session.runtimes[0];
    expect(runtime.setCameraInteractive).toHaveBeenLastCalledWith(false);
    first.connection.setCameraInteractive(true);
    expect(runtime.setCameraInteractive).toHaveBeenLastCalledWith(true);
    first.connection.setCameraInteractive(false);
    expect(runtime.setCameraInteractive).toHaveBeenLastCalledWith(false);
    first.connection.release();
    session.attach(true, true);
    expect(runtime.setCameraInteractive).toHaveBeenLastCalledWith(false);
  });

  it('prepares and restores the same runtime with the vehicle outside before scan admission', async () => {
    const session = createSession();
    const first = session.attach(true, true);
    await Promise.resolve();
    expect(session.options[0].waitingOutside).toBe(true);
    session.options[0].onReady();
    first.connection.release();
    const returned = session.attach(true, true);
    expect(returned.connection.canvas).toBe(first.connection.canvas);
    expect(session.runtimes[0].setWaitingOutside).toHaveBeenLastCalledWith(true);
    expect(session.runtimes[0].enter).not.toHaveBeenCalled();
    returned.connection.setWaitingOutside(false);
    expect(session.runtimes[0].setWaitingOutside).toHaveBeenLastCalledWith(false);
  });

  it('reattaches the same ready canvas and GPU runtime without another load or preparation', async () => {
    const session = createSession();
    const first = session.attach();
    await Promise.resolve();
    session.options[0].onReady();
    const runtime = session.runtimes[0];
    first.connection.release();
    expect(runtime.setActive).toHaveBeenLastCalledWith(false);
    expect(runtime.dispose).not.toHaveBeenCalled();
    expect(first.host.children).toHaveLength(0);

    const returned = session.attach(true);
    expect(returned.connection.canvas).toBe(first.connection.canvas);
    expect(returned.host.children).toEqual([first.connection.canvas]);
    expect(returned.onStatusChange).toHaveBeenCalledWith('ready');
    expect(returned.onIntroComplete).toHaveBeenCalledOnce();
    expect(runtime.setActive).toHaveBeenLastCalledWith(true);
    expect(runtime.setPalette).not.toHaveBeenCalled();
    expect(session.loadRuntime).toHaveBeenCalledOnce();
    expect(session.createRuntime).toHaveBeenCalledOnce();
  });

  it('keeps preparation alive while away and creates a parked inactive runtime if the module is still loading', async () => {
    const session = createSession();
    const first = session.attach();
    first.connection.release();
    await Promise.resolve();
    expect(session.options[0]).toMatchObject({ initiallyParked: true, active: false });
    session.options[0].onReady();
    expect(first.onStatusChange).not.toHaveBeenCalledWith('ready');
    const returned = session.attach(true);
    expect(returned.onStatusChange).toHaveBeenCalledWith('ready');
    expect(session.createRuntime).toHaveBeenCalledOnce();
  });

  it('starts playback only when a connected page requests it and the retained runtime is ready', async () => {
    const session = createSession();
    const first = session.attach();
    first.connection.enter();
    await Promise.resolve();
    expect(session.runtimes[0].enter).not.toHaveBeenCalled();
    session.options[0].onReady();
    expect(session.runtimes[0].enter).toHaveBeenCalledOnce();
    first.connection.release();
    session.options[0].onReady();
    expect(session.runtimes[0].enter).toHaveBeenCalledOnce();
  });

  it('ignores stale page commands after the canvas belongs to a returned view', async () => {
    const session = createSession();
    const first = session.attach();
    await Promise.resolve();
    first.connection.release();
    const returned = session.attach(true);
    first.connection.release();
    first.connection.resetCamera();
    first.connection.setPalette({ primary: '#fff', secondary: '#fff' });
    expect(returned.host.children).toEqual([returned.connection.canvas]);
    expect(session.runtimes[0].setActive).toHaveBeenCalledTimes(2);
    expect(session.runtimes[0].resetCamera).not.toHaveBeenCalled();
    expect(session.runtimes[0].setPalette).not.toHaveBeenCalled();
  });

  it('preserves failure status for return navigation and replaces resources only on explicit retry', async () => {
    const session = createSession();
    const first = session.attach();
    await Promise.resolve();
    first.connection.release();
    session.options[0].onError();
    const returned = session.attach(true);
    expect(returned.onStatusChange).toHaveBeenCalledWith('failed');
    session.cache.dispose();
    const retried = session.attach(true);
    await Promise.resolve();
    expect(retried.connection.canvas).not.toBe(returned.connection.canvas);
    expect(session.runtimes[0].dispose).toHaveBeenCalledOnce();
    expect(session.createRuntime).toHaveBeenCalledTimes(2);
    expect(session.options[1].initiallyParked).toBe(true);
  });

  it('releases cached resources once on app teardown and supports development remounts', async () => {
    const session = createSession();
    const first = session.attach();
    await Promise.resolve();
    session.cache.dispose();
    session.cache.dispose();
    expect(session.runtimes[0].dispose).toHaveBeenCalledOnce();
    expect(first.host.children).toHaveLength(0);
    session.attach();
    await Promise.resolve();
    expect(session.createRuntime).toHaveBeenCalledTimes(2);
  });

  it('ignores a late runtime import after its cache entry was discarded', async () => {
    const session = createSession();
    session.attach();
    session.cache.dispose();
    await Promise.resolve();
    expect(session.createRuntime).not.toHaveBeenCalled();
  });

  it('creates one accessible canvas and rejects simultaneous owners', () => {
    const session = createSession();
    const view = session.attach();
    const canvas = view.connection.canvas as unknown as CanvasAdapter;
    expect(canvas.className).toBe('scanning-bay-canvas');
    expect(canvas.attributes.get('aria-label')).toContain('Véhicule');
    expect(canvas.attributes.get('aria-disabled')).toBe('true');
    expect(canvas.tabIndex).toBe(-1);
    expect(() => session.attach()).toThrow('already has an active view');
  });
});
