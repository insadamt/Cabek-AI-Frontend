import { describe, expect, it, vi } from 'vitest';
import gsap from 'gsap';
import {
  animateSearchReturnContents,
  returnIconPaths,
  searchIconPaths,
} from './searchReturnMotion';

describe('persistent search to Retour morph', () => {
  it.each(['return', 'search'])('morphs the same icon and text layers toward %s', (mode) => {
    const paths = [{}, {}, {}];
    const query = {};
    const label = {};
    const submit = {};
    const control = {
      dataset: { mode },
      querySelectorAll: () => paths,
      querySelector: (selector: string) =>
        ({
          '.search-return-query': query,
          '.search-return-label': label,
          '.search-return-submit': submit,
        })[selector],
    } as unknown as HTMLElement;
    const timeline = { fromTo: vi.fn() };
    animateSearchReturnContents(timeline as unknown as gsap.core.Timeline, control, false);
    const focused = mode === 'return';
    paths.forEach((path, index) => {
      const [target, from, to, start] = timeline.fromTo.mock.calls[index];
      expect(target).toBe(path);
      expect(from.attr.d).toBe((focused ? searchIconPaths : returnIconPaths)[index]);
      expect(to.attr.d).toBe((focused ? returnIconPaths : searchIconPaths)[index]);
      expect(start).toBe(0);
    });
    const [, queryFrom, queryTo] = timeline.fromTo.mock.calls[3];
    const [labelTarget, labelFrom, labelTo] = timeline.fromTo.mock.calls[4];
    expect(queryFrom.opacity).toBe(focused ? 1 : 0);
    expect(queryTo.opacity).toBe(focused ? 0 : 1);
    expect(labelTarget).toBe(label);
    expect(labelFrom.opacity).toBe(focused ? 0 : 1);
    expect(labelTo.opacity).toBe(focused ? 1 : 0);
    expect(labelTo.clearProps).toBe('opacity,transform');
  });

  it('keeps icon commands compatible for continuous interpolation in both directions', () => {
    searchIconPaths.forEach((searchPath, index) => {
      const returnPath = returnIconPaths[index];
      expect(searchPath.match(/[A-Za-z]/g)).toEqual(returnPath.match(/[A-Za-z]/g));
      const midpoint = gsap.utils.interpolate(searchPath, returnPath, 0.5);
      expect(midpoint).not.toBe(searchPath);
      expect(midpoint).not.toBe(returnPath);
      expect(midpoint).not.toContain('NaN');
    });
  });

  it('settles every icon and content layer immediately for reduced motion', () => {
    const timeline = { fromTo: vi.fn() };
    const control = {
      dataset: { mode: 'return' },
      querySelectorAll: () => [{}, {}, {}],
      querySelector: () => ({}),
    } as unknown as HTMLElement;
    animateSearchReturnContents(timeline as unknown as gsap.core.Timeline, control, true);
    expect(timeline.fromTo).toHaveBeenCalledTimes(5);
    timeline.fromTo.mock.calls.forEach(([, , to]) => expect(to.duration).toBe(0));
  });
});
