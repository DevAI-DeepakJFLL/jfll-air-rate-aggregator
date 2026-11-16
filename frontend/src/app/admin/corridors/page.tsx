"use client";

import React, { useState, useMemo } from "react";
import { Network, Search, Globe, CheckCircle2, X } from "lucide-react";
import { RATE_SHEET_DESTINATIONS } from "@/lib/rate-destinations";

const REGION_CARRIERS: Record<string, string[]> = {
  "Middle East": ["Emirates", "Air India", "Etihad Cargo", "Qatar Cargo", "Oman Air", "IndiGo"],
  Europe: ["British Airways", "Air India", "Lufthansa Cargo", "Virgin Atlantic", "Air France"],
  "North America": ["Air India", "United Cargo", "Emirates", "Qatar Cargo", "Etihad Cargo"],
  "Southeast Asia": ["Singapore Airlines", "Malaysia Airlines", "IndiGo", "Thai Airways"],
  "East Asia": ["Cathay Pacific", "Air India", "All Nippon Airways", "Korean Air"],
  Africa: ["Ethiopian Cargo", "Kenya Airways", "EgyptAir"],
  "Latin America": ["LATAM Cargo", "Emirates", "Qatar Cargo"],
  "Australia & Pacific": ["Air India", "Singapore Airlines", "Malaysia Airlines"],
};

export default function AdminCorridorsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRegion, setSelectedRegion] = useState<string>("ALL");

  // Derive unique regions list
  const regions = useMemo(() => {
    const set = new Set<string>();
    RATE_SHEET_DESTINATIONS.forEach((d) => set.add(d.region));
    return Array.from(set).sort();
  }, []);

  // Filter corridors based on search and region selection
  const filtered = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    return RATE_SHEET_DESTINATIONS.filter((c) => {
      if (selectedRegion !== "ALL" && c.region !== selectedRegion) {
        return false;
      }
      if (!q) return true;
      return (
        c.code.toLowerCase().includes(q) ||
        c.city.toLowerCase().includes(q) ||
        c.country.toLowerCase().includes(q) ||
        c.region.toLowerCase().includes(q)
      );
    });
  }, [searchTerm, selectedRegion]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
            Corridors &amp; Port Directory
          </h1>
          <p className="text-xs text-slate-600 font-medium">
            Active export trade lanes monitored from Chhatrapati Shivaji Maharaj International Airport (BOM Terminal 2).
          </p>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search port, city, code, or country..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            aria-label="Search trade corridors by code, city, or country"
            className="w-full h-9 pl-9 pr-8 rounded-xl border border-slate-300 bg-white text-xs font-semibold focus-ring placeholder:text-slate-400"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
              aria-label="Clear search"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      {/* Origin Hub Card with Genuine Fleet Stats */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-obsidian-950 text-amber-400 flex items-center justify-center font-mono font-black text-sm shrink-0">
            BOM
          </div>
          <div>
            <div className="text-sm font-bold text-slate-900">
              Primary Origin: Mumbai (BOM / VABB) &bull; Terminal 2 Cargo Complex
            </div>
            <p className="text-xs text-slate-500 font-medium">
              Maharashtra, India &bull; Smalls Desk Scope: &lt; 500 kg air freight
            </p>
          </div>
        </div>

        <div className="flex items-center gap-6 text-left md:text-right border-t md:border-t-0 pt-3 md:pt-0 border-slate-100">
          <div>
            <div className="text-xs font-extrabold text-slate-900 font-mono">
              {RATE_SHEET_DESTINATIONS.length} Ports
            </div>
            <div className="text-[10px] text-slate-500">Indexed Air Corridors</div>
          </div>
          <div>
            <div className="text-xs font-extrabold text-slate-900 font-mono">
              {regions.length} Regions
            </div>
            <div className="text-[10px] text-slate-500">Global Coverage</div>
          </div>
          <div>
            <div className="text-xs font-extrabold text-emerald-700 font-mono">100% Live</div>
            <div className="text-[10px] text-slate-500">BOM Gateway Status</div>
          </div>
        </div>
      </div>

      {/* Region Filter Chips */}
      <div className="flex items-center gap-1.5 flex-wrap" role="group" aria-label="Filter corridors by region">
        <button
          type="button"
          onClick={() => setSelectedRegion("ALL")}
          aria-pressed={selectedRegion === "ALL"}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
            selectedRegion === "ALL"
              ? "bg-slate-900 text-white border-slate-900 shadow-2xs"
              : "bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 border-slate-200"
          }`}
        >
          All Regions ({RATE_SHEET_DESTINATIONS.length})
        </button>
        {regions.map((reg) => {
          const count = RATE_SHEET_DESTINATIONS.filter((d) => d.region === reg).length;
          const isSelected = selectedRegion === reg;
          return (
            <button
              key={reg}
              type="button"
              onClick={() => setSelectedRegion(reg)}
              aria-pressed={isSelected}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                isSelected
                  ? "bg-jfll-blue text-white border-jfll-blue shadow-2xs"
                  : "bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 border-slate-200"
              }`}
            >
              {reg} ({count})
            </button>
          );
        })}
      </div>

      {/* Corridors Table */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Network className="h-4 w-4 text-jfll-blue" />
            <h2 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
              Monitored Trade Corridors ({filtered.length} of {RATE_SHEET_DESTINATIONS.length})
            </h2>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-semibold text-slate-700">
            <thead className="bg-slate-50 text-[10px] font-extrabold text-slate-500 uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th scope="col" className="px-4 py-3 w-28">IATA Code</th>
                <th scope="col" className="px-4 py-3 min-w-[200px]">Destination Port &amp; City</th>
                <th scope="col" className="px-4 py-3 min-w-[140px]">Region</th>
                <th scope="col" className="px-4 py-3 min-w-[260px]">Connected Flight Carriers ex-BOM</th>
                <th scope="col" className="px-4 py-3 w-28 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-xs text-slate-500 font-medium">
                    No monitored corridors found matching &ldquo;{searchTerm}&rdquo;
                  </td>
                </tr>
              ) : (
                filtered.map((item) => {
                  const carriers = REGION_CARRIERS[item.region] || ["Air India", "Emirates"];
                  return (
                    <tr key={item.code} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-4 py-3">
                        <span className="font-mono font-black text-xs text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                          {item.code}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-900">{item.city}</div>
                        <div className="text-[11px] text-slate-500">{item.country}</div>
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium">
                          <Globe className="h-3 w-3 text-slate-400" />
                          {item.region}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {carriers.map((airline) => (
                            <span
                              key={airline}
                              className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-700 border border-slate-200/60"
                            >
                              {airline}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="h-3 w-3" />
                          ACTIVE
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer */}
        <div className="p-3 bg-slate-50/80 border-t border-slate-200/80 flex items-center justify-between text-xs text-slate-600">
          <span className="font-medium text-slate-500">
            Jet Freight Air Cargo Network ex-BOM Gateway
          </span>
          <span className="font-semibold text-slate-700">
            Showing {filtered.length} of {RATE_SHEET_DESTINATIONS.length} airports
          </span>
        </div>
      </div>
    </div>
  );
}
