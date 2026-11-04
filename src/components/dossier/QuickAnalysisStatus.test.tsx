/** Confirms photos remain inspectable while real inference/pricing have separate feedback; depends on React markup and API DTOs. */
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { QuickAnalysisStatus } from './QuickAnalysisStatus';
import type { DossierResponse } from '../../types';

const waiting: DossierResponse = {
  dossier_id: 'REAL-1',
  type: 'chiffrage_rapide',
  status: 'processing',
  workflow_status: 'awaiting_metadata',
  vehicle: { marque: '', modele: '', matricule: '' },
  photos: [{ photo_id: 'p1', original_url: '/p1.jpg' }],
  progress: {
    stage: 'awaiting_metadata',
    annotations_ready: 3,
    annotations_expected: 3,
    photos_completed: 1,
    photos_total: 1,
    elapsed_seconds: 10,
    eta_seconds: null,
    report_ready: false,
    result_ready: false,
  },
  error: null,
  result: null,
};
describe('quick analysis feedback', () => {
  it('distinguishes saved photos and completed detection from pricing that needs a vehicle', () => {
    const markup = renderToStaticMarkup(<QuickAnalysisStatus response={waiting} />);
    expect(markup).toContain('1 photos enregistrées');
    expect(markup).toContain('Détection terminée');
    expect(markup).toContain('chiffrage en attente');
    expect(markup).toContain('1/1 photos analysées');
    expect(markup).toContain('Les photographies restent consultables');
    expect(markup).not.toContain('Analyse et estimation enregistrées');
  });
  it('shows real failures without presenting a fabricated estimate', () => {
    const markup = renderToStaticMarkup(
      <QuickAnalysisStatus
        response={{
          ...waiting,
          status: 'failed',
          error: { code: 'scan_timeout', message: 'Timed out' },
        }}
      />,
    );
    expect(markup).toContain('photographies conservées');
    expect(markup).toContain('Le délai maximal');
    expect(markup).not.toContain('Analyse et estimation enregistrées');
  });
});
