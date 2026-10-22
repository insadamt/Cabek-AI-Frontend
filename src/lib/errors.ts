const errorMessages: Record<string, string> = {
  already_analyzed: 'Ce dossier a déjà été analysé. Ouvrez son résultat enregistré.',
  scan_in_progress: 'Une analyse est déjà en cours pour ce dossier.',
  invalid_request: 'Les paramètres de la demande sont invalides.',
  invalid_dossier_id: 'La référence du dossier est invalide.',
  artifact_not_found: 'L’image demandée est indisponible.',
  report_not_found: 'Aucun rapport enregistré n’est disponible pour ce dossier.',
  invalid_image: 'Cette photographie ne peut pas être lue.',
  invalid_report: 'Le rapport enregistré ne peut pas être lu.',
  invalid_analysis: 'Les données d’analyse de ce dossier sont invalides.',
  invalid_status: 'L’état enregistré de l’analyse ne peut pas être lu.',
  invalid_feedback: 'Les observations enregistrées de ce dossier sont invalides.',
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
  ) {
    super(errorMessages[code] ?? 'La demande n’a pas abouti. Veuillez réessayer.');
  }
}

export function describeError(error: unknown): string {
  return error instanceof Error ? error.message : 'Une erreur est survenue. Veuillez réessayer.';
}

export function failureMessage(code: string): string {
  return errorMessages[code] ?? errorMessages.scan_failed;
}
