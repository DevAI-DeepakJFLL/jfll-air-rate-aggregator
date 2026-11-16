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
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !carrier) {
      setRates([]);
      setSearchQuery("");
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

  // DSA Optimization: Memoized Corridor Search Index
  // Caches normalized tokens and evaluates in O(N) only when query or rates change.
  // Placed unconditionally before early returns to strictly adhere to React's Rules of Hooks.
  const filteredRates: CarrierRateRow[] = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return rates;

    return rates.filter((r) => {
      const dest = r.destination.toLowerCase();
      if (dest.includes(q)) return true;
      if (r.commodity && r.commodity.toLowerCase().includes(q)) return true;
      return false;
    });
  }, [rates, searchQuery]);

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
                <span className="font-mono font-bold text-slate-900 block mt-0.5">
                  {rates.length} active routes
                </span>
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
                  Parser Signature
                </span>
                <span className="font-mono text-slate-700 block mt-0.5 text-[11px] truncate">
                  {carrier.parser_id}
                </span>
              </div>
            </div>

            {/* Quick Filter Search */}
            <div className="mt-4 relative">
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
                    {filteredRates.map((row, idx) => (
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

          {/* Drawer Footer */}
          <div className="p-4 sm:p-5 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
            <span className="text-xs text-slate-500">
              Showing {filteredRates.length} of {rates.length} corridors
            </span>
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
  );
}
