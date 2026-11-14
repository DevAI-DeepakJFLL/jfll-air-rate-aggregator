"use client";

import React, { useState, useMemo } from "react";
import { RateQuoteItem } from "../../types/rate";
import { formatINR } from "../../lib/utils";
import { CostBreakdownModal } from "./CostBreakdownModal";
import { CarrierBadge } from "./CarrierBadge";
import {
  Clock,
  CheckCircle2,
  TrendingDown,
  Info,
  Copy,
  Check,
  Plane,
  ArrowRight,
  Filter,
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

  // Direct count
  const directCount = useMemo(() => {
    return rates.filter((r) => r.routing_type.toLowerCase().includes("direct")).length;
  }, [rates]);

  // Filtered & sorted rates
  const displayedRates = useMemo(() => {
    let result = [...rates];
    if (activeFilter === "direct") {
      result = result.filter((r) => r.routing_type.toLowerCase().includes("direct"));
    } else if (activeFilter === "fastest") {
      // Extract numeric hours from transit string e.g. "3h 15m" or "17h 25m"
      result.sort((a, b) => {
        const getMinutes = (str: string) => {
          const h = str.match(/(\d+)\s*h/i);
          const m = str.match(/(\d+)\s*m/i);
          return (h ? parseInt(h[1], 10) * 60 : 0) + (m ? parseInt(m[1], 10) : 0);
        };
        return getMinutes(a.transit_time) - getMinutes(b.transit_time);
      });
    } else if (activeFilter === "cheapest") {
      result.sort((a, b) => a.breakdown.total_landed_buy - b.breakdown.total_landed_buy);
    }
    return result;
  }, [rates, activeFilter]);

  // 1-Click Copy Quote Summary to Clipboard
  const handleCopyQuote = (quote: RateQuoteItem) => {
    const text = [
      `✈ AIR CARGO BUYING TARIFF | JET FREIGHT LOGISTICS`,
      `Route: ${quote.origin} → ${quote.destination} (${quote.flight_number})`,
      `Carrier: ${quote.carrier_name} (${quote.carrier_code})`,
      `Service: ${quote.routing_type} • Transit: ${quote.transit_time}`,
      `Chargeable Weight: ${quote.chargeable_weight} kg (${quote.weight_tier_applied})`,
      `Base Freight: ₹${quote.breakdown.base_rate_per_kg}/kg (Total: ${formatINR(quote.breakdown.base_freight_total)})`,
      `Fuel (FSC): ${formatINR(quote.breakdown.fsc_total)} | Security (SSC): ${formatINR(quote.breakdown.ssc_total)}`,
      `Origin THC & X-Ray: ${formatINR(quote.breakdown.origin_thc_total)} | AWB: ${formatINR(quote.breakdown.awb_fee)}`,
      `-----------------------------------------`,
      `TOTAL LANDED BUY COST: ${formatINR(quote.breakdown.total_landed_buy)}`,
      `EFFECTIVE RATE / KG: ₹${quote.breakdown.effective_buy_per_kg.toFixed(2)} / kg`,
      `Cutoff: ${quote.cargo_cutoff}`,
      `*Zero commercial margin applied. Internal use only.`,
    ].join("\n");

    navigator.clipboard.writeText(text);
    setCopiedId(quote.id);
    setTimeout(() => setCopiedId(null), 2200);
  };

  if (rates.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Search Header Bar with Filter Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div>
          <h3 className="text-base font-extrabold text-slate-900">
            Available Airline Tariffs ({displayedRates.length} Results)
          </h3>
          <p className="text-xs font-semibold text-slate-600">
            Pure buying rates from BOM airport circulars &bull; Sorted by lowest cost
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5" role="tablist" aria-label="Tariff filter options">
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
              className={`rounded-full px-3 py-1.5 text-xs font-bold transition-all cursor-pointer focus-ring ${
                activeFilter === tab.id
                  ? "bg-slate-900 text-white shadow-xs"
                  : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-100"
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
            className={`relative rounded-2xl border p-5 sm:p-6 transition-all duration-150 bg-white shadow-xs hover:shadow-md ${
              quote.recommended
                ? "border-emerald-300 ring-2 ring-emerald-500/10"
                : "border-slate-200 hover:border-jfll-blue"
            }`}
          >
            {/* Top Recommended Tag */}
            {quote.recommended && (
              <div className="absolute -top-3 left-6 inline-flex items-center gap-1 rounded-full bg-emerald-700 px-3 py-0.5 text-xs font-bold text-white shadow-xs">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-200" />
                Lowest Buying Cost
              </div>
            )}

            {/* Top Row: Carrier Branding & Flight Header (Left) + Landed Price (Right) */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-3.5 border-b border-slate-100">
              <div className="flex items-center gap-3.5 min-w-0">
                <CarrierBadge carrierCode={quote.carrier_code} carrierName={quote.carrier_name} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-extrabold text-base text-slate-900 tracking-tight">
                      {quote.carrier_name}
                    </h4>
                    <span className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-[11px] font-bold text-slate-700">
                      AWB {quote.airline_prefix}
                    </span>
                  </div>
                  <div className="mt-0.5 flex items-center gap-2 text-xs text-slate-600 font-semibold flex-wrap">
                    <span>
                      Flight <strong className="font-mono text-slate-900">{quote.flight_number}</strong>
                    </span>
                    <span className="text-slate-300">&bull;</span>
                    <span>{quote.cargo_category}</span>
                    <span className="text-slate-300">&bull;</span>
                    <span className="text-jfll-blue font-bold">{quote.routing_type}</span>
                  </div>
                </div>
              </div>

              {/* Price Hero */}
              <div className="flex sm:flex-col items-baseline sm:items-end justify-between sm:justify-start pt-2 sm:pt-0 border-t sm:border-0 border-slate-100 shrink-0">
                <div className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  Total Landed Buy
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span className="font-mono tabular-nums text-2xl font-black text-slate-900 tracking-tight">
                    {formatINR(quote.breakdown.total_landed_buy)}
                  </span>
                  <span className="text-[11px] font-bold text-slate-600">all-in</span>
                </div>
                <div className="text-xs font-bold text-emerald-700 font-mono tabular-nums">
                  ₹{quote.breakdown.effective_buy_per_kg.toFixed(2)} / kg
                </div>
              </div>
            </div>

            {/* Center: 3-Column Timetable Journey Flow (Benchmark Style) */}
            <div className="grid grid-cols-3 items-center gap-3 sm:gap-6 py-4 border-b border-slate-100">
              {/* Departure Column */}
              <div>
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Departure
                </div>
                <div className="mt-0.5 flex items-baseline gap-1.5">
                  <span className="font-mono tabular-nums text-lg sm:text-xl font-black text-slate-900">
                    {quote.departure_time.split(" ")[0]}
                  </span>
                  <span className="font-extrabold text-xs text-slate-700">{quote.origin}</span>
                </div>
                <div className="text-[11px] font-semibold text-slate-600 mt-0.5">
                  {quote.departure_time.split(" ")[1] || "IST"}
                </div>
              </div>

              {/* Transit Flight Path & Airplane Icon */}
              <div className="flex flex-col items-center justify-center text-center px-1">
                <span className="text-[10px] sm:text-xs font-bold text-slate-700 flex items-center gap-1">
                  <Clock className="h-3 w-3 text-jfll-blue shrink-0" />
                  {quote.transit_time}
                </span>
                <div className="relative flex items-center justify-center w-full max-w-[100px] sm:max-w-[160px] my-1 sm:my-1.5">
                  <div className="h-0.5 w-full bg-slate-300" />
                  <div className="absolute flex h-5 w-5 items-center justify-center rounded-full bg-white border border-slate-400 text-jfll-blue shadow-2xs">
                    <Plane className="h-3 w-3 rotate-45" />
                  </div>
                </div>
                <span className="text-[10px] sm:text-[11px] font-bold text-jfll-blue">
                  {quote.routing_type}
                </span>
              </div>

              {/* Arrival Column */}
              <div className="text-right">
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Arrival
                </div>
                <div className="mt-0.5 flex items-baseline justify-end gap-1.5">
                  <span className="font-mono tabular-nums text-lg sm:text-xl font-black text-slate-900">
                    {quote.arrival_time.split(" ")[0]}
                  </span>
                  <span className="font-extrabold text-xs text-slate-700">{quote.destination}</span>
                </div>
                <div className="text-[11px] font-semibold text-slate-600 mt-0.5">
                  {quote.arrival_time.split(" ")[1] || "Local"}
                </div>
              </div>
            </div>

            {/* Break-even Pivot Savings Highlight Banner with interactive math explainer */}
            {quote.is_pivoted && (
              <div className="mt-3.5 relative">
                <div
                  onClick={() =>
                    setActiveTooltipId(activeTooltipId === quote.id ? null : quote.id)
                  }
                  className="flex items-center justify-between rounded-xl bg-emerald-50 px-3.5 py-2 text-xs font-bold text-emerald-900 border border-emerald-200 cursor-pointer hover:bg-emerald-100/80 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <TrendingDown className="h-4 w-4 text-emerald-700 shrink-0" />
                    <span>{quote.pivot_savings}</span>
                  </div>
                  <span className="text-[11px] text-emerald-700 underline font-semibold">
                    {activeTooltipId === quote.id ? "Hide Break-even Math" : "View Break-even Math"}
                  </span>
                </div>

                {/* Math Explainer Dropdown */}
                {activeTooltipId === quote.id && (
                  <div className="mt-1 rounded-xl bg-white p-3.5 text-xs text-slate-700 border border-emerald-200 shadow-md animate-in fade-in duration-150">
                    <div className="font-bold text-slate-900 mb-1">IATA Break-Even Pivot Rule:</div>
                    <p className="leading-relaxed">
                      Declaring shipment as the higher minimum weight slab (e.g. 300 kg) at the
                      carrier’s discounted slab rate produces a lower total freight invoice than
                      billing at the natural weight tier.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Bottom Row: Cutoff & Specs (Left) + Actions (Right) */}
            <div className="mt-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
              <div className="flex items-center gap-2.5 text-xs text-slate-600 font-semibold flex-wrap">
                <span className="inline-flex items-center gap-1 text-amber-800">
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

              {/* Action Buttons: Copy Quote + Cost Breakdown */}
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
                  className="inline-flex items-center gap-1.5 rounded-xl bg-jfll-blue px-4 py-2 text-xs font-bold text-white hover:bg-jfll-navy focus-ring transition-colors shadow-xs cursor-pointer"
                >
                  <Info className="h-3.5 w-3.5" />
                  Cost Breakdown
                </button>
              </div>
            </div>

            {/* Sub-line summary: Base + FSC + SSC + THC + Tax */}
            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-slate-100 pt-2 text-[11px] font-semibold text-slate-600">
              <span>Base: {formatINR(quote.breakdown.base_freight_total)}</span>
              <span>&bull;</span>
              <span>Fuel (FSC): {formatINR(quote.breakdown.fsc_total)}</span>
              <span>&bull;</span>
              <span>Security (SSC): {formatINR(quote.breakdown.ssc_total)}</span>
              <span>&bull;</span>
              <span>Terminal: {formatINR(quote.breakdown.origin_thc_total)}</span>
              <span>&bull;</span>
              <span>GST 5%: {formatINR(quote.breakdown.gst_tax)}</span>
              <span className="ml-auto font-bold text-emerald-700">Zero Margin Applied</span>
            </div>
          </div>
        ))}
      </div>

      <CostBreakdownModal quote={selectedQuote} onClose={() => setSelectedQuote(null)} />
    </div>
  );
}
