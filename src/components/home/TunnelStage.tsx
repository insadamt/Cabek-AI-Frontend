/**
 * Connects the retained studio, metadata-first capture controls and persisted-dossier finale.
 * Depends on useStageEntrance and the app capture store; only the scan action admits the waiting vehicle.
 */
import '../../styles/stage-entrance.css';
import '../../styles/cinematic-capture.css';
import '../../styles/capture-preparation.css';
import { useEffect, useRef, useState } from 'react';
import { CategoryStageVisual, type ScannerPlayback } from './CategoryStageVisual';
import { StageLoadingScreen } from './StageLoadingScreen';
import { CaptureMetadataDrawer } from './CaptureMetadataDrawer';
import { AfterCapturePicker } from './AfterCapturePicker';
import { CaptureFinale } from './CaptureFinale';
import { CapturePreparationHeader } from './CapturePreparationHeader';
import { DossierActions } from '../dossier/DossierActions';
import { DossierActionMenu } from '../dossier/DossierActionMenu';
import { AnimatedText } from '../AnimatedText';
import { useStageEntrance } from '../../hooks/useStageEntrance';
import { useTunnelCapture } from '../../hooks/useTunnelCapture';
import { useNavigation } from '../../hooks/useNavigation';
import { categoryPath, type Category } from '../../lib/workflows';
import { captureLabel, captureReady, hasVehicleMetadata } from '../../lib/tunnelCapture';
import { describeError, failureMessage, isPreview } from '../../lib/api';
import type { CreatableDossierType } from '../../workflowTypes';
import { useCollectionNavigation } from '../../hooks/useCollectionNavigation';

type LocalCategory = Category & { type: CreatableDossierType };

