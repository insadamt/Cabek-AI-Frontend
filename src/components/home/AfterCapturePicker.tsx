/** Selects persisted verification dossiers awaiting repair evidence; depends on server-filtered, paginated collections. */
import { useState } from 'react';
import { DetailsDrawer } from '../dossier/DetailsDrawer';
import { useResource } from '../../hooks/useResource';
import { describeError, listDossiers } from '../../lib/api';
import type { DossierSummary } from '../../types';

export function AfterCapturePicker({
  onSelect,
  onClose,
}: {
  onSelect: (dossier: DossierSummary) => void;
  onClose: () => void;
}) {
  const [offset, setOffset] = useState(0);
  const [workflow, setWorkflow] = useState<'awaiting_after' | 'after_incomplete'>('awaiting_after');
  const dossiers = useResource(`after-picker-${workflow}-${offset}`, (signal) =>
    listDossiers(
      {
        type: 'verification',
        workflow_status: workflow,
        status: 'all',
        search: '',
        limit: 20,
        offset,
        sort: 'updated_at_desc',
      },
      signal,
    ),
  );
  return (
    <DetailsDrawer
      title="Compléter une capture APRÈS"
      subtitle="Même dossier · Même véhicule"
      onClose={onClose}
    >
      {(requestClose) => (
        <div className="capture-after-picker">
          <label>
            État
            <select
              value={workflow}
              onChange={(event) => {
                setWorkflow(event.target.value as typeof workflow);
                setOffset(0);
              }}
            >
              <option value="awaiting_after">En attente des photos après</option>
              <option value="after_incomplete">Photos après incomplètes</option>
            </select>
          </label>
          {dossiers.loading && <p role="status">Chargement des dossiers…</p>}
          {dossiers.error != null && (
            <p role="alert">
              {describeError(dossiers.error)}{' '}
              <button type="button" onClick={dossiers.refresh}>
                Réessayer
              </button>
            </p>
          )}
          {!dossiers.loading && dossiers.data?.items.length === 0 && <p>Aucun dossier éligible.</p>}
          {dossiers.data?.items.map((dossier) => (
            <button
              className="capture-after-option"
              key={dossier.dossier_id}
              type="button"
              disabled={dossiers.loading}
              onClick={() => requestClose(() => onSelect(dossier))}
            >
              <strong>
                <bdi>{dossier.vehicle.matricule}</bdi>
              </strong>
              <span>
                {dossier.dossier_id} · {dossier.vehicle.marque} {dossier.vehicle.modele}
              </span>
            </button>
          ))}
          <div className="capture-picker-pagination">
            <button
              type="button"
              disabled={!offset || dossiers.loading}
              onClick={() => setOffset((value) => Math.max(0, value - 20))}
            >
              Précédents
            </button>
            <button
              type="button"
              disabled={dossiers.loading || !dossiers.data || offset + 20 >= dossiers.data.total}
              onClick={() => setOffset((value) => value + 20)}
            >
              Suivants
            </button>
          </div>
        </div>
      )}
    </DetailsDrawer>
  );
}
