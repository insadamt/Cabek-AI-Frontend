/**
 * Attaches the application's cached studio canvas so returning routes reuse decoded meshes, shaders and camera state.
 * Depends on BayRuntimeCacheProvider, the page cue and motion preferences; route cleanup pauses rather than disposes GPU resources.
 */
import { RotateCcw } from 'lucide-react';
import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react';
import type { Category } from '../../lib/workflows';
import type { BayRuntimeConnection } from '../scanner/bayRuntimeCache';
import type { BayPalette } from '../scanner/bayChoreography';
import type { StageSceneStatus } from '../../hooks/useStageEntrance';
import { useBayRuntimeCache } from './BayRuntimeCacheProvider';
import '../../styles/scanning-bay.css';

const categoryPalettes: Record<Category['type'], BayPalette> = {
  forfait_expertise: {
    primary: '#b8db80',
    secondary: '#e5edcf',
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
    primary: '#edf0e7',
    secondary: '#ffffff',
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

interface CategoryStageVisualProps {
  category: Category;
  initiallyParked: boolean;
  playIntro: boolean;
  onStatusChange: (status: StageSceneStatus) => void;
}

export function CategoryStageVisual({
  category,
  initiallyParked,
  playIntro,
  onStatusChange,
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
  const cameraInteractive = status === 'ready' && playIntro;

  useLayoutEffect(() => {
    const host = canvasHostRef.current;
    if (!host) return;
    let cancelled = false;
    const connection = cache.attach({
      host,
      initiallyParked: attempt > 0 || initialPose.current,
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
  }, [cameraInteractive, attempt]);

  useEffect(() => {
    connectionRef.current?.setPalette(categoryPalettes[category.type]);
  }, [category.type]);
  useEffect(() => {
    connectionRef.current?.setReducedMotion(reducedMotion);
  }, [reducedMotion]);
  useEffect(() => {
    if (playIntro) connectionRef.current?.enter();
  }, [playIntro, attempt]);

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
      data-entrance={introComplete ? 'settled' : 'playing'}
    >
      <div ref={canvasHostRef} className="scanning-bay-canvas-host" />
      <div className="bay-camera-toolbar">
        {cameraInteractive && !introComplete && (
          <button
            className="bay-skip-intro"
            type="button"
            onClick={() => connectionRef.current?.skipIntro()}
          >
            Passer l’introduction <span aria-hidden="true">↗</span>
          </button>
        )}
        {cameraInteractive && introComplete && (
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
