/**
 * Connects the retained studio, capture controls, editable metadata and persisted-dossier finale.
 * Depends on useStageEntrance and the app capture store; visual completion never changes backend workflow state.
 */
import '../../styles/stage-entrance.css';
import { useEffect, useRef, useState } from 'react';
import { CategoryStageVisual } from './CategoryStageVisual';
import { StageLoadingScreen } from './StageLoadingScreen';
import { CaptureMetadataDrawer } from './CaptureMetadataDrawer';
import { AfterCapturePicker } from './AfterCapturePicker';
import { CaptureFinale } from './CaptureFinale';
import { useStageEntrance } from '../../hooks/useStageEntrance';
import { useTunnelCapture } from '../../hooks/useTunnelCapture';
import { useNavigation } from '../../hooks/useNavigation';
import { categoryPath, type Category } from '../../lib/workflows';
import { captureReady, hasVehicleMetadata } from '../../lib/tunnelCapture';
import { describeError, isPreview } from '../../lib/api';
import type { CreatableDossierType } from '../../workflowTypes';

type LocalCategory = Category & { type: CreatableDossierType };

export function TunnelStage({ category, onBack }: { category: LocalCategory; onBack: () => void }) {
  const entrance = useStageEntrance();
  const { session, store } = useTunnelCapture();
  const { navigate } = useNavigation();
  const [drawer, setDrawer] = useState(false);
  const [afterPicker, setAfterPicker] = useState(false);
  const [error, setError] = useState('');
  const [parked, setParked] = useState(entrance.restoreSettledView);
  const current = session?.identity.type === category.type ? session : null;
  const phase =
    category.type === 'verification' ? (current?.identity.phase ?? 'before') : undefined;
  const capture = current?.capture;
  const metadataMissing =
    (capture?.status === 'completed' || (phase === 'after' && !!current?.response)) &&
    !hasVehicleMetadata(current?.response);
  const processing =
    current?.response?.status === 'processing' || current?.response?.status === 'queued';
  const finale = captureReady(current) && !drawer && !afterPicker;
  const blocked = !!session && !current;
  const disabled =
    current?.pending ||
    capture?.status === 'capturing' ||
    (processing && !metadataMissing) ||
    !parked ||
    (capture?.status === 'completed' && category.type === 'verification' && !metadataMissing) ||
    (capture?.status === 'completed' &&
      current?.response?.status === 'completed' &&
      !metadataMissing);
  const ready = entrance.phase === 'ready';
  const scannerRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (ready && parked) scannerRef.current?.focus({ preventScroll: true });
  }, [ready, parked]);

  async function scan() {
    if (metadataMissing) {
      setDrawer(true);
      return;
    }
    if (!store || disabled) return;
    setError('');
    try {
      await store.start(category.type, phase);
    } catch (failure) {
      setError(describeError(failure));
    }
  }

  return (
    <div
      className="tunnel-stage"
      data-entrance-phase={entrance.phase}
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
          initiallyParked={entrance.restoreSettledView || !!current}
          playIntro={ready}
          onStatusChange={entrance.setSceneStatus}
          onParked={setParked}
          capturing={capture?.status === 'capturing'}
          finishing={finale}
        />
      </div>
      <>
        <nav
          className="capture-stage-nav"
          aria-label="Navigation du parcours"
          inert={!ready || finale}
          aria-hidden={finale || undefined}
        >
          <button type="button" onClick={onBack}>
            Tous les parcours
          </button>
          <a
            href={categoryPath(category.type)}
            onClick={(event) => {
              if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
              event.preventDefault();
              navigate(categoryPath(category.type));
            }}
          >
            Voir les dossiers ↗
          </a>
        </nav>
        <div
          className="capture-controls"
          inert={!ready || finale}
          aria-hidden={!ready || finale || undefined}
        >
          <p className="eyebrow">
            {category.title}
            {phase ? ` · ${phase === 'before' ? 'AVANT' : 'APRÈS'}` : ''}
          </p>
          {blocked ? (
            <p role="status">
              Un dossier est actif.{' '}
              <button type="button" onClick={() => navigate('/?reprendre=1')}>
                Reprendre sa capture
              </button>
            </p>
          ) : (
            <>
              <div className="capture-actions">
                <button
                  ref={scannerRef}
                  className="capture-scanner"
                  type="button"
                  disabled={disabled || isPreview}
                  onClick={() => {
                    void scan();
                  }}
                >
                  {metadataMissing
                    ? 'COMPLÉTER LA FICHE'
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
                              : 'SCANNER'}
                </button>
                <button
                  className="capture-metadata-toggle"
                  type="button"
                  onClick={() => setDrawer(true)}
                >
                  Fiche véhicule ↗
                </button>
              </div>
              {category.type === 'verification' && !current && (
                <div className="capture-phase-actions">
                  <span>Nouvelle capture AVANT</span>
                  <button type="button" onClick={() => setAfterPicker(true)}>
                    Compléter une capture APRÈS
                  </button>
                </div>
              )}
            </>
          )}
          {!current && <p role="status">Prêt à accueillir votre véhicule.</p>}
          {error && !current && (
            <p role="alert" className="inline-error">
              {error}
            </p>
          )}
          {isPreview && <p>Connectez l’API CABEK pour scanner et enregistrer des photographies.</p>}
          {current?.identity.dossierId && (
            <a
              href={`/dossiers/${encodeURIComponent(current.identity.dossierId)}`}
              onClick={(event) => {
                if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
                event.preventDefault();
                navigate(event.currentTarget.getAttribute('href')!);
              }}
            >
              Ouvrir le dossier enregistré
            </a>
          )}
        </div>
      </>
      {drawer && (
        <CaptureMetadataDrawer
          type={category.type}
          phase={phase}
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
      {finale && current?.response && <CaptureFinale response={current.response} />}
    </div>
  );
}
