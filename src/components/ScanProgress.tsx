import { Check, Clock3, FileCheck2, Images, LoaderCircle, ScanLine } from 'lucide-react';
import { formatDuration, photoProgress } from '../lib/format';
import type { DossierResponse } from '../types';

const stages = [
  { stage: 'queued', title: 'En attente', icon: Clock3 },
  { stage: 'preparing', title: 'Préparation', icon: ScanLine },
  { stage: 'analyzing_photos', title: 'Analyse des photos', icon: Images },
  { stage: 'finalizing', title: 'Finalisation', icon: FileCheck2 },
] as const;

export function ScanProgressPanel({ response }: { response: DossierResponse }) {
  const progress = response.progress;
  const percentage = photoProgress(progress);
  const stage = progress?.stage ?? (response.status === 'queued' ? 'queued' : 'preparing');
  const stageIndex = stages.findIndex((item) => item.stage === stage);
  const label =
    stage === 'queued'
      ? 'Votre dossier est dans la file d’attente.'
      : stage === 'preparing'
        ? 'L’analyse démarre. Les premières photos sont en cours de préparation.'
        : stage === 'finalizing'
          ? 'Finalisation de l’expertise, du chiffrage et du rapport.'
          : 'Chaque photo est examinée pour identifier les pièces et les dommages.';

  return (
    <section className="surface scan-panel">
      <div className="scan-heading" role="status" aria-live="polite" aria-atomic="true">
        <div className="scan-orbit">
          <ScanLine size={26} strokeWidth={1.3} />
        </div>
        <span className="eyebrow">VOTRE EXPERTISE PREND FORME</span>
        <h2>
          {stage === 'queued'
            ? 'Votre analyse va commencer.'
            : stage === 'finalizing'
              ? 'Les derniers détails comptent.'
              : 'Nous regardons de plus près.'}
        </h2>
        <p>{label}</p>
      </div>
      <ol className="scan-stages" aria-label="Étapes de l’analyse">
        {stages.map((item, index) => (
          <li
            key={item.stage}
            className={
              index < stageIndex ? 'stage-done' : index === stageIndex ? 'stage-current' : ''
            }
            aria-current={index === stageIndex ? 'step' : undefined}
          >
            <span>
              {index < stageIndex ? (
                <Check size={16} />
              ) : index === stageIndex && stage !== 'queued' ? (
                <LoaderCircle size={16} className="spin" />
              ) : (
                <item.icon size={16} />
              )}
            </span>
            <strong>{item.title}</strong>
          </li>
        ))}
      </ol>
      <div className="scan-progress-meta">
        <span>Photos traitées</span>
        <strong>
          {progress ? `${progress.photos_completed} / ${progress.photos_total}` : 'En cours'}
        </strong>
      </div>
      <div
        className={`progress-track ${percentage == null || stage === 'queued' || stage === 'preparing' ? 'indeterminate' : ''}`}
        role="progressbar"
        aria-label="Photos traitées"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={stage === 'queued' || stage === 'preparing' ? undefined : percentage}
      >
        {percentage != null && stage !== 'queued' && stage !== 'preparing' && (
          <span style={{ transform: `scaleX(${percentage / 100})` }} />
        )}
      </div>
      <div className="scan-timings">
        {progress && response.status !== 'queued' && (
          <span>Temps écoulé : {formatDuration(progress.elapsed_seconds)}</span>
        )}
        {progress?.eta_seconds != null && (
          <span>Temps restant estimé : {formatDuration(progress.eta_seconds)}</span>
        )}
      </div>
      <p className="scan-continue">
        <span className="tiny-dot" />
        Vous pouvez revenir aux dossiers. L’analyse continue.
      </p>
    </section>
  );
}
