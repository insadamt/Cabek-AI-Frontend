import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { previewDossiers } from '../../preview/data';
import { DossierCarousel } from './DossierCarousel';

const motion = vi.hoisted(() => ({ progress: 0 }));

vi.mock('../../hooks/useDossierCarousel', () => ({
  useDossierCarousel: () => ({
    progress: motion.progress,
    dragging: false,
    animating: true,
    gestureHandlers: {},
    tilt: { x: 0, y: 0 },
    animateStep: vi.fn(),
    stopMotion: vi.fn(),
    canSelect: () => false,
  }),
}));

function renderOpenLink(activeIndex: number, indices?: number[], total = previewDossiers.length) {
  const markup = renderToStaticMarkup(
    <DossierCarousel
      dossiers={previewDossiers}
      activeIndex={activeIndex}
      total={total}
      offset={0}
      indices={indices}
      onSelect={() => {}}
      onStep={() => {}}
    />,
  );
  return markup.match(/<a class="home-open-dossier"[^>]*>/)?.[0] ?? '';
}

describe('dossier link during carousel motion', () => {
  beforeEach(() => {
    motion.progress = 0;
  });

  it('opens the visible folder before a fast forward swipe settles', () => {
    motion.progress = 1.8;
    const link = renderOpenLink(0);
    expect(link).toContain(`/dossiers/${previewDossiers[2].dossier_id}`);
    expect(link).not.toContain(`/dossiers/${previewDossiers[0].dossier_id}`);
  });

  it('opens the last folder when swiping backward across the collection boundary', () => {
    motion.progress = -0.8;
    expect(renderOpenLink(0)).toContain(`/dossiers/${previewDossiers.at(-1)!.dossier_id}`);
  });

  it('resolves global positions in a window with prefetched pages', () => {
    motion.progress = 0.9;
    expect(renderOpenLink(1, [10, 11, 12, 13, 14, 15, 16, 17, 18], 30)).toContain(
      `/dossiers/${previewDossiers[2].dossier_id}`,
    );
  });

  it('does not offer the starting dossier if the visible page is unavailable', () => {
    motion.progress = 1.8;
    const link = renderOpenLink(0, [0, 1, 5, 6, 7, 8, 9, 10, 11], 30);
    expect(link).toContain('aria-disabled="true"');
    expect(link).not.toContain('href=');
  });
});

// Status changes must preserve the visible folder as the action target during motion.

describe('visible folder action', () => {
  it.each([
    ['not_analyzed', 'Analyser'],
    ['failed', 'Analyser'],
    ['completed', 'Ouvrir'],
    ['queued', 'Suivre'],
    ['processing', 'Suivre'],
  ] as const)('offers %s folders the %s action', (status, label) => {
    motion.progress = 0;
    const dossier = { ...previewDossiers[0], status };
    const markup = renderToStaticMarkup(
      <DossierCarousel
        dossiers={[dossier]}
        activeIndex={0}
        total={1}
        offset={0}
        onSelect={() => {}}
        onStep={() => {}}
      />,
    );
    expect(markup).toContain(`${label} le dossier ${dossier.dossier_id}`);
    expect(markup).toContain('role="search"');
  });
});
