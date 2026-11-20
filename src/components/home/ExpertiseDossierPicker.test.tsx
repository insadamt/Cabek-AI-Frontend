/** Verify imported-dossier selection, server queries, and safe empty/error states.
 * Depends on static rendering and controlled resources; no browser or hardware automation runs.
 */
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { DossierList } from '../../types';

const state = vi.hoisted(() => ({
  data: undefined as DossierList | undefined,
  loading: false,
  error: null as unknown,
  loader: undefined as ((signal: AbortSignal) => Promise<unknown>) | undefined,
  list: vi.fn().mockResolvedValue({ items: [] }),
}));
vi.mock('../../hooks/useResource', () => ({
  useResource: (_key: string, loader: (signal: AbortSignal) => Promise<unknown>) => {
    state.loader = loader;
    return { data: state.data, loading: state.loading, error: state.error, refresh: vi.fn() };
  },
}));
vi.mock('../../lib/api', () => ({
  listDossiers: state.list,
  describeError: (error: Error) => error.message,
}));
import { ExpertiseDossierPicker } from './ExpertiseDossierPicker';

function render() {
  return renderToStaticMarkup(<ExpertiseDossierPicker onSelect={vi.fn()} onClose={vi.fn()} />);
}
beforeEach(() => {
  vi.clearAllMocks();
  state.data = undefined;
  state.loading = false;
  state.error = null;
});

describe('expertise dossier picker', () => {
  it('uses server-filtered expertise search and pagination without any creation control', async () => {
    const markup = render();
    const signal = new AbortController().signal;
    await state.loader!(signal);
    expect(state.list).toHaveBeenCalledWith(
      {
        type: 'forfait_expertise',
        workflow_status: 'awaiting_photos',
        status: 'all',
        search: '',
        limit: 20,
        offset: 0,
        sort: 'created_at_desc',
      },
      signal,
    );
    expect(markup).toContain('type="search"');
    expect(markup).not.toContain('Capture à reprendre');
    expect(markup).not.toContain('État de la capture');
    expect(markup).not.toContain('Nouveau dossier');
    expect(markup).not.toContain('Fiche véhicule');
  });
  it('identifies each dossier by reference, vehicle, and registration', () => {
    state.data = {
      items: [
        {
          dossier_id: 'EXTERNAL-REF',
          type: 'forfait_expertise',
          source: 'external',
          workflow_status: 'awaiting_photos',
          status: 'not_analyzed',
          photo_count: 0,
          created_at: null,
          vehicle: { marque: 'Dacia', modele: 'Sandero', matricule: '84654-ب-454' },
        },
      ],
      total: 21,
      limit: 20,
      offset: 0,
      counts: {} as never,
      warnings: [],
    };
    const markup = render();
    expect(markup).toContain('EXTERNAL-REF');
    expect(markup).toContain('Dacia Sandero');
    expect(markup).toContain('<bdi>84654-ب-454</bdi>');
    expect(markup).toContain('Page 1 sur 2');
    expect(markup).toContain('Page suivante');
  });
  it('distinguishes loading, empty imports, and failed requests', () => {
    state.loading = true;
    expect(render()).toContain('Chargement des dossiers');
    expect(render()).not.toContain('Aucun dossier disponible');
    state.loading = false;
    expect(render()).toContain('Les dossiers importés en attente');
    state.error = new Error('Serveur indisponible');
    const markup = render();
    expect(markup).toContain('Serveur indisponible');
    expect(markup).toContain('Réessayer');
    expect(markup).not.toContain('Aucun dossier disponible');
  });
});
