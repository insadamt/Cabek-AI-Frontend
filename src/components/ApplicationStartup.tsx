/**
 * Prepares shared artwork, font metrics and the retained 3D studio before any route opens.
 * Depends on the application runtime cache and backend lifecycle signals; cached GPU assets live until app teardown.
 */
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useBayRuntimeCache } from './home/BayRuntimeCacheProvider';
import { prepareApplicationImages } from '../lib/applicationAssets';
import { signalApplicationLighting } from '../lib/applicationLighting';
import '../styles/stage-entrance.css';
import '../styles/application-startup.css';

const startupPalette = {
  primary: '#555e66',
  secondary: '#9ca1a6',
  focus: 0,
  sensorEmphasis: 0,
  cameraPreset: 0,
};

export function ApplicationStartup({ children }: { children: ReactNode }) {
  const cache = useBayRuntimeCache();
  const host = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (ready || !host.current) return;
    let cancelled = false;
    let releaseScene: (() => void) | undefined;
    const lightingStarted = signalApplicationLighting('startup');
    const minimumStartup = new Promise<void>((resolve) => setTimeout(resolve, 4000));
    const scene = new Promise<void>((resolve, reject) => {
      const connection = cache.attach({
        host: host.current!,
        initiallyParked: false,
        waitingOutside: true,
        palette: startupPalette,
        reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
        onStatusChange(status) {
          if (status === 'ready') resolve();
          if (status === 'failed') reject(new Error('Studio unavailable'));
        },
        onIntroComplete() {},
      });
      releaseScene = () => connection.release();
    });
    void Promise.all([scene, prepareApplicationImages(), minimumStartup])
      .then(async () => {
        await lightingStarted;
        if (cancelled) return;
        releaseScene?.();
        await signalApplicationLighting('ready');
        if (!cancelled) setReady(true);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
      releaseScene?.();
    };
  }, [cache, attempt, ready]);

  async function continueWithoutStudio() {
    await signalApplicationLighting('ready');
    setReady(true);
  }

  function retry() {
    cache.dispose();
    setFailed(false);
    setAttempt((value) => value + 1);
  }

  if (ready) return children;
  return (
    <div className="application-startup" aria-busy={!failed}>
      <div ref={host} className="application-startup-scene" aria-hidden="true" />
      <div className="stage-loading-screen">
        <div className="stage-loading-content" role="status" aria-live="polite" aria-atomic="true">
          <span className="stage-loading-name">Cabek AI</span>
          {!failed && (
            <span className="stage-loading-track" aria-hidden="true">
              <span />
            </span>
          )}
          <p>{failed ? 'Le studio 3D est indisponible.' : 'Préparation de votre espace…'}</p>
          <span className="stage-loading-detail">
            {failed
              ? 'Vous pouvez réessayer ou accéder à vos dossiers.'
              : 'Chargement du studio et des ressources de l’application.'}
          </span>
          {failed && (
            <div className="application-startup-actions">
              <button type="button" onClick={retry}>
                Réessayer
              </button>
              <button type="button" onClick={() => void continueWithoutStudio()}>
                Continuer sans le studio
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
