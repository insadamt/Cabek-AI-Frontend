/** Guards drawer-to-dock sequencing without a browser; depends on persistent hook state and the real stage tree. */
import { Children, isValidElement, type ReactNode } from 'react';
import { beforeEach, expect, it, vi } from 'vitest';
import type { CaptureSession } from '../../captureTypes';

const state = vi.hoisted(() => ({
  session: null as CaptureSession | null,
  values: [] as unknown[],
  index: 0,
}));
vi.mock('react', async (original) => ({
  ...(await original<typeof import('react')>()),
  useState: (initial: unknown) => {
    const index = state.index++;
    if (!(index in state.values)) state.values[index] = initial;
    return [
      state.values[index],
      (value: unknown) => {
        state.values[index] = value;
      },
    ];
  },
  useRef: (initial: unknown) => {
    const index = state.index++;
    if (!(index in state.values)) state.values[index] = { current: initial };
    return state.values[index];
  },
  useEffect: vi.fn(),
}));
vi.mock('../../hooks/useTunnelCapture', () => ({
  useTunnelCapture: () => ({ session: state.session, store: {} }),
}));
vi.mock('../../hooks/useStageEntrance', () => ({
  useStageEntrance: () => ({ phase: 'ready', restoreSettledView: true }),
}));
vi.mock('../../hooks/useNavigation', () => ({
  navigate: vi.fn(),
  useNavigation: () => ({ navigate: vi.fn() }),
}));
vi.mock('../../hooks/useCollectionNavigation', () => ({
  useCollectionNavigation: () => ({ pending: false, error: '' }),
}));
import { TunnelStage } from './TunnelStage';
import { CaptureMetadataDrawer } from './CaptureMetadataDrawer';
import { CapturePreparationHeader } from './CapturePreparationHeader';
import { categories } from '../../lib/workflows';
import { getPreviewResult, previewDossiers } from '../../preview/data';

function find(node: ReactNode, matches: (element: any) => boolean): any {
  for (const child of Children.toArray(node)) {
    if (!isValidElement<{ children?: ReactNode }>(child)) continue;
    if (matches(child)) return child;
    const result = find(child.props.children, matches);
    if (result) return result;
  }
}
function renderStage() {
  state.index = 0;
  return TunnelStage({ category: categories[1], onBack: vi.fn() });
}
function savedSession(): CaptureSession {
  const response = getPreviewResult(previewDossiers[0].dossier_id);
  return {
    identity: { type: 'chiffrage_rapide', creationKey: 'saved', dossierId: response.dossier_id },
    response: {
      ...response,
      vehicle: {
        marque: 'Dacia',
        modele: 'Sandero',
        marque_id: 1,
        model_id: 2,
        matricule: '12345-A-678',
        date_mise_en_circulation: '2020-01-01',
      },
    },
    synchronized: true,
    pending: false,
    error: '',
  };
}
beforeEach(() => {
  state.values = [];
  state.session = null;
});

it('retains the fiche action until the drawer reports its exit complete', () => {
  let tree = renderStage();
  find(tree, (element) => element.props.className === 'capture-scanner').props.onClick();
  state.session = savedSession();
  tree = renderStage();
  expect(
    find(tree, (element) => element.props.className === 'capture-actions').props[
      'data-metadata-shown'
    ],
  ).toBe(false);
  expect(
    find(tree, (element) => element.type === CapturePreparationHeader).props.vehicle,
  ).toBeUndefined();
  find(tree, (element) => element.type === CaptureMetadataDrawer).props.onClose();
  tree = renderStage();
  expect(
    find(tree, (element) => element.props.className === 'capture-actions').props[
      'data-metadata-shown'
    ],
  ).toBe(true);
  expect(
    find(tree, (element) => element.type === CapturePreparationHeader).props.vehicle.matricule,
  ).toBe('12345-A-678');
});

it('retains existing identity during edits and applies saved values after dismissal', () => {
  state.session = savedSession();
  let tree = renderStage();
  find(tree, (element) => element.props.className === 'capture-metadata-toggle').props.onClick();
  state.session = {
    ...state.session,
    response: {
      ...state.session.response!,
      vehicle: {
        ...state.session.response!.vehicle,
        matricule: '999-A-111',
      },
    },
  };
  tree = renderStage();
  expect(
    find(tree, (element) => element.type === CapturePreparationHeader).props.vehicle.matricule,
  ).toBe('12345-A-678');
  find(tree, (element) => element.type === CaptureMetadataDrawer).props.onClose();
  tree = renderStage();
  expect(
    find(tree, (element) => element.type === CapturePreparationHeader).props.vehicle.matricule,
  ).toBe('999-A-111');
});
