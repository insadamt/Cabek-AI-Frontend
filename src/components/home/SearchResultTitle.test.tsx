import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { previewDossiers } from '../../preview/data';
import { SearchResultTitle } from './SearchResultTitle';

const dossier = {
  ...previewDossiers[0],
  dossier_id: 'DOS-123',
  vehicle: {
    ...previewDossiers[0].vehicle,
    marque: 'Dacia',
    modele: 'Duster',
    matricule: '123-A-456',
  },
};
function render(search: string) {
  return renderToStaticMarkup(<SearchResultTitle dossier={dossier} search={search} />);
}
describe('search result titles', () => {
  it('shows registration and highlights the matching digits', () => {
    const markup = render('456');
    expect(markup).toContain('Immatriculation');
    expect(markup).toContain('<mark>456</mark>');
    expect(markup).not.toContain('Duster');
  });
  it('matches make and model without changing their casing', () => {
    expect(render('DUSTER')).toContain('<mark>Duster</mark>');
  });
  it('shows every matching field when a number matches both ID and registration', () => {
    const markup = render('123');
    expect(markup).toContain('Référence');
    expect(markup).toContain('Immatriculation');
    expect(markup.match(/<mark>123<\/mark>/g)).toHaveLength(2);
  });
  it('defaults to vehicle identity for an empty query', () => {
    expect(render('')).toContain('Dacia Duster');
    expect(render('')).not.toContain('<mark>');
  });
});
