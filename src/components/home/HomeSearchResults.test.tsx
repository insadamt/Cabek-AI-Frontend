import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { previewDossiers } from '../../preview/data';
import { HomeSearchResults } from './HomeSearchResults';

const selection = vi.hoisted(() => ({
  selectedFolder: null as import('../../types').DossierSummary | null,
  documentOpen: false,
  busy: false,
  selectFolder: vi.fn(),
  returnToGrid: vi.fn(),
  handleDocumentMotionChange: vi.fn(),
}));
vi.mock('../../hooks/useGridFolderSelection', () => ({ useGridFolderSelection: () => selection }));
vi.mock('../../hooks/useFolderGridMotion', () => ({
  useFolderGridMotion: () => ({ current: null }),
}));
vi.mock('../../hooks/useResource', () => ({
  useResource: () => ({
    data: { items: previewDossiers, total: previewDossiers.length, limit: 24 },
    loading: false,
  }),
}));
function render() {
  return renderToStaticMarkup(<HomeSearchResults search="" offset={0} />);
}
describe('focused grid folder controls', () => {
  beforeEach(() => {
    selection.selectedFolder = null;
    selection.documentOpen = false;
    selection.busy = false;
  });
  it('keeps the grid selection on the page instead of linking straight to a dossier', () => {
    const markup = render();
    expect(markup).toContain('Effacer');
    expect(markup).toContain('role="search"');
    expect(markup).toContain('data-mode="search"');
    expect(markup).toContain('class="search-return-label"');
    expect(markup).not.toContain('href="/dossiers/');
  });
  it.each([
    ['not_analyzed', 'Analyser'],
    ['completed', 'Ouvrir'],
    ['processing', 'Suivre'],
  ] as const)('shows Back and %s action %s for the focused folder', (status, label) => {
    selection.selectedFolder = { ...previewDossiers[0], status };
    selection.documentOpen = true;
    const markup = render();
    expect(markup).toContain('Retour');
    expect(markup).toContain('data-mode="return"');
    expect(markup).toContain('class="search-return-form" aria-hidden="true" inert=""');
    expect(markup).toContain(label);
    expect(markup).toContain(`href="/dossiers/${selection.selectedFolder.dossier_id}"`);
    expect(markup).toContain('aria-expanded="true"');
    expect(markup).not.toContain('role="search"');
    expect(markup).not.toContain('Effacer');
  });
  it('prevents grid interaction until the folder return and neighbor fade finish', () => {
    selection.busy = true;
    const markup = render();
    expect(markup).toContain('<div inert="" aria-busy="false" class="home-folder-grid');
    expect(markup).toContain(
      'class="home-clear-search" data-flip-id="home-action" type="button" disabled=""',
    );
  });
});
