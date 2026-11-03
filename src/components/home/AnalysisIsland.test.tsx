/** Verifies island activity priority and route-scoped durable recovery; depends on server-rendered React and mocked operation stores. */
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CaptureSession } from '../../captureTypes';
import type { DossierOpeningSession } from '../../lib/dossierOpeningState';
import { previewDossiers } from '../../preview/data';
import { AnalysisIsland } from './AnalysisIsland';

const state = vi.hoisted(() => ({
  opening: null as DossierOpeningSession | null,
  capture: null as CaptureSession | null,
  location: '/',
}));
vi.mock('../../hooks/useNavigation', () => ({
  useNavigation: () => ({ location: state.location }),
  navigate: vi.fn(),
}));
vi.mock('../../hooks/useTunnelCapture', () => ({
  useTunnelCapture: () => ({ session: state.capture }),
}));
vi.mock('../../hooks/useDossierOpening', () => ({ useDossierOpening: () => state.opening }));
vi.mock('../../hooks/useHomeAnalysis', () => ({
  useHomeAnalysis: () => ({ session: null, busy: false }),
}));

beforeEach(() => {
  state.opening = null;
  state.capture = null;
  state.location = '/';
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

describe('capture island visibility', () => {
  function restore() {
    state.capture = {
      identity: { type: 'chiffrage_rapide', creationKey: 'recovery', dossierId: 'SAVED' },
      pending: false,
      synchronized: false,
      error: 'Connexion indisponible',
    };
  }
  it.each(['/', '/categories/forfait-expertise', '/dossiers/OTHER'])(
    'keeps persisted errors compact at %s',
    (path) => {
      restore();
      state.location = path;
      const markup = renderToStaticMarkup(<AnalysisIsland />);
      expect(markup).toContain('data-phase="idle"');
      expect(markup).not.toContain('Connexion indisponible');
      expect(markup).not.toContain('capture-island-activity');
      expect(state.capture?.identity.dossierId).toBe('SAVED');
    },
  );
  it('presents readable recovery only when the operator resumes the tunnel', () => {
    restore();
    state.location = '/?reprendre=1';
    const markup = renderToStaticMarkup(<AnalysisIsland />);
    expect(markup).toContain('data-capture-presentation="recovery"');
    expect(markup).toContain('Connexion indisponible');
    expect(markup).toContain('Reprendre');
  });
  it('yields capture presentation entirely to dossier image preparation', () => {
    restore();
    state.location = '/?reprendre=1';
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
    expect(markup).toContain('dossier-opening-island');
    expect(markup).not.toContain('data-capture-presentation');
    expect(markup).not.toContain('capture-island-activity');
    expect(markup).not.toContain('Connexion indisponible');
  });
  it('keeps an active draft request visible and collapses when it stops away from the tunnel', () => {
    restore();
    state.capture!.error = '';
    state.capture!.pending = true;
    expect(renderToStaticMarkup(<AnalysisIsland />)).toContain('capture-island-activity');
    state.capture!.pending = false;
    expect(renderToStaticMarkup(<AnalysisIsland />)).toContain('data-phase="idle"');
  });
});
