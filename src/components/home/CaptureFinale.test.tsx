/** Guards finale ownership, Strict Mode microtasks and exact persisted-dossier cleanup without a browser; depends on mocked motion and opening services. */
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getPreviewResult, previewDossiers } from '../../preview/data';
const lifecycle = vi.hoisted(() => ({
  effects: [] as Array<() => (() => void) | undefined>,
  refs: [] as Array<{ current: unknown }>,
  refIndex: 0,
  effect: undefined as (() => (() => void) | undefined) | undefined,
  host: {} as HTMLElement,
  complete: undefined as (() => void) | undefined,
  open: vi.fn(),
  clear: vi.fn(),
  cancel: vi.fn(),
  timeline: { to: vi.fn(), fromTo: vi.fn() },
  flight: {},
  removeFlight: vi.fn(),
  releaseFolder: vi.fn(),
  folderProps: vi.fn(),
  motionOptions: undefined as
    { preserveLaunch?: boolean; deferRestore?: boolean; restore?: () => void } | undefined,
}));
vi.mock('react', async (original) => ({
  ...(await original<typeof import('react')>()),
  useRef: (value: unknown) => {
    const index = lifecycle.refIndex++;
    return (lifecycle.refs[index] ??= { current: value === null ? lifecycle.host : value });
  },
  useLayoutEffect: (effect: () => (() => void) | undefined) => {
    lifecycle.effects.push(effect);
    lifecycle.effect = lifecycle.effects[0];
  },
}));
vi.mock('./DossierFolder', () => ({
  DossierFolder: (props: unknown) => {
    lifecycle.folderProps(props);
    return <div />;
  },
}));
vi.mock('../../lib/folderFlight', () => ({
  createIslandFolderFlight: (...args: unknown[]) => {
    lifecycle.releaseFolder(...args);
    return { flight: lifecycle.flight, remove: lifecycle.removeFlight };
  },
}));
vi.mock('../../hooks/useDossierOpening', () => ({ useDossierOpening: () => null }));
vi.mock('../../hooks/useTunnelCapture', () => ({
  useTunnelCapture: () => ({ store: { clear: lifecycle.clear }, session: null }),
}));
vi.mock('../../lib/dossierNavigation', () => ({ openDossierFromFolder: lifecycle.open }));
vi.mock('../../lib/journeyMotion', () => ({
  runJourneyMotion: ({
    build,
    onComplete,
    ...options
  }: {
    preserveLaunch?: boolean;
    deferRestore?: boolean;
    restore?: () => void;
    build: (timeline: any) => void;
    onComplete: () => void;
  }) => {
    lifecycle.motionOptions = options;
    build(lifecycle.timeline);
    lifecycle.complete = onComplete;
    return lifecycle.cancel;
  },
}));
import type { DossierResponse } from '../../types';
import { CaptureFinale } from './CaptureFinale';
const response: DossierResponse = {
  ...getPreviewResult(previewDossiers[1].dossier_id),
  type: 'forfait_expertise' as const,
};

beforeEach(() => {
  vi.clearAllMocks();
  lifecycle.complete = undefined;
  lifecycle.effects = [];
  lifecycle.refs = [];
  lifecycle.refIndex = 0;
  const bounds = { left: 50, top: 200, width: 400, height: 300 };
  const folder = { getBoundingClientRect: () => bounds };
  lifecycle.host = {
    querySelector: () => folder,
    parentElement: { querySelector: () => ({}) },
  } as unknown as HTMLElement;
  vi.stubGlobal('document', {
    querySelector: () => ({ getBoundingClientRect: () => ({ left: 150, width: 200, bottom: 44 }) }),
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

function rerender(next: typeof response, ready = true) {
  lifecycle.refIndex = 0;
  lifecycle.effects = [];
  return renderToStaticMarkup(<CaptureFinale response={next} ready={ready} />);
}

it.each(['queued', 'processing', 'failed', 'completed'] as const)(
  'emits an empty folder but never opens %s without a saved AI result',
  async (status) => {
    const pending = { ...response, type: 'chiffrage_rapide' as const, status, result: null };
    const markup = rerender(pending);
    const cleanup = lifecycle.effect?.();
    lifecycle.complete?.();
    await Promise.resolve();
    await Promise.resolve();
    expect(markup).toContain('data-waiting="true"');
    expect(lifecycle.open).not.toHaveBeenCalled();
    expect(lifecycle.clear).not.toHaveBeenCalled();
    cleanup?.();
  },
);

it('opens the existing emitted folder when AI completes, without emitting again', async () => {
  rerender({ ...response, type: 'chiffrage_rapide', status: 'processing', result: null });
  const cleanup = lifecycle.effect?.();
  lifecycle.complete?.();
  await Promise.resolve();
  expect(lifecycle.open).not.toHaveBeenCalled();
  rerender({ ...response, type: 'chiffrage_rapide', status: 'completed', result: {} as never });
  lifecycle.effects[1]();
  await Promise.resolve();
  expect(lifecycle.open).toHaveBeenCalledOnce();
  lifecycle.effects[1]();
  await Promise.resolve();
  expect(lifecycle.open).toHaveBeenCalledOnce();
  cleanup?.();
});

it('keeps a completed folder closed until synchronization and modal ownership permit opening', async () => {
  rerender(response, false);
  const cleanup = lifecycle.effect?.();
  lifecycle.complete?.();
  await Promise.resolve();
  expect(lifecycle.open).not.toHaveBeenCalled();
  rerender(response, true);
  lifecycle.effects[1]();
  await Promise.resolve();
  expect(lifecycle.open).toHaveBeenCalledOnce();
  cleanup?.();
});

it('keeps the native folder hidden while a masked viewport flight leaves the Island', () => {
  const cleanup = lifecycle.effect?.();
  expect(lifecycle.timeline.to).toHaveBeenCalledWith(
    expect.anything(),
    expect.objectContaining({ opacity: 0, duration: 0.65 }),
    0,
  );
  expect(lifecycle.timeline.fromTo).toHaveBeenCalledWith(
    lifecycle.flight,
    expect.objectContaining({ x: 0, y: -338, scale: 0.2 }),
    expect.objectContaining({ x: 0, y: 0, scale: 1 }),
    0.5,
  );
  cleanup?.();
});

it('disables hover and selection on the empty finale folder', () => {
  expect(lifecycle.folderProps).toHaveBeenLastCalledWith(
    expect.objectContaining({ interactive: false }),
  );
});

it('keeps the exit pose through the React handoff and removes the viewport flight on disposal', () => {
  const cleanup = lifecycle.effect?.();
  expect(lifecycle.releaseFolder).toHaveBeenCalledWith(expect.anything(), expect.anything(), 44);
  expect(lifecycle.motionOptions).toMatchObject({ preserveLaunch: true, deferRestore: true });
  lifecycle.motionOptions?.restore?.();
  expect(lifecycle.removeFlight).toHaveBeenCalledOnce();
  cleanup?.();
  expect(lifecycle.removeFlight).toHaveBeenCalledTimes(2);
});
