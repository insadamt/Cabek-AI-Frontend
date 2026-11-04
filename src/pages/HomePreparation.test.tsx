/** Prevents a loading-frame flash when a prepared collection first mounts; depends on server-rendered Home with isolated resource and frame boundaries. */
import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { DossierSummary } from '../types';
const state = vi.hoisted(() => ({
  prepared: undefined as { items: DossierSummary[]; indices: number[]; total: number } | undefined,
}));
vi.mock('../hooks/useNavigation', () => ({
  useNavigation: () => ({ searchParams: new URLSearchParams() }),
}));
vi.mock('../hooks/useResource', () => ({
  useResource: () => ({ loading: true, error: null, data: undefined, refresh: vi.fn() }),
}));
vi.mock('../lib/collectionPreparation', () => ({ getPreparedCollection: () => state.prepared }));
vi.mock('../components/home/HomeFrame', () => ({
  HomeFrame: ({ children }: { children: ReactNode }) => <main>{children}</main>,
}));
vi.mock('../components/home/CategoryControls', () => ({ CategoryControls: () => <header /> }));
vi.mock('../components/home/DossierCarousel', () => ({
  DossierCarousel: () => <section>Prepared folders</section>,
}));
import { Home } from './Home';
import { categories } from '../lib/workflows';
import { previewDossiers } from '../preview/data';
beforeEach(() => {
  state.prepared = undefined;
  vi.stubGlobal('window', { history: { state: { ejectFolders: true } } });
});
afterEach(() => vi.unstubAllGlobals());
describe('prepared collection first paint', () => {
  it('renders real folders before the resource effect resolves', () => {
    state.prepared = { items: [previewDossiers[0]], indices: [0], total: 1 };
    const markup = renderToStaticMarkup(<Home category={categories[0]} />);
    expect(markup).toContain('Prepared folders');
    expect(markup).not.toContain('home-loading-indicator');
  });
  it('renders a prepared empty collection without a loading flash', () => {
    state.prepared = { items: [], indices: [], total: 0 };
    const markup = renderToStaticMarkup(<Home category={categories[0]} />);
    expect(markup).toContain('Aucun dossier');
    expect(markup).not.toContain('home-loading-indicator');
  });
  it('keeps genuine loading feedback for an unprepared direct visit', () => {
    const markup = renderToStaticMarkup(<Home category={categories[0]} />);
    expect(markup).toContain('home-loading-indicator');
  });
});
