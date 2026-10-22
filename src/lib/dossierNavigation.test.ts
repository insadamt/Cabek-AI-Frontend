import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { previewDossiers, getPreviewResult } from '../preview/data';
import type { DossierResponse } from '../types';
import {
  getDossierOpening,
  publishDossierOpening,
  subscribeToDossierOpening,
} from './dossierOpeningState';

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  prepare: vi.fn(),
  flyDocument: vi.fn(),
  flyPhotos: vi.fn(),
}));
vi.mock('../hooks/useNavigation', () => ({ navigate: mocks.navigate }));
vi.mock('react-dom', () => ({ flushSync: (callback: () => void) => callback() }));
vi.mock('./dossierImages', () => ({ prepareDossierImages: mocks.prepare }));
vi.mock('./analysisMotion', () => ({ flyAnalysisDocument: mocks.flyDocument }));
vi.mock('./dossierPhotoMotion', () => ({ flyDossierPhotos: mocks.flyPhotos }));
import { openDossierFromFolder } from './dossierNavigation';

const dossier = previewDossiers.find((item) => item.status === 'completed')!;
const response = getPreviewResult(dossier.dossier_id);
let finishPreparation: (response: DossierResponse) => void;
let failPreparation: (error: Error) => void;
const cleanups: Array<() => void> = [];
const tasks: Promise<void>[] = [];

function createFolder(motionState = 'open') {
  const scope = { inert: false };
  const paper = Object.assign(new EventTarget(), { dataset: { motionState } });
  const styles = new Map<string, string>();
  const folder = Object.assign(new EventTarget(), {
    style: {
      getPropertyValue: (name: string) => styles.get(name) ?? '',
      setProperty: (name: string, value: string) => styles.set(name, value),
      removeProperty: (name: string) => styles.delete(name),
    },
    isConnected: true,
    closest: () => scope,
    querySelector: () => paper,
    getBoundingClientRect: () => ({ left: 400, top: 260, width: 500, height: 370 }),
  });
  cleanups.push(
    subscribeToDossierOpening(() => {
      if (getDossierOpening()?.phase === 'extracting') {
        paper.dataset.motionState = 'open';
        paper.dispatchEvent(new Event('document-motion-settled'));
      }
    }),
  );
  folder.addEventListener('dossier-navigation-start', () => {
    paper.dataset.motionState = 'closing';
  });
  return {
    scope,
    folder,
    styles,
    options: { dossier, folder: folder as unknown as HTMLElement, path: '/dossiers/test' },
    finishInsertion: () => {
      paper.dataset.motionState = 'closed';
      paper.dispatchEvent(new Event('document-motion-settled'));
    },
  };
}
function open(options: Parameters<typeof openDossierFromFolder>[0]) {
  const task = openDossierFromFolder(options);
  tasks.push(task);
  return task;
}
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal('window', new EventTarget());
  vi.stubGlobal('document', { querySelector: () => ({}) });
  mocks.flyDocument.mockResolvedValue(undefined);
  mocks.flyPhotos.mockResolvedValue(undefined);
  mocks.prepare.mockImplementation(
    ({ signal, onProgress }) =>
      new Promise((resolve, reject) => {
        finishPreparation = (result) => {
          onProgress(6, 6);
          resolve(result);
        };
        failPreparation = reject;
        signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), {
          once: true,
        });
      }),
  );
});
afterEach(async () => {
  window.dispatchEvent(new Event('popstate'));
  await Promise.allSettled(tasks.splice(0));
  cleanups.splice(0).forEach((cleanup) => cleanup());
  publishDossierOpening(null);
  vi.unstubAllGlobals();
});

describe('fast prepared dossier opening', () => {
  it('starts loading alongside the flight, then waits for images and insertion before navigating', async () => {
    const source = createFolder();
    const task = open(source.options);
    expect(mocks.prepare).toHaveBeenCalledOnce();
    await vi.waitFor(() => expect(getDossierOpening()?.phase).toBe('loading'));
    expect(mocks.flyDocument).toHaveBeenCalledWith(
      expect.objectContaining({ returning: false, playbackRate: 2 }),
    );
    expect(source.styles.get('--document-playback-rate')).toBe('1.5');
    expect(mocks.navigate).not.toHaveBeenCalled();
    finishPreparation(response);
    await vi.waitFor(() => expect(getDossierOpening()?.phase).toBe('stowing'));
    expect(mocks.flyPhotos).toHaveBeenCalledWith(
      expect.objectContaining({ photos: response.result!.photos }),
    );
    expect(mocks.navigate).not.toHaveBeenCalled();
    source.finishInsertion();
    await task;
    expect(mocks.navigate).toHaveBeenCalledWith('/dossiers/test', {
      dossierEntrance: {
        dossier,
        response,
        folderBounds: { left: 400, top: 260, width: 500, height: 370 },
      },
    });
    expect(source.scope.inert).toBe(false);
    expect(source.styles.has('--document-playback-rate')).toBe(false);
  });

  it('overlaps returning photos with the document instead of waiting for a second animation', async () => {
    const source = createFolder();
    let finishReturn!: () => void;
    mocks.flyDocument.mockImplementation(({ returning }) =>
      returning
        ? new Promise<void>((resolve) => {
            finishReturn = resolve;
          })
        : Promise.resolve(),
    );
    const task = open(source.options);
    await vi.waitFor(() => expect(getDossierOpening()?.phase).toBe('loading'));
    finishPreparation(response);
    await vi.waitFor(() => expect(mocks.flyPhotos).toHaveBeenCalledOnce());
    expect(getDossierOpening()?.phase).toBe('returning');
    expect(mocks.navigate).not.toHaveBeenCalled();
    finishReturn();
    await vi.waitFor(() => expect(getDossierOpening()?.phase).toBe('stowing'));
    source.finishInsertion();
    await task;
  });

  it('extracts a closed sheet and ignores repeated activation', async () => {
    const source = createFolder('closed');
    const task = open(source.options);
    await open(source.options);
    await vi.waitFor(() => expect(getDossierOpening()?.phase).toBe('loading'));
    finishPreparation(response);
    await vi.waitFor(() => expect(getDossierOpening()?.phase).toBe('stowing'));
    source.finishInsertion();
    await task;
    expect(mocks.prepare).toHaveBeenCalledOnce();
    expect(mocks.navigate).toHaveBeenCalledOnce();
  });

  it('cancels loads and navigation when leaving during opening', async () => {
    const source = createFolder();
    const task = open(source.options);
    await vi.waitFor(() => expect(getDossierOpening()?.phase).toBe('loading'));
    window.dispatchEvent(new Event('popstate'));
    await task;
    expect(mocks.navigate).not.toHaveBeenCalled();
    expect(source.scope.inert).toBe(false);
    expect(getDossierOpening()).toBeNull();
    expect(source.styles.has('--document-playback-rate')).toBe(false);
  });

  it('returns the document and exposes retry if an image fails', async () => {
    const source = createFolder();
    const task = open(source.options);
    await vi.waitFor(() => expect(getDossierOpening()?.phase).toBe('loading'));
    failPreparation(new Error('Image unavailable'));
    await vi.waitFor(() => expect(getDossierOpening()?.phase).toBe('stowing'));
    source.finishInsertion();
    await task;
    expect(getDossierOpening()?.phase).toBe('error');
    expect(getDossierOpening()?.retry).toBeTypeOf('function');
    expect(mocks.navigate).not.toHaveBeenCalled();
    expect(source.scope.inert).toBe(false);
  });
});
