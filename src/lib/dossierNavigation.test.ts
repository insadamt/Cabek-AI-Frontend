import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { previewDossiers } from '../preview/data';

const navigation = vi.hoisted(() => ({ navigate: vi.fn() }));
vi.mock('../hooks/useNavigation', () => ({ navigate: navigation.navigate }));
vi.mock('react-dom', () => ({ flushSync: (callback: () => void) => callback() }));
import { openDossierFromFolder } from './dossierNavigation';

function createFolder(motionState = 'open') {
  const scope = { inert: false };
  const paper = Object.assign(new EventTarget(), { dataset: { motionState } });
  const folder = Object.assign(new EventTarget(), {
    isConnected: true,
    closest: () => scope,
    querySelector: () => paper,
    getBoundingClientRect: () => ({ left: 400, top: 260, width: 500, height: 370 }),
  });
  folder.addEventListener('dossier-navigation-start', () => {
    if (paper.dataset.motionState !== 'closed') paper.dataset.motionState = 'closing';
  });
  return {
    folder: folder as unknown as HTMLElement,
    scope,
    finishInsertion: () => {
      paper.dataset.motionState = 'closed';
      paper.dispatchEvent(new Event('document-motion-settled'));
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal('window', new EventTarget());
});
afterEach(() => vi.unstubAllGlobals());

describe('simple dossier opening', () => {
  it('waits for document insertion then passes the actual folder position', async () => {
    const source = createFolder();
    const dossier = previewDossiers[0];
    const task = openDossierFromFolder({ dossier, folder: source.folder, path: '/dossiers/test' });
    await Promise.resolve();
    expect(navigation.navigate).not.toHaveBeenCalled();
    expect(source.scope.inert).toBe(true);
    source.finishInsertion();
    await task;
    expect(navigation.navigate).toHaveBeenCalledWith('/dossiers/test', {
      dossierEntrance: { dossier, folderBounds: { left: 400, top: 260, width: 500, height: 370 } },
    });
    expect(source.scope.inert).toBe(false);
  });

  it('opens an already-closed document without another motion event', async () => {
    const source = createFolder('closed');
    await openDossierFromFolder({
      dossier: previewDossiers[0],
      folder: source.folder,
      path: '/dossiers/test',
    });
    expect(navigation.navigate).toHaveBeenCalledOnce();
  });

  it('cancels when navigating elsewhere and restores the source controls', async () => {
    const source = createFolder();
    const cancelled = vi.fn();
    source.folder.addEventListener('dossier-navigation-cancel', cancelled);
    const task = openDossierFromFolder({
      dossier: previewDossiers[0],
      folder: source.folder,
      path: '/dossiers/test',
    });
    window.dispatchEvent(new Event('popstate'));
    await task;
    source.finishInsertion();
    expect(navigation.navigate).not.toHaveBeenCalled();
    expect(source.scope.inert).toBe(false);
    expect(cancelled).toHaveBeenCalledOnce();
  });

  it('ignores repeated activation during insertion', async () => {
    const source = createFolder();
    const options = { dossier: previewDossiers[0], folder: source.folder, path: '/dossiers/test' };
    const task = openDossierFromFolder(options);
    await openDossierFromFolder(options);
    source.finishInsertion();
    await task;
    expect(navigation.navigate).toHaveBeenCalledOnce();
  });
});
