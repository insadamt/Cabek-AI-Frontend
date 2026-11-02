/** Verifies uniform category absorption, one transition completion and interruption cleanup without rendering. */
import { afterEach, describe, expect, it, vi } from 'vitest';
const animation = vi.hoisted(() => ({
  steps: [] as Array<{ target: unknown; options: Record<string, unknown> }>,
  complete: () => {},
  timeline: { to: vi.fn(), progress: vi.fn(), play: vi.fn(), kill: vi.fn() },
  set: vi.fn(),
}));
vi.mock('gsap', () => ({
  default: {
    timeline: (options: { onComplete: () => void }) => {
      animation.complete = options.onComplete;
      return animation.timeline;
    },
    set: animation.set,
  },
}));
import { absorbCategoryFolder } from './categoryFolderMotion';
afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
  animation.steps = [];
});
function setup(reduced: boolean) {
  const media = Object.assign(new EventTarget(), { matches: reduced });
  vi.stubGlobal('matchMedia', () => media);
  vi.stubGlobal('window', new EventTarget());
  animation.timeline.to.mockImplementation((target, options) => {
    animation.steps.push({ target, options });
    return animation.timeline;
  });
  animation.timeline.progress.mockImplementation(() => {
    animation.complete();
    return animation.timeline;
  });
  const folder = {
    getBoundingClientRect: () => ({ left: 300, top: 200, width: 400, height: 300 }),
  } as HTMLElement;
  const island = {
    getBoundingClientRect: () => ({ left: 350, top: 0, width: 300, height: 44 }),
  } as HTMLElement;
  return { folder, island, media };
}
describe('category to island motion', () => {
  it('recedes other folders and keeps the chosen folder uniformly scaled', () => {
    const { folder, island } = setup(false);
    const peers = [{} as HTMLElement];
    const complete = vi.fn();
    const cancel = absorbCategoryFolder(folder, peers, island, complete);
    expect(animation.steps[0]).toMatchObject({
      target: peers,
      options: { opacity: 0, scale: 0.88 },
    });
    expect(
      animation.steps.some((step) => step.target === folder && step.options.scale === 0.2),
    ).toBe(true);
    expect(animation.steps.every((step) => !('scaleY' in step.options))).toBe(true);
    expect(complete).not.toHaveBeenCalled();
    animation.complete();
    expect(complete).toHaveBeenCalledOnce();
    cancel();
    expect(animation.timeline.kill).toHaveBeenCalledOnce();
  });
  it('settles reduced motion immediately and cleans resize listeners', () => {
    const { folder, island } = setup(true);
    const complete = vi.fn();
    const remove = vi.spyOn(window, 'removeEventListener');
    const cancel = absorbCategoryFolder(folder, [], island, complete);
    expect(complete).toHaveBeenCalledOnce();
    expect(animation.timeline.play).not.toHaveBeenCalled();
    cancel();
    expect(remove).toHaveBeenCalledWith('resize', expect.any(Function));
  });
});
