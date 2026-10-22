import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { getPreviewResult, previewDossiers } from '../../preview/data';
import { DossierEstimateWorkspace } from './DossierEstimateWorkspace';
import { DossierResultWorkspace } from './DossierResultWorkspace';
import { PartCard } from './PartCard';
import { PartDetails } from './PartDetails';
import { FinancialDetails } from './FinancialDetails';
import { DetailsDrawer } from './DetailsDrawer';
import type { AnalysisResult } from '../../types';

const result = getPreviewResult(previewDossiers[1].dossier_id).result!;
const props = {
  dossierId: 'test',
  result,
  status: 'completed' as const,
  loading: false,
  error: null,
  onRetry: vi.fn(),
  onShowPhoto: vi.fn(),
};

// These checks exercise saved-result states without browser automation or fabricated financial calculations.

function renderResult(value: AnalysisResult) {
  return renderToStaticMarkup(<DossierEstimateWorkspace {...props} result={value} />);
}

describe('estimate and damage states', () => {
  it('shows actual totals, part art and distinct damage labels', () => {
    const markup = renderResult(result);
    expect(markup).toContain('MAD');
    expect(markup).toContain('à réparer');
    expect(markup).toContain('à remplacer');
    expect(markup).toContain('/images/parts/front-bumper.webp');
    expect(markup).toContain('/images/parts/front-fender-left.webp');
    expect(markup).toContain('damage-badge-blue');
    expect(markup).toContain('Illustrations génériques');
  });
  it('shows a known subtotal and missing prices without inventing a complete total', () => {
    const incomplete = getPreviewResult(previewDossiers[4].dossier_id).result!;
    const markup = renderResult(incomplete);
    expect(markup).toContain('Estimation incomplète');
    expect(markup).toContain('Sous-total connu');
    expect(markup).toContain('Prix incomplet');
    expect(markup).not.toContain('Certains montants restent à compléter');
    const details = renderToStaticMarkup(<FinancialDetails financial={incomplete.financial} />);
    expect(details).toContain('Certains montants restent à compléter');
  });
  it('preserves a zero estimate and avoids asserting that no detections exist when the parts array is empty', () => {
    const markup = renderResult({
      ...result,
      parts: [],
      financial: { ...result.financial, estimated_total: 0 },
    });
    expect(markup).toContain('0,00');
    expect(markup).toContain('Aucune pièce endommagée répertoriée');
    expect(markup).not.toContain('Aucun dommage détecté');
  });
  it('offers a source action only for a uniquely mapped photo', () => {
    const part = { ...result.parts[0], source_images: ['source.jpg', 'missing.jpg'] };
    const markup = renderToStaticMarkup(
      <PartDetails
        part={part}
        detections={[]}
        onShowPhoto={vi.fn()}
        photos={[
          {
            photo_id: 'source',
            original_url: '/photos/source.jpg',
            parts_url: '',
            damages_url: '',
          },
        ]}
      />,
    );
    expect(markup).toContain('Voir la photo 1');
    expect(markup).toContain('Certaines vues sources ne sont pas disponibles.');
    expect(markup).not.toContain('missing.jpg');
  });
  it('keeps pricing ahead of a bounded source gallery for parts with many views', () => {
    const photos = Array.from({ length: 6 }, (_, index) => ({
      photo_id: `source-${index}`,
      original_url: `/photos/source-${index}.jpg`,
      parts_url: '',
      damages_url: '',
    }));
    const part = { ...result.parts[0], source_images: photos.map((photo) => photo.photo_id) };
    const markup = renderToStaticMarkup(
      <PartDetails part={part} detections={[]} photos={photos} onShowPhoto={vi.fn()} />,
    );
    expect(markup.indexOf('Chiffrage de la pièce')).toBeLessThan(markup.indexOf('Photos sources'));
    expect(markup.match(/class="source-photo-button"/g)).toHaveLength(4);
    expect(markup).toContain('Voir les 2 autres vues');
    expect(markup).not.toContain('Voir la photo 5');
  });
  it('keeps inspection content out of the overview and exposes a single card action', () => {
    const markup = renderToStaticMarkup(
      <PartCard
        part={result.parts[0]}
        detections={result.detections}
        selected={false}
        onOpenDetails={vi.fn()}
      />,
    );
    expect(markup).toContain('aria-haspopup="dialog"');
    expect(markup).toContain('Voir les détails : Pare-chocs avant');
    expect(markup).not.toContain('<details');
    expect(markup).not.toContain('Confiance');
    expect(markup).not.toContain('Photographies sources');
    expect(markup).not.toContain('financial-breakdown');
  });
  it('keeps the global breakdown behind its drawer action', () => {
    const markup = renderResult(result);
    expect(markup).toContain('Détail du montant');
    expect(markup).not.toContain('financial-breakdown');
    expect(markup).not.toContain('<dialog');
  });
  it('labels the drawer and keeps its close control outside scrolling content', () => {
    const markup = renderToStaticMarkup(
      <DetailsDrawer title="Capot" subtitle="Réparer" onClose={vi.fn()}>
        {() => <p>Inspection</p>}
      </DetailsDrawer>,
    );
    expect(markup).toContain('<dialog');
    expect(markup).toContain('aria-labelledby=');
    expect(markup).toContain('Fermer les détails');
    expect(markup.indexOf('Fermer les détails')).toBeLessThan(
      markup.indexOf('details-drawer-content'),
    );
  });
  it('keeps a saved estimate visible after a refresh error', () => {
    const markup = renderToStaticMarkup(
      <DossierEstimateWorkspace {...props} error={new Error('offline')} />,
    );
    expect(markup).toContain('Actualisation indisponible');
    expect(markup).toContain('Pièces et dommages');
  });
  it('distinguishes pending, failed, missing and unavailable results', () => {
    expect(
      renderToStaticMarkup(<DossierEstimateWorkspace {...props} result={null} loading />),
    ).toContain('Chargement de l’estimation');
    expect(
      renderToStaticMarkup(<DossierEstimateWorkspace {...props} result={null} status="failed" />),
    ).toContain('L’analyse n’a pas abouti');
    expect(renderToStaticMarkup(<DossierEstimateWorkspace {...props} result={null} />)).toContain(
      'Résultat indisponible',
    );
    expect(
      renderToStaticMarkup(
        <DossierEstimateWorkspace {...props} result={null} error={new Error('offline')} />,
      ),
    ).toContain('Réessayer');
  });
  it('mounts both accessible panels and initially hides estimation', () => {
    const markup = renderToStaticMarkup(
      <DossierResultWorkspace
        dossierId="test"
        response={{
          dossier_id: 'test',
          status: 'completed',
          progress: null,
          error: null,
          result: { ...result, photos: [] },
        }}
        status="completed"
        loading={false}
        error={null}
        onRetry={vi.fn()}
      />,
    );
    expect(markup).toContain('role="tablist"');
    expect(markup).toContain('id="dossier-tab-photos" role="tab" aria-selected="true"');
    expect(markup).toContain(
      'id="dossier-panel-estimate" aria-labelledby="dossier-tab-estimate" hidden=""',
    );
    expect(markup).toContain('Pièces et dommages');
  });
});
