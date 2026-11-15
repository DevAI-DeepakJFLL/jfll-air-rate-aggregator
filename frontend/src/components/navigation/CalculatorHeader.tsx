import React from "react";
import Link from "next/link";
import { Compass, ShieldCheck } from "lucide-react";

export function CalculatorHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/90 bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-3 sm:px-6 py-2.5 sm:py-3">
        {/* Brand Identity / Home Anchor */}
        <Link
          href="/"
          className="flex items-center gap-2.5 sm:gap-3 focus-ring rounded-xl group min-w-0"
          aria-label="Jet Freight Logistics Home"
        >
          <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-obsidian-900 text-amber-400 shadow-sm group-hover:bg-aero-teal group-hover:text-white transition-all shrink-0">
            <Compass className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <h1 className="text-sm sm:text-base font-black tracking-tight text-obsidian-900">
                JET FREIGHT
              </h1>
              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[9px] sm:text-[10px] font-extrabold text-slate-600 tracking-wider">
                OPERATIONS
              </span>
            </div>
            <p className="hidden sm:block text-xs font-semibold text-slate-500">
              Air Cargo Rate Aggregator &bull;{" "}
              <span className="text-aero-teal font-bold">&lt; 500kg Smalls Desk</span>
            </p>
          </div>
        </Link>

        {/* Operational Indicators */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Gateway Operational Hub badge with green operational beacon */}
          <div className="inline-flex items-center gap-1.5 sm:gap-2 rounded-full border border-slate-200/80 bg-slate-50/80 px-2.5 sm:px-3 py-1 text-xs font-semibold text-slate-700 shadow-2xs">
            <span className="relative flex h-2 w-2 shrink-0" aria-hidden="true">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
            </span>
            <span className="font-mono text-[11px] text-slate-600 whitespace-nowrap">
              <span className="hidden sm:inline">BOM / CSMIA Mumbai Hub</span>
              <span className="sm:hidden">BOM Hub</span>
            </span>
          </div>

          {/* Trust Badge: Pure Net Buy (Zero Margin) */}
          <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-[11px] font-bold text-amber-900 border border-amber-200 shadow-2xs">
            <ShieldCheck className="h-3.5 w-3.5 text-amber-700 shrink-0" />
            <span>Pure Net Buy (Zero Margin)</span>
          </span>
        </div>
      </div>
    </header>
  );
}
