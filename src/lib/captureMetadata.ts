/** Validates vehicle entry before tunnel capture; depends on the backend plate format, full dates and loaded catalogue IDs. */
import type { VehicleOption } from '../types';
import { validDate } from './workflows';

interface CaptureVehicleFields {
  brandId: string;
  modelId: string;
  plate: string;
  date: string;
}

export function completeCaptureVehicle(
  fields: CaptureVehicleFields,
  brands?: VehicleOption[],
  models?: VehicleOption[],
) {
  const brandId = Number(fields.brandId);
  const modelId = Number(fields.modelId);
  return (
    Number.isSafeInteger(brandId) &&
    brandId > 0 &&
    Number.isSafeInteger(modelId) &&
    modelId > 0 &&
    validMoroccanPlate(fields.plate.trim()) &&
    validDate(fields.date) &&
    !!brands?.some((brand) => brand.id === brandId) &&
    !!models?.some((model) => model.id === modelId && model.marque_id === brandId)
  );
}

export function validMoroccanPlate(plate: string) {
  return /^[0-9]{1,6}-(?:[a-z]|(?=\p{L})\p{Script=Arabic})-[0-9]{1,6}$/iu.test(plate);
}
