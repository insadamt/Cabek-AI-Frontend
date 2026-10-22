import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getPreviewResult, previewDossiers } from '../preview/data';
import { Dossier } from './Dossier';

const resources = vi.hoisted(() => ({ read: vi.fn() }));
vi.mock('../hooks/useResource', () => ({ useResource: resources.read }));
vi.mock('../hooks/useDossierEntrance', () => ({ useDossierEntrance: () => true }));
vi.mock('../components/home/DossierFolder', () => ({ DossierFolder: () => null }));
vi.mock('../components/dossier/DossierResultWorkspace', () => ({
  DossierResultWorkspace: () => null,
}));

beforeEach(() => {
  vi.stubGlobal('window', { history: { state: null } });
  resources.read.mockReset();
});
afterEach(() => vi.unstubAllGlobals());

describe('dossier metadata from the result endpoint', () => {
  it('prefers current metadata and existing photo count over the saved analysis and list', () => {
    const summary = previewDossiers.find((dossier) => dossier.status === 'completed')!;
    const response = getPreviewResult(summary.dossier_id);
    response.vehicle = { marque: 'Current brand', modele: 'Current model', matricule: 'CURRENT' };
    response.photos = [];
    resources.read.mockReturnValueOnce({ data: response }).mockReturnValueOnce({ data: summary });
    const markup = renderToStaticMarkup(<Dossier dossierId={summary.dossier_id} />);
    expect(markup).toContain('Current brand Current model');
    expect(markup).toContain('CURRENT');
    expect(markup).not.toContain(summary.vehicle.modele);
    expect(markup).toContain('<dt>Photographies</dt><dd title="0">0</dd>');
  });

  it('opens an unscanned dossier from its result response before the summary arrives', () => {
    const summary = previewDossiers.find((dossier) => dossier.status === 'not_analyzed')!;
    resources.read
      .mockReturnValueOnce({ data: getPreviewResult(summary.dossier_id) })
      .mockReturnValueOnce({ loading: true });
    const markup = renderToStaticMarkup(<Dossier dossierId={summary.dossier_id} />);
    expect(markup).toContain(`${summary.vehicle.marque} ${summary.vehicle.modele}`);
    expect(markup).toContain('À analyser');
    expect(markup).not.toContain('Chargement du dossier');
  });
});
