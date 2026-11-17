"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  X,
  Search,
  TableProperties,
  AlertCircle,
} from "lucide-react";
import { AirlineLogo } from "@/components/rates/AirlineLogo";
import { CarrierRegistryItem, CarrierRateRow } from "@/types/tariff";
import { fetchCarrierRates } from "@/lib/api-client";

interface TariffPreviewDrawerProps {
  carrier: CarrierRegistryItem | null;
  isOpen: boolean;
  onClose: () => void;
}

export function TariffPreviewDrawer({
  carrier,
  isOpen,
  onClose,
}: TariffPreviewDrawerProps) {
  const [rates, setRates] = useState<CarrierRateRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCommodity, setSelectedCommodity] = useState<string>("ALL");
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  useEffect(() => {
    if (!isOpen || !carrier) {
      setRates([]);
      setSearchQuery("");
      setSelectedCommodity("ALL");
      setError(null);
      return;
    }

    const loadRates = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchCarrierRates(carrier.carrier_code);
        setRates(data.rates || []);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Error fetching rates";
        setError(msg);
      } finally {
        setLoading(false);
      }
    };

    loadRates();
  }, [isOpen, carrier]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // DSA Optimization: Precomputed Commodity Partition Index
  const availableCommodities = useMemo(() => {
    const counts: Record<string, number> = {};
    rates.forEach((r) => {
      const comm = r.commodity || "General Cargo";
      counts[comm] = (counts[comm] || 0) + 1;
    });
    return counts;
  }, [rates]);

  // DSA Optimization: Memoized Corridor Search & Section Index
  // Evaluates in O(N) only when query, section, or rates change.
  const filteredRates: CarrierRateRow[] = useMemo(() => {
    let list = rates;
    if (selectedCommodity !== "ALL") {
      list = list.filter((r) => (r.commodity || "General Cargo") === selectedCommodity);
    }
    const q = searchQuery.toLowerCase().trim();
    if (!q) return list;

    return list.filter((r) => {
      const dest = r.destination.toLowerCase();
      if (dest.includes(q)) return true;
      if (r.commodity && r.commodity.toLowerCase().includes(q)) return true;
      return false;
    });
  }, [rates, selectedCommodity, searchQuery]);

  // Reset pagination when search query, section filter, or active carrier changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCommodity, carrier]);

  const totalRates = filteredRates.length;
  const totalRatePages = Math.max(1, Math.ceil(totalRates / pageSize));
  const safeRatePage = Math.min(currentPage, totalRatePages);
  const rateStartIndex = (safeRatePage - 1) * pageSize;
  const rateEndIndex = Math.min(rateStartIndex + pageSize, totalRates);

  const paginatedRates = useMemo(() => {
    return filteredRates.slice(rateStartIndex, rateEndIndex);
  }, [filteredRates, rateStartIndex, rateEndIndex]);

  if (!isOpen || !carrier) return null;

  const circular = carrier.active_circular;

  return (
    <div
      className="fixed inset-0 z-50 overflow-hidden"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tariff-preview-carrier-name"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-obsidian-950/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-3xl bg-white shadow-2xl flex flex-col border-l border-slate-200 animate-in slide-in-from-right duration-200">
          {/* Drawer Header */}
          <div className="p-4 sm:p-6 border-b border-slate-200 bg-slate-50/70">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <AirlineLogo
                  carrierCode={carrier.carrier_code}
                  carrierName={carrier.carrier_name}
                  size="md"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <h2
                      id="tariff-preview-carrier-name"
                      className="text-base font-extrabold text-slate-900"
                    >
                      {carrier.carrier_name}
                    </h2>
                    <span className="font-mono text-xs font-bold text-slate-600 bg-slate-200/80 px-1.5 py-0.5 rounded">
                      {carrier.carrier_code} ({carrier.prefix})
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Extracted Air Cargo Tariff Matrix &bull; ex-BOM Gateway
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-200/70 transition-colors cursor-pointer"
                aria-label="Close preview drawer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Circular Metadata Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-slate-200/80 text-xs">
              <div className="bg-white p-2.5 rounded-xl border border-slate-200/80">
                <span className="text-[11px] font-semibold text-slate-500 block">
                  Active Circular
                </span>
                <span className="font-medium text-slate-900 truncate block mt-0.5" title={circular?.filename || "No active circular"}>
                  {circular?.filename || "No active circular"}
                </span>
              </div>

              <div className="bg-white p-2.5 rounded-xl border border-slate-200/80">
                <span className="text-[11px] font-semibold text-slate-500 block">
                  Total Corridors
                </span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="font-mono font-bold text-slate-900 block">
                    {rates.length} active routes
                  </span>
                  {rates[0]?.rate_basis === "ALL_IN" && (
                    <span className="px-1.5 py-0.2 rounded text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      ALL-IN
                    </span>
                  )}
                </div>
              </div>

              <div className="bg-white p-2.5 rounded-xl border border-slate-200/80">
                <span className="text-[11px] font-semibold text-slate-500 block">
                  Validity Window
                </span>
                <span className="font-mono text-slate-900 block mt-0.5 text-[11px]">
                  {circular?.valid_from || "Current"} &rarr; {circular?.valid_to || "Active Schedule"}
                </span>
              </div>

              <div className="bg-white p-2.5 rounded-xl border border-slate-200/80">
                <span className="text-[11px] font-semibold text-slate-500 block">
                  AWB Prefix
                </span>
                <span className="font-mono font-bold text-slate-900 block mt-0.5 text-[11px]">
                  {carrier.prefix} ({carrier.carrier_code})
                </span>
              </div>
            </div>

            {/* Quick Filter Search & Commodity Section Filter */}
            <div className="mt-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div className="relative flex-1">
                <Search className="h-4 w-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search destination IATA (e.g. DXB, AUH, LHR, FRA)..."
                  className="w-full h-10 pl-9 pr-9 rounded-xl border border-slate-300 text-xs font-semibold placeholder:text-slate-500 focus-ring bg-white"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-0.5 rounded cursor-pointer"
                    aria-label="Clear destination search"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {Object.keys(availableCommodities).length > 1 && (
                <div className="shrink-0 flex items-center gap-1.5 bg-white border border-slate-300 rounded-xl px-3 h-10 shadow-2xs">
                  <span className="text-[11px] font-bold text-slate-500 shrink-0">Section:</span>
                  <select
                    value={selectedCommodity}
                    onChange={(e) => setSelectedCommodity(e.target.value)}
                    className="text-xs font-bold text-slate-800 bg-transparent cursor-pointer focus:outline-hidden max-w-[170px] truncate"
                    aria-label="Filter by cargo commodity section"
                  >
                    <option value="ALL">All Sections ({rates.length})</option>
                    {Object.entries(availableCommodities).map(([comm, count]) => (
                      <option key={comm} value={comm}>
                        {comm} ({count})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Drawer Body: Corridors Rate Table */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6">
            {loading ? (
              <div className="h-64 flex flex-col items-center justify-center gap-2 text-slate-500">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-jfll-blue border-t-transparent" />
                <p className="text-xs font-semibold">Loading extracted corridor rates...</p>
              </div>
            ) : error ? (
              <div className="p-4 rounded-xl border border-red-200 bg-red-50 text-red-900 text-xs flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
                <span>{error}</span>
              </div>
            ) : filteredRates.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center gap-2 text-slate-500 text-center">
                <TableProperties className="h-8 w-8 text-slate-300" />
                <p className="text-xs font-bold text-slate-700">No corridors match search filter</p>
                <p className="text-[11px] text-slate-500">Try clearing the destination query.</p>
              </div>
            ) : (
              <div
                className="border border-slate-200 rounded-xl overflow-x-auto shadow-2xs max-h-[60vh] overflow-y-auto focus-visible:outline-2 focus-visible:outline-sky-600"
                tabIndex={0}
                role="region"
                aria-label="Extracted airline corridors rate matrix"
              >
                <table className="w-full text-left text-xs font-semibold text-slate-700">
                  <thead className="sticky top-0 z-10 bg-slate-100 text-[11px] font-extrabold text-slate-700 uppercase tracking-wider border-b border-slate-200 select-none shadow-xs">
                    <tr>
                      <th className="px-3.5 py-2.5">Dest</th>
                      <th className="px-3 py-2.5">Commodity</th>
                      <th className="px-3 py-2.5 text-right">Min (₹)</th>
                      <th className="px-3 py-2.5 text-right">Norm</th>
                      <th className="px-3 py-2.5 text-right">+45kg</th>
                      <th className="px-3 py-2.5 text-right">+100kg</th>
                      <th className="px-3 py-2.5 text-right">+250kg</th>
                      <th className="px-3 py-2.5 text-right">+300kg</th>
                      <th className="px-3 py-2.5 text-right">FSC/kg</th>
                      <th className="px-3 py-2.5 text-right">SSC/kg</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                    {paginatedRates.map((row, idx) => (
                      <tr key={`${row.destination}-${idx}`} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-3.5 py-2.5 font-sans font-bold text-slate-900">
                          {row.destination}
                        </td>
                        <td className="px-3 py-2.5 font-sans text-slate-600">
                          {row.commodity || "General Cargo"}
                        </td>
                        <td className="px-3 py-2.5 text-right text-slate-900">
                          {row.min_charge ? `₹${row.min_charge.toLocaleString("en-IN")}` : "-"}
                        </td>
                        <td className="px-3 py-2.5 text-right text-slate-800">
                          {row.rate_normal ? `₹${row.rate_normal}` : "-"}
                        </td>
                        <td className="px-3 py-2.5 text-right text-slate-800">
                          {row.rate_45 ? `₹${row.rate_45}` : "-"}
                        </td>
                        <td className="px-3 py-2.5 text-right text-slate-800">
                          {row.rate_100 ? `₹${row.rate_100}` : "-"}
                        </td>
                        <td className="px-3 py-2.5 text-right text-slate-800">
                          {row.rate_250 ? `₹${row.rate_250}` : "-"}
                        </td>
                        <td className="px-3 py-2.5 text-right text-slate-800">
                          {row.rate_300 ? `₹${row.rate_300}` : "-"}
                        </td>
                        <td className="px-3 py-2.5 text-right font-medium text-amber-900 bg-amber-50/40">
                          {row.fsc_per_kg ? `₹${row.fsc_per_kg}` : "-"}
                        </td>
                        <td className="px-3 py-2.5 text-right font-medium text-slate-700">
                          {row.ssc_per_kg ? `₹${row.ssc_per_kg}` : "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Drawer Footer with Corridor Pagination */}
          <div className="p-4 sm:p-5 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3 text-xs text-slate-600">
              <span>
                Showing <strong className="font-bold text-slate-900">{totalRates === 0 ? 0 : rateStartIndex + 1}</strong> to{" "}
                <strong className="font-bold text-slate-900">{rateEndIndex}</strong> of{" "}
                <strong className="font-bold text-slate-900">{totalRates}</strong> corridors
              </span>
              {totalRates > 15 && (
                <>
                  <span className="text-slate-300">•</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-500">Rows:</span>
                    <select
                      value={pageSize}
                      onChange={(e) => {
                        setPageSize(Number(e.target.value));
                        setCurrentPage(1);
                      }}
                      className="h-7 px-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 bg-white cursor-pointer"
                    >
                      <option value={15}>15</option>
                      <option value={30}>30</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                  </div>
                </>
              )}
            </div>

            <div className="flex items-center gap-2">
              {totalRatePages > 1 && (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={safeRatePage <= 1}
                    className="px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition"
                  >
                    Previous
                  </button>
                  <span className="px-2 text-xs font-bold text-slate-700">
                    {safeRatePage} / {totalRatePages}
                  </span>
                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.min(totalRatePages, p + 1))}
                    disabled={safeRatePage >= totalRatePages}
                    className="px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition"
                  >
                    Next
                  </button>
                </div>
              )}
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Done Previewing
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
