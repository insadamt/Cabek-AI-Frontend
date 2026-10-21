import { ArrowUpRight, Check, LoaderCircle, Sparkles, Upload } from 'lucide-react';
import { useHomeAnalysis } from '../../hooks/useHomeAnalysis';
import { navigate } from '../../hooks/useNavigation';
import type { DossierSummary } from '../../types';

interface AnalysisActionProps {
  dossier?: DossierSummary;
  className: string;
  beforeActivate?: () => void;
  disabled?: boolean;
}

export function AnalysisAction({
  dossier,
  className,
  beforeActivate,
  disabled,
}: AnalysisActionProps) {
  const analysis = useHomeAnalysis();
  const session =
    analysis.session?.dossier.dossier_id === dossier?.dossier_id ? analysis.session : null;
  const status = dossier ? analysis.resolveStatus(dossier) : undefined;
  const canAnalyze = status === 'not_analyzed' || status === 'failed';
  const complete = session?.phase === 'done';
  const uploading = session?.phase === 'uploading';
  const working = !!session && analysis.busy;
  const label = complete
    ? 'Terminé'
    : uploading
      ? 'Envoi…'
      : working
        ? 'Analyse…'
        : canAnalyze
          ? 'Analyser'
          : status === 'queued' || status === 'processing'
            ? 'Suivre'
            : 'Ouvrir';
  const unavailable = !dossier || analysis.busy || complete || disabled;
  return (
    <a
      className={className}
      data-flip-id="home-action"
      data-action={complete ? 'done' : working ? 'working' : canAnalyze ? 'analyze' : 'open'}
      href={dossier ? `/dossiers/${encodeURIComponent(dossier.dossier_id)}` : undefined}
      aria-disabled={unavailable || undefined}
      aria-busy={working || undefined}
      aria-label={dossier ? `${label} le dossier ${dossier.dossier_id}` : 'Dossier indisponible'}
      onClick={(event) => {
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        if (!dossier || unavailable) return;
        const scope = event.currentTarget.closest('section');
        const folder = Array.from(
          scope?.querySelectorAll<HTMLElement>('.dossier-folder') ?? [],
        ).find((element) => element.dataset.dossierId === dossier.dossier_id);
        beforeActivate?.();
        if (canAnalyze || status === 'queued' || status === 'processing') {
          if (folder) analysis.beginAnalysis({ ...dossier, status: status! }, folder);
        } else navigate(event.currentTarget.getAttribute('href')!);
      }}
    >
      <span key={label} className="home-action-content">
        {complete ? (
          <Check className="analysis-done-check" size={18} aria-hidden="true" />
        ) : uploading ? (
          <Upload className="analysis-upload-icon" size={18} aria-hidden="true" />
        ) : working ? (
          <LoaderCircle className="spin" size={18} aria-hidden="true" />
        ) : canAnalyze ? (
          <Sparkles size={18} aria-hidden="true" />
        ) : (
          <ArrowUpRight size={20} aria-hidden="true" />
        )}
        {label}
      </span>
    </a>
  );
}
