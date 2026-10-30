/**
 * Prepares fresh visits while restoring Back/internal returns immediately without a loading screen or entrance.
 * Depends on stagePreparation, stageVisit, CSS completion and reduced motion; guards late async work.
 */
import { useEffect, useState, type AnimationEvent } from 'react';
import { observeReducedMotion, prefersReducedMotion } from '../lib/motion';
import { prepareStageIdentity } from '../lib/stagePreparation';
import { rememberStageVisit, shouldRestoreStageVisit } from '../lib/stageVisit';

export type StageEntrancePhase = 'preparing' | 'entering' | 'ready';
export type StageSceneStatus = 'loading' | 'ready' | 'failed';

export function useStageEntrance() {
  const [restoreSettledView] = useState(shouldRestoreStageVisit);
  const [phase, setPhase] = useState<StageEntrancePhase>(
    restoreSettledView ? 'ready' : 'preparing',
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
    if (restoreSettledView) return;
    let cancelled = false;
    void prepareStageIdentity().then(() => {
      if (!cancelled) setIdentityReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [restoreSettledView]);

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
