import type gsap from 'gsap';

// Matching curve commands let the magnifier itself become an arrow without a plugin or icon swap.

export const searchIconPaths = [
  'M15 10 C15 12.76 12.76 15 10 15 C7.24 15 5 12.76 5 10',
  'M5 10 C5 7.24 7.24 5 10 5 C12.76 5 15 7.24 15 10',
  'M14 14 L20 20',
];
export const returnIconPaths = [
  'M11 5 C9 7 6 10 4 12 C4 12 4 12 4 12',
  'M4 12 C6 14 9 17 11 19 C11 19 11 19 11 19',
  'M4 12 L20 12',
];

export function animateSearchReturnContents(
  timeline: ReturnType<typeof gsap.timeline>,
  control: HTMLElement,
  reducedMotion: boolean,
) {
  const focused = control.dataset.mode === 'return';
  const duration = reducedMotion ? 0 : 0.36;
  const fromPaths = focused ? searchIconPaths : returnIconPaths;
  const toPaths = focused ? returnIconPaths : searchIconPaths;
  control.querySelectorAll<SVGPathElement>('[data-search-icon-path]').forEach((path, index) => {
    timeline.fromTo(
      path,
      { attr: { d: fromPaths[index] } },
      {
        attr: { d: toPaths[index] },
        duration,
        ease: 'power2.inOut',
      },
      0,
    );
  });
  const query = control.querySelector('.search-return-query');
  const label = control.querySelector('.search-return-label');
  const submit = control.querySelector('.search-return-submit');
  const searchContent = [query, submit].filter((element) => element !== null);
  timeline.fromTo(
    searchContent,
    { opacity: focused ? 1 : 0, y: focused ? 0 : -6 },
    {
      opacity: focused ? 0 : 1,
      y: focused ? -6 : 0,
      duration,
      ease: 'power2.inOut',
      clearProps: 'opacity,transform',
    },
    0,
  );
  if (label)
    timeline.fromTo(
      label,
      { opacity: focused ? 0 : 1, y: focused ? 6 : 0 },
      {
        opacity: focused ? 1 : 0,
        y: focused ? 0 : 6,
        duration,
        ease: 'power2.inOut',
        clearProps: 'opacity,transform',
      },
      0,
    );
}
