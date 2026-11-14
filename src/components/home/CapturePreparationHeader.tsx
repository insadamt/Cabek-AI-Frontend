/**
 * Reserves a stable identity slot above the studio action dock so saving does not resize the scene.
 * Depends on the stage's presented vehicle snapshot and the capture summary entrance styles.
 */
import { CarFront } from 'lucide-react';
import { vehicleName } from '../../lib/format';
import type { Vehicle } from '../../types';

interface CapturePreparationHeaderProps {
  metadataReady: boolean;
  vehicle?: Vehicle;
  dossierId?: string;
}

export function CapturePreparationHeader({
  metadataReady,
  vehicle,
  dossierId,
}: CapturePreparationHeaderProps) {
  return (
    <header className="capture-preparation-header">
      {metadataReady && vehicle && (
        <div className="capture-vehicle-summary">
          <span className="capture-vehicle-icon" aria-hidden="true">
            <CarFront size={22} strokeWidth={1.5} />
          </span>
          <div>
            <strong>{vehicleName(vehicle)}</strong>
            <bdi>{vehicle.matricule || 'Matricule non renseigné'}</bdi>
            {dossierId && <span className="capture-selected-reference">Dossier {dossierId}</span>}
          </div>
        </div>
      )}
    </header>
  );
}
