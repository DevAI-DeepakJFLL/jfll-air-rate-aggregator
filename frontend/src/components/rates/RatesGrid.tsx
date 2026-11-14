"use client";

import React, { useState, useMemo } from "react";
import { RateQuoteItem } from "../../types/rate";
import { formatINR } from "../../lib/utils";
import { CostBreakdownModal, MarginInfo } from "./CostBreakdownModal";
import { CarrierBadge } from "./CarrierBadge";
import { AirlineLogo } from "./AirlineLogo";
import { MarginControllerBar, MarginMode } from "./MarginControllerBar";
import {
  Clock,
  TrendingDown,
  Info,
  Copy,
  Check,
  Plane,
  Sparkles,
  SlidersHorizontal,
  FileText,
  ChevronDown,
  ChevronUp,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Zap,
} from "lucide-react";

interface RatesGridProps {
  rates: RateQuoteItem[];
}

type FilterOption = "all" | "cheapest" | "fastest" | "direct";
type SortField = "price" | "carrier" | "transit" | "cutoff";
type SortDirection = "asc" | "desc";

interface CardMarginOverride {
  mode: MarginMode;
  value: number;
}

export function RatesGrid({ rates }: RatesGridProps) {
  const [selectedQuote, setSelectedQuote] = useState<RateQuoteItem | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterOption>("all");
  const [sortField, setSortField] = useState<SortField>("price");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedAuditId, setCopiedAuditId] = useState<string | null>(null);

  // Pricing Coordinator Margin State
  const [marginMode, setMarginMode] = useState<MarginMode>("per_kg");
  const [marginInputStr, setMarginInputStr] = useState<string>("");
  const [cardOverrides, setCardOverrides] = useState<Record<string, CardMarginOverride>>({});

  // Inline Row Override Drawer State
  const [activeOverrideRowId, setActiveOverrideRowId] = useState<string | null>(null);
  const [overrideMode, setOverrideMode] = useState<MarginMode>("per_kg");
  const [overrideInputStr, setOverrideInputStr] = useState<string>("");

  const globalMarginNum = parseFloat(marginInputStr) || 0;

  // DSA Optimization: Precomputed Margin Map (O(M) single-pass)
  // Provides O(1) margin and sell price lookups per table row
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
    setActiveOverrideRowId(null);
  };

  const handleOpenOverride = (quote: RateQuoteItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (activeOverrideRowId === quote.id) {
      setActiveOverrideRowId(null);
      return;
    }
    const current = cardOverrides[quote.id];
    setOverrideMode(current ? current.mode : marginMode);
    setOverrideInputStr(current ? current.value.toString() : (globalMarginNum > 0 ? globalMarginNum.toString() : ""));
    setActiveOverrideRowId(quote.id);
    setExpandedRowId(quote.id); // Also expand details to make override visible
  };

  const handleApplyOverride = (quoteId: string) => {
    const val = parseFloat(overrideInputStr);
    if (!isNaN(val) && val > 0) {
      setCardOverrides((prev) => ({
        ...prev,
        [quoteId]: { mode: overrideMode, value: val },
      }));
    } else {
      setCardOverrides((prev) => {
        const next = { ...prev };
        delete next[quoteId];
        return next;
      });
    }
    setActiveOverrideRowId(null);
  };

  const handleRevertOverride = (quoteId: string) => {
    setCardOverrides((prev) => {
      const next = { ...prev };
      delete next[quoteId];
      return next;
    });
    setActiveOverrideRowId(null);
  };

  const toggleRowExpansion = (quoteId: string) => {
    setExpandedRowId((prev) => (prev === quoteId ? null : quoteId));
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  // Copy customer-facing quotation
  const handleCopyQuote = (quote: RateQuoteItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
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
  const handleCopyInternalAudit = (quote: RateQuoteItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
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

  // Helper to get effective price for sorting
  const getEffectivePrice = (item: RateQuoteItem) => {
    const m = marginMap.get(item.id);
    return m ? m.sellTotal : item.breakdown.total_landed_buy;
  };

  // DSA Optimization: Filter & Multi-column Sort Pipeline
  const displayedRates = useMemo(() => {
    // 1. Filter
    let filtered = rates;
    if (activeFilter === "direct") {
      filtered = rates.filter((r) => r.routing_type.toLowerCase().includes("direct"));
    }

    // 2. Sort
    const sorted = [...filtered].sort((a, b) => {
      let comparison = 0;
      if (sortField === "price") {
        comparison = getEffectivePrice(a) - getEffectivePrice(b);
      } else if (sortField === "carrier") {
        comparison = a.carrier_name.localeCompare(b.carrier_name);
      } else if (sortField === "transit") {
        comparison = (a.transit_minutes ?? 9999) - (b.transit_minutes ?? 9999);
      } else if (sortField === "cutoff") {
        comparison = a.cargo_cutoff.localeCompare(b.cargo_cutoff);
      }

      return sortDirection === "asc" ? comparison : -comparison;
    });

    if (activeFilter === "cheapest") {
      sorted.sort((a, b) => getEffectivePrice(a) - getEffectivePrice(b));
    } else if (activeFilter === "fastest") {
      sorted.sort((a, b) => (a.transit_minutes ?? 9999) - (b.transit_minutes ?? 9999));
    }

    return sorted;
  }, [rates, activeFilter, sortField, sortDirection, marginMap]);

  const directCount = useMemo(() => {
    return rates.filter((r) => r.routing_type.toLowerCase().includes("direct")).length;
  }, [rates]);

  // Quick stats computed in O(N)
  const stats = useMemo(() => {
    if (rates.length === 0) return null;
    let minBuy = Infinity;
    let minSell = Infinity;
    let fastestMinutes = Infinity;
    let bestCarrier = "";

    for (const r of rates) {
      if (r.breakdown.total_landed_buy < minBuy) {
        minBuy = r.breakdown.total_landed_buy;
        bestCarrier = r.carrier_name;
      }
      const m = marginMap.get(r.id);
      const effectiveSell = m ? m.sellTotal : r.breakdown.total_landed_buy;
      if (effectiveSell < minSell) {
        minSell = effectiveSell;
      }
      if (r.transit_minutes && r.transit_minutes < fastestMinutes) {
        fastestMinutes = r.transit_minutes;
      }
    }

    return {
      minBuy,
      minSell,
      bestCarrier,
      fastestHours: fastestMinutes < Infinity ? `${Math.floor(fastestMinutes / 60)}h ${fastestMinutes % 60}m` : "N/A",
    };
  }, [rates, marginMap]);

  if (rates.length === 0) {
    return null;
  }

  const selectedMarginInfo = selectedQuote ? getQuoteMargin(selectedQuote) : null;
  const isGlobalMarginActive = globalMarginNum > 0 || Object.keys(cardOverrides).length > 0;

  return (
    <div className="space-y-4 font-sans">
      {/* 1. Pricing Coordinator Margin Controller Bar (Trading Cockpit) */}
      <MarginControllerBar
        marginMode={marginMode}
        onMarginModeChange={setMarginMode}
        marginInputStr={marginInputStr}
        onMarginInputChange={setMarginInputStr}
        hasActiveOverrides={Object.keys(cardOverrides).length > 0}
        onResetMargins={handleResetMargins}
      />

      {/* 2. Header: Table Filter Controls & Quick Stats Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3 pt-1">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-extrabold text-obsidian-900 tracking-tight">
              Airline Comparison Table
            </h3>
            <span className="rounded-full bg-slate-200/80 px-2.5 py-0.5 font-mono text-[11px] font-bold text-slate-700">
              {displayedRates.length} tariffs
            </span>
            {stats && (
              <span className="hidden md:inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800 border border-emerald-200">
                <Zap className="h-3 w-3 text-emerald-600" />
                Lowest Buy: {formatINR(stats.minBuy)} ({stats.bestCarrier})
              </span>
            )}
          </div>
          <p className="text-xs font-semibold text-slate-500 mt-0.5">
            Compare pure net buy vs client sell price side-by-side across all active BOM circulars
          </p>
        </div>

        {/* Quick Filter Buttons */}
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
              onClick={() => {
                setActiveFilter(tab.id as FilterOption);
                if (tab.id === "cheapest") {
                  setSortField("price");
                  setSortDirection("asc");
                } else if (tab.id === "fastest") {
                  setSortField("transit");
                  setSortDirection("asc");
                }
              }}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all cursor-pointer focus-ring ${
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

      {/* 3. High-Density Tariff Comparison Table */}
      <div className="rounded-2xl border border-slate-200/90 bg-white shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/90 text-slate-600 font-extrabold text-[11px] uppercase tracking-wider select-none">
                {/* Airline & Flight */}
                <th
                  scope="col"
                  className="py-3 px-4 font-extrabold cursor-pointer hover:text-obsidian-900 transition-colors"
                  onClick={() => handleSort("carrier")}
                >
                  <div className="flex items-center gap-1.5">
                    <span>Carrier / Flight</span>
                    {sortField === "carrier" ? (
                      sortDirection === "asc" ? (
                        <ArrowUp className="h-3 w-3 text-obsidian-900" />
                      ) : (
                        <ArrowDown className="h-3 w-3 text-obsidian-900" />
                      )
                    ) : (
                      <ArrowUpDown className="h-3 w-3 text-slate-400" />
                    )}
                  </div>
                </th>

                {/* Schedule & Transit */}
                <th
                  scope="col"
                  className="py-3 px-3.5 font-extrabold cursor-pointer hover:text-obsidian-900 transition-colors"
                  onClick={() => handleSort("transit")}
                >
                  <div className="flex items-center gap-1.5">
                    <span>Flight Schedule</span>
                    {sortField === "transit" ? (
                      sortDirection === "asc" ? (
                        <ArrowUp className="h-3 w-3 text-obsidian-900" />
                      ) : (
                        <ArrowDown className="h-3 w-3 text-obsidian-900" />
                      )
                    ) : (
                      <ArrowUpDown className="h-3 w-3 text-slate-400" />
                    )}
                  </div>
                </th>

                {/* Acceptance Cutoff */}
                <th
                  scope="col"
                  className="py-3 px-3 font-extrabold cursor-pointer hover:text-obsidian-900 transition-colors whitespace-nowrap"
                  onClick={() => handleSort("cutoff")}
                >
                  <div className="flex items-center gap-1.5">
                    <span>Cutoff</span>
                    {sortField === "cutoff" ? (
                      sortDirection === "asc" ? (
                        <ArrowUp className="h-3 w-3 text-obsidian-900" />
                      ) : (
                        <ArrowDown className="h-3 w-3 text-obsidian-900" />
                      )
                    ) : (
                      <ArrowUpDown className="h-3 w-3 text-slate-400" />
                    )}
                  </div>
                </th>

                {/* Rating Slab */}
                <th scope="col" className="py-3 px-3 font-extrabold whitespace-nowrap">
                  Rating Tier
                </th>

                {/* Net Landed Buy Rate (Internal Baseline) */}
                <th
                  scope="col"
                  className="py-3 px-3.5 font-extrabold cursor-pointer hover:text-obsidian-900 transition-colors text-right"
                  onClick={() => handleSort("price")}
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>Net Buy Rate</span>
                    {sortField === "price" && !isGlobalMarginActive ? (
                      sortDirection === "asc" ? (
                        <ArrowUp className="h-3 w-3 text-obsidian-900" />
                      ) : (
                        <ArrowDown className="h-3 w-3 text-obsidian-900" />
                      )
                    ) : (
                      <ArrowUpDown className="h-3 w-3 text-slate-400" />
                    )}
                  </div>
                </th>

                {/* Client Selling Price (Hero or Pure Buy Indicator) */}
                <th
                  scope="col"
                  className="py-3 px-4 font-extrabold text-right cursor-pointer hover:text-obsidian-900 transition-colors bg-amber-50/40"
                  onClick={() => handleSort("price")}
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span className="text-obsidian-900 font-black">
                      {isGlobalMarginActive ? "Client Selling Price" : "Commercial Price"}
                    </span>
                    {sortField === "price" && isGlobalMarginActive && (
                      sortDirection === "asc" ? (
                        <ArrowUp className="h-3 w-3 text-obsidian-900" />
                      ) : (
                        <ArrowDown className="h-3 w-3 text-obsidian-900" />
                      )
                    )}
                  </div>
                </th>

                {/* Actions */}
                <th scope="col" className="py-3 px-4 text-center font-extrabold whitespace-nowrap">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {displayedRates.map((quote, idx) => {
                const margin = getQuoteMargin(quote);
                const hasCardOverride = !!cardOverrides[quote.id];
                const hasActiveMargin = margin !== null && margin.totalMargin > 0;
                const isExpanded = expandedRowId === quote.id;
                const isOverrideActive = activeOverrideRowId === quote.id;

                return (
                  <React.Fragment key={quote.id}>
                    <tr
                      onClick={() => toggleRowExpansion(quote.id)}
                      className={`group transition-colors cursor-pointer ${
                        quote.recommended
                          ? "bg-amber-50/25 hover:bg-amber-50/50"
                          : idx % 2 === 1
                          ? "bg-slate-50/30 hover:bg-slate-50/80"
                          : "bg-white hover:bg-slate-50/80"
                      } ${isExpanded ? "border-b-transparent bg-slate-50/60" : ""}`}
                    >
                      {/* Column 1: Airline & Flight Info */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2.5">
                          <CarrierBadge
                            carrierCode={quote.carrier_code}
                            carrierName={quote.carrier_name}
                            size="sm"
                          />
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-extrabold text-obsidian-900 text-xs">
                                {quote.carrier_name}
                              </span>
                              {quote.recommended && (
                                <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-100 px-1.5 py-0.2 text-[9px] font-black text-amber-900 border border-amber-300">
                                  <Sparkles className="h-2.5 w-2.5 text-amber-700" />
                                  Best Buy
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 font-mono mt-0.5">
                              <span className="font-bold text-slate-700">{quote.flight_number}</span>
                              <span className="text-slate-300">&bull;</span>
                              <span>AWB {quote.airline_prefix}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Column 2: Schedule & Transit */}
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        <div>
                          <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-obsidian-900">
                            <span>{quote.departure_time.split(" ")[0]}</span>
                            <span className="text-slate-400">→</span>
                            <span>{quote.arrival_time.split(" ")[0]}</span>
                          </div>
                          <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-500 mt-0.5">
                            <Clock className="h-3 w-3 text-aero-teal shrink-0" />
                            <span>{quote.transit_time}</span>
                            <span className="text-slate-300">&bull;</span>
                            <span className="font-bold text-aero-teal">{quote.routing_type}</span>
                          </div>
                        </div>
                      </td>

                      {/* Column 3: BOM Cutoff */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="font-mono text-xs font-bold text-amber-950">
                          {quote.cargo_cutoff}
                        </div>
                        <div className="text-[10px] font-semibold text-slate-400">
                          BOM Hub Acceptance
                        </div>
                      </td>

                      {/* Column 4: Weight Slab & Pivot */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-xs font-bold text-slate-800">
                            {quote.weight_tier_applied}
                          </span>
                          <span className="text-[10px] font-semibold text-slate-500">
                            ({quote.chargeable_weight} kg)
                          </span>
                        </div>
                        {quote.is_pivoted && (
                          <div className="inline-flex items-center gap-1 rounded bg-amber-100/90 px-1.5 py-0.5 text-[10px] font-extrabold text-amber-900 mt-0.5">
                            <TrendingDown className="h-2.5 w-2.5 text-amber-700" />
                            <span>Pivot Savings</span>
                          </div>
                        )}
                      </td>

                      {/* Column 5: Net Buy Baseline Rate */}
                      <td className="py-3 px-3.5 text-right whitespace-nowrap">
                        <div className="font-mono tabular-nums text-xs font-extrabold text-slate-800">
                          ₹{quote.breakdown.effective_buy_per_kg.toFixed(2)}{" "}
                          <span className="text-[10px] font-semibold text-slate-500">/ kg</span>
                        </div>
                        <div className="font-mono tabular-nums text-[11px] font-bold text-slate-500 mt-0.5">
                          Total {formatINR(quote.breakdown.total_landed_buy)}
                        </div>
                      </td>

                      {/* Column 6: Client Selling Price / Margin Hero */}
                      <td className="py-3 px-4 text-right whitespace-nowrap bg-amber-50/20">
                        {hasActiveMargin ? (
                          <div>
                            <div className="flex items-center justify-end gap-1">
                              <span className="font-mono tabular-nums text-sm font-black text-obsidian-900 tracking-tight">
                                {formatINR(margin.sellTotal)}
                              </span>
                              {hasCardOverride && (
                                <span className="rounded bg-amber-200/90 px-1 py-0.2 text-[9px] font-black text-amber-950">
                                  Override
                                </span>
                              )}
                            </div>
                            <div className="font-mono tabular-nums text-xs font-extrabold text-emerald-700 mt-0.5">
                              ₹{margin.sellPerKg.toFixed(2)} / kg
                            </div>
                            <div className="text-[10px] font-extrabold text-slate-500 font-mono">
                              Profit: +{formatINR(margin.totalMargin)}
                            </div>
                          </div>
                        ) : (
                          <div>
                            <div className="font-mono tabular-nums text-xs font-bold text-slate-400">
                              Zero Margin
                            </div>
                            <div className="font-mono tabular-nums text-[11px] font-semibold text-slate-400 mt-0.5">
                              {formatINR(quote.breakdown.total_landed_buy)} (Buy)
                            </div>
                            <button
                              type="button"
                              onClick={(e) => handleOpenOverride(quote, e)}
                              className="text-[10px] font-bold text-aero-teal hover:underline mt-0.5"
                            >
                              + Add Margin
                            </button>
                          </div>
                        )}
                      </td>

                      {/* Column 7: Fast Actions */}
                      <td className="py-3 px-4 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Copy Customer Quote */}
                          <button
                            type="button"
                            onClick={(e) => handleCopyQuote(quote, e)}
                            title={hasActiveMargin ? "Copy client quote with selling price" : "Copy buy rate quotation"}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:border-slate-400 focus-ring transition-colors shadow-2xs cursor-pointer"
                          >
                            {copiedId === quote.id ? (
                              <>
                                <Check className="h-3 w-3 text-emerald-600" />
                                <span className="text-[11px] text-emerald-700 font-extrabold">Copied!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="h-3 w-3 text-slate-500" />
                                <span className="text-[11px]">{hasActiveMargin ? "Quote" : "Copy"}</span>
                              </>
                            )}
                          </button>

                          {/* Copy Internal Audit Sheet (when margin applied) */}
                          {hasActiveMargin && (
                            <button
                              type="button"
                              onClick={(e) => handleCopyInternalAudit(quote, e)}
                              title="Copy internal audit sheet (Buy Cost + Margin = Sell Price)"
                              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 focus-ring transition-colors shadow-2xs cursor-pointer"
                            >
                              {copiedAuditId === quote.id ? (
                                <Check className="h-3 w-3 text-emerald-600" />
                              ) : (
                                <FileText className="h-3 w-3 text-slate-500" />
                              )}
                              <span className="text-[11px]">Audit</span>
                            </button>
                          )}

                          {/* Cost Breakdown Modal Trigger */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedQuote(quote);
                            }}
                            title="Open detailed line-item cost breakdown"
                            className="inline-flex items-center justify-center h-7 w-7 rounded-lg bg-obsidian-900 text-amber-400 hover:bg-aero-navy transition-colors focus-ring shadow-2xs cursor-pointer"
                          >
                            <Info className="h-3.5 w-3.5" />
                          </button>

                          {/* Row Details Expansion Toggle */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleRowExpansion(quote.id);
                            }}
                            title={isExpanded ? "Collapse row details" : "Expand row details"}
                            className="inline-flex items-center justify-center h-7 w-7 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 transition-colors focus-ring shadow-2xs cursor-pointer"
                          >
                            {isExpanded ? (
                              <ChevronUp className="h-3.5 w-3.5" />
                            ) : (
                              <ChevronDown className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* Expandable Sub-Row (Drill-Down Drawer) */}
                    {isExpanded && (
                      <tr className="bg-slate-50/90 border-b border-slate-200">
                        <td colSpan={7} className="p-4 sm:p-5">
                          <div className="space-y-4">
                            {/* Sub-row Header & API Status */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/80 pb-2.5">
                              <div className="flex items-center gap-2">
                                <span className="font-extrabold text-obsidian-900 text-xs">
                                  {quote.carrier_name} ({quote.carrier_code}) &bull; Flight {quote.flight_number}
                                </span>
                                <span className="rounded bg-slate-200 px-1.5 py-0.5 font-mono text-[10px] font-bold text-slate-700">
                                  Rate Basis: {quote.rate_basis}
                                </span>
                                <span className="inline-flex items-center gap-1 rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800">
                                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-pulse" />
                                  Live API Feed
                                </span>
                              </div>

                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={(e) => handleOpenOverride(quote, e)}
                                  className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors shadow-2xs"
                                >
                                  <SlidersHorizontal className="h-3 w-3 text-slate-500" />
                                  <span>
                                    {hasCardOverride
                                      ? `Override: ${cardOverrides[quote.id].mode === "per_kg" ? "₹" + cardOverrides[quote.id].value + "/kg" : cardOverrides[quote.id].mode === "percent" ? cardOverrides[quote.id].value + "%" : "₹" + cardOverrides[quote.id].value}`
                                      : "Custom Airline Margin"}
                                  </span>
                                </button>
                              </div>
                            </div>

                            {/* Inline Carrier Override Editor (If Open) */}
                            {isOverrideActive && (
                              <div className="p-3.5 rounded-xl bg-white border border-slate-300 shadow-sm space-y-2">
                                <div className="flex items-center justify-between">
                                  <span className="font-extrabold text-obsidian-900 text-xs">
                                    Set Custom Margin for {quote.carrier_name}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => setActiveOverrideRowId(null)}
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
                                    Save Override
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

                            {/* Itemized Surcharges Grid */}
                            <div>
                              <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-2">
                                Landed Buying Cost Line Items (BOM Terminal)
                              </div>
                              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
                                <div className="rounded-xl border border-slate-200 bg-white p-2 text-center">
                                  <div className="text-[10px] font-semibold text-slate-500">Base Freight</div>
                                  <div className="font-mono font-bold text-xs text-slate-800 mt-0.5">
                                    {formatINR(quote.breakdown.base_freight_total)}
                                  </div>
                                  <div className="text-[9px] text-slate-400 font-mono">
                                    ₹{quote.breakdown.base_rate_per_kg}/kg
                                  </div>
                                </div>
                                <div className="rounded-xl border border-slate-200 bg-white p-2 text-center">
                                  <div className="text-[10px] font-semibold text-slate-500">Fuel (FSC)</div>
                                  <div className="font-mono font-bold text-xs text-slate-800 mt-0.5">
                                    {formatINR(quote.breakdown.fsc_total)}
                                  </div>
                                  <div className="text-[9px] text-slate-400 font-mono">
                                    ₹{quote.breakdown.fsc_rate_per_kg}/kg
                                  </div>
                                </div>
                                <div className="rounded-xl border border-slate-200 bg-white p-2 text-center">
                                  <div className="text-[10px] font-semibold text-slate-500">Security (SSC)</div>
                                  <div className="font-mono font-bold text-xs text-slate-800 mt-0.5">
                                    {formatINR(quote.breakdown.ssc_total)}
                                  </div>
                                  <div className="text-[9px] text-slate-400 font-mono">
                                    ₹{quote.breakdown.ssc_rate_per_kg}/kg
                                  </div>
                                </div>
                                <div className="rounded-xl border border-slate-200 bg-white p-2 text-center">
                                  <div className="text-[10px] font-semibold text-slate-500">MIAL THC</div>
                                  <div className="font-mono font-bold text-xs text-slate-800 mt-0.5">
                                    {formatINR(quote.breakdown.origin_thc_total)}
                                  </div>
                                  <div className="text-[9px] text-slate-400 font-mono">Terminal</div>
                                </div>
                                <div className="rounded-xl border border-slate-200 bg-white p-2 text-center">
                                  <div className="text-[10px] font-semibold text-slate-500">X-Ray & Handling</div>
                                  <div className="font-mono font-bold text-xs text-slate-800 mt-0.5">
                                    {formatINR(quote.breakdown.xray_total + quote.breakdown.misc_handling_total)}
                                  </div>
                                  <div className="text-[9px] text-slate-400 font-mono">Screening</div>
                                </div>
                                <div className="rounded-xl border border-slate-200 bg-white p-2 text-center">
                                  <div className="text-[10px] font-semibold text-slate-500">e-AWB & Tax</div>
                                  <div className="font-mono font-bold text-xs text-slate-800 mt-0.5">
                                    {formatINR(quote.breakdown.awb_fee + quote.breakdown.gst_tax)}
                                  </div>
                                  <div className="text-[9px] text-slate-400 font-mono">AWB + 5% GST</div>
                                </div>
                                <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-2 text-center">
                                  <div className="text-[10px] font-bold text-emerald-800">Net Buy Total</div>
                                  <div className="font-mono font-black text-xs text-emerald-900 mt-0.5">
                                    {formatINR(quote.breakdown.total_landed_buy)}
                                  </div>
                                  <div className="text-[9px] font-extrabold text-emerald-700 font-mono">
                                    ₹{quote.breakdown.effective_buy_per_kg.toFixed(2)}/kg
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Break-even Pivot Math (If applicable) */}
                            {quote.is_pivoted && (
                              <div className="rounded-xl border border-amber-300 bg-amber-50/80 p-3 text-xs text-amber-950">
                                <div className="flex items-center gap-2 font-bold mb-1">
                                  <TrendingDown className="h-4 w-4 text-amber-700" />
                                  <span>IATA TACT Break-Even Pivot Rule Applied</span>
                                </div>
                                <p className="leading-relaxed">
                                  {quote.pivot_savings}. Declaring the shipment at the higher weight minimum discounted slab yields a lower total landed invoice than multiplying by the natural tier.
                                </p>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Table Footer Summary Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-t border-slate-200 bg-slate-50 px-4 py-2.5 text-xs text-slate-500 font-semibold">
          <div className="flex items-center gap-3">
            <span>
              Showing <strong>{displayedRates.length}</strong> of <strong>{rates.length}</strong> airline tariffs
            </span>
            <span className="text-slate-300">&bull;</span>
            <span>BOM Hub (Under 500kg Smalls Desk)</span>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[11px] font-mono">
              Net Buy Baseline:{" "}
              <strong className="text-slate-700 font-bold">
                {stats ? formatINR(stats.minBuy) : "0"} - {formatINR(rates[rates.length - 1]?.breakdown.total_landed_buy ?? 0)}
              </strong>
            </span>
            {isGlobalMarginActive && stats && (
              <span className="text-[11px] font-mono font-bold text-emerald-700">
                Sell Range: {formatINR(stats.minSell)}
              </span>
            )}
          </div>
        </div>
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

// Named alias for clean import
export { RatesGrid as RatesTable };
