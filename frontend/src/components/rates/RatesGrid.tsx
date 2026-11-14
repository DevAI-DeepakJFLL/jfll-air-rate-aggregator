"use client";

import React, { useState } from "react";
import { RateQuoteItem } from "../../types/rate";
import { formatINR } from "../../lib/utils";
import { CostBreakdownModal } from "./CostBreakdownModal";
import { Clock, CheckCircle2, TrendingDown, Info } from "lucide-react";

interface RatesGridProps {
  rates: RateQuoteItem[];
}

export function RatesGrid({ rates }: RatesGridProps) {
  const [selectedQuote, setSelectedQuote] = useState<RateQuoteItem | null>(null);

  if (rates.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-bold text-gray-900">
          Ranked Airline Buying Tariffs ({rates.length} Options)
        </h3>
        <span className="text-xs text-gray-500">Sorted by lowest landed buying cost</span>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {rates.map((quote) => (
          <div
            key={quote.id}
            className={`relative rounded-2xl border p-5 shadow-sm transition-all hover:shadow-md ${
              quote.recommended
                ? "border-emerald-300 bg-emerald-50/20"
                : "border-gray-200 bg-white"
            }`}
          >
            {quote.recommended && (
              <div className="absolute -top-3 left-6 inline-flex items-center gap-1 rounded-full bg-emerald-700 px-3 py-0.5 text-xs font-bold text-white shadow-sm">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Lowest Buying Cost
              </div>
            )}

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              {/* Airline and Flight info */}
              <div className="space-y-1">
                <div className="flex items-center gap-3">
                  <span className="rounded-md bg-gray-900 px-2.5 py-1 text-xs font-bold text-white">
                    {quote.carrier_code}
                  </span>
                  <h4 className="text-lg font-bold text-gray-900">{quote.carrier_name}</h4>
                  <span className="text-xs font-medium text-gray-400">
                    AWB Prefix: {quote.airline_prefix}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs text-gray-600">
                  <span className="font-semibold text-jfll-blue">{quote.flight_number}</span>
                  <span>•</span>
                  <span>{quote.routing_type}</span>
                  <span>•</span>
                  <span>Transit: {quote.transit_time}</span>
                  <span>•</span>
                  <span className="inline-flex items-center gap-1 text-amber-800">
                    <Clock className="h-3 w-3" />
                    Cutoff: {quote.cargo_cutoff}
                  </span>
                </div>
              </div>

              {/* Pivot savings highlight */}
              {quote.is_pivoted && (
                <div className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-100 px-3 py-1.5 text-xs font-bold text-emerald-800 self-start md:self-center">
                  <TrendingDown className="h-4 w-4" />
                  {quote.pivot_savings}
                </div>
              )}

              {/* Pricing summary */}
              <div className="flex items-center justify-between md:justify-end gap-6 border-t md:border-t-0 pt-3 md:pt-0">
                <div className="text-right">
                  <div className="text-xs text-gray-500">Landed Buying Cost</div>
                  <div className="text-2xl font-black text-gray-900">
                    {formatINR(quote.breakdown.total_landed_buy)}
                  </div>
                  <div className="text-xs font-semibold text-emerald-700">
                    ₹{quote.breakdown.effective_buy_per_kg.toFixed(2)} / kg
                  </div>
                </div>

                <button
                  onClick={() => setSelectedQuote(quote)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-gray-300 bg-white px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50 hover:border-gray-400 shadow-sm transition-colors"
                >
                  <Info className="h-3.5 w-3.5 text-gray-500" />
                  Cost Breakdown
                </button>
              </div>
            </div>

            {/* Sub-line summary: Base + FSC + SSC + THC + Tax */}
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-gray-100 pt-2 text-[11px] text-gray-500">
              <span>Slab: {quote.weight_tier_applied}</span>
              <span>Base: {formatINR(quote.breakdown.base_freight_total)}</span>
              <span>Fuel (FSC): {formatINR(quote.breakdown.fsc_total)}</span>
              <span>Security (SSC): {formatINR(quote.breakdown.ssc_total)}</span>
              <span>Terminal: {formatINR(quote.breakdown.origin_thc_total)}</span>
              <span>GST (5%): {formatINR(quote.breakdown.gst_tax)}</span>
              <span className="font-semibold text-gray-700">Zero Margin Applied</span>
            </div>
          </div>
        ))}
      </div>

      <CostBreakdownModal quote={selectedQuote} onClose={() => setSelectedQuote(null)} />
    </div>
  );
}
