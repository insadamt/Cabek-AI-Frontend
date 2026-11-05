/** Verifies visible controls and evidence against authoritative sessions without browser/GPU automation. */
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CaptureSession } from '../../captureTypes';
const state = vi.hoisted(() => ({
  session: null as CaptureSession | null,
  catalogueError: null as unknown,
}));
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
  useResource: () => ({ data: [], loading: false, error: state.catalogueError, refresh: vi.fn() }),
}));
vi.mock('./CategoryStageVisual', () => ({
  CategoryStageVisual: ({ capturing }: { capturing: boolean }) => (
    <div data-capturing={capturing} />
  ),
}));
vi.mock('./CaptureFinale', () => ({
  CaptureFinale: ({ ready }: { ready: boolean }) => (
    <div>{ready ? 'Ouverture automatique du dossier enregistré' : 'Dossier vide en attente'}</div>
  ),
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
      vehicle: {
        marque: 'Dacia',
        modele: 'Sandero',
        matricule: '84654-ب-454',
        marque_id: 12,
        model_id: 34,
        date_mise_en_circulation: '2020-05-17',
      },
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
  state.catalogueError = null;
});
function stage() {
  return renderToStaticMarkup(<TunnelStage category={categories[1]} onBack={() => {}} />);
}

describe('capture presentation', () => {
  it('keeps the metadata drawer accessible during capture and prevents repeated scanning', () => {
    const markup = stage();
    expect(markup).toContain('Modifier la fiche ↗');
    expect(markup).toMatch(/class="capture-scanner"[^>]*disabled[^>]*>.*CAPTURE EN COURS/);
    expect(markup).toContain('data-capturing="true"');
    expect(markup).toContain('Voir les dossiers');
    expect(markup).not.toContain('Ouverture automatique');
  });
  it('keeps vehicle entry and navigation controls available on a fresh tunnel', () => {
    state.session = null;
    const markup = stage();
    expect(markup).toContain('FICHE VÉHICULE');
    expect(markup).toContain('Tous les parcours');
    expect(markup).toContain('Voir les dossiers');
    const controls = markup.match(/class="capture-controls"[^>]*>/)?.[0];
    expect(controls).toBeDefined();
    expect(controls).not.toContain('inert');
    expect(controls).not.toContain('aria-hidden="true"');
  });
  it('keeps session controls accessible while the retained 3D scene exits during analysis', () => {
    state.session!.capture!.status = 'completed';
    state.session!.response!.status = 'processing';
    state.session!.response!.workflow_status = 'analyzing';
    const markup = stage();
    expect(markup).toContain('Dossier vide en attente');
    expect(markup).toContain('data-capturing="false"');
    expect(markup).toContain('Modifier la fiche');
    const popover = markup.match(/<div[^>]*popover="auto"[\s\S]*?<\/div><\/div>/)?.[0];
    expect(popover).toContain('Nouveau dossier');
    expect(popover).toContain('Quitter et conserver');
    expect(markup).not.toContain('capture-session-slot');
    expect(markup).toMatch(/class="capture-scanner"[^>]*disabled[^>]*>.*ANALYSE EN COURS/);
    const controls = markup.match(/class="capture-controls"[^>]*>/)?.[0];
    expect(controls).toContain('data-analysis-active="true"');
    expect(controls).not.toContain('inert');
    expect(controls).not.toContain('aria-hidden="true"');
  });
  it('offers complete fiche once photos finish without required metadata', () => {
    state.session!.capture!.status = 'completed';
    state.session!.response!.vehicle = { marque: '', modele: '', matricule: '' };
    expect(stage()).toContain('FICHE VÉHICULE');
    expect(stage()).not.toMatch(/>SCANNER<\/span>/);
    expect(stage()).not.toContain('Ouverture automatique');
  });
  it('waits for a saved AI result before opening the captured dossier', () => {
    state.session!.capture!.status = 'completed';
    state.session!.capture!.saved_count = state.session!.capture!.expected_count = 1;
    state.session!.response!.photos = [...state.session!.capture!.photos];
    state.session!.response!.status = 'processing';
    state.session!.response!.workflow_status = 'analyzing';
    expect(stage()).not.toContain('Ouverture automatique');
    expect(stage()).toContain('Dossier vide en attente');
    expect(stage()).toContain('data-capturing="false"');
    expect(stage()).not.toContain('Ouvrir le dossier enregistré');
    state.session!.response!.status = 'failed';
    expect(stage()).not.toContain('Ouverture automatique');
    state.session!.response!.status = 'completed';
    state.session!.response!.workflow_status = 'estimated';
    expect(stage()).not.toContain('Ouverture automatique');
    state.session!.response!.result = {} as never;
    expect(stage()).toContain('Ouverture automatique du dossier enregistré');
    state.session!.synchronized = false;
    expect(stage()).not.toContain('Ouverture automatique');
  });
  it('shows saved photographs directly in the island using actual URLs and counts', () => {
    const markup = renderToStaticMarkup(<CaptureIslandActivity contentRef={{ current: null }} />);
    expect(markup).toContain('src="/real.webp"');
    expect(markup).toContain('1 / 5 photos enregistrées');
    expect(markup).toContain('aria-label="Photographies enregistrées"');
    expect(markup).toContain('aria-valuenow="20"');
    expect(markup).not.toContain('analysées');
  });
  it('uses the same compact row, status transition and progress track as folder opening', () => {
    const markup = renderToStaticMarkup(<CaptureIslandActivity contentRef={{ current: null }} />);
    expect(markup).toContain('class="island-activity capture-island-activity"');
    expect(markup).toContain('class="island-text-transition"');
    expect(markup).toContain('class="island-timer"');
    expect(markup).toContain('class="island-progress"');
    expect(markup).not.toContain('capture-island-progress');
    expect(markup).not.toContain('capture-island-copy');
  });
  it('uses the shared indeterminate bar until the backend reports a total', () => {
    state.session!.capture!.expected_count = 0;
    const markup = renderToStaticMarkup(<CaptureIslandActivity contentRef={{ current: null }} />);
    expect(markup).toContain('is-indeterminate');
    expect(markup).not.toContain('aria-valuenow');
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
    expect(markup).toContain('aria-label="Photos analysées par l’IA"');
    expect(markup).toContain('aria-valuenow="40"');
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

describe('contextual capture recovery', () => {
  it('shows a visible recovery error at the scan controls as well as the island', () => {
    state.session!.error = 'Connexion au tunnel perdue';
    expect(stage()).toContain('Connexion au tunnel perdue');
    expect(
      renderToStaticMarkup(<CaptureIslandActivity contentRef={{ current: null }} />),
    ).toContain('Connexion au tunnel perdue');
  });
  it('does not offer capture restart while completed verification evidence synchronizes', () => {
    state.session!.identity.type = 'verification';
    state.session!.identity.phase = 'before';
    state.session!.capture!.status = 'completed';
    state.session!.response!.vehicle = {
      marque: 'Dacia',
      modele: 'Sandero',
      marque_id: 1,
      model_id: 2,
      matricule: '84654-ب-454',
      date_mise_en_circulation: '2020-05-17',
    };
    const markup = renderToStaticMarkup(<TunnelStage category={categories[2]} onBack={() => {}} />);
    expect(markup).toMatch(/class="capture-scanner"[^>]*disabled[^>]*>.*SYNCHRONISATION…/);
    expect(markup).not.toContain('RELANCER L’ANALYSE');
  });
});

it('loads the vehicle sheet from the open dossier independently of a retained tunnel session', () => {
  const dossier = {
    ...state.session!.response!,
    dossier_id: 'OPEN-DOSSIER',
    vehicle: {
      marque: 'Dacia',
      modele: 'Sandero',
      matricule: '12345-A-678',
      date_mise_en_circulation: '2021-04-15',
    },
  };
  const markup = renderToStaticMarkup(
    <CaptureMetadataDrawer
      type="chiffrage_rapide"
      dossier={dossier}
      onSaved={vi.fn()}
      onClose={vi.fn()}
    />,
  );
  expect(markup).toContain('value="12345-A-678"');
  expect(markup).toContain('value="2021-04-15"');
});

it('makes the vehicle sheet primary for a fresh session and hides SCANNER', () => {
  state.session = null;
  expect(stage()).toContain('FICHE VÉHICULE');
  expect(stage()).not.toMatch(/>SCANNER<\/span>/);
});

it('keeps saved scanner controls visible but disabled while metadata synchronizes', () => {
  state.session!.capture!.status = 'not_started';
  expect(stage()).toContain('data-metadata-shown="true"');
  expect(stage()).toContain('>SCANNER</span>');
  expect(stage()).toContain('Modifier la fiche');
  state.session!.synchronized = false;
  const markup = stage();
  expect(markup).toMatch(/class="capture-scanner"[^>]*disabled[^>]*>.*SCANNER/);
  expect(markup).toContain('Modifier la fiche');
  expect(markup).toContain('capture-vehicle-summary');
  expect(markup).not.toContain('FICHE VÉHICULE');
});

it('blocks incomplete forms and explains catalogue failures before scanning', () => {
  state.catalogueError = new Error('Unavailable');
  const markup = renderToStaticMarkup(
    <CaptureMetadataDrawer type="chiffrage_rapide" requireComplete onClose={() => {}} />,
  );
  expect(markup).toContain('Le catalogue AutoEstimate est indisponible');
  expect(markup).toContain('Recharger le catalogue');
  expect(markup).toMatch(/<button[^>]*type="submit"[^>]*disabled/);
  expect(markup).toMatch(/<select[^>]*required/);
  expect(markup).toMatch(/<input[^>]*type="date"[^>]*required/);
});
