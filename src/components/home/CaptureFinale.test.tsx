/** Guards finale ownership, Strict Mode microtasks and exact persisted-dossier cleanup without a browser; depends on mocked motion and opening services. */
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getPreviewResult, previewDossiers } from '../../preview/data';
const lifecycle = vi.hoisted(() => ({
  effect: undefined as (() => (() => void) | undefined) | undefined,
  host: {} as HTMLElement,
  complete: undefined as (() => void) | undefined,
  open: vi.fn(),
  clear: vi.fn(),
  cancel: vi.fn(),
}));
vi.mock('react', async (original) => ({
  ...(await original<typeof import('react')>()),
  useRef: (value: unknown) => ({ current: value === null ? lifecycle.host : value }),
  useLayoutEffect: (effect: () => (() => void) | undefined) => {
    lifecycle.effect = effect;
  },
}));
vi.mock('./DossierFolder', () => ({ DossierFolder: () => <div /> }));
vi.mock('../../hooks/useDossierOpening', () => ({ useDossierOpening: () => null }));
vi.mock('../../hooks/useTunnelCapture', () => ({
  useTunnelCapture: () => ({ store: { clear: lifecycle.clear }, session: null }),
}));
vi.mock('../../lib/dossierNavigation', () => ({ openDossierFromFolder: lifecycle.open }));
vi.mock('../../lib/journeyMotion', () => ({
  runJourneyMotion: ({ onComplete }: { onComplete: () => void }) => {
    lifecycle.complete = onComplete;
    return lifecycle.cancel;
  },
}));
import { CaptureFinale } from './CaptureFinale';
const response = getPreviewResult(previewDossiers[0].dossier_id);

beforeEach(() => {
  vi.clearAllMocks();
  const bounds = { left: 50, top: 200, width: 400, height: 300 };
  const folder = { getBoundingClientRect: () => bounds };
  lifecycle.host = {
    querySelector: () => folder,
    parentElement: { querySelector: () => ({}) },
  } as unknown as HTMLElement;
  vi.stubGlobal('document', {
    querySelector: () => ({ getBoundingClientRect: () => ({ bottom: 44 }) }),
  });
  vi.stubGlobal('window', { location: { pathname: '/' } });
  lifecycle.open.mockResolvedValue(undefined);
  renderToStaticMarkup(<CaptureFinale response={response} />);
});
afterEach(() => vi.unstubAllGlobals());

describe('capture finale lifecycle', () => {
  it('starts opening exactly once after the surviving Strict Mode setup', async () => {
    const firstCleanup = lifecycle.effect?.();
    lifecycle.complete?.();
    firstCleanup?.();
    const secondCleanup = lifecycle.effect?.();
    lifecycle.complete?.();
    await Promise.resolve();
    expect(lifecycle.open).toHaveBeenCalledOnce();
    const signal = lifecycle.open.mock.calls[0][0].signal as AbortSignal;
    expect(signal.aborted).toBe(false);
    secondCleanup?.();
    expect(signal.aborted).toBe(true);
  });
  it('does not start late opening after navigation disposes the finale', async () => {
    const cleanup = lifecycle.effect?.();
    lifecycle.complete?.();
    cleanup?.();
    await Promise.resolve();
    expect(lifecycle.open).not.toHaveBeenCalled();
    expect(lifecycle.clear).not.toHaveBeenCalled();
  });
  it.each([true, false])(
    'clears recovery only after opening its own saved dossier (matching=%s)',
    async (matching) => {
      const cleanup = lifecycle.effect?.();
      lifecycle.open.mockImplementation(async () => {
        window.location.pathname = matching
          ? `/dossiers/${encodeURIComponent(response.dossier_id)}`
          : '/dossiers/OTHER';
      });
      lifecycle.complete?.();
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
      expect(lifecycle.clear).toHaveBeenCalledTimes(matching ? 1 : 0);
      cleanup?.();
    },
  );
});
