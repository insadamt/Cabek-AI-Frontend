/** Physical vehicle identity sheet; category workflow labels reuse the existing extraction timeline. */
import { workflowLabels } from '../../lib/workflows';
import { useFolderDocumentMotion } from '../../hooks/useFolderDocumentMotion';
import { shortStatusLabels } from '../../lib/format';
import type { DossierSummary } from '../../types';

interface FolderDocumentProps {
  dossier: DossierSummary;
  documentId: string;
  isOpen: boolean;
  onMotionChange: (moving: boolean) => void;
}

export function FolderDocument({
  dossier,
  documentId,
  isOpen,
  onMotionChange,
}: FolderDocumentProps) {
  const { vehicle } = dossier;
  const documentElement = useFolderDocumentMotion({ isOpen, onMotionChange });

  return (
    <article
      ref={documentElement}
      id={documentId}
      className={`folder-document ${isOpen ? 'is-open' : ''}`}
      aria-label={`Fiche véhicule ${dossier.dossier_id}`}
      aria-hidden={!isOpen}
    >
      <header className="folder-document-header">
        <img className="folder-document-logo" src="/brand/cabek-logo.png" alt="Cabek" />
        <span className="folder-document-reference">{dossier.dossier_id}</span>
      </header>
      <div className="folder-document-identity">
        <p className="folder-document-make">{vehicle.marque || 'Marque non renseignée'}</p>
        <h2>{vehicle.modele || 'Modèle non renseigné'}</h2>
        <div className="folder-document-summary">
          <span>
            <span className="folder-document-year-label">Année </span>
            {vehicle.annee || 'Non renseignée'}
          </span>
          <span className={`folder-document-status status-${dossier.status}`}>
            <span aria-hidden="true" />
            {dossier.workflow_status
              ? workflowLabels[dossier.workflow_status]
              : shortStatusLabels[dossier.status]}
          </span>
        </div>
      </div>
      <dl className="folder-document-fields">
        <div className="folder-document-registration">
          <dt>Immatriculation</dt>
          <dd>
            <bdi>{vehicle.matricule || 'Non renseignée'}</bdi>
          </dd>
        </div>
      </dl>
      <footer className="folder-document-footer">
        <span>
          <strong>{dossier.photo_count}</strong>{' '}
          {dossier.photo_count === 1 ? 'photographie' : 'photographies'}
        </span>
        <span>Fiche véhicule</span>
      </footer>
    </article>
  );
}
