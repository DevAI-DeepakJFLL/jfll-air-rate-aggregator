"use client";

import React from "react";
import Link from "next/link";
import {
  FileSpreadsheet,
  Receipt,
  Network,
  ShieldCheck,
  ArrowRight,
  Plane,
} from "lucide-react";

export default function AdminDashboardPage() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
            Commercial Tariff &amp; Surcharge Management
          </h1>
          <p className="text-xs text-slate-600 font-medium mt-0.5">
            Centralized tariff administration, statutory fees, and carrier rate circular ingestion &bull; CSMIA BOM Gateway.
          </p>
        </div>

        {/* Gateway Hub Status Pill */}
        <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white border border-slate-200/90 shadow-2xs text-xs font-semibold text-slate-700">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="font-mono text-[11px]">BOM Hub Active</span>
          </div>

          <Link
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 text-white hover:bg-slate-800 text-xs font-bold shadow-2xs transition-colors cursor-pointer"
          >
            <Plane className="h-3.5 w-3.5" />
            <span>Open Calculator</span>
          </Link>
        </div>
      </div>

      {/* KPI Overview Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Scheduled Airlines */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-500">
            <span>Airlines Monitored</span>
            <FileSpreadsheet className="h-4 w-4 text-jfll-blue" />
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono">10 Carriers</div>
          <p className="text-[11px] text-slate-500 font-medium">
            Rate circulars and dedicated parsers ex-BOM
          </p>
        </div>

        {/* Metric 2: Gateway Charges */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-500">
            <span>Gateway Fees</span>
            <Receipt className="h-4 w-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono">7 Fee Rules</div>
          <p className="text-[11px] text-slate-500 font-medium">
            Terminal, screening, X-ray &amp; statutory taxes
          </p>
        </div>

        {/* Metric 3: Monitored Corridors */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-500">
            <span>Trade Corridors</span>
            <Network className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono">104 Airports</div>
          <p className="text-[11px] text-slate-500 font-medium">
            Authentic IATA ports across 6 global regions
          </p>
        </div>

        {/* Metric 4: Calculation Engine */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-500">
            <span>Rate Engine</span>
            <ShieldCheck className="h-4 w-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono">Live</div>
          <p className="text-[11px] text-slate-500 font-medium">
            Sub-millisecond pure buy rate discovery
          </p>
        </div>
      </div>

      {/* Administrative Modules Grid */}
      <div className="space-y-3">
        <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
          Administrative Modules
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Card 1: Rate Sheets */}
          <Link
            href="/admin/tariffs"
            className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-xs hover:border-slate-300 hover:shadow-card transition-all flex items-start gap-4 cursor-pointer"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-jfll-blue group-hover:bg-jfll-blue group-hover:text-white transition-colors shrink-0">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 group-hover:text-jfll-blue transition-colors">
                  Airline Rate Sheets
                </h3>
                <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-jfll-blue group-hover:translate-x-0.5 transition-all" />
              </div>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Ingest PDF rate circulars, verify extracted weight breaks (+45kg, +100kg, +250kg, +300kg), and publish to live quotation desk.
              </p>
            </div>
          </Link>

          {/* Card 2: Charges & Surcharges */}
          <Link
            href="/admin/charges"
            className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-xs hover:border-slate-300 hover:shadow-card transition-all flex items-start gap-4 cursor-pointer"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-700 group-hover:bg-amber-500 group-hover:text-white transition-colors shrink-0">
              <Receipt className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 group-hover:text-amber-700 transition-colors">
                  Charges &amp; Surcharges Engine
                </h3>
                <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-amber-600 group-hover:translate-x-0.5 transition-all" />
              </div>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Configure baseline and airline-specific dynamic fees (Fuel, Security, Screening, X-Ray) dynamically evaluated by the pure buy rate engine.
              </p>
            </div>
          </Link>

          {/* Card 3: Corridors & Port Directory */}
          <Link
            href="/admin/corridors"
            className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-xs hover:border-slate-300 hover:shadow-card transition-all flex items-start gap-4 cursor-pointer"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 group-hover:bg-emerald-600 group-hover:text-white transition-colors shrink-0">
              <Network className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
                  Corridors &amp; Port Directory
                </h3>
                <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-all" />
              </div>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Inspect 104 export destinations ex-BOM with paginated tables, search filtering, and active carrier coverage.
              </p>
            </div>
          </Link>

          {/* Card 4: Security & Governance */}
          <Link
            href="/admin/security"
            className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-xs hover:border-slate-300 hover:shadow-card transition-all flex items-start gap-4 cursor-pointer"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-700 group-hover:bg-slate-900 group-hover:text-white transition-colors shrink-0">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 group-hover:text-slate-700 transition-colors">
                  Security &amp; Governance
                </h3>
                <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-slate-700 group-hover:translate-x-0.5 transition-all" />
              </div>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Role permissions and authorization access matrix for commercial rate desks.
              </p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
