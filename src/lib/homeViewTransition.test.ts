import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const timeline = { add: vi.fn(), fromTo: vi.fn(), progress: vi.fn(), kill: vi.fn() };
  timeline.add.mockReturnValue(timeline);
  timeline.fromTo.mockReturnValue(timeline);
  timeline.progress.mockReturnValue(timeline);
  const search = { getClientRects: () => [1], querySelectorAll: () => [] };
  const folders = [{}];
  const content = {
    querySelector: vi.fn<() => HTMLElement | null>(() => null),
    querySelectorAll: vi.fn((selector: string) =>
      selector.includes('stage') || selector === '.home-folder-grid' ? folders : [search],
    ),
  };
  return {
    timeline,
    content,
    folders,
    navigate: vi.fn(),
    getState: vi.fn(() => 'snapshot'),
    flipFrom: vi.fn(() => ({ play: vi.fn() })),
    folderSwitch: { play: vi.fn(), finish: vi.fn() },
    prepareFolders: vi.fn(),
  };
});
vi.mock('gsap', () => ({ default: { registerPlugin: vi.fn(), timeline: () => mocks.timeline } }));
vi.mock('gsap/Flip', () => ({ Flip: { getState: mocks.getState, from: mocks.flipFrom } }));
vi.mock('react-dom', () => ({ flushSync: (callback: () => void) => callback() }));
vi.mock('../hooks/useNavigation', () => ({ navigate: mocks.navigate }));
vi.mock('./homeCollectionMotion', () => ({ prepareCollectionSwitch: mocks.prepareFolders }));
import { finishHomeViewTransition, transitionHomeView } from './homeViewTransition';

describe('home control transitions', () => {
  beforeEach(() => {
    finishHomeViewTransition();
    vi.clearAllMocks();
    mocks.content.querySelector.mockReturnValue(null);
    mocks.prepareFolders.mockReturnValue(mocks.folderSwitch);
    vi.stubGlobal(
      'window',
      Object.assign(new EventTarget(), {
        location: { origin: 'https://cabek.example', search: '' },
      }),
    );
    vi.stubGlobal('document', { querySelector: () => mocks.content });
    vi.stubGlobal('matchMedia', () => ({ matches: false }));
  });
  it('commits the destination before animation and never fades the whole page', () => {
    transitionHomeView('/?search=123');
    expect(mocks.navigate).toHaveBeenCalledWith('/?search=123');
    expect(mocks.getState.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.navigate.mock.invocationCallOrder[0],
    );
    expect(mocks.navigate.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.flipFrom.mock.invocationCallOrder[0],
    );
    expect(mocks.timeline.fromTo).toHaveBeenCalledWith(
      mocks.folders,
      expect.anything(),
      expect.anything(),
      0,
    );
  });
  it('returns folders from above when clearing', () => {
    transitionHomeView('/', 'reverse');
    expect(mocks.timeline.fromTo).toHaveBeenCalledWith(
      mocks.folders,
      { opacity: 0.65, y: -10 },
      expect.anything(),
      0,
    );
  });
  it('skips motion when reduced motion is requested', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: true }));
    transitionHomeView('/', 'reverse');
    expect(mocks.navigate).toHaveBeenCalledWith('/');
    expect(mocks.flipFrom).not.toHaveBeenCalled();
    expect(mocks.prepareFolders).not.toHaveBeenCalled();
  });

  it.each([
    ['', '/?search=', 'forward'],
    ['?search=', '/', 'reverse'],
  ] as const)('hands folders between layouts from %s to %s', (search, path, direction) => {
    window.location.search = search;
    const collection = {} as HTMLElement;
    mocks.content.querySelector.mockReturnValue(collection);
    transitionHomeView(path, direction);
    expect(mocks.prepareFolders).toHaveBeenCalledWith(collection);
    expect(mocks.prepareFolders.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.navigate.mock.invocationCallOrder[0],
    );
    expect(mocks.folderSwitch.play.mock.invocationCallOrder[0]).toBeGreaterThan(
      mocks.navigate.mock.invocationCallOrder[0],
    );
  });

  it('keeps ordinary grid pagination independent of collection travel', () => {
    window.location.search = '?search=';
    mocks.content.querySelector.mockReturnValue({} as HTMLElement);
    transitionHomeView('/?search=&offset=24');
    expect(mocks.prepareFolders).not.toHaveBeenCalled();
  });

  it.each(['resize', 'popstate', 'scroll'])('settles controls and folders on %s', (event) => {
    mocks.content.querySelector.mockReturnValue({} as HTMLElement);
    transitionHomeView('/?search=');
    window.dispatchEvent(new Event(event));
    expect(mocks.folderSwitch.finish).toHaveBeenCalledOnce();
    expect(mocks.timeline.kill).toHaveBeenCalled();
  });
});
