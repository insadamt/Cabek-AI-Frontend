import type { MetadataWarning } from '../types';

const errorMessages: Record<string, string> = {
  dossier_not_found: 'Ce dossier est introuvable.',
  no_valid_photos: 'Aucune photo valide ne permet de lancer l’analyse.',
  worker_unavailable: 'L’analyse ne peut pas être lancée pour le moment. Réessayez plus tard.',
  storage_unavailable: 'Les dossiers sont momentanément inaccessibles.',
  autoestimate_unavailable: 'Le catalogue des véhicules est indisponible.',
  invalid_vehicle_selection: 'La marque et le modèle sélectionnés ne correspondent pas.',
  invalid_result: 'Le résultat enregistré ou ses images ne peuvent pas être lus.',
  invalid_metadata: 'Les informations de ce dossier sont invalides.',
  scan_timeout: 'Le délai maximal de l’analyse a été dépassé.',
  scan_interrupted: 'L’analyse a été interrompue. Vous pouvez la reprendre depuis le début.',
  scan_inputs_changed: 'Les données du dossier ont changé pendant l’analyse.',
  scan_failed: 'L’analyse n’a pas pu aboutir. Vous pouvez réessayer.',
  preview_only: 'Cet aperçu est en lecture seule. Connectez votre API pour lancer une analyse.',
};

export class ApiError extends Error {
  constructor(
    public code: string,
    public status?: number,
    public warnings: MetadataWarning[] = [],
  ) {
    super(
      [
        errorMessages[code] ?? 'La demande n’a pas abouti. Veuillez réessayer.',
        ...warnings.map((warning) => warning.message),
      ].join(' '),
    );
  }
}

export function parseMetadataWarnings(value: unknown): MetadataWarning[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (warning): warning is MetadataWarning =>
      warning != null &&
      typeof warning.field === 'string' &&
      typeof warning.code === 'string' &&
      typeof warning.message === 'string',
  );
}

export function describeError(error: unknown): string {
  return error instanceof Error ? error.message : 'Une erreur est survenue. Veuillez réessayer.';
}

export function failureMessage(code: string): string {
  return errorMessages[code] ?? errorMessages.scan_failed;
}
