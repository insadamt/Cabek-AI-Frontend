/**
 * Protects the opt-in stage header entrance without hiding branding on dossier or collection pages.
 * Depends on server-rendered HomeFrame markup and lightweight provider/island adapters.
 */
import { renderToStaticMarkup } from 'react-dom/server';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { HomeFrame } from './HomeFrame';

vi.mock('../../hooks/useHomeAnalysis', () => ({
  HomeAnalysisProvider: ({ children }: { children: ReactNode }) => children,
  useHomeAnalysis: () => ({ busy: false }),
}));
vi.mock('../../hooks/useDossierOpening', () => ({ useDossierOpening: () => null }));
vi.mock('./AnalysisIsland', () => ({ AnalysisIsland: () => <a href="/">Cabek AI</a> }));

describe('optional stage header entrance', () => {
  it('hides and disables the island while the stage is preparing', () => {
    const markup = renderToStaticMarkup(<HomeFrame entrancePhase="preparing">Studio</HomeFrame>);
    expect(markup).toContain('data-stage-entrance="preparing"');
    expect(markup).toContain('<header class="home-header" inert="" aria-hidden="true">');
  });

  it.each(['entering', 'ready'] as const)('makes the island accessible while %s', (phase) => {
    const markup = renderToStaticMarkup(<HomeFrame entrancePhase={phase}>Studio</HomeFrame>);
    expect(markup).toContain(`data-stage-entrance="${phase}"`);
    expect(markup).toContain('<header class="home-header">');
    expect(markup).not.toContain('inert=""');
  });

  it('leaves other application frames immediately visible', () => {
    const markup = renderToStaticMarkup(<HomeFrame variant="dossier">Dossier</HomeFrame>);
    expect(markup).toContain('dossier-shell');
    expect(markup).toContain('<header class="home-header">');
    expect(markup).not.toContain('data-stage-entrance');
    expect(markup).not.toContain('inert=""');
  });
});
