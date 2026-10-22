import type { MetadataWarning, Vehicle, VehicleOption } from '../types';

const requiredTextFields = [
  ['marque', 'La marque est obligatoire.'],
  ['modele', 'Le modèle est obligatoire.'],
  ['matricule', 'L’immatriculation est obligatoire.'],
] as const;

export function isValidMetadataDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function validateVehicleMetadata(vehicle: Vehicle): MetadataWarning[] {
  const warnings: MetadataWarning[] = [];
  for (const [field, message] of requiredTextFields) {
    if (typeof vehicle[field] !== 'string' || !vehicle[field].trim())
      warnings.push({ field, code: 'required', message });
  }
  for (const [field, label] of [
    ['marque_id', 'marque'],
    ['model_id', 'modèle'],
  ] as const) {
    const value = vehicle[field];
    if (!Number.isSafeInteger(value) || Number(value) <= 0)
      warnings.push({
        field,
        code: value == null ? 'required' : 'invalid_catalogue_id',
        message: `Sélectionnez ${label === 'marque' ? 'une marque' : 'un modèle'} dans le catalogue.`,
      });
  }
  for (const [field, label] of [
    ['date_mise_en_circulation', 'La date de mise en circulation'],
    ['date_sinistre', 'La date du sinistre'],
  ] as const) {
    const value = vehicle[field];
    if (!value) warnings.push({ field, code: 'required', message: `${label} est obligatoire.` });
    else if (!isValidMetadataDate(value))
      warnings.push({
        field,
        code: 'invalid_date',
        message: `${label} doit être une date valide (AAAA-MM-JJ).`,
      });
  }
  return warnings;
}

export function validateVehicleCatalogue(
  vehicle: Vehicle,
  brands: VehicleOption[],
  models: VehicleOption[],
): MetadataWarning[] {
  const warnings: MetadataWarning[] = [];
  const brand = brands.find((option) => option.id === vehicle.marque_id);
  const model = models.find((option) => option.id === vehicle.model_id);
  if (!brand)
    warnings.push({
      field: 'marque_id',
      code: 'unknown_catalogue_id',
      message: 'La marque est absente du catalogue.',
    });
  else if (vehicle.marque.trim() !== brand.libelle.trim())
    warnings.push({
      field: 'marque',
      code: 'catalogue_label_mismatch',
      message: 'La marque ne correspond pas à son identifiant catalogue.',
    });
  // Models come from the selected brand endpoint; an explicit parent ID must agree too.

  if (!model || (model.marque_id != null && model.marque_id !== vehicle.marque_id))
    warnings.push({
      field: 'model_id',
      code: 'model_brand_mismatch',
      message: 'Le modèle sélectionné ne correspond pas à la marque.',
    });
  else if (vehicle.modele.trim() !== model.libelle.trim())
    warnings.push({
      field: 'modele',
      code: 'catalogue_label_mismatch',
      message: 'Le modèle ne correspond pas à son identifiant catalogue.',
    });
  return warnings;
}
