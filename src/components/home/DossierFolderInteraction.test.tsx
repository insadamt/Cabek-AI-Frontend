/** Guards decorative capture folders against hover and click side effects; depends on isolated React hooks and dossier activity providers. */
import { Children, isValidElement, type ReactNode } from 'react';
import { beforeEach, expect, it, vi } from 'vitest';
import { getPreviewResult, previewDossiers } from '../../preview/data';

const state = vi.hoisted(() => ({
  stateIndex: 0,
  hovered: false,
  setHovered: vi.fn(),
  revealDocument: vi.fn(),
}));
vi.mock('react', async (original) => ({
  ...(await original<typeof import('react')>()),
  useId: () => 'folder',
  useRef: () => ({ current: null }),
  useLayoutEffect: vi.fn(),
  useState: (initial: unknown) => {
    const index = state.stateIndex++;
    return index === 1 ? [state.hovered, state.setHovered] : [initial, vi.fn()];
  },
}));
vi.mock('../../hooks/useHomeAnalysis', () => ({
  useHomeAnalysis: () => ({
    session: null,
    busy: false,
    revealDocument: state.revealDocument,
    resolveStatus: (dossier: { status: string }) => dossier.status,
  }),
}));
vi.mock('../../hooks/useDossierOpening', () => ({ useDossierOpening: () => null }));
import { DossierFolder } from './DossierFolder';

function findCover(node: ReactNode): any {
  for (const child of Children.toArray(node)) {
    if (!isValidElement<{ className?: string; children?: ReactNode }>(child)) continue;
    if (child.props.className === 'folder-cover') return child;
    const found = findCover(child.props.children);
    if (found) return found;
  }
}
function folder(interactive: boolean) {
  state.stateIndex = 0;
  const response = getPreviewResult(previewDossiers[0].dossier_id);
  const onSelect = vi.fn();
  const tree = DossierFolder({
    dossier: { ...response, created_at: null, photo_count: 0 },
    isActive: true,
    isOpen: false,
    interactive,
    onSelect,
  });
  return { tree, cover: findCover(tree), onSelect };
}
beforeEach(() => {
  vi.clearAllMocks();
  state.hovered = false;
});

it('does not reveal or select the fiche when an empty capture folder is hovered or clicked', () => {
  const { tree, cover, onSelect } = folder(false);
  tree.props.onPointerEnter({ pointerType: 'mouse' } as any);
  cover.props.onClick();
  expect(state.setHovered).not.toHaveBeenCalled();
  expect(state.revealDocument).not.toHaveBeenCalled();
  expect(onSelect).not.toHaveBeenCalled();
  expect(cover.props.tabIndex).toBe(-1);
  expect(cover.props['aria-disabled']).toBe(true);
  state.hovered = true;
  expect(folder(false).tree.props.className).not.toContain('folder-mouth-open');
});

it('retains hover and selection behavior for normal dossier folders', () => {
  const { tree, cover, onSelect } = folder(true);
  tree.props.onPointerEnter({ pointerType: 'mouse' } as any);
  cover.props.onClick();
  expect(state.setHovered).toHaveBeenCalledWith(true);
  expect(state.revealDocument).toHaveBeenCalledOnce();
  expect(onSelect).toHaveBeenCalledOnce();
  expect(cover.props.tabIndex).toBe(0);
});
