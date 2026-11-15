"use client";

import React, { useState } from "react";
import { Network, Search, Globe, CheckCircle2 } from "lucide-react";

interface CorridorItem {
  code: string;
  name: string;
  country: string;
  region: string;
  typicalAirlines: string[];
  status: "ACTIVE" | "MONITORED";
}

const SAMPLE_CORRIDORS: CorridorItem[] = [
  {
    code: "DXB",
    name: "Dubai International",
    country: "United Arab Emirates",
    region: "Middle East / GCC",
    typicalAirlines: ["Emirates", "Air India", "Flydubai"],
    status: "ACTIVE",
  },
  {
    code: "AUH",
    name: "Zayed International Airport",
    country: "United Arab Emirates",
    region: "Middle East / GCC",
    typicalAirlines: ["Etihad Cargo", "Air India"],
    status: "ACTIVE",
  },
  {
    code: "DOH",
    name: "Hamad International Airport",
    country: "Qatar",
    region: "Middle East / GCC",
    typicalAirlines: ["Qatar Airways Cargo"],
    status: "ACTIVE",
  },
  {
    code: "LHR",
    name: "London Heathrow",
    country: "United Kingdom",
    region: "Europe",
    typicalAirlines: ["British Airways", "Air India", "Virgin Atlantic"],
    status: "ACTIVE",
  },
  {
    code: "FRA",
    name: "Frankfurt Airport",
    country: "Germany",
    region: "Europe",
    typicalAirlines: ["Lufthansa Cargo", "Air India"],
    status: "ACTIVE",
  },
  {
    code: "SIN",
    name: "Singapore Changi Airport",
    country: "Singapore",
    region: "Southeast Asia",
    typicalAirlines: ["Singapore Airlines Cargo", "Air India"],
    status: "ACTIVE",
  },
  {
    code: "JFK",
    name: "John F. Kennedy International",
    country: "United States",
    region: "Americas",
    typicalAirlines: ["Air India", "Qatar Cargo", "Emirates"],
    status: "ACTIVE",
  },
  {
    code: "ORD",
    name: "Chicago O'Hare International",
    country: "United States",
    region: "Americas",
    typicalAirlines: ["Qatar Cargo", "Etihad Cargo"],
    status: "MONITORED",
  },
];

export default function AdminCorridorsPage() {
  const [searchTerm, setSearchTerm] = useState("");

  const filtered = SAMPLE_CORRIDORS.filter(
    (c) =>
      c.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.country.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.region.toLowerCase().includes(searchTerm.toLowerCase())
  );

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

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search port or code..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-9 pl-9 pr-3 rounded-xl border border-slate-300 bg-white text-xs font-semibold focus-ring placeholder:text-slate-400"
          />
        </div>
      </div>

      {/* Origin Hub Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-obsidian-950 text-amber-400 flex items-center justify-center font-mono font-black text-sm">
            BOM
          </div>
          <div>
            <div>
              <span className="text-sm font-bold text-slate-900">
                Primary Origin: Mumbai (BOM / VABB) &bull; Terminal 2 Cargo Complex
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              Maharashtra, India &bull; Smalls Desk Scope: &lt; 500 kg air freight
            </p>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-6 text-right">
          <div>
            <div className="text-xs font-extrabold text-slate-900 font-mono">24 Hubs</div>
            <div className="text-[10px] text-slate-500">Connected Ports</div>
          </div>
          <div>
            <div className="text-xs font-extrabold text-emerald-700 font-mono">100% Live</div>
            <div className="text-[10px] text-slate-500">Gateway Status</div>
          </div>
        </div>
      </div>

      {/* Corridors Table */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Network className="h-4 w-4 text-jfll-blue" />
            <h2 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
              Monitored Trade Corridors ({filtered.length})
            </h2>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-semibold text-slate-700">
            <thead className="bg-slate-50 text-[10px] font-extrabold text-slate-500 uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Airport / IATA</th>
                <th className="px-4 py-3">Destination Name</th>
                <th className="px-4 py-3">Region</th>
                <th className="px-4 py-3">Frequent Carriers</th>
                <th className="px-4 py-3 text-right">Status</th>
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
                filtered.map((item) => (
                  <tr key={item.code} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-4 py-3">
                      <span className="font-mono font-black text-xs text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                        {item.code}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-bold text-slate-900">{item.name}</div>
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
                        {item.typicalAirlines.map((airline) => (
                          <span
                            key={airline}
                            className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-700"
                          >
                            {airline}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span
                        className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          item.status === "ACTIVE"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-amber-50 text-amber-700 border border-amber-200"
                        }`}
                      >
                        <CheckCircle2 className="h-3 w-3" />
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
