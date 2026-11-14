/** Verify preselected expertise routes cannot trigger capture or switch an active dossier.
 * Depends on controlled hook effects, abortable reads, and a mocked durable store.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { TunnelCaptureStore } from '../lib/tunnelCapture';
const state = vi.hoisted(() => ({
  requestedId: 'EXPERT-1',
  effect: undefined as (() => void | (() => void)) | undefined,
  update: vi.fn(),
  read: vi.fn(),
  navigate: vi.fn(),
}));
vi.mock('react', () => ({
  useState: (value: unknown) => [value, state.update],
  useEffect: (effect: () => void | (() => void)) => {
    state.effect = effect;
  },
}));
vi.mock('./useNavigation', () => ({
  useNavigation: () => ({
    searchParams: new URLSearchParams({ dossier: state.requestedId }),
    navigate: state.navigate,
  }),
}));
vi.mock('../lib/api', () => ({
  readDossier: state.read,
  describeError: (failure: Error) => failure.message,
}));
import { useExpertiseDossierSelection } from './useExpertiseDossierSelection';
const imported = {
  dossier_id: 'EXPERT-1',
  type: 'forfait_expertise',
  status: 'not_analyzed',
  workflow_status: 'awaiting_photos',
};
let cleanup: (() => void) | undefined;
function setup(currentId?: string, canClear = true) {
  const store = {
    getSnapshot: vi.fn(() => (currentId ? { identity: { dossierId: currentId } } : null)),
    clear: vi.fn(() => canClear),
    restoreExisting: vi.fn(),
    refresh: vi.fn().mockResolvedValue(undefined),
  };
  const result = useExpertiseDossierSelection(true, store as unknown as TunnelCaptureStore);
  const dispose = state.effect?.();
  cleanup = typeof dispose === 'function' ? dispose : undefined;
  return { store, result };
}
beforeEach(() => {
  vi.clearAllMocks();
  state.requestedId = 'EXPERT-1';
  state.read.mockResolvedValue(imported);
});
afterEach(() => {
  cleanup?.();
  cleanup = undefined;
});

describe('selected expertise route', () => {
  it('blocks scanning immediately while validating a different requested dossier', async () => {
    const { store, result } = setup();
    expect(result.pending).toBe(true);
    await vi.waitFor(() =>
      expect(store.restoreExisting).toHaveBeenCalledWith(
        'forfait_expertise',
        undefined,
        'EXPERT-1',
      ),
    );
    expect(state.read).toHaveBeenCalledWith('EXPERT-1', expect.any(AbortSignal));
    expect(store.refresh).toHaveBeenCalledOnce();
  });
  it('refreshes the same persisted dossier without clearing or selecting it again', async () => {
    const { store } = setup('EXPERT-1');
    await vi.waitFor(() => expect(store.refresh).toHaveBeenCalledOnce());
    expect(state.read).not.toHaveBeenCalled();
    expect(store.clear).not.toHaveBeenCalled();
    expect(store.restoreExisting).not.toHaveBeenCalled();
  });
  it('refuses a response identifying a different dossier', async () => {
    state.read.mockResolvedValue({ ...imported, dossier_id: 'OTHER' });
    const { store } = setup();
    await vi.waitFor(() =>
      expect(state.update).toHaveBeenCalledWith(expect.stringContaining('Choisissez un dossier')),
    );
    expect(store.clear).not.toHaveBeenCalled();
    expect(store.restoreExisting).not.toHaveBeenCalled();
  });
  it('does not replace a capture or analysis session that cannot be cleared', async () => {
    const { store } = setup('ACTIVE', false);
    await vi.waitFor(() => expect(store.clear).toHaveBeenCalledOnce());
    expect(store.restoreExisting).not.toHaveBeenCalled();
    expect(state.update).toHaveBeenCalledWith(expect.stringContaining('Terminez la capture'));
  });
  it('ignores a late response after navigation cancels selection', async () => {
    let finish!: (value: typeof imported) => void;
    state.read.mockReturnValue(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );
    const { store } = setup();
    const signal = state.read.mock.calls[0][1] as AbortSignal;
    cleanup?.();
    expect(signal.aborted).toBe(true);
    finish(imported);
    await Promise.resolve();
    await Promise.resolve();
    expect(store.clear).not.toHaveBeenCalled();
    expect(store.restoreExisting).not.toHaveBeenCalled();
  });
});
