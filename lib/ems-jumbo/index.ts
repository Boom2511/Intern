/**
 * EMS Jumbo Calculator
 * Entry point for all EMS Jumbo calculation functions
 */

// Main calculator
export { calculateEMSJumboTotal } from './helpers/calculate-total';
export type { EMSJumboInput, EMSJumboResult, CalculationMode } from './helpers/calculate-total';

// Individual helpers
export { calculateVolumetricWeight } from './helpers/volumetric-weight';
export { getChargeableWeight } from './helpers/chargeable-weight';
export { findWeightPriceByZone } from './helpers/weight-price-lookup';
export { findModelPriceByZone, getAllModels, getModelById } from './helpers/model-price-lookup';
export { calculateOversizeSurcharge } from './helpers/oversize-surcharge';

// Data
export { EMS_WEIGHT_PRICE_TABLE } from './data/weight-price-table';
export type { WeightPriceEntry } from './data/weight-price-table';

export { EMS_MODEL_PRICE_TABLE } from './data/model-price-table';
export type { ModelPriceEntry } from './data/model-price-table';

export { EMS_MODEL_PRICE_TABLE_FULL } from './data/model-price-table-full';

export { 
  PROVINCE_ZONE_MAPPING,
  getZoneByProvince,
  getZoneByZipCode,
  getProvincesByZone
} from './data/zone-mapping';
export type { ProvinceZoneMapping } from './data/zone-mapping';

// Zipcode helpers
export {
  getProvinceFromZipcode,
  getZoneFromZipcode,
  getLocationFromZipcode,
  isValidZipcode,
} from './helpers/zipcode-lookup';

// Search helpers
export {
  fuzzyMatch,
  fuzzySearchMultiple,
  getFuzzyScore,
  smartSearch,
} from './helpers/fuzzy-search';
