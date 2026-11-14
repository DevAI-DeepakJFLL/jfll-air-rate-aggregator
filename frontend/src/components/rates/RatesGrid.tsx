"use client";

import React, { useState, useMemo } from "react";
import { RateQuoteItem } from "../../types/rate";
import { formatINR } from "../../lib/utils";
import { CostBreakdownModal, MarginInfo } from "./CostBreakdownModal";
import { CarrierBadge } from "./CarrierBadge";
import { AirlineLogo } from "./AirlineLogo";
import {
  Clock,
  TrendingDown,
  Info,
  Copy,
  Check,
  Plane,
  Sparkles,
  Calculator,
  RotateCcw,
  SlidersHorizontal,
  FileText,
} from "lucide-react";

interface RatesGridProps {
  rates: RateQuoteItem[];
}

type FilterOption = "all" | "cheapest" | "fastest" | "direct";
type MarginMode = "per_kg" | "percent" | "flat";

interface CardMarginOverride {
  mode: MarginMode;
  value: number;
}

const PRESETS: Record<MarginMode, { label: string; value: number }[]> = {
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

export function RatesGrid({ rates }: RatesGridProps) {
  const [selectedQuote, setSelectedQuote] = useState<RateQuoteItem | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterOption>("all");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedAuditId, setCopiedAuditId] = useState<string | null>(null);
  const [activeTooltipId, setActiveTooltipId] = useState<string | null>(null);

  // Pricing Coordinator Margin State
  const [marginMode, setMarginMode] = useState<MarginMode>("per_kg");
  const [marginInputStr, setMarginInputStr] = useState<string>("");
  const [cardOverrides, setCardOverrides] = useState<Record<string, CardMarginOverride>>({});

  // Inline Card Override Drawer State
  const [activeOverrideCardId, setActiveOverrideCardId] = useState<string | null>(null);
  const [overrideMode, setOverrideMode] = useState<MarginMode>("per_kg");
  const [overrideInputStr, setOverrideInputStr] = useState<string>("");

  const globalMarginNum = parseFloat(marginInputStr) || 0;

  // DSA Optimization: Precomputed Margin Map (O(M) single-pass)
  // Provides O(1) margin and sell price lookups per card, eliminating redundant recalculations
  const marginMap = useMemo(() => {
    const map = new Map<string, MarginInfo>();
    for (let i = 0; i < rates.length; i++) {
      const q = rates[i];
      const cw = q.chargeable_weight;
      const buyTotal = q.breakdown.total_landed_buy;
      const override = cardOverrides[q.id];
      const mode = override ? override.mode : marginMode;
      const val = override ? override.value : globalMarginNum;

      if (!isNaN(val) && val > 0) {
        let totalMargin = 0;
        let marginPerKg = 0;
        if (mode === "per_kg") {
          marginPerKg = val;
          totalMargin = Math.round(val * cw);
        } else if (mode === "percent") {
          totalMargin = Math.round(buyTotal * (val / 100));
          marginPerKg = totalMargin / Math.max(cw, 0.5);
        } else if (mode === "flat") {
          totalMargin = Math.round(val);
          marginPerKg = totalMargin / Math.max(cw, 0.5);
        }
        const sellTotal = buyTotal + totalMargin;
        const sellPerKg = sellTotal / Math.max(cw, 0.5);
        map.set(q.id, {
          mode,
          value: val,
          totalMargin,
          sellTotal,
          sellPerKg,
          marginPerKg,
        });
      }
    }
    return map;
  }, [rates, marginMode, globalMarginNum, cardOverrides]);

  // O(1) retrieval from memoized Map
  const getQuoteMargin = (quote: RateQuoteItem): MarginInfo | null => {
    return marginMap.get(quote.id) ?? null;
  };

  const handleResetMargins = () => {
    setMarginInputStr("");
    setCardOverrides({});
    setActiveOverrideCardId(null);
  };

  const handleOpenOverride = (quote: RateQuoteItem) => {
    if (activeOverrideCardId === quote.id) {
      setActiveOverrideCardId(null);
      return;
    }
    const current = cardOverrides[quote.id];
    setOverrideMode(current ? current.mode : marginMode);
    setOverrideInputStr(current ? current.value.toString() : (globalMarginNum > 0 ? globalMarginNum.toString() : ""));
    setActiveOverrideCardId(quote.id);
  };

  const handleApplyOverride = (quoteId: string) => {
    const val = parseFloat(overrideInputStr);
    if (!isNaN(val) && val > 0) {
      setCardOverrides((prev) => ({
        ...prev,
        [quoteId]: { mode: overrideMode, value: val },
      }));
    } else {
      // Revert if zero or invalid
      setCardOverrides((prev) => {
        const next = { ...prev };
        delete next[quoteId];
        return next;
      });
    }
    setActiveOverrideCardId(null);
  };

  const handleRevertOverride = (quoteId: string) => {
    setCardOverrides((prev) => {
      const next = { ...prev };
      delete next[quoteId];
      return next;
    });
    setActiveOverrideCardId(null);
  };

  // Copy customer-facing quotation
  const handleCopyQuote = (quote: RateQuoteItem) => {
    const margin = getQuoteMargin(quote);
    let text = "";

    if (margin && margin.totalMargin > 0) {
      text = [
        `✈ AIR FREIGHT QUOTATION | JET FREIGHT LOGISTICS`,
        `Route: ${quote.origin} → ${quote.destination} (${quote.flight_number})`,
        `Carrier: ${quote.carrier_name} (${quote.carrier_code})`,
        `Routing: ${quote.routing_type} • Transit: ${quote.transit_time}`,
        `Chargeable Weight: ${quote.chargeable_weight} kg (${quote.weight_tier_applied})`,
        `Commodity: ${quote.cargo_category}`,
        `-----------------------------------------`,
        `ALL-IN CLIENT SELLING RATE: ₹${margin.sellPerKg.toFixed(2)} / kg`,
        `TOTAL ESTIMATED FREIGHT: ${formatINR(margin.sellTotal)}`,
        `Includes: Base Air Freight, Fuel (FSC), Security (SSC), Origin MIAL Terminal Charges & 5% GST`,
        `-----------------------------------------`,
        `Departure: ${quote.departure_time} | Arrival: ${quote.arrival_time}`,
        `Cargo Acceptance Cutoff: ${quote.cargo_cutoff}`,
        `Terms: Subject to space confirmation and airline booking acceptance at Mumbai Hub (BOM).`,
      ].join("\n");
    } else {
      text = [
        `✈ AIR CARGO BUYING TARIFF | JET FREIGHT LOGISTICS`,
        `Route: ${quote.origin} → ${quote.destination} (${quote.flight_number})`,
        `Carrier: ${quote.carrier_name} (${quote.carrier_code})`,
        `Routing: ${quote.routing_type} • Transit: ${quote.transit_time}`,
        `Chargeable Weight: ${quote.chargeable_weight} kg (${quote.weight_tier_applied})`,
        `Base Freight: ₹${quote.breakdown.base_rate_per_kg}/kg (Total: ${formatINR(quote.breakdown.base_freight_total)})`,
        `Fuel (FSC): ${formatINR(quote.breakdown.fsc_total)} | Security (SSC): ${formatINR(quote.breakdown.ssc_total)}`,
        `Origin THC & Screening: ${formatINR(quote.breakdown.origin_thc_total)} | e-AWB: ${formatINR(quote.breakdown.awb_fee)}`,
        `-----------------------------------------`,
        `TOTAL LANDED BUY COST: ${formatINR(quote.breakdown.total_landed_buy)} (Zero Margin)`,
        `EFFECTIVE RATE / KG: ₹${quote.breakdown.effective_buy_per_kg.toFixed(2)} / kg`,
        `Cutoff: ${quote.cargo_cutoff}`,
      ].join("\n");
    }

    navigator.clipboard.writeText(text);
    setCopiedId(quote.id);
    setTimeout(() => setCopiedId(null), 2200);
  };

  // Copy internal pricing audit sheet
  const handleCopyInternalAudit = (quote: RateQuoteItem) => {
    const margin = getQuoteMargin(quote);
    const text = [
      `✈ INTERNAL PRICING AUDIT SHEET | JET FREIGHT LOGISTICS (BOM)`,
      `Route: ${quote.origin} → ${quote.destination} (${quote.flight_number})`,
      `Carrier: ${quote.carrier_name} (${quote.carrier_code})`,
      `Chargeable Weight: ${quote.chargeable_weight} kg (${quote.weight_tier_applied})`,
      `Commodity: ${quote.cargo_category}`,
      `-----------------------------------------`,
      `NET AIRLINE BUY COST: ${formatINR(quote.breakdown.total_landed_buy)} (₹${quote.breakdown.effective_buy_per_kg.toFixed(2)} / kg)`,
      `COORDINATOR MARGIN: +${formatINR(margin ? margin.totalMargin : 0)} (+₹${margin ? margin.marginPerKg.toFixed(2) : "0.00"} / kg)`,
      `FINAL CLIENT SELL PRICE: ${formatINR(margin ? margin.sellTotal : quote.breakdown.total_landed_buy)} (₹${margin ? margin.sellPerKg.toFixed(2) : quote.breakdown.effective_buy_per_kg.toFixed(2)} / kg)`,
      `Gross Profit Margin: ${margin ? ((margin.totalMargin / quote.breakdown.total_landed_buy) * 100).toFixed(1) : "0.0"}% on buy cost`,
      `-----------------------------------------`,
      `Base Freight: ₹${quote.breakdown.base_rate_per_kg}/kg | FSC: ${formatINR(quote.breakdown.fsc_total)} | SSC: ${formatINR(quote.breakdown.ssc_total)}`,
      `MIAL Terminal THC: ${formatINR(quote.breakdown.origin_thc_total)} | e-AWB: ${formatINR(quote.breakdown.awb_fee)} | GST (5%): ${formatINR(quote.breakdown.gst_tax)}`,
      `Cutoff: ${quote.cargo_cutoff}`,
    ].join("\n");

    navigator.clipboard.writeText(text);
    setCopiedAuditId(quote.id);
    setTimeout(() => setCopiedAuditId(null), 2200);
  };

  // DSA Optimization: Pre-indexed views for O(1) filter tab switching
  const precomputedViews = useMemo(() => {
    const direct: RateQuoteItem[] = [];
    for (let i = 0; i < rates.length; i++) {
      if (rates[i].routing_type.toLowerCase().includes("direct")) {
        direct.push(rates[i]);
      }
    }

    const getEffectivePrice = (item: RateQuoteItem) => {
      const m = marginMap.get(item.id);
      return m ? m.sellTotal : item.breakdown.total_landed_buy;
    };

    const cheapest = [...rates].sort(
      (a, b) => getEffectivePrice(a) - getEffectivePrice(b)
    );

    const fastest = [...rates].sort(
      (a, b) => (a.transit_minutes ?? 9999) - (b.transit_minutes ?? 9999)
    );

    return {
      all: rates,
      cheapest,
      fastest,
      direct,
      directCount: direct.length,
    };
  }, [rates, marginMap]);

  const displayedRates = precomputedViews[activeFilter] ?? rates;
  const directCount = precomputedViews.directCount;
  const currentPresets = PRESETS[marginMode];

  if (rates.length === 0) {
    return null;
  }

  const selectedMarginInfo = selectedQuote ? getQuoteMargin(selectedQuote) : null;

  return (
    <div className="space-y-4 font-sans">
      {/* 1. Pricing Coordinator Margin Controller Bar (Trading Cockpit) */}
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
                  Coordinator Margin & Client Sell Price
                </h4>
                <span className="rounded-md bg-amber-400/20 px-2 py-0.5 font-mono text-[10px] font-bold text-amber-300 border border-amber-400/30">
                  Mumbai Hub Smalls Desk
                </span>
                {globalMarginNum > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/20 px-2 py-0.5 font-mono text-[10px] font-extrabold text-emerald-300 border border-emerald-500/30">
                    Active: +{marginMode === "per_kg" ? `₹${globalMarginNum}/kg` : marginMode === "percent" ? `${globalMarginNum}%` : `₹${globalMarginNum}`}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Dynamic customer selling price calculator. Pure airline buy rates remain 100% untouched as your procurement baseline.
              </p>
            </div>
          </div>

          {/* Reset button if active */}
          {(globalMarginNum > 0 || Object.keys(cardOverrides).length > 0) && (
            <button
              type="button"
              onClick={handleResetMargins}
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
            <div className="inline-flex rounded-xl bg-slate-950 p-1 border border-slate-800" role="group" aria-label="Margin Calculation Mode">
              <button
                type="button"
                onClick={() => setMarginMode("per_kg")}
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
                onClick={() => setMarginMode("percent")}
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
                onClick={() => setMarginMode("flat")}
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
                onChange={(e) => setMarginInputStr(e.target.value)}
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
                onClick={() => setMarginInputStr(preset.value.toString())}
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

      {/* 2. Header with Filter Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3.5 pt-2">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-extrabold text-obsidian-900 tracking-tight">
              Discovered Airline Tariffs
            </h3>
            <span className="rounded-full bg-slate-200/80 px-2 py-0.5 font-mono text-[11px] font-bold text-slate-700">
              {displayedRates.length} active
            </span>
          </div>
          <p className="text-xs font-semibold text-slate-500 mt-0.5">
            BOM Gateway circulars &bull; Standardized landed buying rates
          </p>
        </div>

        {/* Filter Pills with Obsidian/Champagne accents */}
        <div className="flex flex-wrap items-center gap-1.5" role="tablist" aria-label="Tariff sort filters">
          {[
            { id: "all", label: `All Flights (${rates.length})` },
            { id: "cheapest", label: "Lowest Price" },
            { id: "direct", label: `Direct Only (${directCount})` },
            { id: "fastest", label: "Fastest Transit" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeFilter === tab.id}
              onClick={() => setActiveFilter(tab.id as FilterOption)}
              className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer focus-ring ${
                activeFilter === tab.id
                  ? "bg-obsidian-900 text-amber-300 shadow-sm"
                  : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* 3. Cards List */}
      <div className="space-y-4">
        {displayedRates.map((quote) => {
          const margin = getQuoteMargin(quote);
          const hasCardOverride = !!cardOverrides[quote.id];
          const hasActiveMargin = margin !== null && margin.totalMargin > 0;

          return (
            <div
              key={quote.id}
              className={`relative rounded-2xl border p-5 sm:p-6 transition-all duration-150 bg-white shadow-card hover:shadow-elevated ${
                quote.recommended
                  ? "border-amber-400/80 ring-2 ring-amber-400/20"
                  : "border-slate-200/90 hover:border-slate-400"
              }`}
            >
              {/* Top Recommended Tag (Champagne Brass & Obsidian) */}
              {quote.recommended && (
                <div className="absolute -top-3 left-6 inline-flex items-center gap-1 rounded-full bg-amber-900 px-3 py-0.5 text-xs font-extrabold text-amber-200 shadow-sm border border-amber-700">
                  <Sparkles className="h-3 w-3 text-amber-300" />
                  Best Buying Rate
                </div>
              )}

              {/* Carrier Info (Left) + Price Hero (Right) */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-slate-100">
                <div className="flex items-center gap-3.5 min-w-0">
                  <CarrierBadge carrierCode={quote.carrier_code} carrierName={quote.carrier_name} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-extrabold text-base text-obsidian-900 tracking-tight">
                        {quote.carrier_name}
                      </h4>
                      <span className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-[11px] font-bold text-slate-600">
                        AWB {quote.airline_prefix}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-xs text-slate-500 font-semibold flex-wrap">
                      <span>
                        Flight <strong className="font-mono text-slate-800">{quote.flight_number}</strong>
                      </span>
                      <span className="text-slate-300">&bull;</span>
                      <span className="text-slate-600">{quote.cargo_category}</span>
                      <span className="text-slate-300">&bull;</span>
                      <span className="text-aero-teal font-bold">{quote.routing_type}</span>
                    </div>
                  </div>
                </div>

                {/* Direct Carrier API Feed & Price Hero */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between sm:justify-end gap-3 sm:gap-4 pt-3 sm:pt-0 border-t sm:border-0 border-slate-100 shrink-0">
                  {/* Real-time Airline API Feed Connection Pill with Authorized Logo */}
                  <div
                    className="inline-flex items-center gap-2.5 rounded-xl border border-slate-200/90 bg-slate-50/80 px-3 py-2 shadow-2xs hover:bg-slate-100/80 transition-colors"
                    title={`Live tariff feed from ${quote.carrier_name} (${quote.carrier_code}) API`}
                  >
                    <div className="relative shrink-0">
                      <AirlineLogo
                        carrierCode={quote.carrier_code}
                        carrierName={quote.carrier_name}
                        size="sm"
                      />
                      {/* Live ping beacon */}
                      <span className="absolute -bottom-0.5 -right-0.5 flex h-2.5 w-2.5" aria-hidden="true">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 border border-white"></span>
                      </span>
                    </div>
                    <div className="flex flex-col text-left">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-black uppercase tracking-wider text-obsidian-900 leading-tight">
                          Direct API Feed
                        </span>
                        <span className="inline-flex items-center rounded-sm bg-emerald-100 px-1 py-0.5 font-mono text-[9px] font-bold text-emerald-800 leading-none">
                          LIVE
                        </span>
                      </div>
                      <span className="text-[10px] font-semibold text-slate-500 font-mono mt-0.5 leading-tight">
                        Prefix {quote.airline_prefix} &bull; Net Tariff
                      </span>
                    </div>
                  </div>

                  {/* Landed Buy Price Block vs Customer Selling Price */}
                  <div className="text-left sm:text-right shrink-0">
                    {hasActiveMargin ? (
                      <div className="space-y-1">
                        {/* Customer Selling Price Hero */}
                        <div className="flex items-center sm:justify-end gap-1.5">
                          <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md">
                            Client Sell Price
                          </span>
                          {hasCardOverride && (
                            <span className="text-[10px] font-extrabold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded">
                              Carrier Override
                            </span>
                          )}
                        </div>
                        <div className="flex items-baseline sm:justify-end gap-1.5">
                          <span className="font-mono tabular-nums text-2xl font-black text-obsidian-900 tracking-tight">
                            {formatINR(margin.sellTotal)}
                          </span>
                          <span className="text-[11px] font-extrabold text-slate-500 uppercase">all-in</span>
                        </div>
                        <div className="text-xs font-black text-emerald-700 font-mono tabular-nums">
                          ₹{margin.sellPerKg.toFixed(2)} / kg
                        </div>

                        {/* Internal Net Buy Baseline Pill */}
                        <div className="mt-1 flex items-center sm:justify-end gap-1.5 text-[11px] font-semibold text-slate-500 flex-wrap">
                          <span>
                            Net Buy: <strong className="font-mono text-slate-700">{formatINR(quote.breakdown.total_landed_buy)}</strong> (₹{quote.breakdown.effective_buy_per_kg.toFixed(2)}/kg)
                          </span>
                          <span className="text-slate-300">&bull;</span>
                          <span className="text-emerald-700 font-extrabold font-mono">
                            Profit +{formatINR(margin.totalMargin)}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                          Net Landed Buy
                        </div>
                        <div className="flex items-baseline sm:justify-end gap-1.5">
                          <span className="font-mono tabular-nums text-2xl font-black text-obsidian-900 tracking-tight">
                            {formatINR(quote.breakdown.total_landed_buy)}
                          </span>
                          <span className="text-[11px] font-extrabold text-slate-500 uppercase">all-in</span>
                        </div>
                        <div className="text-xs font-bold text-emerald-700 font-mono tabular-nums">
                          ₹{quote.breakdown.effective_buy_per_kg.toFixed(2)} / kg
                        </div>
                        <div className="text-[10px] font-semibold text-slate-400 mt-0.5">
                          Zero Margin Applied
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* 3-Column Timetable Flight Journey */}
              <div className="grid grid-cols-3 items-center gap-3 sm:gap-6 py-4 border-b border-slate-100">
                {/* Departure */}
                <div>
                  <div className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                    Departure
                  </div>
                  <div className="mt-0.5 flex items-baseline gap-1.5">
                    <span className="font-mono tabular-nums text-lg sm:text-xl font-black text-obsidian-900">
                      {quote.departure_time.split(" ")[0]}
                    </span>
                    <span className="font-extrabold text-xs text-slate-700">{quote.origin}</span>
                  </div>
                  <div className="text-[11px] font-semibold text-slate-500 mt-0.5">
                    {quote.departure_time.split(" ")[1] || "IST"}
                  </div>
                </div>

                {/* Transit Flight Line */}
                <div className="flex flex-col items-center justify-center text-center px-1">
                  <span className="text-[10px] sm:text-xs font-bold text-slate-700 flex items-center gap-1 font-mono">
                    <Clock className="h-3 w-3 text-aero-teal shrink-0" />
                    {quote.transit_time}
                  </span>
                  <div className="relative flex items-center justify-center w-full max-w-[100px] sm:max-w-[160px] my-1 sm:my-1.5">
                    <div className="h-0.5 w-full bg-slate-300" />
                    <div className="absolute flex h-5 w-5 items-center justify-center rounded-full bg-white border border-slate-400 text-aero-teal shadow-2xs">
                      <Plane className="h-3 w-3 rotate-45" />
                    </div>
                  </div>
                  <span className="text-[10px] sm:text-[11px] font-bold text-aero-teal">
                    {quote.routing_type}
                  </span>
                </div>

                {/* Arrival */}
                <div className="text-right">
                  <div className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                    Arrival
                  </div>
                  <div className="mt-0.5 flex items-baseline justify-end gap-1.5">
                    <span className="font-mono tabular-nums text-lg sm:text-xl font-black text-obsidian-900">
                      {quote.arrival_time.split(" ")[0]}
                    </span>
                    <span className="font-extrabold text-xs text-slate-700">{quote.destination}</span>
                  </div>
                  <div className="text-[11px] font-semibold text-slate-500 mt-0.5">
                    {quote.arrival_time.split(" ")[1] || "Local"}
                  </div>
                </div>
              </div>

              {/* Break-even Pivot Savings Highlight */}
              {quote.is_pivoted && (
                <div className="mt-3.5 relative">
                  <div
                    onClick={() =>
                      setActiveTooltipId(activeTooltipId === quote.id ? null : quote.id)
                    }
                    className="flex items-center justify-between rounded-xl bg-amber-50/80 px-3.5 py-2 text-xs font-bold text-amber-950 border border-amber-300 cursor-pointer hover:bg-amber-100 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <TrendingDown className="h-4 w-4 text-amber-700 shrink-0" />
                      <span>{quote.pivot_savings}</span>
                    </div>
                    <span className="text-[11px] text-amber-800 underline font-extrabold">
                      {activeTooltipId === quote.id ? "Hide Math" : "View Break-even Math"}
                    </span>
                  </div>

                  {activeTooltipId === quote.id && (
                    <div className="mt-1 rounded-xl bg-white p-3.5 text-xs text-slate-700 border border-amber-300 shadow-md">
                      <div className="font-bold text-obsidian-900 mb-1">
                        IATA TACT Break-Even Pivot Rule:
                      </div>
                      <p className="leading-relaxed">
                        Declaring the shipment at the higher slab minimum (e.g. 300 kg) at the carrier's
                        discounted tariff yields a lower total invoice than calculating at the natural weight tier.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Inline Carrier Override Mini Drawer */}
              {activeOverrideCardId === quote.id && (
                <div className="mt-3.5 p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-obsidian-900">
                      Individual Margin Override for {quote.carrier_name} ({quote.carrier_code})
                    </span>
                    <button
                      type="button"
                      onClick={() => setActiveOverrideCardId(null)}
                      className="text-slate-400 hover:text-slate-600 text-xs font-bold"
                    >
                      Close
                    </button>
                  </div>
                  <div className="flex flex-wrap items-center gap-2.5">
                    <select
                      value={overrideMode}
                      onChange={(e) => setOverrideMode(e.target.value as MarginMode)}
                      className="h-8 rounded-lg border border-slate-300 bg-white px-2.5 font-mono text-xs font-bold text-slate-800"
                    >
                      <option value="per_kg">₹ / kg</option>
                      <option value="percent">% Markup</option>
                      <option value="flat">₹ Flat</option>
                    </select>
                    <input
                      type="number"
                      value={overrideInputStr}
                      onChange={(e) => setOverrideInputStr(e.target.value)}
                      placeholder="e.g. 20"
                      className="h-8 w-24 rounded-lg border border-slate-300 bg-white px-2.5 font-mono text-xs font-bold text-slate-900"
                    />
                    <button
                      type="button"
                      onClick={() => handleApplyOverride(quote.id)}
                      className="rounded-lg bg-obsidian-900 px-3 py-1.5 font-bold text-white text-xs hover:bg-slate-800 cursor-pointer"
                    >
                      Apply Override
                    </button>
                    {hasCardOverride && (
                      <button
                        type="button"
                        onClick={() => handleRevertOverride(quote.id)}
                        className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-bold text-slate-600 text-xs hover:bg-slate-100 cursor-pointer"
                      >
                        Revert to Global
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Bottom Row: Cutoff & Specs (Left) + Actions (Right) */}
              <div className="mt-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                <div className="flex items-center gap-2.5 text-xs text-slate-600 font-semibold flex-wrap">
                  <span className="inline-flex items-center gap-1 text-amber-900 font-bold">
                    <Clock className="h-3 w-3" />
                    Cutoff: <strong>{quote.cargo_cutoff}</strong>
                  </span>
                  <span className="text-slate-300">&bull;</span>
                  <span>
                    Slab: <strong className="text-slate-800">{quote.weight_tier_applied}</strong>
                  </span>
                  <span className="text-slate-300">&bull;</span>
                  <span className="font-mono tabular-nums">
                    CW: <strong>{quote.chargeable_weight} kg</strong>
                  </span>
                  <span className="text-slate-300">&bull;</span>
                  <button
                    type="button"
                    onClick={() => handleOpenOverride(quote)}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-600 hover:text-obsidian-900 transition-colors cursor-pointer"
                  >
                    <SlidersHorizontal className="h-3 w-3 text-slate-400" />
                    <span>{hasCardOverride ? `Override: ${cardOverrides[quote.id].mode === 'per_kg' ? '₹' + cardOverrides[quote.id].value + '/kg' : cardOverrides[quote.id].mode === 'percent' ? cardOverrides[quote.id].value + '%' : '₹' + cardOverrides[quote.id].value}` : "Customize Carrier Margin"}</span>
                  </button>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 self-end sm:self-auto flex-wrap">
                  {/* Primary Quotation Copy Button */}
                  <button
                    type="button"
                    onClick={() => handleCopyQuote(quote)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:border-slate-400 focus-ring transition-colors cursor-pointer"
                    title={hasActiveMargin ? "Copy customer-facing quote with sell price" : "Copy buying rate quotation"}
                  >
                    {copiedId === quote.id ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-600" />
                        <span className="text-emerald-700 font-bold">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5 text-slate-500" />
                        <span>{hasActiveMargin ? "Copy Client Quote" : "Copy Quote"}</span>
                      </>
                    )}
                  </button>

                  {/* Secondary Internal Audit Copy Button (When Margin is Active) */}
                  {hasActiveMargin && (
                    <button
                      type="button"
                      onClick={() => handleCopyInternalAudit(quote)}
                      className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 focus-ring transition-colors cursor-pointer"
                      title="Copy internal audit sheet showing Buy Rate, Margin, and Sell Price"
                    >
                      {copiedAuditId === quote.id ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-emerald-600" />
                          <span className="text-emerald-700 font-bold">Audit Copied!</span>
                        </>
                      ) : (
                        <>
                          <FileText className="h-3.5 w-3.5 text-slate-500" />
                          <span>Audit Sheet</span>
                        </>
                      )}
                    </button>
                  )}

                  {/* Cost Breakdown Details Button */}
                  <button
                    type="button"
                    onClick={() => setSelectedQuote(quote)}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-obsidian-900 px-4 py-2 text-xs font-bold text-white hover:bg-aero-navy focus-ring transition-all shadow-xs cursor-pointer"
                  >
                    <Info className="h-3.5 w-3.5 text-amber-400" />
                    Cost Breakdown
                  </button>
                </div>
              </div>

              {/* Sub-line summary: Base + FSC + SSC + THC + Tax */}
              <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-slate-100 pt-2 text-[11px] font-semibold text-slate-500">
                <span>Base: {formatINR(quote.breakdown.base_freight_total)}</span>
                <span>&bull;</span>
                <span>Fuel (FSC): {formatINR(quote.breakdown.fsc_total)}</span>
                <span>&bull;</span>
                <span>Security: {formatINR(quote.breakdown.ssc_total)}</span>
                <span>&bull;</span>
                <span>Terminal THC: {formatINR(quote.breakdown.origin_thc_total)}</span>
                <span>&bull;</span>
                <span>GST 5%: {formatINR(quote.breakdown.gst_tax)}</span>
                <span className="ml-auto font-bold text-amber-800">
                  {hasActiveMargin
                    ? `Pure Buy Baseline: ${formatINR(quote.breakdown.total_landed_buy)}`
                    : "Zero Margin Applied"}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* 4. Cost Breakdown Modal */}
      <CostBreakdownModal
        quote={selectedQuote}
        marginInfo={selectedMarginInfo}
        onClose={() => setSelectedQuote(null)}
      />
    </div>
  );
}
