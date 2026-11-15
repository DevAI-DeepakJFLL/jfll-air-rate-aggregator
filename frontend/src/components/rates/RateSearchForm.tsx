"use client";

import React, { useState, useMemo } from "react";
import {
  Plane,
  Box,
  Search,
  AlertCircle,
  Scale,
} from "lucide-react";
import { RateSearchRequest, CargoDimension } from "../../types/rate";
import { RATE_SHEET_DESTINATIONS } from "../../lib/rate-destinations";
import { SearchableDestinationSelect } from "./SearchableDestinationSelect";
import {
  DimensionUnit,
  DimensionMode,
  convertToCm,
  calculateVolumetricWeight,
  calculateCbm,
  cbmToVolumetricWeight,
  deriveChargeableWeight,
} from "../../lib/freight-units";

interface RateSearchFormProps {
  onSearch: (payload: RateSearchRequest) => void;
  loading: boolean;
  initialOrigin?: string;
  initialDestination?: string;
}

export function RateSearchForm({
  onSearch,
  loading,
  initialDestination = "",
}: RateSearchFormProps) {
  // Origin is strictly fixed at BOM (Mumbai Gateway Hub)
  const origin = "BOM";
  const [destination, setDestination] = useState(initialDestination || "");
  const [actualWeight, setActualWeight] = useState("");
  const [commodity, setCommodity] = useState("General Cargo");

  // Volumetric Sizing & Unit Conversion State (Starts unselected with zero defaults)
  const [useDims, setUseDims] = useState(false);
  const [dimensionMode, setDimensionMode] = useState<DimensionMode>("dimensions");
  const [dimensionUnit, setDimensionUnit] = useState<DimensionUnit>("cm");
  const [length, setLength] = useState("");
  const [width, setWidth] = useState("");
  const [height, setHeight] = useState("");
  const [pieces, setPieces] = useState("");
  const [cbmVolume, setCbmVolume] = useState("");

  const wtNum = parseFloat(actualWeight) || 0;
  const lNum = parseFloat(length) || 0;
  const wNum = parseFloat(width) || 0;
  const hNum = parseFloat(height) || 0;
  const pcsNum = parseInt(pieces, 10) || 1;
  const cbmNum = parseFloat(cbmVolume) || 0;

  // Compute Volumetric Weight and CBM volume
  const { volWeight, computedCbm } = useMemo(() => {
    if (!useDims) {
      return { volWeight: 0, computedCbm: 0 };
    }
    if (dimensionMode === "cbm") {
      const vol = cbmToVolumetricWeight(cbmNum);
      return { volWeight: vol, computedCbm: cbmNum };
    }
    const vol = calculateVolumetricWeight(lNum, wNum, hNum, pcsNum, dimensionUnit);
    const cbm = calculateCbm(lNum, wNum, hNum, pcsNum, dimensionUnit);
    return { volWeight: vol, computedCbm: cbm };
  }, [useDims, dimensionMode, dimensionUnit, lNum, wNum, hNum, pcsNum, cbmNum]);

  // Derive IATA Chargeable Weight (TACT Rule 1.3.2)
  const derivation = useMemo(() => {
    return deriveChargeableWeight(wtNum, volWeight);
  }, [wtNum, volWeight]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let dims: CargoDimension[] = [];

    if (useDims) {
      if (dimensionMode === "cbm") {
        // Direct CBM: synthesize standard 100cm x 100cm x (CBM * 100)cm box for backend IATA math
        if (cbmNum > 0) {
          dims = [
            {
              length_cm: 100,
              width_cm: 100,
              height_cm: Math.round(cbmNum * 100 * 10) / 10,
              pieces: 1,
            },
          ];
        }
      } else {
        // Dimensions mode: convert linear values to centimeters
        const lCm = convertToCm(lNum, dimensionUnit);
        const wCm = convertToCm(wNum, dimensionUnit);
        const hCm = convertToCm(hNum, dimensionUnit);
        if (lCm > 0 && wCm > 0 && hCm > 0) {
          dims = [
            {
              length_cm: lCm,
              width_cm: wCm,
              height_cm: hCm,
              pieces: pcsNum,
            },
          ];
        }
      }
    }

    onSearch({
      origin: "BOM",
      destination: destination.toUpperCase().trim(),
      actual_weight_kg: wtNum,
      dimensions: dims.length > 0 ? dims : undefined,
      commodity,
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl bg-white p-6 shadow-card border border-slate-200/90 font-sans"
    >
      {/* Header */}
      <div className="border-b border-slate-100 pb-3 mb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-obsidian-900 text-amber-400 shadow-2xs">
            <Plane className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-obsidian-900 tracking-tight">
              Air Cargo Tariff Search
            </h2>
            <p className="text-xs font-medium text-slate-500">
              Live spot tariffs &bull; BOM Mumbai Hub (&lt; 500kg Smalls)
            </p>
          </div>
        </div>
      </div>

      {/* Main Form Fields */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Origin Gateway (Fixed strictly at BOM) */}
        <div>
          <label className="block text-[11px] font-extrabold text-slate-600 uppercase tracking-wider mb-1">
            Origin Airport
          </label>
          <div className="flex items-center justify-between w-full h-11 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 select-none">
            <div className="flex items-center gap-2">
              <span className="font-mono font-black text-xs text-obsidian-900">
                BOM
              </span>
              <span className="text-xs font-bold text-slate-700 truncate">
                Mumbai (CSMIA)
              </span>
            </div>
            <span className="text-[10px] text-slate-500 font-medium">
              Terminal 2
            </span>
          </div>
        </div>

        {/* Destination Dropdown Driven by Rate Sheets (Hybrid Searchable / Type-Ahead) */}
        <div>
          <label
            htmlFor="dest-select"
            className="block text-[11px] font-extrabold text-slate-600 uppercase tracking-wider mb-1"
          >
            Destination Airport
          </label>
          <SearchableDestinationSelect
            id="dest-select"
            value={destination}
            onChange={setDestination}
            destinations={RATE_SHEET_DESTINATIONS}
          />
        </div>

        {/* Actual Gross Weight */}
        <div>
          <label
            htmlFor="weight-input"
            className="block text-[11px] font-extrabold text-slate-600 uppercase mb-1"
          >
            Gross Scale Weight (kg)
          </label>
          <input
            id="weight-input"
            type="number"
            step="0.5"
            min="1"
            value={actualWeight}
            onChange={(e) => setActualWeight(e.target.value)}
            className="w-full h-11 rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm font-bold focus-ring font-mono tabular-nums"
            placeholder="e.g. 120"
            required
          />
          <div className="text-[10px] font-medium text-slate-600 mt-1">
            Physical scale weight measured at warehouse
          </div>
        </div>

        {/* Commodity Class */}
        <div>
          <label
            htmlFor="commodity-select"
            className="block text-[11px] font-extrabold text-slate-600 uppercase mb-1"
          >
            Commodity Class
          </label>
          <select
            id="commodity-select"
            value={commodity}
            onChange={(e) => setCommodity(e.target.value)}
            className="w-full h-11 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 focus-ring cursor-pointer"
          >
            <option value="General Cargo">General Cargo (GCR / GEN)</option>
            <option value="Pharma CRT">Pharma CRT (15°C to 25°C - PILA)</option>
            <option value="Cold Chain">Cold Chain (2°C to 8°C - COL)</option>
            <option value="DGR - PAX">Dangerous Goods (DGR - PAX)</option>
            <option value="Express Courier">Express Courier (XPS / COU)</option>
            <option value="Valuable Cargo">Valuable Cargo (VAL)</option>
          </select>
          <div className="text-[10px] font-medium text-slate-600 mt-1">
            Airline handling &amp; surcharges vary by category
          </div>
        </div>
      </div>

      {/* Cargo Dimensions & Sizing Options Section */}
      <div className="mt-4 pt-3.5 border-t border-slate-100 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <label
            htmlFor="volumetric-checkbox"
            className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer select-none"
          >
            <input
              id="volumetric-checkbox"
              type="checkbox"
              checked={useDims}
              onChange={(e) => setUseDims(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-obsidian-900 focus:ring-obsidian-900 cursor-pointer"
            />
            <span className="flex items-center gap-1.5">
              <Box className="h-3.5 w-3.5 text-aero-teal" />
              Package Dimensions &amp; Volumetric Weight Derivation
            </span>
          </label>

          {useDims && (
            <div className="flex items-center gap-2">
              {/* Dimension Mode Toggle (Linear vs Direct CBM) */}
              <div
                className="flex items-center rounded-lg bg-slate-100 p-0.5 border border-slate-200"
                role="radiogroup"
                aria-label="Dimension entry mode"
              >
                <button
                  type="button"
                  onClick={() => setDimensionMode("dimensions")}
                  className={`rounded-md px-2.5 py-1 text-xs font-bold transition-all cursor-pointer ${
                    dimensionMode === "dimensions"
                      ? "bg-white text-obsidian-900 shadow-2xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Dimensions (L×W×H)
                </button>
                <button
                  type="button"
                  onClick={() => setDimensionMode("cbm")}
                  className={`rounded-md px-2.5 py-1 text-xs font-bold transition-all cursor-pointer ${
                    dimensionMode === "cbm"
                      ? "bg-white text-obsidian-900 shadow-2xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Direct CBM (m³)
                </button>
              </div>

              {/* Unit Switcher Pills (Only in Linear Dimensions Mode) */}
              {dimensionMode === "dimensions" && (
                <div
                  className="flex items-center rounded-lg bg-slate-100 p-0.5 border border-slate-200"
                  role="radiogroup"
                  aria-label="Unit of measurement"
                >
                  {(["cm", "in", "m", "mm"] as DimensionUnit[]).map((u) => (
                    <button
                      key={u}
                      type="button"
                      onClick={() => setDimensionUnit(u)}
                      className={`rounded-md px-2 py-0.5 text-xs font-bold font-mono transition-all cursor-pointer ${
                        dimensionUnit === u
                          ? "bg-obsidian-900 text-amber-300 shadow-2xs"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      {u}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {useDims && dimensionMode === "dimensions" && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label
                htmlFor="dim-length"
                className="block text-[11px] font-extrabold text-slate-500 uppercase mb-1"
              >
                Length ({dimensionUnit})
              </label>
              <input
                id="dim-length"
                type="number"
                step="0.1"
                min="0.1"
                value={length}
                onChange={(e) => setLength(e.target.value)}
                placeholder="Length"
                className="w-full h-10 rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold focus-ring font-mono tabular-nums"
                required
              />
            </div>
            <div>
              <label
                htmlFor="dim-width"
                className="block text-[11px] font-extrabold text-slate-500 uppercase mb-1"
              >
                Width ({dimensionUnit})
              </label>
              <input
                id="dim-width"
                type="number"
                step="0.1"
                min="0.1"
                value={width}
                onChange={(e) => setWidth(e.target.value)}
                placeholder="Width"
                className="w-full h-10 rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold focus-ring font-mono tabular-nums"
                required
              />
            </div>
            <div>
              <label
                htmlFor="dim-height"
                className="block text-[11px] font-extrabold text-slate-500 uppercase mb-1"
              >
                Height ({dimensionUnit})
              </label>
              <input
                id="dim-height"
                type="number"
                step="0.1"
                min="0.1"
                value={height}
                onChange={(e) => setHeight(e.target.value)}
                placeholder="Height"
                className="w-full h-10 rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold focus-ring font-mono tabular-nums"
                required
              />
            </div>
            <div>
              <label
                htmlFor="dim-pieces"
                className="block text-[11px] font-extrabold text-slate-500 uppercase mb-1"
              >
                Pieces (Pcs)
              </label>
              <input
                id="dim-pieces"
                type="number"
                min="1"
                value={pieces}
                onChange={(e) => setPieces(e.target.value)}
                placeholder="Pcs (e.g. 1)"
                className="w-full h-10 rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold focus-ring font-mono tabular-nums"
                required
              />
            </div>
          </div>
        )}

        {useDims && dimensionMode === "cbm" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="cbm-volume-input"
                className="block text-[11px] font-extrabold text-slate-500 uppercase mb-1"
              >
                Total Shipment Volume (CBM / m³)
              </label>
              <input
                id="cbm-volume-input"
                type="number"
                step="0.01"
                min="0.01"
                value={cbmVolume}
                onChange={(e) => setCbmVolume(e.target.value)}
                placeholder="e.g. 0.48"
                className="w-full h-10 rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold focus-ring font-mono tabular-nums"
                required
              />
            </div>
            <div className="flex items-center text-xs text-slate-500 p-2.5 rounded-xl bg-slate-50 border border-slate-200">
              <span>
                Standard IATA Conversion: <strong>1 CBM = 166.67 kg</strong> volumetric weight.
              </span>
            </div>
          </div>
        )}

        {/* Real-time IATA Weight Derivation Strip (TACT Rule 1.3.2) */}
        {useDims && (
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3 sm:gap-4 flex-wrap text-slate-600 font-medium">
              <div className="flex items-center gap-1.5 font-bold text-obsidian-900">
                <Scale className="h-4 w-4 text-aero-teal shrink-0" />
                <span>IATA TACT 1.3.2</span>
              </div>
              <div>
                Scale: <strong className="font-mono text-slate-800">{wtNum.toFixed(1)} kg</strong>
              </div>
              <span className="text-slate-300">&bull;</span>
              <div>
                Volume: <strong className="font-mono text-slate-800">{computedCbm.toFixed(3)} m³</strong>
              </div>
              <span className="text-slate-300">&bull;</span>
              <div>
                Volumetric: <strong className="font-mono text-slate-800">{volWeight.toFixed(1)} kg</strong>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-500 font-medium">
                {derivation.isVolumetricBilled ? "Billed on Volume:" : "Billed on Scale Wt:"}
              </span>
              <span className="font-mono font-black text-sm text-obsidian-900 bg-amber-300/30 border border-amber-300/60 px-2 py-0.5 rounded-lg">
                {derivation.chargeableWeight.toFixed(1)} kg CW
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Heavy Cargo Alert (> 500 kg) */}
      {derivation.chargeableWeight >= 500 && (
        <div className="mt-4 flex items-center gap-2.5 rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs font-bold text-amber-900">
          <AlertCircle className="h-4 w-4 shrink-0 text-amber-700" />
          <span>
            Chargeable weight exceeds 500 kg smalls desk limit. Automated published tariffs will
            prompt referral to the heavy cargo desk.
          </span>
        </div>
      )}

      {/* Submit Button */}
      <div className="mt-5 flex justify-end">
        <button
          type="submit"
          disabled={loading || !destination || wtNum <= 0}
          className="inline-flex items-center gap-2 rounded-xl bg-obsidian-900 px-6 py-3 text-xs font-black uppercase tracking-wider text-amber-300 hover:bg-aero-navy focus-ring transition-all shadow-md cursor-pointer disabled:opacity-50"
        >
          {loading ? (
            <>
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-amber-400 border-t-transparent" />
              <span>Scanning Tariffs...</span>
            </>
          ) : (
            <>
              <Search className="h-4 w-4 text-amber-400" />
              <span>Discover Pure Buy Rates</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
}
