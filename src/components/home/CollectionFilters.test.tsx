/**
 * Guards shared collection filtering, date constraints and URL preservation after the visual redesign.
 * Depends on React server rendering, real category rules and mocked navigation.
 */
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { categories } from '../../lib/workflows';
import { CollectionFilters } from './CollectionFilters';

const route = vi.hoisted(() => ({ search: '', navigate: vi.fn() }));
vi.mock('../../hooks/useDismissibleDetails', () => ({
  useDismissibleDetails: () => ({ current: null }),
}));
vi.mock('../../hooks/useNavigation', () => ({
  useNavigation: () => ({
    pathname: '/categories/verification',
    searchParams: new URLSearchParams(route.search),
    navigate: route.navigate,
  }),
}));

beforeEach(() => {
  route.search = '';
  route.navigate.mockClear();
});

describe('shared collection filters', () => {
  it.each(categories)('uses the allowed statuses for $slug', (category) => {
    const markup = renderToStaticMarkup(<CollectionFilters category={category} />);
    expect(markup.match(/role="combobox"/g)).toHaveLength(2);
    expect(markup.match(/role="option"/g)).toHaveLength(category.statuses.length + 5);
    expect(markup).toContain('Tous les dossiers');
    expect(markup).toContain('disabled=""');
  });

  it('restores active values, shows their count and preserves date limits', () => {
    route.search =
      'workflow_status=awaiting_after&created_from=2026-10-01&created_to=2026-11-09&sort=created_at_asc';
    const markup = renderToStaticMarkup(<CollectionFilters category={categories[2]} />);
    expect(markup).toContain('4 filtres actifs');
    expect(markup).toContain('En attente des photos après');
    expect(markup).toContain('min="2026-10-01"');
    expect(markup).toContain('max="2026-11-09"');
    expect(markup).not.toContain('disabled=""');
  });

  it('clears filters and pagination while retaining the search and unrelated URL state', () => {
    route.search =
      'search=Renault&workflow_status=awaiting_after&sort=created_at_asc&slide=5&offset=24&custom=keep';
    const element = CollectionFilters({ category: categories[2] });
    const panel = element.props.children[1];
    const footer = panel.props.children.at(-1);
    footer.props.children[1].props.onClick();
    expect(route.navigate).toHaveBeenCalledWith(
      '/categories/verification?search=Renault&custom=keep',
    );
  });
});
