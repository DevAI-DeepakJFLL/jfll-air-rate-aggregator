"use client";

import React from "react";
import Link from "next/link";
import {
  FileSpreadsheet,
  Receipt,
  Network,
  ShieldCheck,
  ArrowRight,
} from "lucide-react";
import { useAdminRole } from "@/context/AdminRoleContext";

export default function AdminDashboardPage() {
  const { role, isPricingHead } = useAdminRole();

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="rounded-2xl border border-obsidian-800 bg-obsidian-950 p-6 text-white shadow-card relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-amber-400/10 to-transparent pointer-events-none" />
        <div className="relative z-10 max-w-2xl space-y-2">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-400/10 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-amber-400 border border-amber-400/30">
            Jet Freight Mumbai Hub (BOM) &bull; Commercial Control Desk
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">
            Commercial Tariff &amp; Surcharge Management
          </h1>
          <p className="text-xs text-slate-300 font-medium leading-relaxed">
            Centralized air cargo administration for the &lt; 500kg Smalls Desk. Ingest carrier circulars, maintain baseline and airline-specific surcharges, and audit RBAC permissions in real time.
          </p>
        </div>

        {/* Current Active Role Simulator Pill */}
        <div className="mt-5 pt-4 border-t border-obsidian-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-medium">Active Simulation Mode:</span>
            {isPricingHead ? (
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-amber-400/20 px-2.5 py-1 font-bold text-amber-300 border border-amber-400/30">
                <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
                Pricing Team Head (Full Read / Write Access)
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-sky-500/20 px-2.5 py-1 font-bold text-sky-200 border border-sky-400/30">
                <span className="h-2 w-2 rounded-full bg-sky-400" />
                Pricing Coordinator (Read-Only Preview)
              </span>
            )}
          </div>

          <div className="text-[11px] text-slate-400 font-medium">
            Use the toggle in the top bar to simulate alternate RBAC tiers.
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-500">
            <span>Rate Sheets</span>
            <FileSpreadsheet className="h-4 w-4 text-jfll-blue" />
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono">12 Circulars</div>
          <p className="text-[11px] text-slate-500 font-medium">
            5 Carriers active on BOM Hub
          </p>
        </div>

        {/* Metric 2 */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-500">
            <span>Dynamic Surcharges</span>
            <Receipt className="h-4 w-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono">5 Active Rules</div>
          <p className="text-[11px] text-slate-500 font-medium">
            FSC, SSC, Screening &amp; Handling
          </p>
        </div>

        {/* Metric 3 */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-500">
            <span>Monitored Hubs</span>
            <Network className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono">24 Corridors</div>
          <p className="text-[11px] text-slate-500 font-medium">
            Direct &amp; 1-stop routes from BOM
          </p>
        </div>

        {/* Metric 4 */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-500">
            <span>Security &amp; RBAC</span>
            <ShieldCheck className="h-4 w-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono">Enforced</div>
          <p className="text-[11px] text-slate-500 font-medium">
            Header-based RBAC active
          </p>
        </div>
      </div>

      {/* Quick Action Navigation Grid */}
      <div>
        <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-3">
          Administrative Modules
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Card 1: Rate Sheets */}
          <Link
            href="/admin/tariffs"
            className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-xs hover:border-amber-400/50 hover:shadow-card transition-all flex items-start gap-4"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-700 group-hover:bg-amber-400 group-hover:text-obsidian-950 transition-colors shrink-0">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 group-hover:text-amber-700 transition-colors">
                  Airline Rate Sheet Ingestion
                </h3>
                <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-amber-600 group-hover:translate-x-0.5 transition-all" />
              </div>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Ingest PDF rate circulars, verify extracted weight breaks (+45kg, +100kg, +250kg, +300kg), and publish to live quotation desk.
              </p>
            </div>
          </Link>

          {/* Card 2: Charges & Surcharges */}
          <Link
            href="/admin/charges"
            className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-xs hover:border-amber-400/50 hover:shadow-card transition-all flex items-start gap-4"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-jfll-blue group-hover:bg-jfll-blue group-hover:text-white transition-colors shrink-0">
              <Receipt className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 group-hover:text-jfll-blue transition-colors">
                  Charges &amp; Surcharges Engine
                </h3>
                <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-jfll-blue group-hover:translate-x-0.5 transition-all" />
              </div>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Configure baseline and airline-specific dynamic fees (Fuel, Security, Screening, X-Ray) dynamically evaluated by the pure buy rate engine.
              </p>
            </div>
          </Link>

          {/* Card 3: Corridors */}
          <Link
            href="/admin/corridors"
            className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-xs hover:border-amber-400/50 hover:shadow-card transition-all flex items-start gap-4"
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
                Inspect Mumbai Hub (BOM) export corridors across GCC, Europe, Southeast Asia, and the Americas.
              </p>
            </div>
          </Link>

          {/* Card 4: Security & RBAC */}
          <Link
            href="/admin/security"
            className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-xs hover:border-amber-400/50 hover:shadow-card transition-all flex items-start gap-4"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-50 text-jfll-blue group-hover:bg-jfll-blue group-hover:text-white transition-colors shrink-0">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 group-hover:text-jfll-blue transition-colors">
                  Security &amp; RBAC Governance
                </h3>
                <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-jfll-blue group-hover:translate-x-0.5 transition-all" />
              </div>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Inspect role privileges, review security authorization headers, and audit mutation permissions across the operations team.
              </p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
