"use client";

import React, { useState } from "react";
import { Plane, Box, Search, AlertCircle, ArrowRight } from "lucide-react";
import { RateSearchRequest, CargoDimension } from "../../types/rate";

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

  // Optional Dimensions
  const [useDims, setUseDims] = useState(false);
  const [length, setLength] = useState("80");
  const [width, setWidth] = useState("60");
  const [height, setHeight] = useState("50");
  const [pieces, setPieces] = useState("2");

  const wtNum = parseFloat(actualWeight) || 0;
  const isOverThreshold = wtNum >= 500;

  // Real-time volumetric weight calculation
  const lNum = parseFloat(length) || 0;
  const wNum = parseFloat(width) || 0;
  const hNum = parseFloat(height) || 0;
  const pcsNum = parseInt(pieces, 10) || 1;
  const volWeight = useDims ? Math.round(((lNum * wNum * hNum * pcsNum) / 6000) * 10) / 10 : 0;
  const estimatedCW = Math.max(wtNum, volWeight);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const dims: CargoDimension[] = useDims
      ? [
          {
            length_cm: lNum,
            width_cm: wNum,
            height_cm: hNum,
            pieces: pcsNum,
          },
        ]
      : [];

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
      className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-4 mb-4 gap-2">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-jfll-blue">
            <Plane className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">Air Cargo Rate Search</h2>
            <p className="text-xs font-semibold text-slate-600">
              Live buying tariffs &bull; BOM Export Hub
            </p>
          </div>
        </div>
        <span className="inline-flex items-center self-start sm:self-auto rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-jfll-blue border border-blue-200">
          Scope: &lt; 500 kg Smalls
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Origin */}
        <div>
          <label htmlFor="origin-input" className="block text-xs font-bold text-slate-700 uppercase mb-1">
            Origin Gateway
          </label>
          <input
            id="origin-input"
            type="text"
            maxLength={3}
            value={origin}
            onChange={(e) => setOrigin(e.target.value.toUpperCase())}
            className="w-full h-11 rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm font-bold uppercase focus-ring"
            placeholder="BOM"
            required
          />
        </div>

        {/* Destination */}
        <div>
          <label htmlFor="dest-input" className="block text-xs font-bold text-slate-700 uppercase mb-1">
            Destination Airport
          </label>
          <input
            id="dest-input"
            type="text"
            maxLength={3}
            value={destination}
            onChange={(e) => setDestination(e.target.value.toUpperCase())}
            className="w-full h-11 rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm font-bold uppercase focus-ring"
            placeholder="DXB"
            required
          />
        </div>

        {/* Actual Gross Weight */}
        <div>
          <label htmlFor="weight-input" className="block text-xs font-bold text-slate-700 uppercase mb-1">
            Actual Weight (kg)
          </label>
          <input
            id="weight-input"
            type="number"
            step="0.5"
            min="1"
            value={actualWeight}
            onChange={(e) => setActualWeight(e.target.value)}
            className="w-full h-11 rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm font-bold focus-ring font-mono tabular-nums"
            required
          />
        </div>

        {/* Commodity */}
        <div>
          <label htmlFor="commodity-select" className="block text-xs font-bold text-slate-700 uppercase mb-1">
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

      {/* Volumetric dimensions toggle */}
      <div className="mt-4 pt-3.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
        <label
          htmlFor="volumetric-checkbox"
          className="flex items-center gap-2.5 text-xs font-semibold text-slate-700 cursor-pointer select-none"
        >
          <input
            id="volumetric-checkbox"
            type="checkbox"
            checked={useDims}
            onChange={(e) => setUseDims(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-jfll-blue focus:ring-jfll-blue cursor-pointer"
          />
          <Box className="h-4 w-4 text-slate-500" />
          <span>Add package dimensions (calculate volumetric weight @ 1:6 ratio)</span>
        </label>

        {useDims && (
          <div className="text-xs font-semibold text-slate-600">
            Volumetric: <strong className="font-mono tabular-nums text-slate-900">{volWeight} kg</strong> &bull;
            Est. CW: <strong className="font-mono tabular-nums text-jfll-blue">{estimatedCW} kg</strong>
          </div>
        )}
      </div>

      {/* Volumetric Inputs with explicit accessible labels and touch targets */}
      {useDims && (
        <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
          <div>
            <label htmlFor="dim-length" className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
              Length (cm)
            </label>
            <input
              id="dim-length"
              type="number"
              min="1"
              value={length}
              onChange={(e) => setLength(e.target.value)}
              className="w-full h-10 rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-bold font-mono tabular-nums focus-ring bg-white"
            />
          </div>
          <div>
            <label htmlFor="dim-width" className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
              Width (cm)
            </label>
            <input
              id="dim-width"
              type="number"
              min="1"
              value={width}
              onChange={(e) => setWidth(e.target.value)}
              className="w-full h-10 rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-bold font-mono tabular-nums focus-ring bg-white"
            />
          </div>
          <div>
            <label htmlFor="dim-height" className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
              Height (cm)
            </label>
            <input
              id="dim-height"
              type="number"
              min="1"
              value={height}
              onChange={(e) => setHeight(e.target.value)}
              className="w-full h-10 rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-bold font-mono tabular-nums focus-ring bg-white"
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
              className="w-full h-10 rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-bold font-mono tabular-nums focus-ring bg-white"
            />
          </div>
        </div>
      )}

      {/* Over-threshold warning */}
      {isOverThreshold && (
        <div className="mt-4 flex items-center gap-2 rounded-xl bg-amber-50 p-3 text-xs text-amber-900 border border-amber-300">
          <AlertCircle className="h-4 w-4 shrink-0 text-amber-700" />
          <span>
            <strong>Heavy Cargo Alert:</strong> Shipments ≥ 500 kg require manual spot rates from carrier
            cargo sales desks.
          </span>
        </div>
      )}

      {/* CTA Button */}
      <div className="mt-5 flex justify-end">
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl bg-jfll-blue px-6 py-3 text-sm font-bold text-white shadow-sm hover:bg-jfll-navy transition-all focus-ring disabled:opacity-50 cursor-pointer"
        >
          <Search className="h-4 w-4" />
          {loading ? "Discovering Carrier Tariffs..." : "Compare Airline Buying Rates"}
        </button>
      </div>
    </form>
  );
}
