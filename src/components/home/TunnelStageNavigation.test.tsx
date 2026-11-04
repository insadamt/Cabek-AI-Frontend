/** Guards scanner-to-collection handoffs and native modified clicks; depends on real route actions with isolated React hooks and capture state. */
import { Children, isValidElement, type MouseEvent, type ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CaptureSession } from '../../captureTypes';

const state = vi.hoisted(() => ({
  session: null as CaptureSession | null,
  navigate: vi.fn(),
  clear: vi.fn(),
  openCollection: vi.fn(),
}));
vi.mock('../../hooks/useCollectionNavigation', () => ({
  useCollectionNavigation: () => ({
    openCollection: state.openCollection,
    error: '',
    pending: false,
    leavePage: vi.fn(),
  }),
}));
vi.mock('react', async (original) => ({
  ...(await original<typeof import('react')>()),
  useState: (initial: unknown) => [initial, vi.fn()],
  useRef: (initial: unknown) => ({ current: initial }),
  useEffect: vi.fn(),
}));
vi.mock('../../hooks/useNavigation', () => ({
  navigate: state.navigate,
  useNavigation: () => ({ navigate: state.navigate }),
}));
vi.mock('../../hooks/useTunnelCapture', () => ({
  useTunnelCapture: () => ({ session: state.session, store: { clear: state.clear } }),
}));
vi.mock('../../hooks/useStageEntrance', () => ({
  useStageEntrance: () => ({ phase: 'ready', restoreSettledView: true }),
}));
import { categories, categoryPath } from '../../lib/workflows';
import { CreateDossier } from '../../pages/CreateDossier';
import { TunnelStage } from './TunnelStage';

interface ActionProps {
  children?: ReactNode;
  onClick?: (event: MouseEvent<HTMLAnchorElement>) => void;
}

function findAction(node: ReactNode, label: string): ActionProps | undefined {
  for (const child of Children.toArray(node)) {
    if (!isValidElement<ActionProps>(child)) continue;
    if (child.props.children === label) return child.props;
    const found = findAction(child.props.children, label);
    if (found) return found;
  }
}

function click(modified = false) {
  return {
    metaKey: modified,
    ctrlKey: false,
    shiftKey: false,
    altKey: false,
    preventDefault: vi.fn(),
  } as unknown as MouseEvent<HTMLAnchorElement>;
}

beforeEach(() => {
  vi.clearAllMocks();
  state.session = null;
  state.clear.mockReturnValue(true);
});

describe.each(categories.filter((category) => category.type !== 'forfait_expertise'))(
  '$slug scanner collection handoff',
  (category) => {
    function stage() {
      return TunnelStage({ category, onBack: vi.fn() });
    }

    it('requests folder release when opening the collection', () => {
      const event = click();
      findAction(stage(), 'Voir les dossiers ↗')!.onClick!(event);
      expect(event.preventDefault).toHaveBeenCalledOnce();
      expect(state.openCollection).toHaveBeenCalledWith(category, null);
    });

    it('keeps modified collection clicks native', () => {
      const event = click(true);
      findAction(stage(), 'Voir les dossiers ↗')!.onClick!(event);
      expect(event.preventDefault).not.toHaveBeenCalled();
      expect(state.navigate).not.toHaveBeenCalled();
      expect(state.openCollection).not.toHaveBeenCalled();
    });

    it('requests release after leaving a saved capture session', () => {
      state.session = {
        identity: { type: category.type, creationKey: 'saved-session' },
        synchronized: false,
        pending: false,
        error: '',
      };
      findAction(stage(), 'Quitter et conserver')!.onClick!(click());
      expect(state.clear).not.toHaveBeenCalled();
      expect(state.openCollection).toHaveBeenCalledWith(category, null, {
        beforeNavigate: expect.any(Function),
      });
      state.openCollection.mock.calls[0][2].beforeNavigate();
      expect(state.clear).toHaveBeenCalledOnce();
    });

    it('requests release when returning from the collection creation route', () => {
      const page = CreateDossier({ type: category.type });
      const section = page!.props.children;
      section.props.children.props.onBack();
      expect(state.navigate).toHaveBeenCalledWith(categoryPath(category.type), {
        ejectFolders: true,
      });
    });
  },
);
