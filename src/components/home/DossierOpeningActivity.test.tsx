import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import type { DossierOpeningSession } from '../../lib/dossierOpeningState';
import { previewDossiers } from '../../preview/data';
import { DossierOpeningActivity } from './DossierOpeningActivity';

const session: DossierOpeningSession = {
  dossier: previewDossiers[0],
  phase: 'loading',
  loaded: 3,
  total: 6,
  error: '',
  retry: vi.fn(),
  cancel: vi.fn(),
};

describe('opening progress in the island', () => {
  it('reports actual image counts and progress rather than a simulated timer', () => {
    const markup = renderToStaticMarkup(<DossierOpeningActivity session={session} />);
    expect(markup).toContain('3/6');
    expect(markup).toContain('aria-valuemax="6" aria-valuenow="3"');
    expect(markup).toContain('width:50%');
  });
  it('keeps progress indeterminate until the result reveals the image count', () => {
    const markup = renderToStaticMarkup(
      <DossierOpeningActivity session={{ ...session, total: 0, loaded: 0 }} />,
    );
    expect(markup).not.toContain('aria-valuenow');
    expect(markup).toContain('is-indeterminate');
  });
  it('offers retry and cancel after failure without showing success', () => {
    const markup = renderToStaticMarkup(
      <DossierOpeningActivity
        session={{ ...session, phase: 'error', error: 'Image indisponible' }}
      />,
    );
    expect(markup).toContain('Réessayer le chargement des images');
    expect(markup).toContain('Annuler l’ouverture du dossier');
    expect(markup).not.toContain('is-success');
  });
});
