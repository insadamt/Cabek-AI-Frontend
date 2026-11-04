/** Verifies save dismissal uses the drawer exit lifecycle; depends on isolated form hooks and mocked metadata requests. */
import { beforeEach, expect, it, vi } from 'vitest';
import { getPreviewResult, previewDossiers } from '../../preview/data';

const state = vi.hoisted(() => ({
  hookIndex: 0,
  patchMetadata: vi.fn(),
}));
vi.mock('react', async (original) => ({
  ...(await original<typeof import('react')>()),
  useState: (initial: unknown) => {
    const index = state.hookIndex++;
    return [index === 3 ? '12345-A-678' : initial, vi.fn()];
  },
}));
vi.mock('../../hooks/useTunnelCapture', () => ({
  useTunnelCapture: () => ({ session: null, store: null }),
}));
vi.mock('../../hooks/useResource', () => ({
  useResource: () => ({ loading: false, data: [], error: null }),
}));
vi.mock('../../lib/api', () => ({
  patchMetadata: state.patchMetadata,
  describeError: () => 'Enregistrement impossible',
  listBrands: vi.fn(),
  listModels: vi.fn(),
}));
import { CaptureMetadataDrawer } from './CaptureMetadataDrawer';

beforeEach(() => {
  vi.clearAllMocks();
  state.hookIndex = 0;
});

function setup(closeOnSave: boolean) {
  const dossier = getPreviewResult(previewDossiers[0].dossier_id);
  const onSaved = vi.fn();
  const onClose = vi.fn();
  const requestClose = vi.fn();
  const drawer = CaptureMetadataDrawer({
    type: 'chiffrage_rapide',
    dossier,
    onSaved,
    onClose,
    closeOnSave,
  });
  const form = drawer.props.children(requestClose);
  const event = { preventDefault: vi.fn() };
  return { dossier, onSaved, onClose, requestClose, submit: () => form.props.onSubmit(event) };
}

it('requests an animated exit after a successful fiche save without directly unmounting', async () => {
  const { dossier, onSaved, onClose, requestClose, submit } = setup(true);
  const saved = { ...dossier, vehicle: { ...dossier.vehicle, matricule: '12345-A-678' } };
  state.patchMetadata.mockResolvedValue(saved);
  await submit();
  expect(state.patchMetadata).toHaveBeenCalledWith(dossier.dossier_id, {
    matricule: '12345-A-678',
  });
  expect(onSaved).toHaveBeenCalledWith(saved);
  expect(requestClose).toHaveBeenCalledOnce();
  expect(onClose).not.toHaveBeenCalled();
});

it('keeps the drawer open when saving fails', async () => {
  const { onSaved, requestClose, submit } = setup(true);
  state.patchMetadata.mockRejectedValue(new Error('offline'));
  await submit();
  expect(onSaved).not.toHaveBeenCalled();
  expect(requestClose).not.toHaveBeenCalled();
});

it('keeps dossier editors open when automatic dismissal is disabled', async () => {
  const { dossier, onSaved, requestClose, submit } = setup(false);
  state.patchMetadata.mockResolvedValue(dossier);
  await submit();
  expect(onSaved).toHaveBeenCalledWith(dossier);
  expect(requestClose).not.toHaveBeenCalled();
});
