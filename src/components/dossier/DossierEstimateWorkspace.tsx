import { ArrowUpRight, CircleHelp, Download, ReceiptText, RefreshCw, Wrench } from 'lucide-react';
import { useState } from 'react';
import type { AnalysisResult, ScanStatus } from '../../types';
import { describeError, isPreview } from '../../lib/api';
import { downloadReportWithNotification } from '../../lib/reportDownload';
import { displayTotal, formatMoney } from '../../lib/format';
import { getPartDecision, getPartDetections } from '../../lib/partPresentation';
import { DetailsDrawer } from './DetailsDrawer';
import { FinancialDetails } from './FinancialDetails';
import { PartDetails } from './PartDetails';
import { PartsList } from '../PartsList';

interface EstimateWorkspaceProps {
  dossierId: string;
  result: AnalysisResult | null;
  status: ScanStatus;
  loading: boolean;
  error: unknown;
  onRetry: () => void;
  onShowPhoto: (index: number) => void;
}

export function DossierEstimateWorkspace({
  dossierId,
  result,
  status,
  loading,
  error,
  onRetry,
  onShowPhoto,
}: EstimateWorkspaceProps) {
  const [drawer, setDrawer] = useState<'financial' | number | null>(null);
  const [selectedPartIndex, setSelectedPartIndex] = useState<number>();
  const [downloading, setDownloading] = useState(false);
  const [reportError, setReportError] = useState<unknown>(null);

  async function downloadSavedReport() {
    if (!result?.report_url || downloading) return;
    setDownloading(true);
    setReportError(null);
    try {
      await downloadReportWithNotification(dossierId, result.report_url);
    } catch (failure) {
      setReportError(failure);
    } finally {
      setDownloading(false);
    }
  }

  const financial = result?.financial;
  const complete = financial?.status === 'complete' && financial.estimated_total != null;
  const decisions =
    result?.parts.map((part) =>
      getPartDecision(part, getPartDetections(part, result.detections)),
    ) ?? [];

  return (
    <section className="surface estimate-workspace" aria-label="Estimation et dommages">
      {result && financial ? (
        <>
          <header className="estimate-summary">
            <div>
              <p className="eyebrow">{complete ? 'ESTIMATION PROVISOIRE' : 'SOUS-TOTAL CONNU'}</p>
              <h2>
                {complete ? displayTotal(financial) : formatMoney(financial.known_subtotal)}
                <small>MAD</small>
              </h2>
              <div className="estimate-counts" aria-label="Décisions sur les pièces">
                {[
                  { label: 'à réparer', decision: 'Réparer', Icon: Wrench },
                  { label: 'à remplacer', decision: 'Remplacer', Icon: RefreshCw },
                  { label: 'à vérifier', decision: 'À vérifier', Icon: CircleHelp },
                ].map(({ label, decision, Icon }) => {
                  const count = decisions.filter((value) => value === decision).length;
                  return count > 0 ? (
                    <span key={decision}>
                      <Icon size={13} aria-hidden="true" />
                      {count} {label}
                    </span>
                  ) : null;
                })}
                {!decisions.length && <span>Aucune pièce répertoriée</span>}
              </div>
              {!complete && (
                <p className="estimate-known-subtotal">Estimation incomplète · Sous-total connu</p>
              )}
            </div>
            <div className="estimate-summary-actions">
              <button
                type="button"
                className="button button-secondary estimate-breakdown-button"
                aria-haspopup="dialog"
                onClick={() => setDrawer('financial')}
              >
                <ReceiptText size={16} aria-hidden="true" />
                Détail du montant
                <ArrowUpRight size={14} aria-hidden="true" />
              </button>
              <button
                className="button button-secondary report-download"
                disabled={downloading || !result.report_url || isPreview}
                onClick={downloadSavedReport}
                title={
                  isPreview
                    ? 'Rapport indisponible dans l’aperçu'
                    : !result.report_url
                      ? 'Rapport non disponible'
                      : undefined
                }
              >
                <Download size={16} aria-hidden="true" />
                {downloading ? 'Téléchargement…' : 'Rapport PDF'}
              </button>
            </div>
          </header>
          <div
            className="estimate-scroll-region"
            tabIndex={0}
            role="region"
            aria-label="Détail des pièces et du chiffrage"
          >
            {(error != null || reportError != null) && (
              <div className="notice" role="alert">
                <div>
                  <strong>
                    {reportError != null ? 'Rapport indisponible' : 'Actualisation indisponible'}
                  </strong>
                  <p>{describeError(reportError ?? error)}</p>
                  {error != null && (
                    <button className="text-link" onClick={onRetry}>
                      <RefreshCw size={14} />
                      Réessayer
                    </button>
                  )}
                </div>
              </div>
            )}
            <PartsList
              result={result}
              selectedPartIndex={selectedPartIndex}
              onOpenPart={(index) => {
                setSelectedPartIndex(index);
                setDrawer(index);
              }}
            />
          </div>
          {drawer !== null && (drawer === 'financial' || result.parts[drawer]) && (
            <DetailsDrawer
              title={
                drawer === 'financial'
                  ? 'Chiffrage global'
                  : result.parts[drawer].name?.replace(/^p[_\s-]+/i, '') || 'Pièce non identifiée'
              }
              subtitle={
                drawer === 'financial'
                  ? 'ESTIMATION PROVISOIRE'
                  : getPartDecision(
                      result.parts[drawer],
                      getPartDetections(result.parts[drawer], result.detections),
                    )
              }
              onClose={() => setDrawer(null)}
            >
              {(requestClose) =>
                drawer === 'financial' ? (
                  <FinancialDetails financial={financial} />
                ) : (
                  <PartDetails
                    part={result.parts[drawer]}
                    detections={getPartDetections(result.parts[drawer], result.detections)}
                    photos={result.photos}
                    onShowPhoto={(index) => requestClose(() => onShowPhoto(index))}
                  />
                )
              }
            </DetailsDrawer>
          )}
        </>
      ) : (
        <div className="estimate-unavailable" role="status">
          <h2>
            {loading
              ? 'Chargement de l’estimation…'
              : error != null
                ? 'Estimation indisponible'
                : status === 'completed'
                  ? 'Résultat indisponible'
                  : 'Estimation à venir'}
          </h2>
          <p>
            {error != null
              ? describeError(error)
              : status === 'failed'
                ? 'L’analyse n’a pas abouti. Aucun chiffrage enregistré n’est disponible.'
                : status === 'completed'
                  ? 'Le résultat enregistré n’est pas disponible.'
                  : 'Le chiffrage sera disponible une fois l’analyse terminée.'}
          </p>
          {(error != null || (!loading && status === 'completed')) && (
            <button className="button button-secondary" onClick={onRetry}>
              <RefreshCw size={15} />
              Réessayer
            </button>
          )}
        </div>
      )}
    </section>
  );
}
