/**
 * Coordinates stage entrance while allowing startup-prepared routes to open immediately.
 * Depends on application startup readiness, stagePreparation, stageVisit and reduced motion.
 */
import { useEffect, useState, type AnimationEvent } from 'react';
import { observeReducedMotion, prefersReducedMotion } from '../lib/motion';
import { prepareStageIdentity } from '../lib/stagePreparation';
import { rememberStageVisit, shouldRestoreStageVisit } from '../lib/stageVisit';

export type StageEntrancePhase = 'preparing' | 'entering' | 'ready';
export type StageSceneStatus = 'loading' | 'ready' | 'failed';

export function useStageEntrance(assetsPrepared = false) {
  const [restoreSettledView] = useState(shouldRestoreStageVisit);
  const [phase, setPhase] = useState<StageEntrancePhase>(
    assetsPrepared || restoreSettledView ? 'ready' : 'preparing',
  );
  const [sceneStatus, setSceneStatus] = useState<StageSceneStatus>('loading');
  const [identityReady, setIdentityReady] = useState(false);

  //
  // Record committed visits in an effect so Strict Mode's extra render cannot skip the first introduction.
  //
  useEffect(rememberStageVisit, []);

  useEffect(() => {
    //
    // Return navigation must not flash the preparation page while the parked scene reloads in the background.
    //
    if (assetsPrepared || restoreSettledView) return;
    let cancelled = false;
    void prepareStageIdentity().then(() => {
      if (!cancelled) setIdentityReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [assetsPrepared, restoreSettledView]);

  useEffect(() => {
    if (!identityReady || sceneStatus === 'loading') return;

    //
    // Failure releases the interface too; retry must not replay the complete page entrance.
    //
    setPhase((current) =>
      current === 'preparing'
        ? restoreSettledView || prefersReducedMotion()
          ? 'ready'
          : 'entering'
        : current,
    );
  }, [identityReady, sceneStatus, restoreSettledView]);

  useEffect(
    () =>
      observeReducedMotion(() =>
        setPhase((current) => (current === 'entering' ? 'ready' : current)),
      ),
    [],
  );

  function handleEntranceEnd(event: AnimationEvent<HTMLElement>) {
    //
    // The scene reveal ends after the island and final card, so their earlier events cannot start vehicle playback.
    //
    if (
      event.animationName === 'stage-scene-enter' &&
      event.target === event.currentTarget.querySelector('.category-stage-content')
    )
      setPhase('ready');
  }

  return { phase, restoreSettledView, setSceneStatus, handleEntranceEnd };
}
