/**
 * Retains one decoded vehicle, GPU scene and canvas between route visits instead of rebuilding them on Back.
 * Depends on a lazy bayRuntime and DOM hosts; leases pause detached scenes, retry replaces failed resources, app teardown disposes them.
 */
import type { createBayRuntime } from './bayRuntime';
import type { BayPalette } from './bayChoreography';

type BayRuntime = ReturnType<typeof createBayRuntime>;
type RuntimeModule = Pick<typeof import('./bayRuntime'), 'createBayRuntime'>;
type SceneStatus = 'loading' | 'ready' | 'failed';

interface CacheViewOptions {
  host: HTMLElement;
  initiallyParked: boolean;
  waitingOutside?: boolean;
  palette: BayPalette;
  reducedMotion: boolean;
  onStatusChange: (status: SceneStatus) => void;
  onIntroComplete: () => void;
}

interface CacheView extends CacheViewOptions {
  playbackRequested: boolean;
  cameraInteractive: boolean;
}

interface CacheEntry {
  canvas: HTMLCanvasElement;
  runtime?: BayRuntime;
  view?: CacheView;
  status: SceneStatus;
  introComplete: boolean;
  initiallyParked: boolean;
  palette: BayPalette;
  reducedMotion: boolean;
  disposed: boolean;
  capturing: boolean;
}

export function createBayRuntimeCache(
  loadRuntime: () => Promise<RuntimeModule> = () => import('./bayRuntime'),
) {
  let entry: CacheEntry | undefined;

  function createEntry(options: CacheViewOptions): CacheEntry {
    const canvas = document.createElement('canvas');
    canvas.className = 'scanning-bay-canvas';
    canvas.setAttribute('aria-label', 'Véhicule dans le tunnel de numérisation 3D');
    canvas.setAttribute('aria-describedby', 'bay-camera-help');
    canvas.setAttribute('aria-disabled', 'true');
    canvas.tabIndex = -1;
    return {
      canvas,
      status: 'loading',
      introComplete: options.initiallyParked,
      initiallyParked: options.initiallyParked,
      palette: options.palette,
      reducedMotion: options.reducedMotion,
      disposed: false,
      capturing: false,
    };
  }

  function publishStatus(cached: CacheEntry, status: SceneStatus) {
    if (cached.disposed) return;
    cached.status = status;
    cached.view?.onStatusChange(status);
    if (status === 'ready')
      cached.runtime?.setCameraInteractive?.(cached.view?.cameraInteractive ?? false);
    if (status === 'ready' && cached.view?.playbackRequested) cached.runtime?.enter();
  }

  function startLoading(cached: CacheEntry) {
    void loadRuntime()
      .then(({ createBayRuntime }) => {
        if (cached.disposed) return;
        cached.runtime = createBayRuntime(cached.canvas, {
          initiallyParked: cached.initiallyParked,
          waitingOutside: cached.view?.waitingOutside,
          reducedMotion: cached.reducedMotion,
          palette: cached.palette,
          active: !!cached.view,
          autoStart: false,
          onReady: () => publishStatus(cached, 'ready'),
          onError: () => publishStatus(cached, 'failed'),
          onIntroComplete: () => {
            if (cached.disposed) return;
            cached.introComplete = true;
            cached.view?.onIntroComplete();
          },
        });
        cached.runtime.setCapturing?.(cached.capturing);
        cached.runtime.setCameraInteractive?.(cached.view?.cameraInteractive ?? false);
      })
      .catch(() => publishStatus(cached, 'failed'));
  }

  function setPalette(cached: CacheEntry, palette: BayPalette) {
    if (cached.palette === palette) return;
    cached.palette = palette;
    cached.runtime?.setPalette(palette);
  }

  function setReducedMotion(cached: CacheEntry, reducedMotion: boolean) {
    if (cached.reducedMotion === reducedMotion) return;
    cached.reducedMotion = reducedMotion;
    cached.runtime?.setReducedMotion(reducedMotion);
  }

  return {
    getSnapshot() {
      return { status: entry?.status ?? 'loading', introComplete: entry?.introComplete ?? false };
    },
    attach(options: CacheViewOptions) {
      const created = !entry;
      const cached = (entry ??= createEntry(options));
      if (cached.view) throw new Error('The cached studio already has an active view.');
      const view: CacheView = { ...options, playbackRequested: false, cameraInteractive: false };
      cached.view = view;
      options.host.appendChild(cached.canvas);
      setPalette(cached, options.palette);
      setReducedMotion(cached, options.reducedMotion);
      cached.runtime?.setWaitingOutside?.(options.waitingOutside ?? false);
      cached.runtime?.setCameraInteractive?.(false);
      cached.runtime?.setActive(true);
      options.onStatusChange(cached.status);
      if (cached.introComplete) options.onIntroComplete();
      if (created) startLoading(cached);

      function isConnected() {
        return !cached.disposed && cached.view === view;
      }

      return {
        canvas: cached.canvas,
        enter() {
          if (!isConnected()) return;
          view.playbackRequested = true;
          if (cached.status === 'ready') cached.runtime?.enter();
        },
        replayEntrance() {
          if (!isConnected() || cached.status !== 'ready') return Promise.resolve();
          return cached.runtime?.replayEntrance() ?? Promise.resolve();
        },
        setWaitingOutside(waiting: boolean) {
          if (!isConnected()) return;
          view.waitingOutside = waiting;
          cached.runtime?.setWaitingOutside?.(waiting);
        },
        setCameraInteractive(interactive: boolean) {
          if (!isConnected()) return;
          view.cameraInteractive = interactive;
          cached.runtime?.setCameraInteractive?.(interactive);
        },
        skipIntro() {
          if (isConnected()) cached.runtime?.skipIntro();
        },
        resetCamera() {
          if (isConnected()) cached.runtime?.resetCamera();
        },
        setPalette(palette: BayPalette) {
          if (isConnected()) setPalette(cached, palette);
        },
        setCapturing(capturing: boolean) {
          if (!isConnected()) return;
          cached.capturing = capturing;
          cached.runtime?.setCapturing?.(capturing);
        },
        setReducedMotion(reducedMotion: boolean) {
          if (isConnected()) setReducedMotion(cached, reducedMotion);
        },
        release() {
          if (!isConnected()) return;

          //
          // Remove the React subscriber before parking so old page state is never updated during unmount.
          //
          cached.view = undefined;
          cached.initiallyParked = true;
          cached.introComplete = true;
          cached.runtime?.setActive(false);
          cached.capturing = false;
          cached.runtime?.setCapturing?.(false);
          cached.canvas.remove();
        },
      };
    },
    dispose() {
      const cached = entry;
      entry = undefined;
      if (!cached) return;
      cached.disposed = true;
      cached.view = undefined;
      cached.runtime?.dispose();
      cached.canvas.remove();
    },
  };
}

export type BayRuntimeCache = ReturnType<typeof createBayRuntimeCache>;
export type BayRuntimeConnection = ReturnType<BayRuntimeCache['attach']>;
