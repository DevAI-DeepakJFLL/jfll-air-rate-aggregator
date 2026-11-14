"use client";

import React from "react";
import { Calculator, RotateCcw } from "lucide-react";

export type MarginMode = "per_kg" | "percent" | "flat";

export const MARGIN_PRESETS: Record<MarginMode, { label: string; value: number }[]> = {
  per_kg: [
    { label: "+₹10/kg", value: 10 },
    { label: "+₹15/kg", value: 15 },
    { label: "+₹20/kg", value: 20 },
    { label: "+₹25/kg", value: 25 },
    { label: "+₹35/kg", value: 35 },
  ],
  percent: [
    { label: "+5%", value: 5 },
    { label: "+8%", value: 8 },
    { label: "+10%", value: 10 },
    { label: "+12%", value: 12 },
    { label: "+15%", value: 15 },
  ],
  flat: [
    { label: "+₹1,500", value: 1500 },
    { label: "+₹2,500", value: 2500 },
    { label: "+₹3,500", value: 3500 },
    { label: "+₹5,000", value: 5000 },
  ],
};

export interface MarginControllerBarProps {
  marginMode: MarginMode;
  onMarginModeChange: (mode: MarginMode) => void;
  marginInputStr: string;
  onMarginInputChange: (val: string) => void;
  hasActiveOverrides: boolean;
  onResetMargins: () => void;
}

export function MarginControllerBar({
  marginMode,
  onMarginModeChange,
  marginInputStr,
  onMarginInputChange,
  hasActiveOverrides,
  onResetMargins,
}: MarginControllerBarProps) {
  const globalMarginNum = parseFloat(marginInputStr) || 0;
  const currentPresets = MARGIN_PRESETS[marginMode];

  return (
    <div className="rounded-2xl border border-slate-800 bg-obsidian-900 p-4 sm:p-5 text-white shadow-card">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Title & Description */}
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-400/10 border border-amber-400/30 text-amber-300">
            <Calculator className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-sm font-black tracking-tight text-white uppercase">
                Coordinator Margin &amp; Client Sell Price
              </h4>
              <span className="rounded-md bg-amber-400/20 px-2 py-0.5 font-mono text-[10px] font-bold text-amber-300 border border-amber-400/30">
                Mumbai Hub Smalls Desk
              </span>
              {globalMarginNum > 0 && (
                <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/20 px-2 py-0.5 font-mono text-[10px] font-extrabold text-emerald-300 border border-emerald-500/30">
                  Active: +
                  {marginMode === "per_kg"
                    ? `₹${globalMarginNum}/kg`
                    : marginMode === "percent"
                    ? `${globalMarginNum}%`
                    : `₹${globalMarginNum}`}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Dynamic customer selling price calculator. Pure airline buy rates remain 100% untouched as your procurement baseline.
            </p>
          </div>
        </div>

        {/* Reset button if active */}
        {(globalMarginNum > 0 || hasActiveOverrides) && (
          <button
            type="button"
            onClick={onResetMargins}
            className="inline-flex items-center gap-1.5 self-start lg:self-center rounded-xl border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-700 transition-colors cursor-pointer"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Reset to Pure Buy</span>
          </button>
        )}
      </div>

      {/* Inputs & Presets Grid */}
      <div className="mt-4 pt-3.5 border-t border-slate-800/80 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Mode Selector */}
          <div
            className="inline-flex rounded-xl bg-slate-950 p-1 border border-slate-800"
            role="group"
            aria-label="Margin Calculation Mode"
          >
            <button
              type="button"
              onClick={() => onMarginModeChange("per_kg")}
              className={`rounded-lg px-3 py-1 text-xs font-black transition-all cursor-pointer ${
                marginMode === "per_kg"
                  ? "bg-amber-400 text-obsidian-950 shadow-xs"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              ₹ / kg
            </button>
            <button
              type="button"
              onClick={() => onMarginModeChange("percent")}
              className={`rounded-lg px-3 py-1 text-xs font-black transition-all cursor-pointer ${
                marginMode === "percent"
                  ? "bg-amber-400 text-obsidian-950 shadow-xs"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              % Markup
            </button>
            <button
              type="button"
              onClick={() => onMarginModeChange("flat")}
              className={`rounded-lg px-3 py-1 text-xs font-black transition-all cursor-pointer ${
                marginMode === "flat"
                  ? "bg-amber-400 text-obsidian-950 shadow-xs"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              ₹ Flat
            </button>
          </div>

          {/* Numeric Margin Input */}
          <div className="relative flex items-center">
            <span className="absolute left-3 font-mono text-xs font-bold text-slate-400 pointer-events-none">
              {marginMode === "percent" ? "+" : "+₹"}
            </span>
            <input
              type="number"
              min="0"
              step={marginMode === "per_kg" ? "1" : marginMode === "percent" ? "0.5" : "100"}
              value={marginInputStr}
              onChange={(e) => onMarginInputChange(e.target.value)}
              placeholder="0.00"
              aria-label="Margin value"
              className="h-9 w-28 rounded-xl border border-slate-700 bg-slate-950 pl-8 pr-9 font-mono text-xs font-bold text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400"
            />
            <span className="absolute right-2.5 font-mono text-[11px] font-bold text-slate-400 pointer-events-none">
              {marginMode === "per_kg" ? "/kg" : marginMode === "percent" ? "%" : ""}
            </span>
          </div>
        </div>

        {/* Quick Click Preset Chips */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">
            Quick:
          </span>
          {currentPresets.map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => onMarginInputChange(preset.value.toString())}
              className={`rounded-lg px-2.5 py-1 font-mono text-xs font-extrabold border transition-all cursor-pointer ${
                globalMarginNum === preset.value
                  ? "bg-amber-400/20 border-amber-400 text-amber-300"
                  : "bg-slate-800/60 border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white"
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
