/**
 * Hosts the supplied sedan and tunnel on one persistent canvas, exposing only camera interaction and intro controls.
 * Keeps asynchronous loading/failure usable without replaying categories; depends on the lazy bay runtime and motion preferences.
 */
import { RotateCcw } from 'lucide-react';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import type { Category } from '../../lib/workflows';
import type { createBayRuntime } from '../scanner/bayRuntime';
import type { BayPalette } from '../scanner/bayChoreography';
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
  onIntroComplete: () => void;
}

export function CategoryStageVisual({
  category,
  initiallyParked,
  onIntroComplete,
}: CategoryStageVisualProps) {
  const reducedMotion = useSyncExternalStore(
    subscribeToMotion,
    () => matchMedia('(prefers-reduced-motion: reduce)').matches,
    () => true,
  );
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const runtimeRef = useRef<ReturnType<typeof createBayRuntime> | null>(null);
  const initialPose = useRef(initiallyParked);
  const [introComplete, setIntroComplete] = useState(initiallyParked);
  const latest = useRef({
    palette: categoryPalettes[category.type],
    reducedMotion,
    onIntroComplete,
  });
  latest.current = { palette: categoryPalettes[category.type], reducedMotion, onIntroComplete };
  const [status, setStatus] = useState<'loading' | 'ready' | 'failed'>('loading');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let cancelled = false;
    let runtime: ReturnType<typeof createBayRuntime> | undefined;
    setStatus('loading');
    function finishIntro() {
      if (cancelled) return;
      setIntroComplete(true);
      latest.current.onIntroComplete();
    }
    function reportFailure() {
      if (cancelled) return;
      setStatus('failed');
      finishIntro();
    }
    void import('../scanner/bayRuntime')
      .then(({ createBayRuntime }) => {
        if (cancelled) return;
        runtime = createBayRuntime(canvas, {
          initiallyParked: attempt > 0 || initialPose.current,
          reducedMotion: latest.current.reducedMotion,
          palette: latest.current.palette,
          onReady: () => {
            if (!cancelled) setStatus('ready');
          },
          onIntroComplete: finishIntro,
          onError: reportFailure,
        });
        runtimeRef.current = runtime;
      })
      .catch(reportFailure);
    return () => {
      cancelled = true;
      if (runtimeRef.current === runtime) runtimeRef.current = null;
      runtime?.dispose();
    };
  }, [attempt]);

  useEffect(() => {
    runtimeRef.current?.setPalette(categoryPalettes[category.type]);
  }, [category.type]);
  useEffect(() => {
    runtimeRef.current?.setReducedMotion(reducedMotion);
  }, [reducedMotion]);

  return (
    <div
      className={`category-stage-visual scanning-bay is-${status}`}
      data-renderer="three-webgl"
      data-model="/models/studio-v2/cabek-vehicle.glb"
      data-category={category.type}
      data-entrance={introComplete ? 'settled' : 'playing'}
    >
      <canvas
        key={attempt}
        ref={canvasRef}
        className="scanning-bay-canvas"
        aria-label="Véhicule dans le tunnel de numérisation 3D"
        aria-describedby="bay-camera-help"
        aria-disabled={status !== 'ready'}
        tabIndex={status === 'ready' ? 0 : -1}
      />
      <div className="bay-camera-toolbar">
        {status === 'ready' && !introComplete && (
          <button
            className="bay-skip-intro"
            type="button"
            onClick={() => runtimeRef.current?.skipIntro()}
          >
            Passer l’introduction <span aria-hidden="true">↗</span>
          </button>
        )}
        {status === 'ready' && introComplete && (
          <button
            className="bay-reset-camera"
            type="button"
            onClick={() => runtimeRef.current?.resetCamera()}
          >
            <RotateCcw size={14} strokeWidth={1.6} aria-hidden="true" />
            Réinitialiser la vue
          </button>
        )}
        <p
          id="bay-camera-help"
          className={status === 'ready' && introComplete ? 'bay-camera-help' : 'visually-hidden'}
        >
          Glisser pour explorer · Molette pour zoomer · Flèches et + / − au clavier
        </p>
      </div>
      {status === 'loading' && (
        <p className="scanning-bay-loading" role="status">
          Préparation de la scène 3D…
        </p>
      )}
      {status === 'failed' && (
        <div className="scanning-bay-error">
          <p role="status">La scène 3D est indisponible.</p>
          <button type="button" onClick={() => setAttempt((value) => value + 1)}>
            Réessayer
          </button>
        </div>
      )}
    </div>
  );
}
