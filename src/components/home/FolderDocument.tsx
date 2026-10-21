import { X } from 'lucide-react';
import { useFolderDocumentMotion } from '../../hooks/useFolderDocumentMotion';
import { shortStatusLabels } from '../../lib/format';
import type { DossierSummary } from '../../types';

interface FolderDocumentProps {
  dossier: DossierSummary;
  documentId: string;
  isOpen: boolean;
  onMotionChange: (moving: boolean) => void;
  onRequestClose: () => void;
}

export function FolderDocument({
  dossier,
  documentId,
  isOpen,
  onMotionChange,
  onRequestClose,
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
      <button
        type="button"
        className="folder-document-close"
        aria-label="Ranger la fiche véhicule"
        tabIndex={isOpen ? 0 : -1}
        onPointerDown={(event) => event.stopPropagation()}
        onClick={(event) => {
          event.stopPropagation();
          onRequestClose();
        }}
      >
        <X size={18} aria-hidden="true" />
      </button>
      <header className="folder-document-header">
        <span className="folder-document-brand">
          cabek<span>ai.</span>
        </span>
        <span>FICHE VÉHICULE</span>
      </header>
      <p className="folder-document-reference">{dossier.dossier_id}</p>
      <dl className="folder-document-fields">
        <div>
          <dt>Marque</dt>
          <dd>{vehicle.marque || 'Non renseignée'}</dd>
        </div>
        <div>
          <dt>Modèle</dt>
          <dd>{vehicle.modele || 'Non renseigné'}</dd>
        </div>
        <div className="folder-document-registration">
          <dt>Immatriculation</dt>
          <dd>{vehicle.matricule || 'Non renseignée'}</dd>
        </div>
        <div>
          <dt>Année</dt>
          <dd>{vehicle.annee || 'Non renseignée'}</dd>
        </div>
        <div>
          <dt>Photographies</dt>
          <dd>{dossier.photo_count}</dd>
        </div>
      </dl>
      <footer className="folder-document-footer">
        <span className={`folder-document-status status-${dossier.status}`}>
          <span aria-hidden="true" />
          {shortStatusLabels[dossier.status]}
        </span>
        <span>CABEK / DOSSIER</span>
      </footer>
    </article>
  );
}
