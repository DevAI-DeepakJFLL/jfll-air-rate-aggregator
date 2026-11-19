"use client";

import React, { useState, useMemo } from "react";
import { RateQuoteItem } from "../../types/rate";
import { formatINR } from "../../lib/utils";
import { MarginInfo } from "./CostBreakdownModal";
import { CarrierBadge } from "./CarrierBadge";
import { AirlineLogo } from "./AirlineLogo";
import { MarginMode } from "./MarginControllerBar";
import { StandardSelectOption } from "../common/StandardSelect";
import { RatesTableRowDetail, CardMarginOverride } from "./RatesTableRowDetail";
import {
  Clock,
  TrendingDown,
  Sparkles,
  ChevronDown,
  ChevronUp,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";

interface RatesGridProps {
  rates: RateQuoteItem[];
}

type FilterOption = "all" | "cheapest" | "fastest" | "direct";
type SortField = "price" | "carrier" | "transit" | "cutoff";
type SortDirection = "asc" | "desc";

const MARGIN_MODE_OPTIONS: StandardSelectOption<MarginMode>[] = [
  { value: "per_kg", label: "₹ / kg", description: "Per chargeable kilogram" },
  { value: "percent", label: "% Markup", description: "Percentage markup of freight" },
  { value: "flat", label: "₹ Flat", description: "Fixed flat markup per shipment" },
];

export function RatesGrid({ rates }: RatesGridProps) {
  const [activeFilter, setActiveFilter] = useState<FilterOption>("all");
  const [sortField, setSortField] = useState<SortField>("price");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);

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

  // Helper to get effective price for sorting
  const getEffectivePrice = (item: RateQuoteItem) => {
    const m = marginMap.get(item.id);
    return m ? m.sellTotal : item.breakdown.total_landed_buy;
  };

  // DSA Optimization: Single-Pass Filter & Multi-column Sort Pipeline
  // Evaluates effective sort criteria upfront to avoid redundant O(N log N) multi-pass sorting.
  const displayedRates = useMemo(() => {
    // 1. Filter in O(N)
    const filtered = activeFilter === "direct"
      ? rates.filter((r) => r.routing_type.toLowerCase().includes("direct"))
      : rates;

    // 2. Determine effective sort criteria upfront in O(1)
    const effectiveField: SortField =
      activeFilter === "cheapest" ? "price" : activeFilter === "fastest" ? "transit" : sortField;
    const effectiveDir: SortDirection =
      activeFilter === "cheapest" || activeFilter === "fastest" ? "asc" : sortDirection;

    // 3. Single deterministic O(N log N) sort
    return [...filtered].sort((a, b) => {
      let comparison = 0;
      if (effectiveField === "price") {
        comparison = getEffectivePrice(a) - getEffectivePrice(b);
      } else if (effectiveField === "carrier") {
        comparison = a.carrier_name.localeCompare(b.carrier_name);
      } else if (effectiveField === "transit") {
        comparison = (a.transit_minutes ?? 9999) - (b.transit_minutes ?? 9999);
      } else if (effectiveField === "cutoff") {
        comparison = a.cargo_cutoff.localeCompare(b.cargo_cutoff);
      }

      return effectiveDir === "asc" ? comparison : -comparison;
    });
  }, [rates, activeFilter, sortField, sortDirection, marginMap]);

  const directCount = useMemo(() => {
    return rates.filter((r) => r.routing_type.toLowerCase().includes("direct")).length;
  }, [rates]);

  // Quick stats computed in O(N)
  const stats = useMemo(() => {
    if (rates.length === 0) return null;
    let minBuy = Infinity;
    let maxBuy = -Infinity;
    let minSell = Infinity;
    let maxSell = -Infinity;
    let fastestMinutes = Infinity;
    let bestCarrier = "";

    for (const r of rates) {
      if (r.breakdown.total_landed_buy < minBuy) {
        minBuy = r.breakdown.total_landed_buy;
        bestCarrier = r.carrier_name;
      }
      if (r.breakdown.total_landed_buy > maxBuy) {
        maxBuy = r.breakdown.total_landed_buy;
      }
      const m = marginMap.get(r.id);
      const effectiveSell = m ? m.sellTotal : r.breakdown.total_landed_buy;
      if (effectiveSell < minSell) {
        minSell = effectiveSell;
      }
      if (effectiveSell > maxSell) {
        maxSell = effectiveSell;
      }
      if (r.transit_minutes && r.transit_minutes < fastestMinutes) {
        fastestMinutes = r.transit_minutes;
      }
    }

    return {
      minBuy: minBuy < Infinity ? minBuy : 0,
      maxBuy: maxBuy > -Infinity ? maxBuy : 0,
      minSell: minSell < Infinity ? minSell : 0,
      maxSell: maxSell > -Infinity ? maxSell : 0,
      bestCarrier,
      fastestHours: fastestMinutes < Infinity ? `${Math.floor(fastestMinutes / 60)}h ${fastestMinutes % 60}m` : "N/A",
    };
  }, [rates, marginMap]);

  if (rates.length === 0) {
    return null;
  }

  const isGlobalMarginActive = globalMarginNum > 0 || Object.keys(cardOverrides).length > 0;

  return (
    <div className="space-y-4 font-sans">
      {/* Header: Table Filter Controls & Quick Stats Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3 pt-1">
        <div>
          <h3 className="text-base font-extrabold text-obsidian-900 tracking-tight">
            Airline Comparison Table
          </h3>
          <p className="text-xs font-semibold text-slate-500 mt-0.5">
            Compare pure net buy rates side-by-side across all active BOM circulars
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
        <div
          className="overflow-x-auto focus-visible:outline-2 focus-visible:outline-sky-600"
          tabIndex={0}
          role="region"
          aria-label="Air cargo tariff quotes comparison"
        >
          <table className="w-full min-w-[980px] text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/90 text-slate-600 font-extrabold text-[11px] uppercase tracking-wider select-none">
                {/* Airline & Flight */}
                <th
                  scope="col"
                  aria-sort={sortField === "carrier" ? (sortDirection === "asc" ? "ascending" : "descending") : "none"}
                  className="py-3 px-4 font-extrabold cursor-pointer hover:text-obsidian-900 transition-colors w-[22%]"
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
                  aria-sort={sortField === "transit" ? (sortDirection === "asc" ? "ascending" : "descending") : "none"}
                  className="py-3 px-3.5 font-extrabold cursor-pointer hover:text-obsidian-900 transition-colors w-[18%]"
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
                  aria-sort={sortField === "cutoff" ? (sortDirection === "asc" ? "ascending" : "descending") : "none"}
                  className="py-3 px-3 font-extrabold cursor-pointer hover:text-obsidian-900 transition-colors whitespace-nowrap w-[11%]"
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
                <th scope="col" className="py-3 px-3 font-extrabold whitespace-nowrap w-[11%]">
                  Rating Tier
                </th>

                {/* Net Landed Buy Price (Internal Baseline) */}
                <th
                  scope="col"
                  aria-sort={sortField === "price" ? (sortDirection === "asc" ? "ascending" : "descending") : "none"}
                  className="py-3 px-3.5 font-extrabold cursor-pointer hover:text-obsidian-900 transition-colors text-right w-[14%]"
                  onClick={() => handleSort("price")}
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>Net Buy Price</span>
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
                  aria-sort={sortField === "price" ? (sortDirection === "asc" ? "ascending" : "descending") : "none"}
                  className="py-3 px-4 font-extrabold text-right cursor-pointer hover:text-obsidian-900 transition-colors bg-amber-50/40 w-[14%]"
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

                {/* Breakdown Details */}
                <th scope="col" className="py-3 px-3 text-center font-extrabold whitespace-nowrap w-[70px]">
                  Breakdown
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
                                <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-black text-amber-900 border border-amber-300">
                                  <Sparkles className="h-2.5 w-2.5 text-amber-700" />
                                  Best Buy
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 font-mono mt-0.5">
                              <span className="font-bold text-slate-700">{quote.flight_number}</span>
                              <span className="text-slate-300">&bull;</span>
                              <span className="text-slate-400 font-sans">{quote.routing_type}</span>
                            </div>

                            {/* Tariff Equipment / Packaging Restriction Badge */}
                            {quote.packaging_restricted && (
                              <div className="flex items-center gap-1.5 flex-wrap mt-1">
                                <span className="inline-flex items-center gap-1 rounded-md bg-rose-50 px-1.5 py-0.5 text-[9px] font-black text-rose-700 border border-rose-200">
                                  Packaging Restricted
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Column 2: Schedule & Transit */}
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        <div>
                          <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-obsidian-900">
                            <span>{quote.departure_time.split(" ")[0]}</span>
                            <span className="text-slate-500">→</span>
                            <span>{quote.arrival_time.split(" ")[0]}</span>
                          </div>
                          <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-500 mt-0.5">
                            <Clock className="h-3 w-3 text-aero-teal shrink-0" />
                            <span>{quote.transit_time}</span>
                          </div>
                        </div>
                      </td>

                      {/* Column 3: BOM Cutoff */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="font-mono text-xs font-bold text-amber-950">
                          {quote.cargo_cutoff}
                        </div>
                        <div className="text-[10px] font-semibold text-slate-400">
                          Cargo Cutoff
                        </div>
                      </td>

                      {/* Column 4: Weight Slab & Pivot */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="font-mono text-xs font-extrabold text-slate-800">
                          {quote.weight_tier_applied}
                        </div>
                        {quote.is_pivoted ? (
                          <div className="inline-flex items-center gap-1 rounded bg-amber-100/90 px-1.5 py-0.5 text-[9px] font-extrabold text-amber-900 mt-0.5">
                            <TrendingDown className="h-2.5 w-2.5 text-amber-700" />
                            <span>Pivot Savings</span>
                          </div>
                        ) : (
                          <div className="text-[10px] text-slate-400 font-medium">Standard Slab</div>
                        )}
                      </td>

                      {/* Column 5: Net Buy Total Price (Primary) & Rate/kg (Secondary) */}
                      <td className="py-3 px-3.5 text-right whitespace-nowrap">
                        <div className="font-mono tabular-nums text-sm font-extrabold text-obsidian-900 tracking-tight">
                          {formatINR(quote.breakdown.total_landed_buy)}
                        </div>
                        <div className="font-mono tabular-nums text-[11px] font-semibold text-slate-500 mt-0.5">
                          ₹{quote.breakdown.effective_buy_per_kg.toFixed(2)}{" "}
                          <span className="text-[10px] text-slate-400 font-normal">/ kg</span>
                        </div>
                      </td>

                      {/* Column 6: Client Selling Price (Primary Total, Secondary Rate/kg) */}
                      <td className="py-3 px-4 text-right whitespace-nowrap bg-amber-50/20">
                        {hasActiveMargin ? (
                          <div>
                            <div className="flex items-center justify-end gap-1">
                              <span className="font-mono tabular-nums text-sm font-black text-obsidian-900 tracking-tight">
                                {formatINR(margin.sellTotal)}
                              </span>
                              {hasCardOverride && (
                                <span className="rounded bg-amber-200/90 px-1 py-0.5 text-[9px] font-black text-amber-950">
                                  Override
                                </span>
                              )}
                            </div>
                            <div className="font-mono tabular-nums text-[11px] font-extrabold text-emerald-700 mt-0.5">
                              ₹{margin.sellPerKg.toFixed(2)} / kg
                              <span className="text-slate-500 font-normal ml-1 font-sans text-[10px]">
                                (+{formatINR(margin.totalMargin)})
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div>
                            <div className="font-mono tabular-nums text-sm font-bold text-slate-400 tracking-tight">
                              {formatINR(quote.breakdown.total_landed_buy)}
                            </div>
                            <div className="flex items-center justify-end gap-1.5 mt-0.5">
                              <span className="font-mono tabular-nums text-[11px] text-slate-400">
                                ₹{quote.breakdown.effective_buy_per_kg.toFixed(2)} / kg
                              </span>
                              <span className="text-slate-300">&bull;</span>
                              <button
                                type="button"
                                onClick={(e) => handleOpenOverride(quote, e)}
                                className="text-[10px] font-bold text-aero-teal hover:underline cursor-pointer"
                              >
                                + Margin
                              </button>
                            </div>
                          </div>
                        )}
                      </td>

                      {/* Column 7: Breakdown Details Toggle */}
                      <td className="py-3 px-3 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleRowExpansion(quote.id);
                            }}
                            title={isExpanded ? "Collapse price breakdown" : "Expand price breakdown"}
                            aria-label={isExpanded ? "Collapse price breakdown" : "Expand price breakdown"}
                            className="inline-flex items-center justify-center h-7 w-7 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-obsidian-900 transition-colors focus-ring shadow-2xs cursor-pointer"
                          >
                            {isExpanded ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* Expandable Sub-Row (Drill-Down Drawer) */}
                    {isExpanded && (
                      <RatesTableRowDetail
                        quote={quote}
                        hasCardOverride={hasCardOverride}
                        cardOverride={cardOverrides[quote.id]}
                        isOverrideActive={isOverrideActive}
                        overrideMode={overrideMode}
                        overrideInputStr={overrideInputStr}
                        marginOptions={MARGIN_MODE_OPTIONS}
                        onOpenOverride={(e) => handleOpenOverride(quote, e)}
                        onCloseOverride={() => setActiveOverrideRowId(null)}
                        onSetOverrideMode={(mode) => setOverrideMode(mode)}
                        onSetOverrideInput={(val) => setOverrideInputStr(val)}
                        onApplyOverride={() => handleApplyOverride(quote.id)}
                        onRevertOverride={() => handleRevertOverride(quote.id)}
                      />
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
            <span>BOM Origin Hub</span>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[11px] font-mono">
              Net Buy Baseline:{" "}
              <strong className="text-slate-700 font-bold">
                {stats ? `${formatINR(stats.minBuy)} - ${formatINR(stats.maxBuy)}` : "0"}
              </strong>
            </span>
            {isGlobalMarginActive && stats && (
              <span className="text-[11px] font-mono font-bold text-emerald-700">
                Sell Range: {formatINR(stats.minSell)} - {formatINR(stats.maxSell)}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Named alias for clean import
export { RatesGrid as RatesTable };
