import { describe, it, expect } from "vitest";
import {
  convertToCm,
  calculateVolumetricWeight,
  calculateCbm,
  cbmToVolumetricWeight,
  deriveChargeableWeight,
} from "./freight-units";

describe("freight-units utility functions", () => {
  it("converts inches to centimeters accurately", () => {
    expect(convertToCm(10, "in")).toBeCloseTo(25.4, 1);
    expect(convertToCm(10, "cm")).toBe(10);
  });

  it("calculates volumetric weight with IATA 1:6 ratio (divisor 6000)", () => {
    // 60cm x 50cm x 40cm, 1 piece -> 120,000 / 6000 = 20 kg
    const vol = calculateVolumetricWeight(60, 50, 40, 1, "cm");
    expect(vol).toBe(20.0);
  });

  it("calculates volumetric weight with multiple pieces", () => {
    // 50cm x 40cm x 30cm, 4 pieces -> (60,000 * 4) / 6000 = 40 kg
    const vol = calculateVolumetricWeight(50, 40, 30, 4, "cm");
    expect(vol).toBe(40.0);
  });

  it("calculates CBM correctly", () => {
    // 100cm x 100cm x 100cm = 1 CBM
    const cbm = calculateCbm(100, 100, 100, 1, "cm");
    expect(cbm).toBe(1.0);
  });

  it("converts CBM to volumetric weight using 167 kg/cbm", () => {
    const vol = cbmToVolumetricWeight(2.0);
    expect(vol).toBeCloseTo(333.33, 1);
  });

  it("derives IATA Chargeable Weight rounding up to nearest 0.5 kg", () => {
    // Actual 10.2 kg vs Vol 8.0 kg -> max 10.2 -> rounds up to 10.5 kg
    const res1 = deriveChargeableWeight(10.2, 8.0);
    expect(res1.chargeableWeight).toBe(10.5);
    expect(res1.isVolumetricBilled).toBe(false);

    // Actual 10.0 kg vs Vol 15.1 kg -> max 15.1 -> rounds up to 15.5 kg
    const res2 = deriveChargeableWeight(10.0, 15.1);
    expect(res2.chargeableWeight).toBe(15.5);
    expect(res2.isVolumetricBilled).toBe(true);

    // Actual omitted (0.0 kg) vs Vol 25.0 kg -> derives from volumetric weight
    const res3 = deriveChargeableWeight(0.0, 25.0);
    expect(res3.chargeableWeight).toBe(25.0);
    expect(res3.isVolumetricBilled).toBe(true);
  });
});
