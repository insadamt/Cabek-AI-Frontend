/** Verifies island activity priority and route-scoped durable recovery; depends on server-rendered React and mocked operation stores. */
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CaptureSession } from '../../captureTypes';
import type { DossierOpeningSession } from '../../lib/dossierOpeningState';
import { getPreviewResult, previewDossiers } from '../../preview/data';
import { AnalysisIsland } from './AnalysisIsland';

const state = vi.hoisted(() => ({
  opening: null as DossierOpeningSession | null,
  capture: null as CaptureSession | null,
  location: '/',
  errorDismissed: false,
}));
vi.mock('../../hooks/useIslandErrorTimeout', () => ({
  useIslandErrorTimeout: () => state.errorDismissed,
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
  state.errorDismissed = false;
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
  it('keeps an empty imported capture idle instead of announcing AI at zero photos', () => {
    const response = getPreviewResult(previewDossiers[0].dossier_id);
    state.location = '/?parcours=forfait-expertise&scene=1';
    state.capture = {
      identity: { type: 'forfait_expertise', dossierId: response.dossier_id, creationKey: 'idle' },
      synchronized: true,
      pending: false,
      error: '',
      response: { ...response, type: 'forfait_expertise', status: 'not_analyzed', photos: [] },
      capture: {
        dossier_id: response.dossier_id,
        phase: null,
        capture_id: null,
        status: 'completed',
        expected_count: 4,
        saved_count: 0,
        photos: [],
        error_code: null,
        analysis_error: null,
      },
    };
    const markup = renderToStaticMarkup(<AnalysisIsland />);
    expect(markup).toContain('data-phase="idle"');
    expect(markup).not.toContain('capture-island-activity');
    expect(markup).not.toContain('Analyse IA en cours');
    expect(markup).not.toContain('0/4');
  });

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

describe('expired island error presentation', () => {
  it('restores the brand after a capture error expires while retaining its recoverable session', () => {
    state.capture = {
      identity: { type: 'chiffrage_rapide', creationKey: 'same', dossierId: 'SAVED' },
      pending: false,
      synchronized: false,
      error: 'Connexion indisponible',
    };
    state.location = '/?reprendre=1';
    expect(renderToStaticMarkup(<AnalysisIsland />)).toContain('data-phase="error"');
    state.errorDismissed = true;
    const markup = renderToStaticMarkup(<AnalysisIsland />);
    expect(markup).toContain('data-phase="idle"');
    expect(markup).toContain('tabindex="0" aria-hidden="false"');
    expect(markup).not.toContain('Connexion indisponible');
    expect(markup).not.toContain('capture-island-activity');
    expect(state.capture.identity.dossierId).toBe('SAVED');
  });
  it('collapses a failed opening without cancelling its retryable workflow', () => {
    const cancel = vi.fn();
    const retry = vi.fn();
    state.opening = {
      dossier: previewDossiers[0],
      phase: 'error',
      error: 'Image indisponible',
      loaded: 0,
      total: 6,
      retry,
      cancel,
    };
    state.errorDismissed = true;
    const markup = renderToStaticMarkup(<AnalysisIsland />);
    expect(markup).toContain('data-phase="idle"');
    expect(markup).not.toContain('Chargement interrompu');
    expect(cancel).not.toHaveBeenCalled();
    expect(state.opening.retry).toBe(retry);
  });
});

it('renders confirmed tunnel AI with the same pixels, timer and progress as carousel analysis', () => {
  const response = getPreviewResult(previewDossiers[0].dossier_id);
  state.capture = {
    identity: { type: 'chiffrage_rapide', creationKey: 'capture', dossierId: response.dossier_id },
    pending: false,
    synchronized: true,
    error: '',
    receivedAt: 100,
    startedAt: 100,
    capture: {
      dossier_id: response.dossier_id,
      phase: null,
      capture_id: 'C',
      status: 'completed',
      expected_count: 4,
      saved_count: 4,
      photos: [],
      error_code: null,
      analysis_error: null,
    },
    response: {
      ...response,
      type: 'chiffrage_rapide',
      status: 'processing',
      progress: {
        stage: 'analyzing_photos',
        photos_completed: 1,
        photos_total: 4,
        elapsed_seconds: 2,
        eta_seconds: 6,
      } as never,
    },
  };
  const markup = renderToStaticMarkup(<AnalysisIsland />);
  expect(markup).toContain('data-phase="working"');
  expect(markup).toContain('island-pixel-grid');
  expect(markup).toContain('class="island-timer"');
  expect(markup).toContain('Analyse des photos');
  expect(markup).toContain('aria-valuenow="25"');
  expect(markup).not.toContain('capture-island-activity');
});