export function TunnelStage({ category, onBack }: { category: LocalCategory; onBack: () => void }) {
  const entrance = useStageEntrance();
  const { session, store } = useTunnelCapture();
  const { navigate } = useNavigation();
  const collectionNavigation = useCollectionNavigation();
  const page = useRef<HTMLDivElement>(null);
  const [drawer, setDrawer] = useState(false);
  const [afterPicker, setAfterPicker] = useState(false);
  const [error, setError] = useState('');
  const [vehicleEntering, setVehicleEntering] = useState(false);
  const playbackRef = useRef<ScannerPlayback | null>(null);
  const entryOperation = useRef<AbortController | null>(null);
  const scanEntranceRequested = useRef(false);
  useEffect(() => () => entryOperation.current?.abort(), []);
  const [parked, setParked] = useState(entrance.restoreSettledView);
  const current = session?.identity.type === category.type ? session : null;
  const sessionBeforeEditing = useRef(session);
  const presentedSession = drawer ? sessionBeforeEditing.current : session;
  const presentedDossier =
    presentedSession?.identity.type === category.type ? presentedSession.response : undefined;
  const metadataShown = hasVehicleMetadata(presentedDossier);

  function openMetadata() {
    // Keep the dock unchanged until the drawer's exit animation has finished.

    sessionBeforeEditing.current = session;
    setDrawer(true);
  }
  const phase =
    category.type === 'verification' ? (current?.identity.phase ?? 'before') : undefined;
  const capture = current?.capture;
  // Keep saved identity visible while refresh temporarily blocks scan admission.

  const metadataSaved = hasVehicleMetadata(current?.response);
  const metadataReady = !!current?.synchronized && metadataSaved;
  const processing =
    current?.response?.status === 'processing' || current?.response?.status === 'queued';
  const finale = captureReady(current) && !drawer && !afterPicker;
  const analysisStage =
    category.type === 'chiffrage_rapide' &&
    capture?.status === 'completed' &&
    !!current?.response &&
    ['queued', 'processing', 'completed', 'failed'].includes(current.response.status);
  useEffect(() => {
    if (analysisStage) entrance.setSceneStatus('ready');
  }, [analysisStage, entrance.setSceneStatus]);
  const blocked = !!session && !current;
  const disabled =
    current?.pending ||
    current?.saving ||
    vehicleEntering ||
    !metadataReady ||
    capture?.status === 'capturing' ||
    processing ||
    !parked ||
    (capture?.status === 'completed' && category.type === 'verification') ||
    (capture?.status === 'completed' && current?.response?.status === 'completed');
  const ready = entrance.phase === 'ready';
  const scannerRef = useRef<HTMLButtonElement>(null);

  function release(leave: boolean) {
    if (leave) {
      collectionNavigation.openCollection(category, page.current, {
        beforeNavigate: () => {
          // Keep the saved session visible until its page has finished leaving.

          if (!store?.clear()) throw new Error('Attendez la fin de l’enregistrement en cours.');
          entryOperation.current?.abort();
          entryOperation.current = null;
        },
      });
      return;
    }
    try {
      if (!store?.clear()) throw new Error('Attendez la fin de l’enregistrement en cours.');
      entryOperation.current?.abort();
      entryOperation.current = null;
      scanEntranceRequested.current = false;
      setVehicleEntering(false);
      setError('');
      setDrawer(false);
      setAfterPicker(false);
    } catch (failure) {
      setError(describeError(failure));
    }
  }
  const backendError =
    current?.capture?.error_code ??
    current?.response?.error?.code ??
    current?.capture?.analysis_error;
  const feedback =
    collectionNavigation.error ||
    error ||
    current?.error ||
    (backendError ? failureMessage(backendError) : '');

  async function scan() {
    if (!metadataReady) {
      openMetadata();
      return;
    }
    if (!store || disabled || entryOperation.current) return;
    const controller = new AbortController();
    entryOperation.current = controller;
    setError('');
    try {
      if (capture?.status !== 'completed') {
        // Metadata synchronization can be pending too; only this action authorizes vehicle entry.

        scanEntranceRequested.current = true;
        setVehicleEntering(true);
        await playbackRef.current?.playEntrance();
        controller.signal.throwIfAborted();
      }
      await store.start(category.type, phase);
    } catch (failure) {
      if (!controller.signal.aborted) {
        scanEntranceRequested.current = false;
        setError(describeError(failure));
      }
    } finally {
      if (entryOperation.current === controller) entryOperation.current = null;
      if (!controller.signal.aborted) setVehicleEntering(false);
    }
  }

  const sessionActions = presentedSession ? (
    <div className="capture-session-menu" role="group" aria-label="Actions de la session">
      <button
        type="button"
        className="dossier-menu-item"
        disabled={!!session?.pending || !!session?.saving || !session}
        onClick={() => release(false)}
      >
        Nouveau dossier
      </button>
      {session && (
        <button
          type="button"
          className="dossier-menu-item"
          disabled={session.pending || session.saving}
          onClick={() => release(true)}
        >
          Quitter et conserver
        </button>
      )}

      {current?.identity.dossierId &&
        (category.type !== 'chiffrage_rapide' || captureReady(current)) && (
          <a
            className="dossier-menu-item"
            href={`/dossiers/${encodeURIComponent(current.identity.dossierId)}`}
          >
            Ouvrir le dossier enregistré
          </a>
        )}
    </div>
  ) : null;

  return (
    <div
      ref={page}
      className="tunnel-stage"
      data-entrance-phase={entrance.phase}
      data-analysis-stage={analysisStage}
      onAnimationEnd={entrance.handleEntranceEnd}
    >
      {entrance.phase !== 'ready' && <StageLoadingScreen />}
      <div
        className="category-stage-content"
        inert={!ready || finale}
        aria-hidden={!ready || finale || undefined}
      >
        <CategoryStageVisual
          category={category}
          playbackRef={playbackRef}
          entering={vehicleEntering}
          waitingOutside={
            !vehicleEntering &&
            !scanEntranceRequested.current &&
            (!capture || capture.status === 'not_started') &&
            !processing
          }
          initiallyParked={entrance.restoreSettledView || !!current}
          playIntro={ready}
          onStatusChange={entrance.setSceneStatus}
          onParked={setParked}
          capturing={capture?.status === 'capturing'}
          finishing={finale || analysisStage}
        />
      </div>
      <>
        <h1 className="capture-page-title" aria-hidden={!ready || finale || undefined}>
          {category.title}
          {phase && <span> · {phase === 'before' ? 'Avant' : 'Après'}</span>}
        </h1>
        <nav
          className="capture-stage-nav"
          aria-label="Navigation du parcours"
          inert={!ready || finale}
          aria-hidden={finale || undefined}
        >
          <button
            type="button"
            onClick={() => {
              if (window.location.pathname.endsWith('/new')) {
                collectionNavigation.openCollection(category, page.current);
              } else {
                collectionNavigation.leavePage(page.current, onBack);
              }
            }}
          >
            Tous les parcours
          </button>
          <a
            href={categoryPath(category.type)}
            onClick={(event) => {
              if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
              event.preventDefault();
              collectionNavigation.openCollection(category, page.current);
            }}
          >
            Voir les dossiers ↗
          </a>
        </nav>
        <div
          className="capture-controls"
          data-analysis-active={analysisStage}
          inert={!ready || finale || collectionNavigation.pending}
          aria-hidden={!ready || finale || undefined}
        >
          <CapturePreparationHeader
            metadataReady={metadataShown}
            vehicle={presentedDossier?.vehicle}
          />
          {blocked ? (
            <p role="status">
              Un dossier est actif.{' '}
              <button type="button" onClick={() => navigate('/?reprendre=1')}>
                Reprendre sa capture
              </button>
            </p>
          ) : (
            <>
              <div className="capture-actions" data-metadata-shown={metadataShown}>
                {!metadataShown ? (
                  <button
                    ref={scannerRef}
                    className="capture-scanner"
                    type="button"
                    disabled={isPreview || !!current?.pending || !!current?.saving}
                    onClick={openMetadata}
                    aria-label="FICHE VÉHICULE"
                  >
                    <AnimatedText text="FICHE VÉHICULE" />
                  </button>
                ) : (
                  <button
                    ref={scannerRef}
                    className="capture-scanner"
                    type="button"
                    disabled={disabled || isPreview}
                    onClick={() => {
                      void scan();
                    }}
                  >
                    <AnimatedText
                      text={
                        vehicleEntering
                          ? 'ENTRÉE DU VÉHICULE'
                          : current?.pending
                            ? 'CONNEXION…'
                            : capture?.status === 'capturing'
                              ? 'CAPTURE EN COURS'
                              : processing
                                ? 'ANALYSE EN COURS'
                                : capture?.status === 'failed'
                                  ? 'RÉESSAYER LA CAPTURE'
                                  : capture?.status === 'completed'
                                    ? category.type === 'verification'
                                      ? 'SYNCHRONISATION…'
                                      : 'RELANCER L’ANALYSE'
                                    : 'SCANNER'
                      }
                    />
                  </button>
                )}
                <div
                  className="capture-metadata-slot"
                  inert={!metadataShown}
                  aria-hidden={!metadataShown}
                >
                  <button
                    className="capture-metadata-toggle"
                    type="button"
                    disabled={!current?.identity.dossierId}
                    onClick={openMetadata}
                  >
                    Modifier la fiche ↗
                  </button>
                  {current?.response && (
                    <DossierActions
                      dossier={current.response}
                      disabled={current.pending}
                      onDeleted={() => release(false)}
                      onError={() => void store?.refresh()}
                    >
                      {sessionActions}
                    </DossierActions>
                  )}
                </div>
                {!current?.response && (category.type === 'verification' || presentedSession) && (
                  <div className="dossier-actions capture-phase-menu">
                    <DossierActionMenu
                      disabled={!!current?.pending || !!current?.saving}
                      busy={false}
                      pending={false}
                      onNewBefore={category.type === 'verification' ? openMetadata : undefined}
                      onCompleteAfter={
                        category.type === 'verification' ? () => setAfterPicker(true) : undefined
                      }
                    >
                      {sessionActions}
                    </DossierActionMenu>
                  </div>
                )}
              </div>
            </>
          )}
          {current && (
            <p role="status" className="visually-hidden">
              {captureLabel(current)}
            </p>
          )}
          {feedback && (
            <p role="alert" className="inline-error">
              {feedback}
            </p>
          )}
          {isPreview && <p>Connectez l’API CABEK pour scanner et enregistrer des photographies.</p>}
        </div>
      </>
      {drawer && (
        <CaptureMetadataDrawer
          type={category.type}
          phase={phase}
          requireComplete
          closeOnSave
          onSaved={(saved) => {
            if (hasVehicleMetadata(saved)) {
              setError('');
            }
          }}
          onClose={() => setDrawer(false)}
        />
      )}
      {afterPicker && (
        <AfterCapturePicker
          onClose={() => setAfterPicker(false)}
          onSelect={(dossier) => {
            setAfterPicker(false);
            try {
              store?.restoreExisting('verification', 'after', dossier.dossier_id);
            } catch (failure) {
              setError(describeError(failure));
            }
          }}
        />
      )}
      {(finale || analysisStage) && current?.response && (
        <CaptureFinale response={current.response} ready={finale} />
      )}
    </div>
  );
}
