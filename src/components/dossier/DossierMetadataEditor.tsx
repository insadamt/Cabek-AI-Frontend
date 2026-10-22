import { useEffect, useRef, useState } from 'react';
import { ApiError, describeError, isPreview } from '../../lib/api';
import { runHomeScan } from '../../lib/homeAnalysis';
import { validateVehicleMetadata } from '../../lib/vehicleMetadata';
import type { DossierResponse, DossierSummary, MetadataWarning, Vehicle } from '../../types';
import { MetadataWarnings } from '../MetadataWarnings';
import { VehicleForm } from '../VehicleForm';

interface DossierMetadataEditorProps {
  dossier: DossierSummary;
  onSaved: (vehicle: Vehicle) => void;
  onResponse: (response: DossierResponse) => void;
}

export function DossierMetadataEditor({
  dossier,
  onSaved,
  onResponse,
}: DossierMetadataEditorProps) {
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState('');
  const [serverWarnings, setServerWarnings] = useState<MetadataWarning[]>([]);
  const operation = useRef<AbortController | null>(null);
  const warnings = validateVehicleMetadata(dossier.vehicle);

  useEffect(() => () => operation.current?.abort(), []);

  async function launchScan() {
    if (operation.current || dirty || saving || warnings.length || isPreview) return;
    const controller = new AbortController();
    operation.current = controller;
    setScanning(true);
    setError('');
    setServerWarnings([]);
    try {
      await runHomeScan({
        dossierId: dossier.dossier_id,
        signal: controller.signal,
        startIfNeeded: true,
        onResponse,
        onConnectionMessage: setError,
      });
    } catch (failure) {
      if (!controller.signal.aborted) {
        setError(describeError(failure));
        if (failure instanceof ApiError) setServerWarnings(failure.warnings);
      }
    } finally {
      if (!controller.signal.aborted) {
        operation.current = null;
        setScanning(false);
      }
    }
  }

  return (
    <section className="dossier-metadata-editor" aria-label="Préparation de l’analyse">
      <MetadataWarnings warnings={warnings} />
      <fieldset disabled={scanning}>
        <VehicleForm
          dossierId={dossier.dossier_id}
          vehicle={dossier.vehicle}
          onBusyChange={setSaving}
          onPendingChangesChange={setDirty}
          onSaved={(vehicle) => {
            setServerWarnings([]);
            setError('');
            onSaved(vehicle);
          }}
        />
      </fieldset>
      {dirty && <p role="status">Enregistrez les modifications avant de lancer l’analyse.</p>}
      <MetadataWarnings warnings={serverWarnings} />
      {error && (
        <p className="inline-error" role="alert">
          {error}
        </p>
      )}
      <button
        className="button button-primary"
        disabled={!!warnings.length || dirty || saving || scanning || isPreview}
        aria-busy={scanning || undefined}
        onClick={() => void launchScan()}
      >
        {scanning ? 'Analyse en cours…' : 'Analyser'}
      </button>
    </section>
  );
}
