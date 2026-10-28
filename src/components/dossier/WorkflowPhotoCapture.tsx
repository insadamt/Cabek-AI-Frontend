/** Side/phase capture from saved originals; uploads use the central API and never fabricate progress. */
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Camera, Check, Upload } from 'lucide-react';
import type { DossierResponse, OriginalPhoto } from '../../types';
import type { PhotoPhase, PhotoSide } from '../../workflowTypes';
import { describeError, isPreview, uploadDossierPhotos } from '../../lib/api';
import { savedPhaseSideCount, vehicleSides } from '../../lib/workflows';
import { useSelectionIndicator } from '../../hooks/useSelectionIndicator';
import { useWorkflowReveal } from '../../hooks/useWorkflowReveal';
import { OriginalPhotoPreview } from './OriginalPhotoPreview';

interface CaptureProps {
  response: DossierResponse;
  onSaved: (response: DossierResponse) => void;
  onRefresh: () => void;
  onBusyChange?: (busy: boolean) => void;
}

export function WorkflowPhotoCapture({ response, onSaved, onRefresh, onBusyChange }: CaptureProps) {
  const verification = response.type === 'verification';
  const beforeCount = savedPhaseSideCount(response, 'before');
  const afterCount = savedPhaseSideCount(response, 'after');
  const [phase, setPhase] = useState<PhotoPhase>(beforeCount === 4 ? 'after' : 'before');
  const [side, setSide] = useState<PhotoSide>('front');
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState('');
  const operation = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const sidesRef = useSelectionIndicator(side);
  const phasesRef = useSelectionIndicator(phase);
  useEffect(() => () => operation.current?.abort(), []);
  useEffect(() => {
    onBusyChange?.(busy);
  }, [busy, onBusyChange]);
  const photos = response.photos.filter(
    (photo) => photo.side === side && (!verification || photo.phase === phase),
  );
  const alreadySaved = verification && photos.length > 0;
  const reveal = useWorkflowReveal(
    `${side}-${phase}-${photos.map((photo) => photo.photo_id).join(',')}`,
  );
  const locked = verification
    ? !!response.comparison?.finalized ||
      (phase === 'before' && !!response.comparison?.before_locked)
    : ['queued', 'processing', 'completed'].includes(response.status);

  function resetSelection() {
    setFiles([]);
    setError('');
    setFeedback('');
    if (inputRef.current) inputRef.current.value = '';
  }
  async function upload(event: FormEvent) {
    event.preventDefault();
    if (
      !files.length ||
      operation.current ||
      alreadySaved ||
      locked ||
      (verification && phase === 'after' && beforeCount < 4)
    )
      return;
    const controller = new AbortController();
    operation.current = controller;
    setBusy(true);
    setError('');
    setFeedback('');
    try {
      const next = await uploadDossierPhotos(
        { dossierId: response.dossier_id, side, phase: verification ? phase : undefined, files },
        controller.signal,
        (saved, completed) => {
          if (!controller.signal.aborted) {
            onSaved(saved);
            setFiles(files.slice(completed));
          }
        },
      );
      if (!controller.signal.aborted) {
        onSaved(next);
        resetSelection();
        setFeedback(
          `${files.length} photo${files.length > 1 ? 's' : ''} enregistrée${files.length > 1 ? 's' : ''}.`,
        );
      }
    } catch (failure) {
      if (!controller.signal.aborted) {
        setError(describeError(failure));
        onRefresh();
      }
    } finally {
      if (operation.current === controller) operation.current = null;
      if (!controller.signal.aborted) setBusy(false);
    }
  }
  return (
    <section className="workflow-capture" aria-label="Collection de photographies">
      <div className="workflow-capture-heading">
        <div>
          <p className="eyebrow">
            {verification ? 'SUIVI DES RÉPARATIONS' : 'PHOTOGRAPHIES DU VÉHICULE'}
          </p>
          <h2>{verification ? 'Avant. Après. Chaque côté.' : 'Choisissez un côté.'}</h2>
        </div>
        <span role="status">
          {verification
            ? `${beforeCount + afterCount}/8`
            : `${response.photos.length} photo${response.photos.length > 1 ? 's' : ''}`}
        </span>
      </div>
      {verification && (
        <div
          className="segmented-control workflow-phases"
          ref={phasesRef}
          aria-label="Phase de réparation"
        >
          <span className="selection-indicator" aria-hidden="true" />
          {(['before', 'after'] as const).map((value) => (
            <button
              key={value}
              disabled={busy || (value === 'after' && beforeCount < 4)}
              className={phase === value ? 'selected' : ''}
              aria-pressed={phase === value}
              onClick={() => {
                setPhase(value);
                resetSelection();
              }}
            >
              {value === 'before' ? 'Avant réparation' : 'Après réparation'} ·{' '}
              {value === 'before' ? beforeCount : afterCount}/4
            </button>
          ))}
        </div>
      )}
      {verification && beforeCount < 4 && (
        <p className="workflow-note">
          Enregistrez les quatre côtés avant de passer aux photos après réparation.
        </p>
      )}
      <div
        className="segmented-control workflow-sides"
        ref={sidesRef}
        aria-label="Côté du véhicule"
      >
        <span className="selection-indicator" aria-hidden="true" />
        {vehicleSides.map(([value, label]) => {
          const count = response.photos.filter(
            (photo) => photo.side === value && (!verification || photo.phase === phase),
          ).length;
          return (
            <button
              key={value}
              className={side === value ? 'selected' : ''}
              aria-pressed={side === value}
              disabled={busy}
              onClick={() => {
                setSide(value);
                resetSelection();
              }}
            >
              {label}{' '}
              {count > 0 && (
                <>
                  <Check size={13} aria-hidden="true" />
                  <span className="visually-hidden">{count} enregistrée(s)</span>
                </>
              )}
            </button>
          );
        })}
      </div>
      <div ref={reveal} className="workflow-capture-content">
        <div data-workflow-reveal>
          {photos.length > 0 ? (
            <SavedSidePhotos key={`${side}-${phase}`} photos={photos} />
          ) : (
            <div className="workflow-photo-placeholder">
              <Camera size={36} strokeWidth={1} />
              <p>Aucune photo enregistrée pour ce côté.</p>
            </div>
          )}
        </div>
      </div>
      <form className="workflow-upload-form" onSubmit={upload} aria-busy={busy}>
        {!alreadySaved && !locked && (
          <label className="workflow-file-label">
            <Upload size={16} /> {verification ? 'Choisir une photo' : 'Choisir des photos'}
            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png"
              multiple={!verification}
              disabled={busy}
              onChange={(event) => {
                setFiles(Array.from(event.target.files ?? []));
                setError('');
                setFeedback('');
              }}
            />
          </label>
        )}
        {files.length > 0 && (
          <ul className="workflow-file-list">
            {files.map((file, index) => (
              <li key={`${file.name}-${index}`}>{file.name}</li>
            ))}
          </ul>
        )}
        {alreadySaved ? (
          <p className="workflow-note">
            <Check size={14} /> Photo enregistrée pour ce côté.
          </p>
        ) : (
          !locked && (
            <button
              type="submit"
              className="button workflow-primary"
              disabled={!files.length || busy}
            >
              {busy ? 'Envoi en cours…' : 'Enregistrer les photos'}
            </button>
          )
        )}
        {busy && (
          <button
            type="button"
            className="text-link"
            onClick={() => {
              operation.current?.abort();
              operation.current = null;
              setBusy(false);
              setFiles([]);
              if (inputRef.current) inputRef.current.value = '';
              setFeedback('Envoi interrompu. Vérification des photos enregistrées…');
              onRefresh();
            }}
          >
            Annuler l’envoi
          </button>
        )}
        {locked && (
          <p className="workflow-note">
            {verification
              ? 'Ces photographies sont finalisées.'
              : 'La collection est conservée avec l’analyse de ce dossier.'}
          </p>
        )}
      </form>
      <p role="status" aria-live="polite">
        {busy ? 'Transfert et enregistrement des photographies…' : feedback}
      </p>
      {error && (
        <p role="alert" className="inline-error">
          {error}
        </p>
      )}
      {isPreview && (
        <p className="workflow-note">Aperçu interactif · Photos conservées dans cet onglet.</p>
      )}
    </section>
  );
}

function SavedSidePhotos({ photos }: { photos: OriginalPhoto[] }) {
  const [selected, setSelected] = useState(0);
  const photo = photos[Math.min(selected, photos.length - 1)];
  return (
    <div className="workflow-saved-side">
      <OriginalPhotoPreview key={photo.photo_id} photo={photo} />
      {photos.length > 1 && (
        <div className="workflow-photo-index" aria-label="Photographies de ce côté">
          {photos.map((item, index) => (
            <button
              key={item.photo_id}
              aria-pressed={selected === index}
              onClick={() => setSelected(index)}
            >
              {index + 1}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
