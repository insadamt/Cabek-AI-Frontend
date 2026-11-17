/**
 * Attaches the application's cached studio canvas so returning routes reuse decoded meshes, shaders and camera state.
 * Depends on BayRuntimeCacheProvider, the page cue and motion preferences; route cleanup pauses rather than disposes GPU resources.
 */
import type { CaptureStatus } from '../../captureTypes';
import { BayVisualControls } from './BayVisualControls';
import { Lock, Unlock, RotateCcw } from 'lucide-react';
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  useImperativeHandle,
  type RefObject,
} from 'react';
import type { Category } from '../../lib/workflows';
import type { BayRuntimeConnection } from '../scanner/bayRuntimeCache';
import type { BayPalette } from '../scanner/bayChoreography';
import type { StageSceneStatus } from '../../hooks/useStageEntrance';
import { useBayRuntimeCache } from './BayRuntimeCacheProvider';
import '../../styles/scanning-bay.css';

const categoryPalettes: Record<Category['type'], BayPalette> = {
  forfait_expertise: {
    primary: '#555e66',
    secondary: '#9ca1a6',
    focus: 0,
    sensorEmphasis: 0,
    cameraPreset: 0,
  },
  chiffrage_rapide: {
    primary: '#bfd98f',
    secondary: '#e8edda',
    focus: 1,
    sensorEmphasis: 0.15,
    cameraPreset: 1,
  },
  verification: {
    primary: '#adbfcd',
    secondary: '#e2eaf0',
    focus: 0,
    sensorEmphasis: 1,
    cameraPreset: 2,
  },
};

function subscribeToMotion(listener: () => void) {
  const query = matchMedia('(prefers-reduced-motion: reduce)');
  query.addEventListener('change', listener);
  return () => query.removeEventListener('change', listener);
}

export interface ScannerPlayback {
  playEntrance: () => Promise<void>;
}

interface CategoryStageVisualProps {
  playbackRef?: RefObject<ScannerPlayback | null>;
  entering?: boolean;
  waitingOutside?: boolean;
  category: Category;
  initiallyParked: boolean;
  playIntro: boolean;
  onStatusChange: (status: StageSceneStatus) => void;
  captureStatus?: CaptureStatus['status'];
  captureChangedAt?: number;
  lightStatus?: CaptureStatus['status'];
  lightChangedAt?: number;
  finishing?: boolean;
  onParked?: (parked: boolean) => void;
}

