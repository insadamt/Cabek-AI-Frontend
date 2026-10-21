import {
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  Check,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  Circle,
  FolderClosed,
  LayoutGrid,
  List,
  RefreshCw,
  ScanLine,
  Search,
  TriangleAlert,
  X,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { CarBlueprint } from '../components/CarBlueprint';
import { EmptyState } from '../components/EmptyState';
import { StatusBadge } from '../components/StatusBadge';
import { useEntrance } from '../hooks/useEntrance';
import { navigate, restoreScrollPosition, useNavigation } from '../hooks/useNavigation';
import { useResource } from '../hooks/useResource';
import { describeError, isPreview, listDossiers } from '../lib/api';
import { formatDate, isActiveStatus, statusLabels, vehicleName } from '../lib/format';
import type { DossierQuery, DossierSummary, FilterStatus } from '../types';

const filters: FilterStatus[] = [
  'all',
  'not_analyzed',
  'queued',
  'processing',
  'completed',
  'failed',
];
const statDefinitions = [
  {
    status: 'all',
    label: 'Dossiers au total',
    icon: FolderClosed,
    caption: 'Une vue sur votre activité',
  },
  {
    status: 'not_analyzed',
    label: 'À analyser',
    icon: Circle,
    caption: 'Prêts pour votre expertise',
  },
  {
    status: 'processing',
    label: 'En analyse',
    icon: ScanLine,
    caption: 'Le traitement suit son cours',
  },
  {
    status: 'completed',
    label: 'Analyses terminées',
    icon: CheckCheck,
    caption: 'Vos résultats enregistrés',
  },
] as const;

function DossierCard({ dossier, rowView }: { dossier: DossierSummary; rowView: boolean }) {
  const label =
    dossier.status === 'completed'
      ? 'Voir le résultat'
      : isActiveStatus(dossier.status)
        ? 'Voir le suivi'
        : 'Ouvrir le dossier';
  return (
    <article className={`dossier-card ${rowView ? 'dossier-row' : ''}`} data-enter>
      <div className="dossier-card-top">
        <span className="folder-icon">
          <FolderClosed size={21} strokeWidth={1.4} />
        </span>
        <StatusBadge status={dossier.status} />
      </div>
      <div className="dossier-card-identity">
        <h3>{vehicleName(dossier.vehicle)}</h3>
        <span className="plate">
          {dossier.vehicle.matricule || 'Immatriculation non renseignée'}
        </span>
      </div>
      <span className="dossier-reference" title={dossier.dossier_id}>
        {dossier.dossier_id}
      </span>
      <div className="dossier-card-meta">
        <span>
          <span className="photo-stack" aria-hidden="true" /> {dossier.photo_count} photo
          {dossier.photo_count > 1 ? 's' : ''}
        </span>
        <span>{formatDate(dossier.created_at)}</span>
      </div>
      <a
        className={`card-action ${dossier.status === 'completed' ? 'card-action-completed' : ''}`}
        href={`/dossiers/${encodeURIComponent(dossier.dossier_id)}`}
        onClick={(event) => {
          if (!event.metaKey && !event.ctrlKey) {
            event.preventDefault();
            navigate(event.currentTarget.getAttribute('href')!);
          }
        }}
      >
        <span>{label}</span>
        <ArrowUpRight size={16} />
      </a>
    </article>
  );
}

export function Dashboard() {
  const { pathname, searchParams } = useNavigation();
  const overview = pathname === '/';
  useEffect(() => {
    document.title = 'CABEK AI — Expertise automobile';
  }, []);
  const search = searchParams.get('search') ?? '';
  const status = filters.includes(searchParams.get('status') as FilterStatus)
    ? (searchParams.get('status') as FilterStatus)
    : 'all';
  const parsedOffset = Number(searchParams.get('offset') ?? 0);
  const offset = Number.isSafeInteger(parsedOffset) && parsedOffset >= 0 ? parsedOffset : 0;
  const [searchInput, setSearchInput] = useState(search);
  const [rowView, setRowView] = useState(false);
  const container = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const query: DossierQuery = { search, status, limit: 6, offset };
  const resource = useResource(
    JSON.stringify(query),
    (signal) => listDossiers(query, signal),
    (data) =>
      !isPreview && data && data.counts.processing + data.counts.queued > 0 ? 10_000 : undefined,
  );
  const data = resource.data;
  const counts = data?.counts;
  useEntrance(
    container,
    `${overview}-${data?.items.map((item) => item.dossier_id).join(',') ?? 'loading'}-${rowView}`,
  );

  function updateQuery(updates: { search?: string; status?: FilterStatus; offset?: number }) {
    const params = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(updates)) {
      if (value === '' || value === 'all' || value === 0) params.delete(key);
      else params.set(key, String(value));
    }
    navigate(`${pathname}${params.size ? `?${params}` : ''}`);
  }

  useEffect(() => {
    setSearchInput(search);
  }, [search]);
  useEffect(() => {
    if (searchInput === search) return;
    const timer = setTimeout(() => updateQuery({ search: searchInput, offset: 0 }), 300);
    return () => clearTimeout(timer);
  }, [searchInput, search]);
  useEffect(() => {
    if (data) restoreScrollPosition();
  }, [Boolean(data)]);
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (
        (event.metaKey || event.ctrlKey) &&
        event.key === 'k' &&
        !document.querySelector('dialog[open]')
      ) {
        event.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <div ref={container} className="page dashboard-page">
      <div className="page-heading" data-enter>
        <div>
          <div className="eyebrow">VOTRE ESPACE, EN UN REGARD</div>
          <h1>{overview ? 'Chaque détail compte.' : 'Vos dossiers, simplement.'}</h1>
          <p>
            {overview
              ? 'Une vision claire pour chacune de vos expertises.'
              : 'Retrouvez un véhicule et poursuivez votre expertise.'}
          </p>
        </div>
        <button
          className="button button-secondary refresh-button"
          onClick={resource.refresh}
          disabled={resource.loading}
        >
          <RefreshCw size={15} className={resource.loading ? 'spin' : ''} />
          Actualiser
        </button>
      </div>

      {overview && (
        <section className="overview-hero" data-enter>
          <div className="hero-copy">
            <div className="hero-eyebrow">
              <span />
              L’EXPERTISE, AUTREMENT
            </div>
            <h2>
              Un regard précis.
              <br />
              <span>Une décision éclairée.</span>
            </h2>
            <p>
              Photos, dommages et chiffrage.
              <br />
              L’essentiel de votre expertise, au même endroit.
            </p>
            <button
              onClick={() =>
                document.getElementById('dossiers-section')?.scrollIntoView({
                  behavior: matchMedia('(prefers-reduced-motion: reduce)').matches
                    ? 'instant'
                    : 'smooth',
                  block: 'start',
                })
              }
            >
              Explorer les dossiers <ArrowUpRight size={16} />
            </button>
          </div>
          <div className="hero-visual">
            <div className="hero-grid" />
            <CarBlueprint />
            <span className="hero-coordinate">CABEK / EXPERTISE AUTOMOBILE</span>
            <span className="hero-visual-badge">
              <Check size={12} />
              Chaque angle a son importance.
            </span>
          </div>
        </section>
      )}

      <section className="stats-grid" aria-label="Statistiques des dossiers">
        {statDefinitions.map((stat, index) => (
          <button
            key={stat.status}
            className={`stat-card ${status === stat.status && stat.status !== 'all' ? 'stat-selected' : ''}`}
            onClick={() => updateQuery({ status: stat.status, offset: 0 })}
            data-enter
          >
            <div className="stat-top">
              <span>{stat.label}</span>
              <stat.icon size={16} strokeWidth={1.5} />
            </div>
            <div className="stat-value">
              <strong>{counts ? String(counts[stat.status]).padStart(2, '0') : '—'}</strong>
              <span className="stat-number">/ 0{index + 1}</span>
            </div>
            <div className="stat-bottom">
              <span>{stat.caption}</span>
              <ArrowUpRight size={13} />
            </div>
          </button>
        ))}
      </section>

      <section id="dossiers-section" className="dossiers-section" aria-label="Liste des dossiers">
        <div className="section-toolbar" data-enter>
          <div className="section-title">
            <h2>{overview ? 'Vos dossiers' : statusLabels[status]}</h2>
            <span className="count-pill">{data?.total ?? '—'}</span>
          </div>
          <div className="list-tools">
            <label className="search-field">
              <Search size={16} />
              <input
                ref={searchRef}
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Rechercher un dossier…"
                aria-label="Rechercher par dossier, véhicule ou immatriculation"
                maxLength={200}
              />
              {searchInput ? (
                <button
                  onClick={() => setSearchInput('')}
                  type="button"
                  aria-label="Effacer la recherche"
                >
                  <X size={14} />
                </button>
              ) : (
                <kbd>⌘ K</kbd>
              )}
            </label>
            <div className="view-switch" aria-label="Présentation des dossiers">
              <button
                aria-label="Vue en grille"
                aria-pressed={!rowView}
                className={!rowView ? 'selected' : ''}
                onClick={() => setRowView(false)}
              >
                <LayoutGrid size={16} />
              </button>
              <button
                aria-label="Vue en liste"
                aria-pressed={rowView}
                className={rowView ? 'selected' : ''}
                onClick={() => setRowView(true)}
              >
                <List size={17} />
              </button>
            </div>
          </div>
        </div>
        <div className="filter-toolbar" data-enter>
          <div className="status-tabs" role="group" aria-label="Filtrer par état">
            {filters.map((filter) => (
              <button
                className={status === filter ? 'selected' : ''}
                key={filter}
                aria-pressed={status === filter}
                onClick={() => updateQuery({ status: filter, offset: 0 })}
              >
                {filter === 'all' ? 'Tous' : statusLabels[filter]}
                <span>{counts?.[filter] ?? '—'}</span>
              </button>
            ))}
          </div>
          <span className="sort-label">
            <ArrowDownLeft size={12} />
            Référence décroissante
          </span>
        </div>

        {resource.error != null && (
          <div className="notice error-notice" role="alert">
            <TriangleAlert size={17} />
            <div>
              <strong>Synchronisation interrompue</strong>
              <p>{describeError(resource.error)}</p>
              {data && <p>Les dernières données reçues restent affichées.</p>}
            </div>
            <button onClick={resource.refresh}>Réessayer</button>
          </div>
        )}
        {!!data?.warnings.length && (
          <details className="notice warning-notice">
            <summary>
              <TriangleAlert size={16} />
              {data.warnings.length} dossier(s) n’ont pas pu être affichés
            </summary>
            <ul>
              {data.warnings.map((warning) => (
                <li key={warning.dossier_id}>
                  {warning.dossier_id} — Les données enregistrées sont indisponibles ou invalides.
                </li>
              ))}
            </ul>
          </details>
        )}

        <div
          aria-busy={resource.loading}
          className={`dossier-grid ${rowView ? 'dossier-list' : ''}`}
        >
          {!data &&
            resource.loading &&
            Array.from({ length: 6 }, (_, index) => (
              <div className="dossier-card skeleton-card" key={index}>
                <div className="skeleton skeleton-icon" />
                <div className="skeleton skeleton-title" />
                <div className="skeleton skeleton-line" />
                <div className="skeleton skeleton-line short" />
                <div className="skeleton skeleton-action" />
              </div>
            ))}
          {data?.items.map((dossier) => (
            <DossierCard key={dossier.dossier_id} dossier={dossier} rowView={rowView} />
          ))}
        </div>
        {data && !data.items.length && (
          <EmptyState
            title={
              search || status !== 'all' ? 'Aucun dossier ne correspond' : 'Votre espace est prêt'
            }
            description={
              search || status !== 'all'
                ? 'Essayez une autre recherche ou effacez les filtres.'
                : 'Les dossiers présents dans votre service apparaîtront ici.'
            }
            onRetry={
              search || status !== 'all'
                ? () => {
                    setSearchInput('');
                    updateQuery({ search: '', status: 'all', offset: 0 });
                  }
                : undefined
            }
            actionLabel="Effacer les filtres"
          />
        )}
        {data && data.total > 0 && (
          <div className="pagination">
            <span>
              {offset + 1}–{Math.min(offset + data.limit, data.total)} sur {data.total} dossiers
              {resource.loading && <span className="updating-label"> · Actualisation…</span>}
            </span>
            <div>
              <button
                className="pagination-arrow"
                disabled={offset === 0}
                onClick={() => updateQuery({ offset: Math.max(0, offset - data.limit) })}
                aria-label="Page précédente"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="pagination-current">{Math.floor(offset / data.limit) + 1}</span>
              <span className="pagination-total">/ {Math.ceil(data.total / data.limit)}</span>
              <button
                className="pagination-arrow"
                disabled={offset + data.limit >= data.total}
                onClick={() => updateQuery({ offset: offset + data.limit })}
                aria-label="Page suivante"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </section>
      {overview && (
        <div className="dashboard-footnote">
          <span>
            <span className="small-spark">✳</span>La technologie accompagne votre regard d’expert.
          </span>
          <span>
            Des résultats enregistrés. Une expertise qui reste la vôtre.
            <ArrowRight size={13} />
          </span>
        </div>
      )}
    </div>
  );
}
