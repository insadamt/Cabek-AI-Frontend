/** Static accessibility and workflow-boundary checks; uses real components and mocked resource reads. */
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DossierCreationForm } from './DossierCreationForm';
import { WorkflowPhotoCapture } from './WorkflowPhotoCapture';
import { VerificationWorkspace } from './VerificationWorkspace';
import { AnalysisAction } from '../home/AnalysisAction';
import { getPreviewResult } from '../../preview/data';

vi.mock('../../hooks/useResource', () => ({
  useResource: () => ({ data: [], loading: false, refresh: vi.fn() }),
}));
vi.mock('../../hooks/useWorkflowReveal', () => ({ useWorkflowReveal: () => ({ current: null }) }));
beforeEach(() => vi.clearAllMocks());

describe('workflow screens', () => {
  it.each(['RAPIDE-APERCU-01', 'RAPIDE-APERCU-02'])(
    'opens quick dossier %s for capture before scanning',
    (id) => {
      const response = getPreviewResult(id);
      const markup = renderToStaticMarkup(
        <AnalysisAction
          className="action"
          dossier={{ ...response, photo_count: response.photos.length, created_at: null }}
        />,
      );
      expect(markup).toContain('Ouvrir le dossier');
      expect(markup).not.toContain('Analyser le dossier');
    },
  );
  it('requires full metadata and disables the model until a brand is chosen', () => {
    const markup = renderToStaticMarkup(<DossierCreationForm type="chiffrage_rapide" />);
    expect(markup).toContain('Date de mise en circulation<input required="" type="date"');
    expect(markup).toContain('Modèle<select required="" disabled=""');
    expect(markup).toContain('Matricule<input required="" maxLength="100" dir="auto"');
    expect(markup).toMatch(/<button[^>]*type="submit"[^>]*disabled=""/);
  });
  it('permits multiple photos for one side in a quick estimate', () => {
    const markup = renderToStaticMarkup(
      <WorkflowPhotoCapture
        response={getPreviewResult('RAPIDE-APERCU-01')}
        onSaved={vi.fn()}
        onRefresh={vi.fn()}
      />,
    );
    expect(markup).toContain('type="file" accept="image/jpeg,image/png" multiple=""');
    expect(markup).toContain('Aucune photo enregistrée pour ce côté.');
    expect(markup).toContain('aria-pressed="true"');
  });
  it('locks the after phase until all four before sides have been saved', () => {
    const markup = renderToStaticMarkup(
      <VerificationWorkspace
        response={getPreviewResult('VERIF-APERCU-01')}
        onSaved={vi.fn()}
        onRefresh={vi.fn()}
      />,
    );
    expect(markup).toContain('2/8');
    expect(markup).toContain('Après réparation');
    expect(markup).toMatch(/<button[^>]*disabled=""[^>]*>Après réparation/);
    expect(markup).not.toContain('multiple=""');
    expect(markup).not.toMatch(/Analyser|Estimation|PDF|progressbar/);
  });
  it('presents distinct before and after originals once all eight slots are saved', () => {
    const markup = renderToStaticMarkup(
      <VerificationWorkspace
        response={getPreviewResult('VERIF-APERCU-04')}
        onSaved={vi.fn()}
        onRefresh={vi.fn()}
      />,
    );
    expect(markup).toContain('8/8 PHOTOS ENREGISTRÉES');
    expect(markup).toContain('Avant réparation · Avant');
    expect(markup).toContain('Après réparation · Avant');
    expect(markup).toContain('Deux prises de vue indépendantes');
    expect(markup).not.toMatch(/Analyser|Estimation|PDF|progressbar/);
  });
  it('honors durable evidence locks even when an original is missing', () => {
    const response = getPreviewResult('VERIF-APERCU-04');
    const missing = {
      ...response,
      photos: response.photos.filter(
        (photo) => !(photo.side === 'front' && photo.phase === 'before'),
      ),
      comparison: {
        slots: [],
        missing_before: ['front' as const],
        missing_after: [],
        before_locked: true,
        finalized: true,
      },
    };
    const markup = renderToStaticMarkup(
      <VerificationWorkspace response={missing} onSaved={vi.fn()} onRefresh={vi.fn()} />,
    );
    expect(markup).toContain('7/8');
    expect(markup).toContain('Ces photographies sont finalisées.');
    expect(markup).not.toContain('type="file"');
  });
  it.each(['not_analyzed', 'failed', 'processing', 'completed'] as const)(
    'verification has only an open action even with stale AI status %s',
    (status) => {
      const response = getPreviewResult('VERIF-APERCU-04');
      const markup = renderToStaticMarkup(
        <AnalysisAction
          className="action"
          dossier={{ ...response, status, photo_count: response.photos.length, created_at: null }}
        />,
      );
      expect(markup).toContain('Ouvrir le dossier');
      expect(markup).not.toMatch(/Analyser|Suivre|data-action="analyze"/);
    },
  );
});
