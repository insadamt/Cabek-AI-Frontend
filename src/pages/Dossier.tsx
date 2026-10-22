import {
  ArrowLeft,
  ArrowUpRight,
  Check,
  Download,
  FileText,
  FolderClosed,
  Images,
  LoaderCircle,
  LockKeyhole,
  RefreshCw,
  ScanLine,
  TriangleAlert,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { EmptyState } from '../components/EmptyState';
import { FinancialSummary } from '../components/FinancialSummary';
import { ImageViewer } from '../components/ImageViewer';
import { PartsList } from '../components/PartsList';
import { ScanProgressPanel } from '../components/ScanProgress';
import { StatusBadge } from '../components/StatusBadge';
import { VehicleForm } from '../components/VehicleForm';
import { AnimatedHeading } from '../components/AnimatedText';
import { AnimatedPresence } from '../components/AnimatedPresence';
import { useEntrance } from '../hooks/useEntrance';
import { navigate } from '../hooks/useNavigation';
import { useResource } from '../hooks/useResource';
import {
  ApiError,
  describeError,
  downloadReport,
  failureMessage,
  findDossierSummary,
  isPreview,
  readDossier,
  startScan,
} from '../lib/api';
import { formatDate, isActiveStatus, vehicleName } from '../lib/format';
import type { Vehicle } from '../types';

export function Dossier({ dossierId }: { dossierId: string }) {
  const container = useRef<HTMLDivElement>(null);
  const resource = useResource(
    dossierId,
    (signal) => readDossier(dossierId, signal),
    (data) => (!isPreview && isActiveStatus(data?.status) ? 1800 : undefined),
  );
  const summary = useResource(`summary-${dossierId}`, (signal) =>
    findDossierSummary(dossierId, signal),
  );
  const [savedVehicle, setSavedVehicle] = useState<Vehicle>();
  const [viewerOpen, setViewerOpen] = useState(false);
  const [starting, setStarting] = useState(false);
  const [launchUncertain, setLaunchUncertain] = useState(false);
  const [actionError, setActionError] = useState('');
  const [downloading, setDownloading] = useState(false);
  const [downloadPrepared, setDownloadPrepared] = useState(false);
  const [vehicleBusy, setVehicleBusy] = useState(false);
  const [vehicleDirty, setVehicleDirty] = useState(false);
  const response = resource.data;
  const result = response?.result;
  const vehicle = result?.vehicle ?? savedVehicle ?? summary.data?.vehicle;
  const scanActive = isActiveStatus(response?.status);
  const canAnalyze = response?.status === 'not_analyzed' || response?.status === 'failed';
  useEntrance(container, `${dossierId}-${response?.status ?? 'loading'}`);
  useEffect(() => {
    if (response && (isActiveStatus(response.status) || response.status === 'completed')) {
      if (launchUncertain) setActionError('');
      setLaunchUncertain(false);
    }
  }, [response, launchUncertain]);
  useEffect(() => {
    document.title = `${vehicle ? vehicleName(vehicle) : 'Dossier'} — CABEK AI`;
  }, [vehicle]);
  useEffect(() => {
    if (!downloadPrepared) return;
    const timer = window.setTimeout(() => setDownloadPrepared(false), 1400);
    return () => window.clearTimeout(timer);
  }, [downloadPrepared]);

  async function launchScan() {
    if (starting || !canAnalyze || launchUncertain || isPreview || vehicleBusy || vehicleDirty)
      return;
    setStarting(true);
    setActionError('');
    try {
      const accepted = await startScan(dossierId);
      resource.replaceData(accepted);
      resource.refresh();
      summary.refresh();
    } catch (error) {
      if (
        error instanceof ApiError &&
        ['scan_in_progress', 'already_analyzed'].includes(error.code)
      ) {
        resource.refresh();
        summary.refresh();
      } else {
        setActionError(describeError(error));
        // A lost POST response can still represent an accepted job; only reads are retried.

        if (!(error instanceof ApiError)) setLaunchUncertain(true);
        resource.refresh();
      }
    } finally {
      setStarting(false);
    }
  }

  async function download() {
    if (!result || downloading) return;
    setDownloading(true);
    setDownloadPrepared(false);
    setActionError('');
    try {
      await downloadReport(dossierId, result.report_url);
      setDownloadPrepared(true);
    } catch (error) {
      setActionError(describeError(error));
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="page dossier-page" ref={container}>
      <button
        className="back-link"
        onClick={() => {
          if (window.history.state && window.history.length > 1) window.history.back();
          else navigate('/dossiers');
        }}
      >
        <ArrowLeft size={15} />
        Retour aux dossiers
      </button>
      <div className="page-heading dossier-page-heading" data-enter>
        <div>
          <div className="eyebrow">VOTRE DOSSIER D’EXPERTISE</div>
          <h1>
            <AnimatedHeading text={vehicle ? vehicleName(vehicle) : 'Dossier automobile'} />
          </h1>
          <div className="dossier-header-meta">
            <span className="plate">{vehicle?.matricule || 'Immatriculation non renseignée'}</span>
            <span className="meta-dot">·</span>
            <span className="detail-reference">{dossierId}</span>
          </div>
        </div>
        <div className="dossier-header-actions">
          {response && <StatusBadge status={response.status} />}
          <button
            className="icon-button"
            onClick={() => {
              resource.refresh();
              summary.refresh();
            }}
            disabled={resource.loading}
            aria-label="Actualiser le dossier"
          >
            <RefreshCw size={17} className={resource.loading ? 'spin' : ''} />
          </button>
        </div>
      </div>
      <AnimatedPresence visible={resource.error != null}>
        <div className="notice error-notice" role="alert">
          <TriangleAlert size={18} />
          <div>
            <strong>Impossible de synchroniser le dossier</strong>
            <p>{describeError(resource.error)}</p>
            {response && <p>Le dernier état reçu reste affiché.</p>}
          </div>
          <button onClick={resource.refresh}>Réessayer</button>
        </div>
      </AnimatedPresence>
      {!response && resource.loading && (
        <div className="surface detail-skeleton">
          <div className="skeleton skeleton-title" />
          <div className="skeleton skeleton-line" />
          <div className="skeleton skeleton-block" />
        </div>
      )}
      <AnimatedPresence visible={!!actionError}>
        <div className="notice error-notice" role="alert">
          <TriangleAlert size={17} />
          <div>
            <strong>
              {launchUncertain
                ? 'Vérification du lancement nécessaire'
                : 'La demande n’a pas abouti'}
            </strong>
            <p>{actionError}</p>
            {launchUncertain && (
              <p>
                La demande a peut-être été acceptée. Vérifiez son état avant toute nouvelle action.
              </p>
            )}
          </div>
          {launchUncertain && <button onClick={resource.refresh}>Vérifier l’état</button>}
        </div>
      </AnimatedPresence>
      {response && (
        <>
          <div className="vehicle-facts" data-enter>
            <div>
              <span>Année du véhicule</span>
              <strong>{vehicle?.annee || 'Non renseignée'}</strong>
            </div>
            <div>
              <span>Date du sinistre</span>
              <strong>{formatDate(vehicle?.date_sinistre)}</strong>
            </div>
            <div>
              <span>Photos du dossier</span>
              <strong>
                {result?.photos.length ?? summary.data?.photo_count ?? '—'} <small>photo(s)</small>
              </strong>
            </div>
            <div>
              <span>Référence</span>
              <strong title={dossierId} className="fact-reference">
                {dossierId}
              </strong>
            </div>
          </div>
          <AnimatedPresence visible={scanActive}>
            <div data-enter>
              {scanActive && <ScanProgressPanel response={response} />}
              {isPreview && (
                <p className="preview-footnote">
                  Exemple de suivi figé pour l’aperçu. Aucune analyse n’est en cours.
                </p>
              )}
            </div>
          </AnimatedPresence>
          {canAnalyze && (
            <div className="preparation-layout" data-enter>
              <div className="preparation-main">
                {response.status === 'failed' && (
                  <div className="notice failure-panel">
                    <TriangleAlert size={20} />
                    <div>
                      <strong>L’analyse a été interrompue</strong>
                      <p>{failureMessage(response.error?.code ?? 'scan_failed')}</p>
                      <p>Une nouvelle tentative reprend le traitement depuis le début.</p>
                    </div>
                  </div>
                )}
                {vehicle ? (
                  <VehicleForm
                    dossierId={dossierId}
                    vehicle={vehicle}
                    onSaved={setSavedVehicle}
                    onBusyChange={setVehicleBusy}
                    onPendingChangesChange={setVehicleDirty}
                  />
                ) : summary.loading ? (
                  <div className="surface detail-skeleton">
                    <div className="skeleton skeleton-line" />
                  </div>
                ) : (
                  <div className="notice">
                    <TriangleAlert size={17} />
                    <div>
                      <strong>Informations du véhicule indisponibles</strong>
                      <p>
                        {summary.error
                          ? describeError(summary.error)
                          : 'Le résumé du dossier n’a pas pu être retrouvé.'}
                      </p>
                      <button className="text-link" onClick={summary.refresh}>
                        Recharger les informations
                      </button>
                    </div>
                  </div>
                )}
                <div className="surface photo-overview">
                  <span className="photo-overview-icon">
                    <Images size={30} strokeWidth={1.2} />
                  </span>
                  <div>
                    <h2>{summary.data?.photo_count ?? '—'} photos pour voir plus juste.</h2>
                    <p>
                      Les photos originales sont conservées dans votre dossier. Après l’analyse,
                      comparez-les aux annotations des pièces et des dommages.
                    </p>
                  </div>
                  <span className="photo-overview-decoration" aria-hidden="true">
                    <span />
                    <span />
                    <span />
                  </span>
                </div>
              </div>
              <aside className="surface launch-panel">
                <span className="panel-icon">
                  <ScanLine size={22} />
                </span>
                <h2>
                  Prêt à regarder
                  <br />
                  de plus près ?
                </h2>
                <p>
                  L’analyse rassemble les dommages identifiés, les décisions sur les pièces et leur
                  chiffrage.
                </p>
                {!vehicle?.marque_id && (
                  <div className="launch-warning">
                    <TriangleAlert size={15} />
                    Sélectionnez le véhicule pour permettre la recherche des prix de remplacement.
                  </div>
                )}
                <button
                  className="button button-primary"
                  onClick={launchScan}
                  disabled={
                    starting ||
                    resource.loading ||
                    launchUncertain ||
                    vehicleBusy ||
                    vehicleDirty ||
                    !summary.data ||
                    !summary.data.photo_count ||
                    isPreview
                  }
                >
                  {starting ? <LoaderCircle size={16} className="spin" /> : <ScanLine size={16} />}{' '}
                  {starting
                    ? 'Demande en cours…'
                    : response.status === 'failed'
                      ? 'Réessayer l’analyse'
                      : 'Lancer l’analyse'}
                  {!starting && <ArrowUpRight size={15} />}
                </button>
                {isPreview && (
                  <p className="small-copy">
                    Connectez votre API pour lancer une véritable analyse.
                  </p>
                )}
                {summary.data?.photo_count === 0 && (
                  <p className="small-copy">Ce dossier ne contient aucune photo disponible.</p>
                )}
                {vehicleDirty && (
                  <p className="small-copy">
                    Enregistrez votre sélection de véhicule avant de continuer.
                  </p>
                )}
                <div className="launch-lock-note">
                  <LockKeyhole size={14} />
                  <p>
                    Une analyse réussie est enregistrée définitivement. Elle ne pourra pas être
                    relancée.
                  </p>
                </div>
              </aside>
            </div>
          )}
          {response.status === 'completed' && result && (
            <div className="result-content" data-enter>
              <div className="result-top-grid">
                <FinancialSummary financial={result.financial} />
                <div className="result-side">
                  <section className="surface result-photos">
                    <span className="panel-icon">
                      <Images size={22} />
                    </span>
                    <div>
                      <h2>
                        Voir au-delà
                        <br />
                        de la photo.
                      </h2>
                      <p>Comparez les originaux aux annotations et explorez les détails.</p>
                    </div>
                    <button
                      className="button button-primary"
                      onClick={() => setViewerOpen(true)}
                      disabled={!result.photos.length}
                    >
                      <Images size={16} />
                      Comparer les photos
                      <ArrowUpRight size={15} />
                    </button>
                  </section>
                  <section className="surface report-card">
                    <span className="report-icon">
                      <FileText size={24} strokeWidth={1.3} />
                    </span>
                    <div>
                      <h3>Votre rapport d’expertise</h3>
                      <p>Le résultat enregistré, au format PDF.</p>
                      {isPreview && <span className="small-copy">Disponible avec votre API.</span>}
                    </div>
                    <button
                      className="icon-button"
                      onClick={download}
                      disabled={downloading || isPreview || !result.report_url}
                      aria-label="Télécharger le rapport PDF"
                      title={
                        downloadPrepared
                          ? 'Rapport prêt au téléchargement'
                          : 'Télécharger le rapport PDF'
                      }
                    >
                      {downloading ? (
                        <LoaderCircle size={19} className="spin" />
                      ) : downloadPrepared ? (
                        <Check size={19} className="download-prepared" />
                      ) : (
                        <Download size={19} />
                      )}
                    </button>
                    <span className="visually-hidden" role="status">
                      {downloadPrepared ? 'Rapport prêt au téléchargement' : ''}
                    </span>
                  </section>
                </div>
              </div>
              <PartsList result={result} />
              <div className="saved-result-note">
                <Check size={14} />
                Cette expertise est enregistrée. Sa consultation ne relance aucun calcul.
              </div>
            </div>
          )}
          {response.status === 'completed' && !result && (
            <EmptyState
              title="Le résultat n’est pas disponible"
              description="Le service n’a pas encore fourni le résultat enregistré. Réessayez sa lecture."
              onRetry={resource.refresh}
            />
          )}
        </>
      )}
      {!response && !resource.loading && resource.error == null && (
        <EmptyState
          title="Dossier introuvable"
          description="Revenez à la liste pour retrouver vos dossiers."
          onRetry={() => navigate('/dossiers')}
          actionLabel="Voir les dossiers"
        />
      )}
      <div className="dossier-bottom-label">
        <FolderClosed size={13} />
        Un dossier. Tous les détails.
      </div>
      {viewerOpen && result && result.photos.length > 0 && (
        <ImageViewer photos={result.photos} onClose={() => setViewerOpen(false)} />
      )}
    </div>
  );
}
