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
    'restores %s without a progress page or entrance replay',
    (pathname) => {
      route.restoring = true;
      const markup = render(pathname, 'parcours=verification');
      expect(markup).toContain('data-entrance="settled"');
      expect(markup).not.toContain('data-entrance="playing"');
      expect(markup).toContain('href="/categories/verification"');
      expect(markup).toContain('data-entrance-phase="ready"');
      expect(markup).toContain('aria-busy="false"');
      expect(markup).not.toContain('class="stage-loading-screen"');
      expect(markup).not.toContain('Préparation');
      expect(markup).toContain('<div class="category-stage-dock">');
      expect(markup).not.toContain('inert=""');
    },
  );
  it('shows exactly three category choices at home', () => {
    const markup = render('/');
    expect(markup.match(/role="tab"/g)).toHaveLength(3);
    expect(markup).toContain('aria-orientation="vertical"');
    expect(markup).toContain('id="category-stage-tab-forfait_expertise"');
    expect(markup).toContain('id="category-stage-tab-chiffrage_rapide"');
    expect(markup).toContain('id="category-stage-tab-verification"');
    expect(markup).toContain('>Forfait / Devis d’expertise</span>');
    expect(markup).toContain('>Chiffrage rapide</span>');
    expect(markup).toContain('>Photos avant / après</span>');
    expect(markup.match(/class="category-stage-tab-index" aria-hidden="true"/g)).toHaveLength(3);
    expect(markup).toContain('aria-hidden="true">01</span>');
    expect(markup).toContain('aria-hidden="true">02</span>');
    expect(markup).toContain('aria-hidden="true">03</span>');
    expect(markup).toContain('href="/categories/forfait-expertise"');
    expect(markup).toContain('data-model="/models/studio-v2/cabek-vehicle.glb"');
    expect(markup).toContain('data-renderer="three-webgl"');
    expect(markup.match(/class="scanning-bay-canvas-host"/g)).toHaveLength(1);
    expect(markup).toContain('data-entrance="playing"');
    expect(markup).toContain('data-entrance-phase="preparing"');
    expect(markup).toContain('aria-busy="true"');
    expect(markup).toContain('class="stage-loading-screen" role="status"');
    expect(markup).toContain('Préparation de votre espace…');
    expect(markup).toContain('<div class="category-stage-dock" inert="" aria-hidden="true">');
    expect(markup).toContain(
      'aria-selected="true" aria-controls="category-stage-panel" tabindex="0"',
    );
    expect(markup).not.toContain('pearl-sedan.png');
    expect(markup).not.toContain('Voir le passage');
    expect(markup).not.toContain('<video');
    expect(markup).not.toContain('L’expertise.');
  });
  it.each(['forfait-expertise', 'chiffrage-rapide', 'verification'])(
    'plays the introduction for selected category %s while keeping its destination',
    (slug) => {
      const markup = render('/', `parcours=${slug}`);
      expect(markup).toContain(`href="/categories/${slug}"`);
      expect(markup).toContain('data-model="/models/studio-v2/cabek-vehicle.glb"');
      expect(markup.match(/class="scanning-bay-canvas-host"/g)).toHaveLength(1);
      expect(markup).toContain('data-entrance="playing"');
      expect(markup).toContain('class="stage-loading-screen"');
      expect(markup).toContain('<div class="category-stage-dock" inert="" aria-hidden="true">');
      expect(markup.match(/aria-selected="true"/g)).toHaveLength(1);
    },
  );
  it('ignores an unknown parcours and starts the introduction with expertise selected', () => {
    const markup = render('/', 'parcours=unknown');
    expect(markup).toContain('href="/categories/forfait-expertise"');
    expect(markup).toContain('data-entrance="playing"');
    expect(markup).toContain('data-entrance-phase="preparing"');
    expect(markup.match(/aria-selected="true"/g)).toHaveLength(1);
  });
  it('keeps the existing preview URL available with the new selector', () => {
    expect(render('/preview/expertise')).toContain('category-stage');
  });
  it.each(['chiffrage-rapide', 'verification'])(
    'opens the %s collection and creation screens directly',
    (slug) => {
      expect(render(`/categories/${slug}`)).toContain('Créer un dossier');
      expect(render(`/categories/${slug}/new`)).toContain('<form aria-label="Créer');
    },
  );
  it('keeps expertise externally created and rejects its creation route', () => {
    expect(render('/categories/forfait-expertise')).not.toContain('Créer un dossier');
    expect(render('/categories/forfait-expertise/new')).toContain('Cette page est introuvable');
  });
  it('keeps dossier IDs and unknown routes distinct', () => {
    expect(render('/dossiers/DOS%20001')).toContain('Dossier DOS 001');
    expect(render('/dossiers/%ZZ')).toContain('Cette page est introuvable');
    expect(render('/categories/missing')).toContain('Cette page est introuvable');
  });
});
