"use client";

import React, { useState } from "react";
import { Plane, Box, Search, AlertCircle } from "lucide-react";
import { RateSearchRequest, CargoDimension } from "../../types/rate";

interface RateSearchFormProps {
  onSearch: (payload: RateSearchRequest) => void;
  loading: boolean;
}

export function RateSearchForm({ onSearch, loading }: RateSearchFormProps) {
  const [origin, setOrigin] = useState("BOM");
  const [destination, setDestination] = useState("DXB");
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const dims: CargoDimension[] = useDims
      ? [
          {
            length_cm: parseFloat(length) || 0,
            width_cm: parseFloat(width) || 0,
            height_cm: parseFloat(height) || 0,
            pieces: parseInt(pieces, 10) || 1,
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
    <form onSubmit={handleSubmit} className="rounded-2xl bg-white p-6 shadow-md border border-gray-100">
      <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-4">
        <div className="flex items-center gap-2">
          <Plane className="h-5 w-5 text-jfll-blue" />
          <h2 className="text-lg font-bold text-gray-900">Air Cargo Tariff Search</h2>
        </div>
        <span className="inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-jfll-blue">
          Scope: &lt; 500 kg Smalls
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Origin */}
        <div>
          <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Origin Hub</label>
          <input
            type="text"
            maxLength={3}
            value={origin}
            onChange={(e) => setOrigin(e.target.value.toUpperCase())}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold uppercase focus:border-jfll-blue focus:ring-1 focus:ring-jfll-blue"
            required
          />
        </div>

        {/* Destination */}
        <div>
          <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Destination</label>
          <input
            type="text"
            maxLength={3}
            value={destination}
            onChange={(e) => setDestination(e.target.value.toUpperCase())}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold uppercase focus:border-jfll-blue focus:ring-1 focus:ring-jfll-blue"
            required
          />
        </div>

        {/* Actual Gross Weight */}
        <div>
          <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">
            Actual Weight (kg)
          </label>
          <input
            type="number"
            step="0.5"
            min="1"
            value={actualWeight}
            onChange={(e) => setActualWeight(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold focus:border-jfll-blue focus:ring-1 focus:ring-jfll-blue"
            required
          />
        </div>

        {/* Commodity */}
        <div>
          <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Commodity</label>
          <select
            value={commodity}
            onChange={(e) => setCommodity(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium focus:border-jfll-blue focus:ring-1 focus:ring-jfll-blue"
          >
            <option value="General Cargo">General Cargo (GCR)</option>
            <option value="DGR - PAX">Dangerous Goods (DGR - PAX)</option>
            <option value="Pharma CRT">Pharma CRT (15°C to 25°C)</option>
            <option value="Cold Chain">Cold Chain (2°C to 8°C)</option>
          </select>
        </div>
      </div>

      {/* Volumetric dimensions toggle */}
      <div className="mt-4 pt-3 border-t border-gray-50 flex items-center justify-between">
        <label className="flex items-center gap-2 text-xs font-medium text-gray-600 cursor-pointer">
          <input
            type="checkbox"
            checked={useDims}
            onChange={(e) => setUseDims(e.target.checked)}
            className="rounded border-gray-300 text-jfll-blue focus:ring-jfll-blue"
          />
          <Box className="h-4 w-4 text-gray-400" />
          Include package dimensions (calculate volumetric weight @ 1:6)
        </label>
      </div>

      {useDims && (
        <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3 bg-gray-50 p-3 rounded-lg">
          <div>
            <span className="text-[11px] font-medium text-gray-500">Length (cm)</span>
            <input
              type="number"
              value={length}
              onChange={(e) => setLength(e.target.value)}
              className="w-full rounded border border-gray-300 px-2 py-1 text-xs"
            />
          </div>
          <div>
            <span className="text-[11px] font-medium text-gray-500">Width (cm)</span>
            <input
              type="number"
              value={width}
              onChange={(e) => setWidth(e.target.value)}
              className="w-full rounded border border-gray-300 px-2 py-1 text-xs"
            />
          </div>
          <div>
            <span className="text-[11px] font-medium text-gray-500">Height (cm)</span>
            <input
              type="number"
              value={height}
              onChange={(e) => setHeight(e.target.value)}
              className="w-full rounded border border-gray-300 px-2 py-1 text-xs"
            />
          </div>
          <div>
            <span className="text-[11px] font-medium text-gray-500">Pieces</span>
            <input
              type="number"
              value={pieces}
              onChange={(e) => setPieces(e.target.value)}
              className="w-full rounded border border-gray-300 px-2 py-1 text-xs"
            />
          </div>
        </div>
      )}

      {isOverThreshold && (
        <div className="mt-4 flex items-center gap-2 rounded-lg bg-amber-50 p-3 text-xs text-amber-800 border border-amber-200">
          <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
          <span>Notice: Shipments ≥ 500 kg require manual spot rates from airline cargo sales desks.</span>
        </div>
      )}

      <div className="mt-5 flex justify-end">
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl bg-jfll-blue px-6 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-jfll-navy transition-colors disabled:opacity-50"
        >
          <Search className="h-4 w-4" />
          {loading ? "Aggregating Buying Tariffs..." : "Compare Airline Buying Rates"}
        </button>
      </div>
    </form>
  );
}
