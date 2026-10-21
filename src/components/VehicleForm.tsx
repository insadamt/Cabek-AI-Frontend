import { useEffect, useState } from 'react';
import { Check, ChevronDown, LoaderCircle, SlidersHorizontal } from 'lucide-react';
import type { Vehicle, VehicleOption } from '../types';
import { describeError, isPreview, listBrands, listModels, saveVehicle } from '../lib/api';

export function VehicleForm({
  dossierId,
  vehicle,
  onSaved,
  onBusyChange,
  onPendingChangesChange,
}: {
  dossierId: string;
  vehicle: Vehicle;
  onSaved: (vehicle: Vehicle) => void;
  onBusyChange: (busy: boolean) => void;
  onPendingChangesChange: (dirty: boolean) => void;
}) {
  const [brandId, setBrandId] = useState(vehicle.marque_id ? String(vehicle.marque_id) : '');
  const [modelId, setModelId] = useState(vehicle.model_id ? String(vehicle.model_id) : '');
  const [brands, setBrands] = useState<VehicleOption[]>([]);
  const [models, setModels] = useState<VehicleOption[]>([]);
  const [brandsLoading, setBrandsLoading] = useState(true);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setBrandsLoading(true);
    setError('');
    listBrands(controller.signal)
      .then(setBrands)
      .catch((error) => {
        if (!controller.signal.aborted) setError(describeError(error));
      })
      .finally(() => {
        if (!controller.signal.aborted) setBrandsLoading(false);
      });
    return () => controller.abort();
  }, [retry]);

  useEffect(() => {
    if (!brandId) {
      setModels([]);
      return;
    }
    const controller = new AbortController();
    setModelsLoading(true);
    listModels(Number(brandId), controller.signal)
      .then(setModels)
      .catch((error) => {
        if (!controller.signal.aborted) setError(describeError(error));
      })
      .finally(() => {
        if (!controller.signal.aborted) setModelsLoading(false);
      });
    return () => controller.abort();
  }, [brandId, retry]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (saving || !brandId || !modelId) return;
    setSaving(true);
    onBusyChange(true);
    setError('');
    setSaved(false);
    try {
      const resolved = await saveVehicle(dossierId, {
        marque_id: Number(brandId),
        model_id: Number(modelId),
      });
      onSaved({ ...vehicle, ...resolved });
      onPendingChangesChange(false);
      setSaved(true);
    } catch (error) {
      setError(describeError(error));
    } finally {
      setSaving(false);
      onBusyChange(false);
    }
  }

  return (
    <section className="surface vehicle-form">
      <div className="panel-heading">
        <span className="panel-icon">
          <SlidersHorizontal size={18} />
        </span>
        <div>
          <h2>Véhicule pour la tarification</h2>
          <p>Une identification précise pour rechercher les prix des pièces.</p>
        </div>
      </div>
      <form onSubmit={submit}>
        <div className="form-fields">
          <label>
            Marque
            <div className="select-wrapper">
              <select
                aria-label="Marque du véhicule"
                value={brandId}
                disabled={brandsLoading || saving || isPreview}
                onChange={(event) => {
                  setBrandId(event.target.value);
                  setModelId('');
                  setModels([]);
                  setSaved(false);
                  setError('');
                  onPendingChangesChange(true);
                }}
              >
                <option value="">
                  {brandsLoading ? 'Chargement des marques…' : 'Sélectionner une marque'}
                </option>
                {brands.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.libelle}
                  </option>
                ))}
              </select>
              <ChevronDown size={15} />
            </div>
          </label>
          <label>
            Modèle
            <div className="select-wrapper">
              <select
                aria-label="Modèle du véhicule"
                value={modelId}
                disabled={!brandId || modelsLoading || saving || isPreview}
                onChange={(event) => {
                  setModelId(event.target.value);
                  setSaved(false);
                  onPendingChangesChange(true);
                }}
              >
                <option value="">
                  {modelsLoading ? 'Chargement des modèles…' : 'Sélectionner un modèle'}
                </option>
                {models.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.libelle}
                  </option>
                ))}
              </select>
              <ChevronDown size={15} />
            </div>
          </label>
        </div>
        {error && (
          <div className="inline-error" role="alert">
            {error}
            <button
              type="button"
              className="text-link"
              onClick={() => setRetry((value) => value + 1)}
            >
              Recharger le catalogue
            </button>
          </div>
        )}
        <div className="form-footer">
          <span aria-live="polite">
            {saved ? (
              <>
                <Check size={14} />
                Véhicule enregistré
              </>
            ) : isPreview ? (
              'Sélection non modifiable dans l’aperçu.'
            ) : (
              'Les modifications sont enregistrées uniquement après confirmation.'
            )}
          </span>
          <button
            className="button button-secondary"
            disabled={!brandId || !modelId || saving || isPreview}
            type="submit"
          >
            {saving && <LoaderCircle size={14} className="spin" />}
            {saving ? 'Enregistrement…' : 'Enregistrer le véhicule'}
          </button>
        </div>
      </form>
    </section>
  );
}
