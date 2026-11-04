/** Dossier identity and physical entrance shared by expertise, quick estimates and repair evidence. */
import { categoryForType, categoryPath, workflowLabels } from '../lib/workflows';
import { DossierActions } from '../components/dossier/DossierActions';
import { QuickEstimateWorkspace } from '../components/dossier/QuickEstimateWorkspace';
import { VerificationWorkspace } from '../components/dossier/VerificationWorkspace';
import { useHomeAnalysis } from '../hooks/useHomeAnalysis';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { DossierFolder } from '../components/home/DossierFolder';
import { DossierResultWorkspace } from '../components/dossier/DossierResultWorkspace';
import { EmptyState } from '../components/EmptyState';
import { StatusBadge } from '../components/StatusBadge';
import { useDossierEntrance } from '../hooks/useDossierEntrance';
import { navigate } from '../hooks/useNavigation';
import { useResource } from '../hooks/useResource';
import { describeError, findDossierSummary, isPreview, readDossier } from '../lib/api';
import type { DossierEntrance } from '../lib/dossierNavigation';
import { formatDate, isActiveStatus, vehicleName } from '../lib/format';
import type { DossierSummary } from '../types';

export function Dossier({ dossierId }: { dossierId: string }) {
  const container = useRef<HTMLDivElement>(null);
  const analysis = useHomeAnalysis();
  const [entrance] = useState<DossierEntrance | undefined>(() => {
    const snapshot = window.history.state?.dossierEntrance as DossierEntrance | undefined;
    return snapshot?.dossier.dossier_id === dossierId ? snapshot : undefined;
  });
  const resource = useResource(
    dossierId,
    (signal) => readDossier(dossierId, signal),
    (data) =>
      !isPreview && data?.type !== 'verification' && isActiveStatus(data?.status)
        ? 1800
        : undefined,
  );
  const summary = useResource(`summary-${dossierId}`, (signal) =>
    findDossierSummary(dossierId, signal),
  );
  const savedSummary = summary.data ?? entrance?.dossier;
  const sessionResponse =
    analysis.session?.dossier.dossier_id === dossierId ? analysis.session.response : undefined;
  const response = resource.data ?? entrance?.response;
  // Publish scan samples once so later photo edits cannot be hidden by an older island session.

  useEffect(() => {
    if (sessionResponse) resource.replaceData(sessionResponse);
  }, [sessionResponse, resource.replaceData]);
  // Current metadata can differ from the immutable vehicle snapshot saved with the analysis.

  const vehicle = response?.vehicle ?? response?.result?.vehicle ?? savedSummary?.vehicle;
  const dossier: DossierSummary | undefined = vehicle
    ? {
        dossier_id: dossierId,
        type: response?.type ?? savedSummary?.type,
        workflow_status: response?.workflow_status ?? savedSummary?.workflow_status,
        source: response?.source ?? savedSummary?.source,
        vehicle,
        status: response?.status ?? savedSummary?.status ?? 'not_analyzed',
        photo_count:
          response?.photos?.length ??
          savedSummary?.photo_count ??
          response?.result?.photos.length ??
          0,
        created_at: response?.created_at ?? savedSummary?.created_at ?? null,
      }
    : undefined;
  const entranceComplete = useDossierEntrance({ container, entrance, ready: !!dossier });

  useEffect(() => {
    document.title = `${vehicle ? vehicleName(vehicle) : 'Dossier'} — CABEK AI`;
  }, [vehicle]);

  function refreshMetadata() {
    resource.refresh();
    summary.refresh();
  }

  return (
    <div
      className="page dossier-page dossier-overview"
      data-category={response?.type ?? savedSummary?.type}
      ref={container}
    >
      <button
        className="back-link"
        onClick={() => {
          const returnTo = window.history.state?.returnTo;
          if (
            typeof returnTo === 'string' &&
            returnTo.split('?')[0] === categoryPath(dossier?.type)
          ) {
            if (window.history.length > 1) window.history.back();
            else navigate(returnTo);
          } else navigate(categoryPath(dossier?.type));
        }}
      >
        <ArrowLeft size={15} /> Retour aux dossiers
      </button>
      <div className="dossier-overview-layout">
        <section className="dossier-overview-sidebar" aria-label="Informations du dossier">
          {dossier && (
            <>
              <div
                className="dossier-overview-folder"
                role="img"
                aria-label={`Dossier ${dossierId}`}
              >
                <DossierFolder
                  dossier={dossier}
                  isActive={false}
                  isOpen={false}
                  onSelect={() => {}}
                />
              </div>
              <div className="dossier-overview-identity" data-dossier-metadata>
                <p className="eyebrow">{categoryForType(dossier.type).title}</p>
                <h1 title={vehicleName(dossier.vehicle)}>{vehicleName(dossier.vehicle)}</h1>
                <p className="dossier-registration">
                  <bdi>{dossier.vehicle.matricule || 'Immatriculation non renseignée'}</bdi>
                </p>
                {dossier.type && dossier.type !== 'forfait_expertise' && dossier.workflow_status ? (
                  <span className="status-badge">{workflowLabels[dossier.workflow_status]}</span>
                ) : (
                  <StatusBadge status={dossier.status} />
                )}
              </div>
              <div className="dossier-information" data-dossier-metadata>
                <h2 className="dossier-information-heading">Informations du dossier</h2>
                <dl className="dossier-metadata">
                  <div data-dossier-metadata>
                    <dt>Référence</dt>
                    <dd title={String(dossierId)}>{dossierId}</dd>
                  </div>
                  <div data-dossier-metadata>
                    <dt>Marque</dt>
                    <dd title={String(dossier.vehicle.marque || 'Non renseignée')}>
                      {dossier.vehicle.marque || 'Non renseignée'}
                    </dd>
                  </div>
                  <div data-dossier-metadata>
                    <dt>Modèle</dt>
                    <dd title={String(dossier.vehicle.modele || 'Non renseigné')}>
                      {dossier.vehicle.modele || 'Non renseigné'}
                    </dd>
                  </div>
                  <div data-dossier-metadata>
                    <dt>Immatriculation</dt>
                    <dd title={dossier.vehicle.matricule || 'Non renseignée'}>
                      <bdi>{dossier.vehicle.matricule || 'Non renseignée'}</bdi>
                    </dd>
                  </div>
                  <div data-dossier-metadata>
                    <dt>Année du véhicule</dt>
                    <dd title={String(dossier.vehicle.annee || 'Non renseignée')}>
                      {dossier.vehicle.annee || 'Non renseignée'}
                    </dd>
                  </div>
                  <div data-dossier-metadata>
                    <dt>Mise en circulation</dt>
                    <dd>{formatDate(dossier.vehicle.date_mise_en_circulation)}</dd>
                  </div>
                  <div data-dossier-metadata>
                    <dt>Date du sinistre</dt>
                    <dd title={String(formatDate(dossier.vehicle.date_sinistre))}>
                      {formatDate(dossier.vehicle.date_sinistre)}
                    </dd>
                  </div>
                  <div data-dossier-metadata>
                    <dt>Création du dossier</dt>
                    <dd title={String(formatDate(dossier.created_at))}>
                      {formatDate(dossier.created_at)}
                    </dd>
                  </div>
                  <div data-dossier-metadata>
                    <dt>Photographies</dt>
                    <dd title={String(dossier.photo_count)}>{dossier.photo_count}</dd>
                  </div>
                </dl>
              </div>
              {response && (
                <DossierActions
                  dossier={response}
                  disabled={analysis.busy}
                  onError={resource.refresh}
                  onDeleted={() => navigate(categoryPath(response.type))}
                />
              )}
              {isPreview && (
                <p className="dossier-preview" data-dossier-metadata>
                  {dossier.type && dossier.type !== 'forfait_expertise'
                    ? 'Aperçu interactif · Données d’exemple'
                    : 'Aperçu en lecture seule · Données d’exemple'}
                </p>
              )}
            </>
          )}
          {!dossier && (summary.loading || resource.loading) && (
            <div
              className="dossier-metadata-loading"
              role="status"
              aria-label="Chargement du dossier"
            >
              <div className="skeleton skeleton-block" />
              <div className="skeleton skeleton-title" />
              <div className="skeleton skeleton-line" />
            </div>
          )}
          {(summary.error != null || (!dossier && resource.error != null)) && (
            <div className="notice" role="alert">
              <div>
                <strong>Informations indisponibles</strong>
                <p>{describeError(summary.error ?? resource.error)}</p>
                <button className="text-link" onClick={refreshMetadata}>
                  <RefreshCw size={14} /> Réessayer
                </button>
              </div>
            </div>
          )}
          {!dossier &&
            !summary.loading &&
            !resource.loading &&
            !summary.error &&
            !resource.error && (
              <EmptyState
                title="Dossier introuvable"
                description="Revenez à l’accueil pour retrouver vos dossiers."
                onRetry={() => navigate('/')}
                actionLabel="Retour à l’accueil"
              />
            )}
        </section>
        {dossier && (
          <div
            className="dossier-inspection"
            data-ready={entranceComplete}
            inert={!entranceComplete}
          >
            {resource.error != null &&
              response &&
              dossier.type &&
              dossier.type !== 'forfait_expertise' && (
                <p role="alert">
                  {describeError(resource.error)}{' '}
                  <button className="text-link" onClick={resource.refresh}>
                    Réessayer
                  </button>
                </p>
              )}
            {response?.type === 'verification' ? (
              <VerificationWorkspace
                response={response}
                onSaved={resource.replaceData}
                onRefresh={resource.refresh}
              />
            ) : response?.type === 'chiffrage_rapide' ? (
              <QuickEstimateWorkspace
                response={response}
                dossier={dossier}
                error={resource.error}
                onSaved={resource.replaceData}
                onRefresh={resource.refresh}
              />
            ) : dossier.type === 'verification' || dossier.type === 'chiffrage_rapide' ? (
              <div role="status">
                {resource.error ? 'Photographies indisponibles.' : 'Chargement des photographies…'}
              </div>
            ) : (
              <DossierResultWorkspace
                key={dossierId}
                dossierId={dossierId}
                response={response}
                status={response?.status ?? dossier.status}
                loading={!response && resource.loading}
                error={resource.error}
                onRetry={resource.refresh}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
