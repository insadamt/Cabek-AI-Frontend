import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { DossierOpeningSession } from '../../lib/dossierOpeningState';
import { previewDossiers } from '../../preview/data';
import { AnalysisIsland } from './AnalysisIsland';

const state = vi.hoisted(() => ({ opening: null as DossierOpeningSession | null }));
vi.mock('../../hooks/useDossierOpening', () => ({ useDossierOpening: () => state.opening }));
vi.mock('../../hooks/useHomeAnalysis', () => ({
  useHomeAnalysis: () => ({ session: null, busy: false }),
}));

beforeEach(() => {
  state.opening = null;
});

describe('persistent island branding', () => {
  it('keeps the idle brand accessible', () => {
    const markup = renderToStaticMarkup(<AnalysisIsland />);
    expect(markup).toContain('class="island-brand"');
    expect(markup).toContain('tabindex="0" aria-hidden="false"');
    expect(markup).toContain('cabek-ai-logo-white.png');
  });
  it('keeps the same brand surface mounted but inaccessible while image loading is active', () => {
    state.opening = {
      dossier: previewDossiers[0],
      phase: 'loading',
      loaded: 2,
      total: 6,
      error: '',
      retry: vi.fn(),
      cancel: vi.fn(),
    };
    const markup = renderToStaticMarkup(<AnalysisIsland />);
    expect(markup.match(/class="ai-activity-island /g)).toHaveLength(1);
    expect(markup).toContain('class="island-brand"');
    expect(markup).toContain('tabindex="-1" aria-hidden="true"');
    expect(markup).toContain('Chargement des images');
    expect(markup).toContain('2/6');
  });
});
