"use client";

import React, { useState, useMemo } from "react";
import { Plane, Box, Search, AlertCircle, Scale } from "lucide-react";
import { RateSearchRequest, CargoDimension } from "../../types/rate";
import { airportTrie } from "../../lib/airport-trie";
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
  initialOrigin = "BOM",
  initialDestination = "DXB",
}: RateSearchFormProps) {
  const [origin, setOrigin] = useState(initialOrigin);
  const [destination, setDestination] = useState(initialDestination);
  const [actualWeight, setActualWeight] = useState("120");
  const [commodity, setCommodity] = useState("General Cargo");

  // Volumetric Sizing & Unit Conversion State
  const [useDims, setUseDims] = useState(true);
  const [dimensionMode, setDimensionMode] = useState<DimensionMode>("dimensions");
  const [dimensionUnit, setDimensionUnit] = useState<DimensionUnit>("cm");
  const [length, setLength] = useState("80");
  const [width, setWidth] = useState("60");
  const [height, setHeight] = useState("50");
  const [pieces, setPieces] = useState("2");
  const [cbmVolume, setCbmVolume] = useState("0.48");

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

  const destSuggestions = useMemo(() => {
    if (!destination || destination.length >= 3) return [];
    return airportTrie.searchPrefix(destination, 4);
  }, [destination]);

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
      origin: origin.toUpperCase().trim(),
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-4 mb-4 gap-2">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-obsidian-900 text-amber-400 shadow-2xs">
            <Plane className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-obsidian-900 tracking-tight">
              Air Cargo Tariff Search
            </h2>
            <p className="text-xs font-semibold text-slate-500">
              Live buying tariffs &bull; Mumbai Chhatrapati Shivaji Hub (BOM)
            </p>
          </div>
        </div>
        <span className="inline-flex items-center self-start sm:self-auto rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-900 border border-amber-200">
          Scope: &lt; 500 kg Smalls
        </span>
      </div>

      {/* Main Form Fields */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Origin */}
        <div>
          <label htmlFor="origin-input" className="block text-[11px] font-extrabold text-slate-600 uppercase mb-1">
            Origin Gateway (BOM Hub)
          </label>
          <input
            id="origin-input"
            type="text"
            maxLength={3}
            value={origin}
            onChange={(e) => setOrigin(e.target.value.toUpperCase())}
            className="w-full h-11 rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm font-bold uppercase focus-ring font-mono"
            placeholder="BOM"
            required
          />
        </div>

        {/* Destination */}
        <div>
          <label htmlFor="dest-input" className="block text-[11px] font-extrabold text-slate-600 uppercase mb-1">
            Destination Airport (IATA)
          </label>
          <input
            id="dest-input"
            type="text"
            maxLength={3}
            value={destination}
            onChange={(e) => setDestination(e.target.value.toUpperCase())}
            className="w-full h-11 rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm font-bold uppercase focus-ring font-mono"
            placeholder="DXB"
            required
          />
          {destSuggestions.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1" role="listbox" aria-label="Airport suggestions">
              {destSuggestions.map((item) => (
                <button
                  key={item.code}
                  type="button"
                  onClick={() => setDestination(item.code)}
                  className="rounded-md bg-slate-100 hover:bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-slate-700 hover:text-amber-900 border border-slate-200 transition-colors cursor-pointer"
                  title={`${item.name}, ${item.country}`}
                >
                  {item.code} ({item.city})
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Actual Gross Weight */}
        <div>
          <label htmlFor="weight-input" className="block text-[11px] font-extrabold text-slate-600 uppercase mb-1">
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
        </div>

        {/* Commodity Class */}
        <div>
          <label htmlFor="commodity-select" className="block text-[11px] font-extrabold text-slate-600 uppercase mb-1">
            Commodity Class
          </label>
          <select
            id="commodity-select"
            value={commodity}
            onChange={(e) => setCommodity(e.target.value)}
            className="w-full h-11 rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-800 focus-ring cursor-pointer"
          >
            <option value="General Cargo">General Cargo (GCR)</option>
            <option value="DGR - PAX">Dangerous Goods (DGR - PAX)</option>
            <option value="Pharma CRT">Pharma CRT (15°C to 25°C)</option>
            <option value="Cold Chain">Cold Chain (2°C to 8°C)</option>
          </select>
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
            <Box className="h-4 w-4 text-aero-teal" />
            <span>Enable Package Dimensions &amp; Volumetric Derivation</span>
          </label>

          {useDims && (
            <div className="flex items-center gap-2">
              {/* Unit Switcher Pills (cm / in / m / mm) */}
              {dimensionMode === "dimensions" && (
                <div className="inline-flex rounded-lg bg-slate-100 p-0.5" role="group" aria-label="Dimension Unit">
                  {(["cm", "in", "m", "mm"] as const).map((u) => (
                    <button
                      key={u}
                      type="button"
                      onClick={() => setDimensionUnit(u)}
                      className={`rounded-md px-2 py-0.5 text-[10px] font-black uppercase transition-all cursor-pointer ${
                        dimensionUnit === u
                          ? "bg-obsidian-900 text-amber-300 shadow-xs"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      {u}
                    </button>
                  ))}
                </div>
              )}

              {/* Dimension Mode Switcher (Dimensions vs Direct CBM) */}
              <div className="inline-flex rounded-lg bg-slate-100 p-0.5" role="group" aria-label="Sizing Input Mode">
                <button
                  type="button"
                  onClick={() => setDimensionMode("dimensions")}
                  className={`rounded-md px-2.5 py-1 text-[11px] font-bold transition-all cursor-pointer ${
                    dimensionMode === "dimensions"
                      ? "bg-white text-obsidian-900 shadow-xs"
                      : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  Dimensions
                </button>
                <button
                  type="button"
                  onClick={() => setDimensionMode("cbm")}
                  className={`rounded-md px-2.5 py-1 text-[11px] font-bold transition-all cursor-pointer ${
                    dimensionMode === "cbm"
                      ? "bg-white text-obsidian-900 shadow-xs"
                      : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  Direct CBM
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Dynamic Inputs (Dimensions or Direct CBM) */}
        {useDims && (
          <div>
            {dimensionMode === "dimensions" ? (
              <div className="space-y-2 bg-slate-50/80 p-3.5 rounded-xl border border-slate-200">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label htmlFor="dim-length" className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                      Length ({dimensionUnit})
                    </label>
                    <input
                      id="dim-length"
                      type="number"
                      step="any"
                      min="0.1"
                      value={length}
                      onChange={(e) => setLength(e.target.value)}
                      placeholder={dimensionUnit === "in" ? "e.g. 32" : "e.g. 80"}
                      className="w-full h-10 rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-bold font-mono tabular-nums focus-ring bg-white"
                      required={useDims}
                    />
                  </div>
                  <div>
                    <label htmlFor="dim-width" className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                      Width ({dimensionUnit})
                    </label>
                    <input
                      id="dim-width"
                      type="number"
                      step="any"
                      min="0.1"
                      value={width}
                      onChange={(e) => setWidth(e.target.value)}
                      placeholder={dimensionUnit === "in" ? "e.g. 24" : "e.g. 60"}
                      className="w-full h-10 rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-bold font-mono tabular-nums focus-ring bg-white"
                      required={useDims}
                    />
                  </div>
                  <div>
                    <label htmlFor="dim-height" className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                      Height ({dimensionUnit})
                    </label>
                    <input
                      id="dim-height"
                      type="number"
                      step="any"
                      min="0.1"
                      value={height}
                      onChange={(e) => setHeight(e.target.value)}
                      placeholder={dimensionUnit === "in" ? "e.g. 20" : "e.g. 50"}
                      className="w-full h-10 rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-bold font-mono tabular-nums focus-ring bg-white"
                      required={useDims}
                    />
                  </div>
                  <div>
                    <label htmlFor="dim-pieces" className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                      Pieces
                    </label>
                    <input
                      id="dim-pieces"
                      type="number"
                      min="1"
                      value={pieces}
                      onChange={(e) => setPieces(e.target.value)}
                      placeholder="e.g. 2"
                      className="w-full h-10 rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-bold font-mono tabular-nums focus-ring bg-white"
                      required={useDims}
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between rounded-lg bg-sky-50/80 px-3 py-1.5 text-[11px] text-slate-600 border border-sky-100">
                  <span>
                    IATA Standard: (L × W × H × Pieces) ÷ 6,000{" "}
                    {dimensionUnit !== "cm" ? `(auto-converted from ${dimensionUnit} to cm)` : ""}
                  </span>
                  {volWeight > 0 ? (
                    <span className="font-extrabold text-aero-teal font-mono">
                      = {volWeight.toFixed(1)} kg vol. ({computedCbm.toFixed(3)} CBM)
                    </span>
                  ) : (
                    <span className="text-slate-400 italic">
                      Enter dimensions in {dimensionUnit}
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-slate-50/80 p-3.5 rounded-xl border border-slate-200 space-y-2">
                <div className="max-w-xs">
                  <label htmlFor="dim-cbm" className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    Total Volume (CBM / m³)
                  </label>
                  <input
                    id="dim-cbm"
                    type="number"
                    step="0.001"
                    min="0.001"
                    value={cbmVolume}
                    onChange={(e) => setCbmVolume(e.target.value)}
                    placeholder="e.g. 0.48"
                    className="w-full h-10 rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-bold font-mono tabular-nums focus-ring bg-white"
                    required={useDims}
                  />
                </div>
                <div className="flex items-center justify-between rounded-lg bg-sky-50/80 px-3 py-1.5 text-[11px] text-slate-600 border border-sky-100">
                  <span>1 CBM = 166.7 kg volumetric weight (IATA air cargo 1:6 ratio)</span>
                  <span className="font-extrabold text-aero-teal font-mono">
                    = {volWeight.toFixed(1)} kg vol.
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* IATA Chargeable Weight Verification Banner (Ported from Cargo Booking Platform) */}
      {derivation.chargeableWeight > 0 && (
        <div className="mt-4 rounded-xl bg-slate-50 p-4 border border-slate-200 space-y-3 font-sans">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <span className="font-black text-obsidian-900 uppercase text-[11px] tracking-wider flex items-center gap-1.5">
              <Scale className="h-4 w-4 text-aero-teal" />
              IATA Chargeable Weight Verification (TACT Rule 1.3.2)
            </span>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-black ${
                derivation.isVolumetricBilled
                  ? "bg-amber-100 text-amber-900 border border-amber-300"
                  : "bg-emerald-100 text-emerald-900 border border-emerald-300"
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  derivation.isVolumetricBilled ? "bg-amber-600" : "bg-emerald-600"
                }`}
              />
              {derivation.isVolumetricBilled
                ? "Billed on Volumetric Weight (Bulky Cargo)"
                : "Billed on Gross Scale Weight (Dense Cargo)"}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 bg-white rounded-xl p-3 border border-slate-200">
            <div>
              <span className="text-[10px] text-slate-500 block font-bold uppercase tracking-wider">
                Gross Scale Weight
              </span>
              <span className="text-base font-black text-obsidian-900 font-mono tabular-nums">
                {derivation.actualWeight.toFixed(1)} kg
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 block font-bold uppercase tracking-wider">
                Volumetric Weight (÷6,000)
              </span>
              <span className="text-base font-black text-obsidian-900 font-mono tabular-nums">
                {derivation.volumetricWeight.toFixed(1)} kg{" "}
                <span className="text-xs font-semibold text-slate-500">
                  ({computedCbm.toFixed(3)} CBM)
                </span>
              </span>
            </div>
            <div className="col-span-2 sm:col-span-1 border-t sm:border-t-0 sm:border-l border-slate-100 pt-2 sm:pt-0 sm:pl-3">
              <span className="text-[10px] text-aero-teal block font-black uppercase tracking-wider">
                Derived Chargeable Weight
              </span>
              <span className="text-lg font-black text-emerald-700 font-mono tabular-nums">
                {derivation.chargeableWeight.toFixed(1)} kg
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-600 gap-1 pt-0.5">
            <span className="text-[11px]">
              <strong>Rule 1.3.2:</strong> Higher of Actual vs Volumetric Weight, rounded up to the nearest 0.5 kg.
            </span>
            <span className="font-mono text-[11px] font-bold text-slate-700">
              Air Cargo Ratio: 1 m³ = 166.7 kg (1:6)
            </span>
          </div>

          {derivation.chargeableWeight >= 500 && (
            <div className="flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-950">
              <AlertCircle className="h-4 w-4 shrink-0 text-amber-700" />
              <span>
                <strong>Heavy Shipment Notice (&ge; 500 kg):</strong> Chargeable weight exceeds the 500 kg Smalls threshold. Airline circular tariffs do not apply; ad-hoc spot rate negotiation is required.
              </span>
            </div>
          )}
        </div>
      )}

      {/* CTA Button */}
      <div className="mt-5 flex justify-end">
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl bg-obsidian-900 px-6 py-3 text-sm font-extrabold text-amber-300 shadow-sm hover:bg-aero-navy transition-all focus-ring disabled:opacity-50 cursor-pointer"
        >
          <Search className="h-4 w-4 text-amber-300" />
          {loading ? "Searching Carrier Tariffs..." : "Compare Airline Buying Rates"}
        </button>
      </div>
    </form>
  );
}
