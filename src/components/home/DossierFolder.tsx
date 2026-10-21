import type { DossierSummary } from '../../types';

export function DossierFolder({ dossier }: { dossier: DossierSummary }) {
  return (
    <div className="dossier-folder" aria-hidden="true">
      <div className="folder-tab" />
      <div className="folder-back" />
      <div className="folder-cover">
        <span className="folder-label">{dossier.dossier_id}</span>
      </div>
    </div>
  );
}
