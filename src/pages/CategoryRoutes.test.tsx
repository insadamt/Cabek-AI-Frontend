/**
 * Verifies the preparation screen, hidden unfinished controls and stable workflow destinations.
 * Depends on server-rendered React markup, the real scene host and mocked navigation/data services.
 */
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../App';

const route = vi.hoisted(() => ({ pathname: '/', search: '', restoring: false }));
vi.mock('../lib/stageVisit', () => ({
  shouldRestoreStageVisit: () => route.restoring,
  rememberStageVisit: vi.fn(),
}));
vi.mock('../hooks/useNavigation', () => ({
  useNavigation: () => ({
    pathname: route.pathname,
    searchParams: new URLSearchParams(route.search),
    navigate: vi.fn(),
  }),
  navigate: vi.fn(),
}));
vi.mock('../hooks/useRouteMotion', () => ({ useRouteMotion: () => ({ current: null }) }));
vi.mock('../hooks/useWorkflowReveal', () => ({ useWorkflowReveal: () => ({ current: null }) }));
vi.mock('../hooks/useResource', () => ({
  useResource: () => ({
    data: { items: [], indices: [], total: 0 },
    loading: false,
    refresh: vi.fn(),
  }),
}));
vi.mock('../components/home/HomeFrame', () => ({
  HomeFrame: ({ children }: { children: import('react').ReactNode }) => <main>{children}</main>,
}));
vi.mock('../components/dossier/DossierCreationForm', () => ({
  DossierCreationForm: ({ type }: { type: string }) => <form aria-label={`Créer ${type}`} />,
}));
vi.mock('./Dossier', () => ({
  Dossier: ({ dossierId }: { dossierId: string }) => <div>Dossier {dossierId}</div>,
}));

function render(pathname: string, search = '') {
  route.pathname = pathname;
  route.search = search;
  return renderToStaticMarkup(<App />);
}
describe('category-first application routes', () => {
  beforeEach(() => {
    route.restoring = false;
  });

  it.each(['/', '/preview/expertise'])(
    'shows three glass category folders at %s without preparing a hidden scene',
    (pathname) => {
      const markup = render(pathname);
      expect(markup.match(/data-category-folder=/g)).toHaveLength(3);
      expect(markup).toContain('aria-label="Forfait / Devis d’expertise"');
      expect(markup).toContain('aria-label="Chiffrage rapide"');
      expect(markup).toContain('aria-label="Photos avant / après"');
      expect(markup).toContain('role="group" aria-label="Choisir un parcours"');
      expect(markup).not.toContain('data-dossier-id=');
      expect(markup).not.toContain('scanning-bay-canvas-host');
      expect(markup).not.toContain('stage-loading-screen');
    },
  );
  it.each(['chiffrage-rapide', 'verification'])(
    'loads the %s tunnel after selection with collection navigation and metadata control',
    (slug) => {
      const markup = render('/', `parcours=${slug}&scene=1`);
      expect(markup).toContain(`href="/categories/${slug}"`);
      expect(markup).toContain('Voir les dossiers');
      expect(markup).toContain('FICHE VÉHICULE');
      expect(markup).not.toMatch(/>SCANNER<\/span>/);
      expect(markup.match(/class="scanning-bay-canvas-host"/g)).toHaveLength(1);
      expect(markup).toContain('data-entrance-phase="preparing"');
      expect(markup).toContain('class="stage-loading-screen"');
      expect(markup).not.toContain('data-category-folder=');
    },
  );
  it('restores a selected tunnel without replaying its entrance', () => {
    route.restoring = true;
    const markup = render('/', 'parcours=verification&scene=1');
    expect(markup).toContain('data-entrance="waiting"');
    expect(markup).toContain('data-entrance-phase="ready"');
    expect(markup).not.toContain('stage-loading-screen');
  });
  it('keeps unknown scene links on category navigation', () => {
    expect(render('/', 'parcours=unknown&scene=1')).toContain('category-folder-grid');
  });
  it('opens expertise capture with dossier selection and no creation or metadata form', () => {
    const markup = render('/', 'parcours=forfait-expertise&scene=1');
    expect(markup).toContain('CHOISIR UN DOSSIER');
    expect(markup).toContain('href="/categories/forfait-expertise"');
    expect(markup).not.toContain('FICHE VÉHICULE');
    expect(markup).not.toContain('Nouveau dossier');
    expect(markup).not.toContain('category-folder-grid');
  });
  it('keeps the existing preview URL available with the new selector', () => {
    expect(render('/preview/expertise')).toContain('category-stage');
  });
  it.each(['chiffrage-rapide', 'verification'])(
    'opens the %s collection and creation screens directly',
    (slug) => {
      expect(render(`/categories/${slug}`)).toContain('Nouveau dossier');
      expect(render(`/categories/${slug}/new`)).toContain('class="tunnel-stage"');
    },
  );
  it('keeps expertise externally created and rejects its creation route', () => {
    expect(render('/categories/forfait-expertise')).not.toContain('Nouveau dossier');
    expect(render('/categories/forfait-expertise/new')).toContain('Cette page est introuvable');
  });
  it('keeps dossier IDs and unknown routes distinct', () => {
    expect(render('/dossiers/DOS%20001')).toContain('Dossier DOS 001');
    expect(render('/dossiers/%ZZ')).toContain('Cette page est introuvable');
    expect(render('/categories/missing')).toContain('Cette page est introuvable');
  });
});
