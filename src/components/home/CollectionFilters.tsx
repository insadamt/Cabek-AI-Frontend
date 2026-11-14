/**
 * Shared dossier filters for all three collections, preserving server queries and URL restoration.
 * Depends on category status rules, FilterSelect, navigation and dismissible native details.
 */
import { ArrowDownWideNarrow, CalendarDays, RotateCcw, SlidersHorizontal } from 'lucide-react';
import { useDismissibleDetails } from '../../hooks/useDismissibleDetails';
import { useNavigation } from '../../hooks/useNavigation';
import { brandSortAvailable } from '../../lib/api';
import { collectionUrl, workflowLabels, type Category } from '../../lib/workflows';
import { FilterSelect } from '../FilterSelect';

export function CollectionFilters({ category }: { category: Category }) {
  const { pathname, searchParams, navigate } = useNavigation();
  const detailsRef = useDismissibleDetails();
  const status = searchParams.get('workflow_status') ?? '';
  const createdFrom = searchParams.get('created_from') ?? '';
  const createdTo = searchParams.get('created_to') ?? '';
  const sort = searchParams.get('sort') ?? 'created_at_desc';
  const activeCount = [status, createdFrom, createdTo, sort !== 'created_at_desc'].filter(
    Boolean,
  ).length;

  function applyFilters(changes: Record<string, string | null>) {
    navigate(collectionUrl(pathname, searchParams, { offset: null, slide: null, ...changes }));
  }

  return (
    <details ref={detailsRef} className="category-filters" open={activeCount > 0 || undefined}>
      <summary>
        <SlidersHorizontal size={15} aria-hidden="true" />
        Filtrer et trier
        {activeCount > 0 && (
          <span
            className="filter-active-count"
            aria-label={`${activeCount} filtre${activeCount > 1 ? 's' : ''} actif${activeCount > 1 ? 's' : ''}`}
          >
            {activeCount}
          </span>
        )}
      </summary>
      <div className="category-filter-fields">
        <div className="filter-panel-heading">
          <div>
            <h2>Affiner les dossiers</h2>
            <p>Par état, date de création ou ordre d’affichage.</p>
          </div>
          <ArrowDownWideNarrow size={18} aria-hidden="true" />
        </div>
        <FilterSelect
          label="État du dossier"
          value={status}
          options={[
            { value: '', label: 'Tous les états' },
            ...category.statuses.map((value) => ({ value, label: workflowLabels[value] })),
          ]}
          onChange={(value) => applyFilters({ workflow_status: value || null })}
        />
        <FilterSelect
          label="Trier par"
          value={sort}
          options={[
            { value: 'created_at_desc', label: 'Plus récents' },
            { value: 'created_at_asc', label: 'Plus anciens' },
            { value: 'updated_at_desc', label: 'Dernière modification' },
            {
              value: 'brand_asc',
              label: brandSortAvailable ? 'Marque' : 'Marque · indisponible',
              disabled: !brandSortAvailable,
            },
          ]}
          onChange={(value) => applyFilters({ sort: value === 'created_at_desc' ? null : value })}
        />
        <label className="filter-date-field">
          <span className="filter-field-label">Créé à partir du</span>
          <span className="filter-date-control">
            <CalendarDays size={15} aria-hidden="true" />
            <input
              type="date"
              value={createdFrom}
              max={createdTo || undefined}
              onChange={(event) => applyFilters({ created_from: event.target.value || null })}
            />
          </span>
        </label>
        <label className="filter-date-field">
          <span className="filter-field-label">Créé jusqu’au</span>
          <span className="filter-date-control">
            <CalendarDays size={15} aria-hidden="true" />
            <input
              type="date"
              value={createdTo}
              min={createdFrom || undefined}
              onChange={(event) => applyFilters({ created_to: event.target.value || null })}
            />
          </span>
        </label>
        <div className="filter-panel-footer">
          <span>
            {activeCount
              ? `${activeCount} filtre${activeCount > 1 ? 's' : ''} actif${activeCount > 1 ? 's' : ''}`
              : 'Tous les dossiers'}
          </span>
          <button
            type="button"
            className="filter-reset"
            disabled={!activeCount}
            onClick={() =>
              applyFilters({
                workflow_status: null,
                created_from: null,
                created_to: null,
                sort: null,
              })
            }
          >
            <RotateCcw size={13} aria-hidden="true" /> Réinitialiser
          </button>
        </div>
      </div>
    </details>
  );
}
