"use client";

import React, { useState, useMemo } from "react";
import { RateQuoteItem } from "../../types/rate";
import { formatINR } from "../../lib/utils";
import { CostBreakdownModal } from "./CostBreakdownModal";
import { CarrierBadge } from "./CarrierBadge";
import { AirlineLogo } from "./AirlineLogo";
import {
  Clock,
  CheckCircle2,
  TrendingDown,
  Info,
  Copy,
  Check,
  Plane,
  ArrowRight,
  Sparkles,
} from "lucide-react";

interface RatesGridProps {
  rates: RateQuoteItem[];
}

type FilterOption = "all" | "cheapest" | "fastest" | "direct";

export function RatesGrid({ rates }: RatesGridProps) {
  const [selectedQuote, setSelectedQuote] = useState<RateQuoteItem | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterOption>("all");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeTooltipId, setActiveTooltipId] = useState<string | null>(null);

  const directCount = useMemo(() => {
    return rates.filter((r) => r.routing_type.toLowerCase().includes("direct")).length;
  }, [rates]);

  const displayedRates = useMemo(() => {
    let result = [...rates];
    if (activeFilter === "direct") {
      result = result.filter((r) => r.routing_type.toLowerCase().includes("direct"));
    } else if (activeFilter === "fastest") {
      // DSA Optimization: O(1) integer comparison using precomputed transit_minutes
      result.sort((a, b) => (a.transit_minutes ?? 9999) - (b.transit_minutes ?? 9999));
    } else if (activeFilter === "cheapest") {
      // DSA Optimization: O(1) integer subtraction
      result.sort((a, b) => a.breakdown.total_landed_buy - b.breakdown.total_landed_buy);
    }
    return result;
  }, [rates, activeFilter]);

  const handleCopyQuote = (quote: RateQuoteItem) => {
    const text = [
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

    navigator.clipboard.writeText(text);
    setCopiedId(quote.id);
    setTimeout(() => setCopiedId(null), 2200);
  };

  if (rates.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4 font-sans">
      {/* Header with Filter Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3.5">
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

      {/* Cards List */}
      <div className="space-y-4">
        {displayedRates.map((quote) => (
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

                {/* Landed Buy Price Block */}
                <div className="text-left sm:text-right shrink-0">
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
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2.5 self-end sm:self-auto">
                <button
                  type="button"
                  onClick={() => handleCopyQuote(quote)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:border-slate-400 focus-ring transition-colors cursor-pointer"
                  title="Copy formatted quotation for WhatsApp or Email"
                >
                  {copiedId === quote.id ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-600" />
                      <span className="text-emerald-700 font-bold">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5 text-slate-500" />
                      <span>Copy Quote</span>
                    </>
                  )}
                </button>

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
              <span className="ml-auto font-bold text-amber-800">Zero Margin Applied</span>
            </div>
          </div>
        ))}
      </div>

      <CostBreakdownModal quote={selectedQuote} onClose={() => setSelectedQuote(null)} />
    </div>
  );
}
