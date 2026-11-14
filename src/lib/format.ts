/** Format API values and status messages for the French dossier UI.
 * Depends on shared DTOs and Intl; unknown amounts and hours remain explicit.
 */
import type { FilterStatus, FinancialResult, ScanProgress, Vehicle } from '../types';

export const statusLabels: Record<FilterStatus, string> = {
  all: 'Tous les dossiers',
  not_analyzed: 'À analyser',
  queued: 'En attente',
  processing: 'En analyse',
  completed: 'Analysés',
  failed: 'Échecs',
};

export const shortStatusLabels: Record<FilterStatus, string> = {
  ...statusLabels,
  all: 'Tous',
  completed: 'Analysé',
  failed: 'Échec',
};

const moneyFormatter = new Intl.NumberFormat('fr-MA', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatMoney(amount: number | null | undefined): string {
  return amount == null || !Number.isFinite(amount)
    ? 'Indisponible'
    : moneyFormatter.format(amount);
}

const laborHoursFormatter = new Intl.NumberFormat('fr-MA', { maximumFractionDigits: 2 });

export function formatLaborHours(hours: number | null | undefined): string {
  return hours == null || !Number.isFinite(hours) || hours < 0
    ? 'Durée indisponible'
    : `${laborHoursFormatter.format(hours)} h`;
}

export function displayTotal(financial: FinancialResult): string {
  return financial.status === 'complete' && financial.estimated_total != null
    ? formatMoney(financial.estimated_total)
    : 'Estimation incomplète';
}

export function vehicleName(vehicle: Vehicle): string {
  return [vehicle.marque, vehicle.modele].filter(Boolean).join(' ') || 'Véhicule non renseigné';
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return 'Non renseignée';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'Non renseignée'
    : date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.floor(seconds)} s`;
  return `${Math.floor(seconds / 60)} min ${Math.floor(seconds % 60)} s`;
}

export function photoProgress(progress: ScanProgress | null): number | undefined {
  if (!progress || progress.photos_total <= 0) return undefined;
  return Math.min(
    100,
    Math.max(0, Math.floor((progress.photos_completed / progress.photos_total) * 100)),
  );
}

export function isActiveStatus(status?: string): boolean {
  return status === 'queued' || status === 'processing';
}

export function translateWarning(message: string): string {
  if (/identifiers unavailable/i.test(message))
    return 'Le véhicule n’est pas associé au catalogue de tarification.';
  if (/autoestimate|observation|prix pièce/i.test(message))
    return 'Le prix de certaines pièces de remplacement est indisponible.';
  if (/non identifiée|unidentified/i.test(message))
    return 'Une zone n’a pas pu être identifiée avec certitude et nécessite une vérification.';
  if (/parts_supply/.test(message)) return 'Le prix de fourniture d’une pièce est manquant.';
  if (/paint_materials|prix MET/.test(message))
    return 'Le coût de certains produits peinture est indisponible.';
  if (/paint_labor|repair_labor|replacement_labor/.test(message))
    return 'Une partie des coûts de main-d’œuvre est indisponible.';
  return 'Une limite de chiffrage a été signalée. Le sous-total comprend uniquement les montants connus.';
}

export function financialWarnings(financial: FinancialResult): string[] {
  return [...new Set(financial.warnings.map(translateWarning))];
}
