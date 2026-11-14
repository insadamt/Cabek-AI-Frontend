/** Choose an existing imported dossier before tunnel capture.
 * Depends on server-side category/search/status pagination and the shared accessible drawer.
 */
import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, ChevronRight, FolderOpen, Search } from 'lucide-react';
import { DetailsDrawer } from '../dossier/DetailsDrawer';
import { useResource } from '../../hooks/useResource';
import { describeError, listDossiers } from '../../lib/api';
import { vehicleName } from '../../lib/format';
import type { DossierSummary } from '../../types';
import '../../styles/after-capture-picker.css';

const pageSize = 20;

export function ExpertiseDossierPicker({
  onSelect,
  onClose,
}: {
  onSelect: (dossier: DossierSummary) => void;
  onClose: () => void;
}) {
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [offset, setOffset] = useState(0);
  useEffect(() => {
    const timer = setTimeout(() => setQuery(search.trim()), 250);
    return () => clearTimeout(timer);
  }, [search]);
  const dossiers = useResource(`expertise-picker-${query}-${offset}`, (signal) =>
    listDossiers(
      {
        type: 'forfait_expertise',
        workflow_status: 'awaiting_photos',
        status: 'all',
        search: query,
        limit: pageSize,
        offset,
        sort: 'created_at_desc',
      },
      signal,
    ),
  );
  const total = dossiers.data?.total ?? 0;
  const loading = dossiers.loading || query !== search.trim();
  return (
    <DetailsDrawer
      title="Choisir un dossier"
      subtitle="Devis d’expertise · Capture tunnel"
      onClose={onClose}
    >
      {(requestClose) => (
        <div className="capture-after-picker">
          <div className="capture-picker-intro">
            <span className="capture-picker-icon">
              <FolderOpen size={22} aria-hidden="true" />
            </span>
            <p>
              Sélectionnez le dossier du véhicule présent dans le tunnel. Sa fiche est importée
              automatiquement.
            </p>
          </div>
          <label className="capture-picker-search">
            <span>Référence, matricule, marque ou modèle</span>
            <span>
              <Search size={18} aria-hidden="true" />
              <input
                type="search"
                value={search}
                maxLength={200}
                placeholder="Rechercher un dossier…"
                onChange={(event) => {
                  setSearch(event.target.value);
                  setOffset(0);
                }}
              />
            </span>
          </label>
          <section
            className="capture-picker-results"
            aria-label="Dossiers disponibles"
            aria-busy={loading}
          >
            <div className="capture-picker-list-heading">
              <h3>Dossiers disponibles</h3>
              {!loading && !dossiers.error && (
                <span role="status">
                  {total} dossier{total !== 1 ? 's' : ''}
                </span>
              )}
            </div>
            {loading && (
              <p className="capture-picker-feedback" role="status">
                Chargement des dossiers…
              </p>
            )}
            {dossiers.error != null && (
              <div className="capture-picker-feedback" role="alert">
                <p>{describeError(dossiers.error)}</p>
                <button type="button" onClick={dossiers.refresh}>
                  Réessayer
                </button>
              </div>
            )}
            {!loading && !dossiers.error && total === 0 && (
              <div className="capture-picker-empty" role="status">
                <FolderOpen size={28} aria-hidden="true" />
                <strong>Aucun dossier disponible</strong>
                <p>
                  {query
                    ? 'Essayez une autre référence ou un autre matricule.'
                    : 'Les dossiers importés en attente de photographies apparaîtront ici.'}
                </p>
              </div>
            )}
            {!dossiers.error &&
              dossiers.data?.items.map((dossier) => (
                <button
                  className="capture-after-option"
                  key={dossier.dossier_id}
                  type="button"
                  disabled={loading}
                  onClick={() => requestClose(() => onSelect(dossier))}
                >
                  <span className="capture-picker-icon">
                    <FolderOpen size={22} aria-hidden="true" />
                  </span>
                  <span className="capture-picker-vehicle">
                    <strong>
                      <bdi>{dossier.vehicle.matricule || 'Matricule non renseigné'}</bdi>
                    </strong>
                    <span>{vehicleName(dossier.vehicle)}</span>
                    <span className="capture-picker-reference">{dossier.dossier_id}</span>
                  </span>
                  <ChevronRight size={18} aria-hidden="true" />
                </button>
              ))}
          </section>
          {!dossiers.error && (total > pageSize || offset > 0) && (
            <nav className="capture-picker-pagination" aria-label="Pages des dossiers">
              <button
                type="button"
                aria-label="Page précédente"
                disabled={!offset || loading}
                onClick={() => setOffset(Math.max(0, offset - pageSize))}
              >
                <ArrowLeft size={16} />
              </button>
              <span>
                Page {Math.floor(offset / pageSize) + 1} sur{' '}
                {Math.max(1, Math.ceil(total / pageSize))}
              </span>
              <button
                type="button"
                aria-label="Page suivante"
                disabled={loading || !dossiers.data || offset + pageSize >= total}
                onClick={() => setOffset(offset + pageSize)}
              >
                <ArrowRight size={16} />
              </button>
            </nav>
          )}
          <p className="capture-picker-note">
            Vérifiez la référence et le matricule avant de scanner. Les photos seront enregistrées
            dans ce dossier.
          </p>
        </div>
      )}
    </DetailsDrawer>
  );
}
