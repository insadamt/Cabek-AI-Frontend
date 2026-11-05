import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const timeline = { add: vi.fn(), fromTo: vi.fn(), progress: vi.fn(), kill: vi.fn() };
  timeline.add.mockReturnValue(timeline);
  timeline.fromTo.mockReturnValue(timeline);
  timeline.progress.mockReturnValue(timeline);
  const search = { getClientRects: () => [1], querySelectorAll: () => [], closest: () => null };
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
  };
});
vi.mock('gsap', () => ({ default: { registerPlugin: vi.fn(), timeline: () => mocks.timeline } }));
vi.mock('gsap/Flip', () => ({ Flip: { getState: mocks.getState, from: mocks.flipFrom } }));
vi.mock('react-dom', () => ({ flushSync: (callback: () => void) => callback() }));
vi.mock('../hooks/useNavigation', () => ({ navigate: mocks.navigate }));
import { finishHomeViewTransition, transitionHomeView } from './homeViewTransition';

describe('home control transitions', () => {
  beforeEach(() => {
    finishHomeViewTransition();
    vi.clearAllMocks();
    mocks.content.querySelector.mockReturnValue(null);
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
  });
  it('leaves folder opacity to the native view crossfade without moving folders', () => {
    transitionHomeView('/', 'reverse');
    expect(
      mocks.content.querySelectorAll.mock.calls.every(
        ([selector]) =>
          !selector.includes('.carousel-stage') && !selector.includes('.home-folder-grid'),
      ),
    ).toBe(true);
  });
  it('skips motion when reduced motion is requested', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: true }));
    transitionHomeView('/', 'reverse');
    expect(mocks.navigate).toHaveBeenCalledWith('/');
    expect(mocks.flipFrom).not.toHaveBeenCalled();
  });

  it.each([
    ['', '/?search=', 'forward'],
    ['?search=', '/', 'reverse'],
  ] as const)('morphs controls between layouts from %s to %s', (search, path, direction) => {
    window.location.search = search;
    const collection = {} as HTMLElement;
    mocks.content.querySelector.mockReturnValue(collection);
    transitionHomeView(path, direction);
    expect(mocks.navigate).toHaveBeenCalledWith(path);
    expect(mocks.flipFrom).toHaveBeenCalled();
  });

  it('retains animated controls during grid pagination', () => {
    window.location.search = '?search=';
    mocks.content.querySelector.mockReturnValue({} as HTMLElement);
    transitionHomeView('/?search=&offset=24');
    expect(mocks.navigate).toHaveBeenCalledWith('/?search=&offset=24');
  });

  it.each(['resize', 'popstate'])('settles controls on %s', (event) => {
    mocks.content.querySelector.mockReturnValue({} as HTMLElement);
    transitionHomeView('/?search=');
    window.dispatchEvent(new Event(event));
    expect(mocks.timeline.kill).toHaveBeenCalled();
  });
});
