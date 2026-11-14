/**
 * Freight Unit Conversion & IATA Weight Derivation Engine
 * Ported from Jet Freight Logistics Cargo Booking Platform
 * Implements IATA TACT Rule 1.3.2 (Chargeable Weight Calculation)
 */

export type DimensionUnit = "cm" | "in" | "m" | "mm";
export type DimensionMode = "dimensions" | "cbm";

// DSA: O(1) Precomputed Linear Conversion Factor Table
const LINEAR_UNIT_CONVERSION_FACTORS: Record<DimensionUnit, number> = {
  cm: 1.0,
  in: 2.54,
  m: 100.0,
  mm: 0.1,
};

/**
 * Converts linear dimensions from supported unit to centimeters (cm).
 * Time Complexity: O(1) branchless lookup
 */
export function convertToCm(value: number, unit: DimensionUnit = "cm"): number {
  if (!value || isNaN(value) || value <= 0) return 0;
  const factor = LINEAR_UNIT_CONVERSION_FACTORS[unit] ?? 1.0;
  return Math.round(value * factor * 10) / 10;
}

/**
 * Calculates volumetric weight in kg according to IATA standard divisor (6,000 cm³/kg).
 */
export function calculateVolumetricWeight(
  length: number,
  width: number,
  height: number,
  pieces: number = 1,
  unit: DimensionUnit = "cm"
): number {
  const l = convertToCm(length, unit);
  const w = convertToCm(width, unit);
  const h = convertToCm(height, unit);
  const pcs = Math.max(1, pieces || 1);
  if (l > 0 && w > 0 && h > 0) {
    return Math.round(((l * w * h * pcs) / 6000) * 10) / 10;
  }
  return 0;
}

/**
 * Calculates volume in CBM (m³) from dimensions.
 */
export function calculateCbm(
  length: number,
  width: number,
  height: number,
  pieces: number = 1,
  unit: DimensionUnit = "cm"
): number {
  const l = convertToCm(length, unit);
  const w = convertToCm(width, unit);
  const h = convertToCm(height, unit);
  const pcs = Math.max(1, pieces || 1);
  if (l > 0 && w > 0 && h > 0) {
    return Math.round(((l * w * h * pcs) / 1_000_000) * 1000) / 1000;
  }
  return 0;
}

/**
 * Converts direct CBM volume to IATA volumetric weight in kg (1 CBM = 166.67 kg).
 */
export function cbmToVolumetricWeight(cbm: number): number {
  if (!cbm || isNaN(cbm) || cbm <= 0) return 0;
  // 1 m³ = 1,000,000 cm³ / 6,000 = 166.6667 kg
  return Math.round(((cbm * 1_000_000) / 6000) * 10) / 10;
}

/**
 * Computes IATA Chargeable Weight according to TACT Rule 1.3.2:
 * Higher of Actual Gross Scale Weight and Volumetric Weight,
 * rounded UP to the nearest half kilogram (0.5 kg).
 */
export function deriveChargeableWeight(
  actualGrossWeight: number,
  volumetricWeight: number
): {
  actualWeight: number;
  volumetricWeight: number;
  chargeableWeight: number;
  isVolumetricBilled: boolean;
  cbm: number;
} {
  const actual = Math.max(0, actualGrossWeight || 0);
  const vol = Math.max(0, volumetricWeight || 0);
  const rawWeight = Math.max(actual, vol);
  // TACT Rule 1.3.2: Round up to nearest 0.5 kg
  const chargeableWeight = Math.ceil(rawWeight * 2) / 2;
  const isVolumetricBilled = vol > actual;
  // Standard CBM equivalent: vol * 6000 / 1000000
  const cbm = Math.round(((vol * 6000) / 1_000_000) * 1000) / 1000;

  return {
    actualWeight: actual,
    volumetricWeight: vol,
    chargeableWeight,
    isVolumetricBilled,
    cbm,
  };
}
