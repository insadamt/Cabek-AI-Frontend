/** Route rendering checks for category-first entry, supported creation and stable dossier links. */
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import App from '../App';

const route = vi.hoisted(() => ({ pathname: '/', search: '' }));
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
  it('shows exactly three category choices at home', () => {
    const markup = render('/');
    expect(markup.match(/class="category-choice"/g)).toHaveLength(3);
    expect(markup).toContain('href="/categories/forfait-expertise"');
    expect(markup).toContain('href="/categories/chiffrage-rapide"');
    expect(markup).toContain('href="/categories/verification"');
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
