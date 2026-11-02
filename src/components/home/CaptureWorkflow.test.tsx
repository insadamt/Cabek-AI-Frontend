/** Verifies visible controls and evidence against authoritative sessions without browser/GPU automation. */
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CaptureSession } from '../../captureTypes';
const state = vi.hoisted(() => ({ session: null as CaptureSession | null }));
vi.mock('../../hooks/useTunnelCapture', () => ({
  useTunnelCapture: () => ({ session: state.session, store: {} }),
}));
vi.mock('../../hooks/useStageEntrance', () => ({
  useStageEntrance: () => ({
    phase: 'ready',
    restoreSettledView: true,
    setSceneStatus: vi.fn(),
    handleEntranceEnd: vi.fn(),
  }),
}));
vi.mock('../../hooks/useNavigation', () => ({
  useNavigation: () => ({ navigate: vi.fn() }),
  navigate: vi.fn(),
}));
vi.mock('../../hooks/useResource', () => ({
  useResource: () => ({ data: [], loading: false, error: null, refresh: vi.fn() }),
}));
vi.mock('./CategoryStageVisual', () => ({
  CategoryStageVisual: ({ capturing }: { capturing: boolean }) => (
    <div data-capturing={capturing} />
  ),
}));
vi.mock('./CaptureFinale', () => ({
  CaptureFinale: () => <div>Ouverture automatique du dossier enregistré</div>,
}));
vi.mock('../dossier/DetailsDrawer', () => ({
  DetailsDrawer: ({ children }: { children: (close: () => void) => import('react').ReactNode }) => (
    <div>{children(() => {})}</div>
  ),
}));
import { categories } from '../../lib/workflows';
import { TunnelStage } from './TunnelStage';
import { CaptureIslandActivity } from './CaptureIslandActivity';
import { CaptureMetadataDrawer } from './CaptureMetadataDrawer';

function activeSession(): CaptureSession {
  return {
    identity: { type: 'chiffrage_rapide', dossierId: 'REAL-42', creationKey: 'stable' },
    synchronized: true,
    pending: false,
    error: '',
    capture: {
      dossier_id: 'REAL-42',
      phase: null,
      capture_id: 'C1',
      status: 'capturing',
      expected_count: 5,
      saved_count: 1,
      photos: [
        {
          photo_id: 'saved',
          status: 'saved',
          original_url: '/real.jpg',
          preview_url: '/real.webp',
        },
      ],
      error_code: null,
      analysis_error: null,
    },
    response: {
      dossier_id: 'REAL-42',
      type: 'chiffrage_rapide',
      workflow_status: 'capturing',
      vehicle: { marque: '', modele: '', matricule: '' },
      photos: [],
      status: 'not_analyzed',
      progress: null,
      result: null,
      error: null,
    },
  };
}
beforeEach(() => {
  state.session = activeSession();
});
function stage() {
  return renderToStaticMarkup(<TunnelStage category={categories[1]} onBack={() => {}} />);
}

describe('capture presentation', () => {
  it('keeps the metadata drawer accessible during capture and prevents repeated scanning', () => {
    const markup = stage();
    expect(markup).toContain('Fiche véhicule ↗');
    expect(markup).toContain('disabled="">CAPTURE EN COURS');
    expect(markup).toContain('data-capturing="true"');
    expect(markup).toContain('Voir les dossiers');
    expect(markup).not.toContain('Ouverture automatique');
  });
  it('offers complete fiche once photos finish without required metadata', () => {
    state.session!.capture!.status = 'completed';
    expect(stage()).toContain('COMPLÉTER LA FICHE');
    expect(stage()).not.toContain('Ouverture automatique');
  });
  it('only triggers the finale on persisted estimated results and complete vehicle data', () => {
    state.session!.capture!.status = 'completed';
    state.session!.response = {
      ...state.session!.response!,
      status: 'completed',
      workflow_status: 'estimated',
      result: {} as never,
      vehicle: {
        marque: 'Dacia',
        modele: 'Sandero',
        marque_id: 12,
        model_id: 34,
        matricule: '84654-ب-454',
        date_mise_en_circulation: '2020-05-17',
      },
    };
    expect(stage()).toContain('Ouverture automatique du dossier enregistré');
    state.session!.synchronized = false;
    expect(stage()).not.toContain('Ouverture automatique');
  });
  it('shows saved photographs directly in the island using actual URLs and counts', () => {
    const markup = renderToStaticMarkup(<CaptureIslandActivity contentRef={{ current: null }} />);
    expect(markup).toContain('src="/real.webp"');
    expect(markup).toContain('1 / 5 photos enregistrées');
    expect(markup).not.toContain('%');
    expect(markup).not.toContain('analysées');
  });
  it('does not show a planned or unsaved image as received', () => {
    state.session!.capture!.photos.push({
      photo_id: 'planned',
      status: 'pending',
      original_url: '/not-saved.jpg',
    } as never);
    expect(
      renderToStaticMarkup(<CaptureIslandActivity contentRef={{ current: null }} />),
    ).not.toContain('/not-saved.jpg');
  });
  it('shows independent backend AI counts while retaining capture evidence', () => {
    state.session!.capture!.status = 'completed';
    state.session!.response!.progress = {
      stage: 'analyzing_photos',
      photos_completed: 2,
      photos_total: 5,
    } as never;
    const markup = renderToStaticMarkup(<CaptureIslandActivity contentRef={{ current: null }} />);
    expect(markup).toContain('1 / 5 photos enregistrées');
    expect(markup).toContain('2 / 5 photos analysées');
  });
  it('retains Arabic registration and enabled metadata inputs during active capture', () => {
    state.session!.response!.vehicle.matricule = '84654-ب-454';
    state.session!.response!.status = 'processing';
    const markup = renderToStaticMarkup(
      <CaptureMetadataDrawer type="chiffrage_rapide" onClose={() => {}} />,
    );
    expect(markup).toContain('value="84654-ب-454"');
    expect(markup).toContain('dir="auto"');
    expect(markup).not.toMatch(/<input[^>]*disabled/);
    expect(markup).toContain('Enregistrer la fiche');
  });
  it('shows readable failure and retry feedback without discarding partial images', () => {
    state.session!.capture!.status = 'failed';
    state.session!.capture!.error_code = 'capture_interrupted';
    expect(stage()).toContain('RÉESSAYER LA CAPTURE');
    const markup = renderToStaticMarkup(<CaptureIslandActivity contentRef={{ current: null }} />);
    expect(markup).toContain('src="/real.webp"');
    expect(markup).toContain('enregistrées sont conservées');
  });
  it('offers a separate AFTER dossier selection before starting a verification capture', () => {
    state.session = null;
    const markup = renderToStaticMarkup(<TunnelStage category={categories[2]} onBack={() => {}} />);
    expect(markup).toContain('Nouvelle capture AVANT');
    expect(markup).toContain('Compléter une capture APRÈS');
  });
});
