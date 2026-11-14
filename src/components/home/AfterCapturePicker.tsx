/** Selects saved before/after dossiers with readable vehicle identity; depends on server pagination, the shared drawer and selection motion. */
import { useState } from 'react';
import { ArrowLeft, ArrowRight, Camera, CarFront, ChevronRight, FolderOpen } from 'lucide-react';
import { DetailsDrawer } from '../dossier/DetailsDrawer';
import { useResource } from '../../hooks/useResource';
import { useSelectionIndicator } from '../../hooks/useSelectionIndicator';
import { describeError, listDossiers } from '../../lib/api';
import type { DossierSummary } from '../../types';
import '../../styles/after-capture-picker.css';

const pageSize = 20;
const captureFilters = [
  { value: 'awaiting_after', label: 'À commencer' },
  { value: 'after_incomplete', label: 'À compléter' },
] as const;

export function AfterCapturePicker({
  onSelect,
  onClose,
}: {
  onSelect: (dossier: DossierSummary) => void;
  onClose: () => void;
}) {
  const [offset, setOffset] = useState(0);
  const [workflow, setWorkflow] = useState<'awaiting_after' | 'after_incomplete'>('awaiting_after');
  const filters = useSelectionIndicator(workflow, '[aria-pressed="true"]');
  const dossiers = useResource(`after-picker-${workflow}-${offset}`, (signal) =>
    listDossiers(
      {
        type: 'verification',
        workflow_status: workflow,
        status: 'all',
        search: '',
        limit: pageSize,
        offset,
        sort: 'updated_at_desc',
      },
      signal,
    ),
  );
  const total = dossiers.data?.total ?? 0;
  const hasError = dossiers.error != null;
  return (
    <DetailsDrawer
      title="Compléter une capture APRÈS"
      subtitle="Photos avant / après"
      onClose={onClose}
    >
      {(requestClose) => (
        <div className="capture-after-picker">
          <div className="capture-picker-intro">
            <span className="capture-picker-icon">
              <Camera size={20} aria-hidden="true" />
            </span>
            <p>
              Sélectionnez le véhicule photographié avant réparation pour ajouter ses photos après.
            </p>
          </div>
          <div
            ref={filters}
            className="capture-picker-filters"
            role="group"
            aria-label="État des photos après"
          >
            <span className="selection-indicator" aria-hidden="true" />
            {captureFilters.map((filter) => (
              <button
                key={filter.value}
                type="button"
                aria-pressed={workflow === filter.value}
                onClick={() => {
                  setWorkflow(filter.value);
                  setOffset(0);
                }}
              >
                {filter.label}
              </button>
            ))}
          </div>
          <section
            className="capture-picker-results"
            aria-label="Dossiers disponibles"
            aria-busy={dossiers.loading}
          >
            <div className="capture-picker-list-heading">
              <h3>Choisir un véhicule</h3>
              {!dossiers.loading && !hasError && (
                <span role="status">
                  {total} dossier{total !== 1 ? 's' : ''}
                </span>
              )}
            </div>
            {dossiers.loading && (
              <p className="capture-picker-feedback" role="status">
                Chargement des dossiers…
              </p>
            )}
            {hasError && (
              <div className="capture-picker-feedback" role="alert">
                <p>{describeError(dossiers.error)}</p>
                <button type="button" onClick={dossiers.refresh}>
                  Réessayer
                </button>
              </div>
            )}
            {!dossiers.loading && !hasError && total === 0 && (
              <div className="capture-picker-empty" role="status">
                <FolderOpen size={28} aria-hidden="true" />
                <strong>
                  {workflow === 'awaiting_after'
                    ? 'Aucune capture à commencer'
                    : 'Aucune capture à compléter'}
                </strong>
                <p>
                  {workflow === 'awaiting_after'
                    ? 'Les dossiers dont les photos avant sont terminées apparaîtront ici.'
                    : 'Les dossiers avec des photos après encore manquantes apparaîtront ici.'}
                </p>
              </div>
            )}
            {!hasError &&
              dossiers.data?.items.map((dossier) => (
                <button
                  className="capture-after-option"
                  key={dossier.dossier_id}
                  type="button"
                  disabled={dossiers.loading}
                  onClick={() => requestClose(() => onSelect(dossier))}
                >
                  <span className="capture-picker-icon">
                    <CarFront size={22} aria-hidden="true" />
                  </span>
                  <span className="capture-picker-vehicle">
                    <strong>
                      <bdi>{dossier.vehicle.matricule || 'Matricule non renseigné'}</bdi>
                    </strong>
                    <span>
                      {[dossier.vehicle.marque, dossier.vehicle.modele].filter(Boolean).join(' ') ||
                        'Véhicule non renseigné'}
                    </span>
                    <span className="capture-picker-reference">{dossier.dossier_id}</span>
                  </span>
                  <ChevronRight size={18} aria-hidden="true" />
                </button>
              ))}
          </section>
          {!hasError && (total > pageSize || offset > 0) && (
            <nav className="capture-picker-pagination" aria-label="Pages des dossiers">
              <button
                type="button"
                disabled={!offset || dossiers.loading}
                onClick={() => setOffset((value) => Math.max(0, value - pageSize))}
                aria-label="Page précédente"
              >
                <ArrowLeft size={16} aria-hidden="true" />
              </button>
              <span>
                Page {Math.floor(offset / pageSize) + 1}
                {dossiers.data && ` sur ${Math.max(1, Math.ceil(total / pageSize))}`}
              </span>
              <button
                type="button"
                disabled={dossiers.loading || !dossiers.data || offset + pageSize >= total}
                onClick={() => setOffset((value) => value + pageSize)}
                aria-label="Page suivante"
              >
                <ArrowRight size={16} aria-hidden="true" />
              </button>
            </nav>
          )}
          <p className="capture-picker-note">
            Les photos après seront ajoutées au même dossier. Vérifiez le matricule avant de
            continuer.
          </p>
        </div>
      )}
    </DetailsDrawer>
  );
}
