/**
 * Connects the retained studio, metadata-first capture controls and persisted-dossier finale.
 * Depends on useStageEntrance and the app capture store; only the scan action admits the waiting vehicle.
 */
import '../../styles/stage-entrance.css';
import '../../styles/cinematic-capture.css';
import '../../styles/capture-preparation.css';
import { useEffect, useRef, useState } from 'react';
import { FolderOpen, LogOut, Plus } from 'lucide-react';
import { CategoryStageVisual, type ScannerPlayback } from './CategoryStageVisual';
import { StageLoadingScreen } from './StageLoadingScreen';
import { CaptureMetadataDrawer } from './CaptureMetadataDrawer';
import { AfterCapturePicker } from './AfterCapturePicker';
import { ExpertiseDossierPicker } from './ExpertiseDossierPicker';
import { useExpertiseDossierSelection } from '../../hooks/useExpertiseDossierSelection';
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
import { useCollectionNavigation } from '../../hooks/useCollectionNavigation';

export function TunnelStage({ category, onBack }: { category: Category; onBack: () => void }) {
  const entrance = useStageEntrance();
  const { session, store } = useTunnelCapture(category.type);
  const expertise = category.type === 'forfait_expertise';
  const expertiseSelection = useExpertiseDossierSelection(expertise, store);
  const [expertisePicker, setExpertisePicker] = useState(false);
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
  const metadataShown = expertise ? !!presentedDossier : hasVehicleMetadata(presentedDossier);

  function openMetadata() {
    if (expertise) {
      setExpertisePicker(true);
      return;
    }
    // Keep the dock unchanged until the drawer's exit animation has finished.

    sessionBeforeEditing.current = session;
    setDrawer(true);
  }
  const phase =
    category.type === 'verification' ? (current?.identity.phase ?? 'before') : undefined;
  const capture = current?.capture;
  const captureNeedsRestart =
    expertise && capture?.status === 'completed' && current?.response?.photos.length === 0;
  // Keep saved identity visible while refresh temporarily blocks scan admission.

  const metadataSaved = expertise ? !!current?.response : hasVehicleMetadata(current?.response);
  const metadataReady = !!current?.synchronized && metadataSaved;
  const processing =
    current?.response?.status === 'processing' || current?.response?.status === 'queued';
  const finale = captureReady(current) && !drawer && !afterPicker && !expertisePicker;
  const analysisStage =
    category.type !== 'verification' &&
    !captureNeedsRestart &&
    capture?.status === 'completed' &&
    !!current?.response &&
    ['queued', 'processing', 'completed', 'failed'].includes(current.response.status);
  useEffect(() => {
    if (analysisStage) entrance.setSceneStatus('ready');
  }, [analysisStage, entrance.setSceneStatus]);
  const blocked = !!session && !current;
  const disabled =
    expertiseSelection.pending ||
    (expertise && !!expertiseSelection.error) ||
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

          if (!expertise && !store?.clear())
            throw new Error('Attendez la fin de l’enregistrement en cours.');
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
    expertiseSelection.error ||
    error ||
    current?.error ||
    (expertise && capture?.status === 'failed'
      ? 'La capture a échoué. Relancez le scan pour reprendre toutes les photos depuis le début.'
      : backendError
        ? failureMessage(backendError)
        : '');

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
      if (capture?.status !== 'completed' || captureNeedsRestart) {
        // Metadata synchronization can be pending too; only this action authorizes vehicle entry.

        scanEntranceRequested.current = true;
        setVehicleEntering(true);
        await playbackRef.current?.playEntrance();
        controller.signal.throwIfAborted();
      }
      if (expertise) await store.start(category.type, phase, current?.identity.dossierId);
      else await store.start(category.type, phase);
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
        disabled={
          !!session?.pending ||
          !!session?.saving ||
          !session ||
          (expertise && (vehicleEntering || processing || capture?.status === 'capturing'))
        }
        onClick={() => {
          if (expertise) setExpertisePicker(true);
          else release(false);
        }}
      >
        <Plus size={16} aria-hidden="true" />
        {expertise ? 'Changer de dossier' : 'Nouveau dossier'}
      </button>
      {session && (
        <button
          type="button"
          className="dossier-menu-item"
          disabled={session.pending || session.saving}
          onClick={() => release(true)}
        >
          <LogOut size={16} aria-hidden="true" />
          Quitter et conserver
        </button>
      )}

      {current?.identity.dossierId &&
        (category.type !== 'chiffrage_rapide' || captureReady(current)) && (
          <a
            className="dossier-menu-item"
            href={`/dossiers/${encodeURIComponent(current.identity.dossierId)}`}
          >
            <FolderOpen size={16} aria-hidden="true" />
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
            dossierId={expertise ? presentedDossier?.dossier_id : undefined}
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
                    disabled={
                      isPreview ||
                      expertiseSelection.pending ||
                      !!current?.pending ||
                      !!current?.saving
                    }
                    onClick={openMetadata}
                    aria-label={expertise ? 'Choisir un dossier' : 'FICHE VÉHICULE'}
                  >
                    <AnimatedText text={expertise ? 'CHOISIR UN DOSSIER' : 'FICHE VÉHICULE'} />
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
                                  ? expertise
                                    ? 'RECOMMENCER LE SCAN'
                                    : 'RÉESSAYER LA CAPTURE'
                                  : capture?.status === 'completed'
                                    ? captureNeedsRestart
                                      ? 'SCANNER'
                                      : category.type === 'verification'
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
                  {expertise ? (
                    <button
                      className="capture-metadata-toggle"
                      type="button"
                      disabled={
                        expertiseSelection.pending ||
                        !!current?.pending ||
                        vehicleEntering ||
                        processing ||
                        capture?.status === 'capturing'
                      }
                      onClick={() => setExpertisePicker(true)}
                    >
                      Changer de dossier
                    </button>
                  ) : (
                    <button
                      className="capture-metadata-toggle"
                      type="button"
                      disabled={!current?.identity.dossierId}
                      onClick={openMetadata}
                    >
                      Modifier la fiche ↗
                    </button>
                  )}
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
      {drawer && category.type !== 'forfait_expertise' && (
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
      {expertisePicker && (
        <ExpertiseDossierPicker
          onClose={() => setExpertisePicker(false)}
          onSelect={(dossier) => {
            setExpertisePicker(false);
            expertiseSelection.selectDossier(dossier.dossier_id);
          }}
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
