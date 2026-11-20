/** Verifies entrance-before-capture admission and abandoned-session safety without a browser; depends on isolated stage hooks. */
import { Children, isValidElement, type ReactNode } from 'react';
import { beforeEach, expect, it, vi } from 'vitest';
import type { CaptureSession } from '../../captureTypes';

const state = vi.hoisted(() => ({
  session: null as CaptureSession | null,
  start: vi.fn(),
  clear: vi.fn(),
}));
vi.mock('react', async (original) => ({
  ...(await original<typeof import('react')>()),
  useState: (initial: unknown) => [initial, vi.fn()],
  useRef: (initial: unknown) => ({ current: initial }),
  useEffect: vi.fn(),
}));
vi.mock('../../hooks/useTunnelCapture', () => ({
  useTunnelCapture: () => ({
    session: state.session,
    store: { start: state.start, clear: state.clear, getSnapshot: () => state.session },
  }),
}));
vi.mock('../../hooks/useNavigation', () => ({
  navigate: vi.fn(),
  useNavigation: () => ({ navigate: vi.fn() }),
}));
vi.mock('../../hooks/useStageEntrance', () => ({
  useStageEntrance: () => ({ phase: 'ready', restoreSettledView: true }),
}));
import { TunnelStage } from './TunnelStage';
import { CameraScanAction } from './CameraScanAction';
import { CategoryStageVisual } from './CategoryStageVisual';
import { categories, type Category } from '../../lib/workflows';
import { getPreviewResult, previewDossiers } from '../../preview/data';

function find(node: ReactNode, matches: (element: any) => boolean): any {
  for (const child of Children.toArray(node)) {
    if (!isValidElement<{ children?: ReactNode }>(child)) continue;
    if (matches(child)) return child;
    const result = find(child.props.children, matches);
    if (result) return result;
  }
}
function setup(category: Category = categories[1]) {
  let arrive!: () => void;
  const entrance = new Promise<void>((resolve) => {
    arrive = resolve;
  });
  const tree = TunnelStage({ category, onBack: vi.fn() });
  const scene = find(tree, (element) => element.type === CategoryStageVisual);
  const playEntrance = vi.fn(() => entrance);
  scene.props.playbackRef.current = { playEntrance };
  return {
    scene,
    arrive,
    playEntrance,
    scan: find(tree, (element) => element.type === CameraScanAction).props.onScan,
    reset: find(tree, (element) =>
      Children.toArray(element.props.children).includes('Nouveau dossier'),
    )?.props.onClick,
  };
}
beforeEach(() => {
  vi.clearAllMocks();
  state.clear.mockReturnValue(true);
  const response = getPreviewResult(previewDossiers[0].dossier_id);
  state.session = {
    identity: { type: 'chiffrage_rapide', creationKey: 'stable', dossierId: response.dossier_id },
    response: {
      ...response,
      type: 'chiffrage_rapide',
      status: 'not_analyzed',
      vehicle: {
        marque: 'Dacia',
        modele: 'Sandero',
        marque_id: 1,
        model_id: 2,
        matricule: '12345-A-6',
        date_mise_en_circulation: '2020-01-01',
      },
    },
    pending: false,
    synchronized: true,
    error: '',
  };
});

it('waits for the parked car before capture and ignores duplicate clicks during entrance', async () => {
  const playback = setup();
  expect(playback.scene.props.waitingOutside).toBe(true);
  playback.scan();
  playback.scan();
  expect(playback.playEntrance).toHaveBeenCalledOnce();
  expect(state.start).not.toHaveBeenCalled();
  playback.arrive();
  await Promise.resolve();
  expect(state.start).toHaveBeenCalledExactlyOnceWith('chiffrage_rapide', undefined);
});

it('never starts a stale capture after the operator releases the session during entry', async () => {
  const playback = setup();
  playback.scan();
  playback.reset();
  playback.arrive();
  await Promise.resolve();
  expect(state.clear).toHaveBeenCalledOnce();
  expect(state.start).not.toHaveBeenCalled();
});

it('keeps the prepared scene mounted for the analysis exit animation', () => {
  state.session!.capture = { status: 'completed' } as CaptureSession['capture'];
  state.session!.response!.status = 'processing';
  const tree = TunnelStage({ category: categories[1], onBack: vi.fn() });
  const scene = find(tree, (element) => element.type === CategoryStageVisual);
  expect(scene).toBeDefined();
  expect(scene.props.finishing).toBe(true);
  expect(scene.props.waitingOutside).toBe(false);
});

it('keeps the car outside while vehicle metadata is synchronizing before a scan click', () => {
  state.session!.pending = true;
  const tree = TunnelStage({ category: categories[1], onBack: vi.fn() });
  const scene = find(tree, (element) => element.type === CategoryStageVisual);
  expect(scene.props.waitingOutside).toBe(true);
});

it('drives in before retrying a failed capture restored from an earlier visit', async () => {
  state.session!.capture = { status: 'failed' } as CaptureSession['capture'];
  const playback = setup();
  expect(playback.scene.props.waitingOutside).toBe(true);
  playback.scan();
  expect(state.start).not.toHaveBeenCalled();
  playback.arrive();
  await Promise.resolve();
  expect(state.start).toHaveBeenCalledOnce();
});

it('waits for entry when expertise has a completed capture but no photographs', async () => {
  const session = state.session!;
  session.identity = { type: 'forfait_expertise', creationKey: 'imported', dossierId: 'IMPORT-1' };
  session.response = { ...session.response!, type: 'forfait_expertise', photos: [] };
  session.capture = {
    dossier_id: 'IMPORT-1',
    phase: null,
    capture_id: 'previous',
    status: 'completed',
    photos: [],
    expected_count: 8,
    saved_count: 0,
    error_code: null,
    analysis_error: null,
  };
  const playback = setup(categories.find((category) => category.type === 'forfait_expertise')!);
  expect(playback.scene.props.waitingOutside).toBe(true);
  expect(playback.scene.props.lightStatus).toBe('not_started');
  expect(playback.scene.props.finishing).toBe(false);
  playback.scan();
  expect(state.start).not.toHaveBeenCalled();
  playback.arrive();
  await Promise.resolve();
  expect(state.start).toHaveBeenCalledExactlyOnceWith('forfait_expertise', undefined, 'IMPORT-1');
});