export function CategoryStageVisual({
  category,
  playbackRef,
  entering = false,
  waitingOutside = false,
  initiallyParked,
  playIntro,
  onStatusChange,
  captureStatus = 'not_started',
  captureChangedAt,
  lightStatus = captureStatus,
  lightChangedAt = captureChangedAt,
  finishing = false,
  onParked,
}: CategoryStageVisualProps) {
  const reducedMotion = useSyncExternalStore(
    subscribeToMotion,
    () => matchMedia('(prefers-reduced-motion: reduce)').matches,
    () => true,
  );
  const cache = useBayRuntimeCache();
  const canvasHostRef = useRef<HTMLDivElement>(null);
  const connectionRef = useRef<BayRuntimeConnection | null>(null);
  const initialPose = useRef(initiallyParked);
  const [introComplete, setIntroComplete] = useState(
    () => initiallyParked || cache.getSnapshot().introComplete,
  );
  const latest = useRef({
    palette: categoryPalettes[category.type],
    reducedMotion,
    onStatusChange,
  });
  latest.current = {
    palette: categoryPalettes[category.type],
    reducedMotion,
    onStatusChange,
  };
  const [status, setStatus] = useState<StageSceneStatus>(() => cache.getSnapshot().status);
  const [attempt, setAttempt] = useState(0);
  const [rotationLocked, setRotationLocked] = useState(true);
  const [visualSettings, setVisualSettings] = useState(() => cache.getVisualSettings());
  const capturing = captureStatus === 'capturing';
  const controlsAvailable = status === 'ready' && playIntro && !entering;
  const cameraInteractive = controlsAvailable && !rotationLocked;
  useEffect(() => {
    onParked?.((status === 'ready' && (waitingOutside || introComplete)) || status === 'failed');
  }, [introComplete, status, onParked, waitingOutside]);

  useLayoutEffect(() => {
    const host = canvasHostRef.current;
    if (!host) return;
    let cancelled = false;
    const connection = cache.attach({
      host,
      initiallyParked: attempt > 0 || initialPose.current,
      waitingOutside,
      palette: latest.current.palette,
      reducedMotion: latest.current.reducedMotion,
      onStatusChange(nextStatus) {
        if (cancelled) return;
        setStatus(nextStatus);
        latest.current.onStatusChange(nextStatus);
        if (nextStatus === 'failed') setIntroComplete(true);
      },
      onIntroComplete() {
        if (!cancelled) setIntroComplete(true);
      },
    });
    connectionRef.current = connection;
    return () => {
      cancelled = true;
      if (connectionRef.current === connection) connectionRef.current = null;
      connection.release();
    };
  }, [cache, attempt]);

  useLayoutEffect(() => {
    const canvas = connectionRef.current?.canvas;
    if (!canvas) return;
    canvas.setAttribute('aria-disabled', String(!cameraInteractive));
    canvas.tabIndex = cameraInteractive ? 0 : -1;
    connectionRef.current?.setCameraInteractive(cameraInteractive);
  }, [cameraInteractive, attempt]);

  useEffect(() => {
    //
    // AI can retain the busy light after photo capture; only photo capture moves the scan frame.
    //
    connectionRef.current?.setCaptureLight({
      status: lightStatus,
      changedAt: lightChangedAt,
      sweeping: capturing && !waitingOutside && !entering,
    });
  }, [lightStatus, lightChangedAt, capturing, waitingOutside, entering, attempt]);
  useEffect(() => {
    connectionRef.current?.setVisualSettings(visualSettings);
  }, [visualSettings, attempt]);
  useEffect(() => {
    connectionRef.current?.setPalette(
      finishing
        ? {
            ...categoryPalettes[category.type],
            primary: '#121719',
            secondary: '#121719',
            focus: 0,
            sensorEmphasis: 0,
          }
        : capturing
          ? { ...categoryPalettes[category.type], focus: 1, sensorEmphasis: 1 }
          : categoryPalettes[category.type],
    );
  }, [capturing, finishing, category.type, attempt]);
  useEffect(() => {
    connectionRef.current?.setReducedMotion(reducedMotion);
  }, [reducedMotion]);
  useEffect(() => {
    connectionRef.current?.setWaitingOutside(waitingOutside);
    if (playIntro && !waitingOutside && !entering) connectionRef.current?.enter();
  }, [playIntro, waitingOutside, entering, attempt]);

  useImperativeHandle(
    playbackRef,
    () => ({
      async playEntrance() {
        if (!connectionRef.current)
          throw new Error('La scène 3D se prépare. Réessayez dans un instant.');
        await connectionRef.current.replayEntrance();
      },
    }),
    [attempt],
  );

  function retryScene() {
    cache.dispose();
    setAttempt((value) => value + 1);
  }

  return (
    <div
      className={`category-stage-visual scanning-bay is-${status}`}
      data-renderer="three-webgl"
      data-model="/models/studio-v2/cabek-vehicle.glb"
      data-category={category.type}
      data-rotation-locked={rotationLocked}
      data-entrance={waitingOutside ? 'waiting' : introComplete ? 'settled' : 'playing'}
    >
      <div ref={canvasHostRef} className="scanning-bay-canvas-host" />
      <div className="bay-camera-toolbar">
        {controlsAvailable && (
          <BayVisualControls
            settings={visualSettings}
            onChange={setVisualSettings}
            disabled={false}
          />
        )}
        {controlsAvailable && (
          <button
            type="button"
            className="bay-rotation-lock"
            aria-label="Verrouillage de la rotation"
            aria-pressed={rotationLocked}
            onClick={() => setRotationLocked((locked) => !locked)}
          >
            {rotationLocked ? (
              <Lock size={14} aria-hidden="true" />
            ) : (
              <Unlock size={14} aria-hidden="true" />
            )}
            {rotationLocked ? 'Déverrouiller la rotation' : 'Verrouiller la rotation'}
          </button>
        )}
        {controlsAvailable && !introComplete && !waitingOutside && (
          <button
            className="bay-skip-intro"
            type="button"
            onClick={() => connectionRef.current?.skipIntro()}
          >
            Passer l’introduction <span aria-hidden="true">↗</span>
          </button>
        )}
        {controlsAvailable && (introComplete || waitingOutside) && (
          <button
            className="bay-reset-camera"
            type="button"
            onClick={() => connectionRef.current?.resetCamera()}
          >
            <RotateCcw size={14} strokeWidth={1.6} aria-hidden="true" />
            Réinitialiser la vue
          </button>
        )}
        <p
          id="bay-camera-help"
          className={cameraInteractive && introComplete ? 'bay-camera-help' : 'visually-hidden'}
        >
          Glisser pour explorer · Molette pour zoomer · Flèches et + / − au clavier
        </p>
      </div>
      {status === 'loading' && !initiallyParked && (
        <p className="scanning-bay-loading" role="status">
          Préparation de la scène 3D…
        </p>
      )}
      {status === 'failed' && (
        <div className="scanning-bay-error">
          <p role="status">La scène 3D est indisponible.</p>
          <button type="button" onClick={retryScene}>
            Réessayer
          </button>
        </div>
      )}
    </div>
  );
}
