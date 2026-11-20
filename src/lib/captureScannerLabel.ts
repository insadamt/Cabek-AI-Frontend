/** Name the scanner action from saved lifecycle state; depends on the capture status contract. */
export function captureScannerLabel(state: {
  vehicleEntering: boolean;
  pending: boolean;
  processing: boolean;
  expertise: boolean;
  needsRestart: boolean;
  verification: boolean;
  status?: string;
}) {
  if (state.vehicleEntering) return 'ENTRÉE DU VÉHICULE';
  if (state.pending) return 'CONNEXION…';
  if (state.status === 'capturing') return 'CAPTURE EN COURS';
  if (state.processing) return 'ANALYSE EN COURS';
  if (state.status === 'failed')
    return state.expertise ? 'RECOMMENCER LE SCAN' : 'RÉESSAYER LA CAPTURE';
  if (state.status === 'completed' && !state.needsRestart)
    return state.verification ? 'SYNCHRONISATION…' : 'RELANCER L’ANALYSE';
  return 'SCANNER';
}
