import React from "react";
import Link from "next/link";
import { Compass } from "lucide-react";

export function CalculatorHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/90 bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 py-2.5 sm:py-3">
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
            <h1 className="text-sm sm:text-base font-black tracking-tight text-obsidian-900">
              JET FREIGHT
            </h1>
            <p className="hidden sm:block text-xs font-medium text-slate-500">
              Air Cargo Rate Aggregator &bull; BOM Mumbai Hub (&lt; 500kg)
            </p>
          </div>
        </Link>

        {/* Quiet Origin Status Indicator */}
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
          <span className="relative flex h-2 w-2 shrink-0" aria-hidden="true">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
          </span>
          <span className="font-mono text-[11px] text-slate-700 font-bold whitespace-nowrap">
            <span className="hidden sm:inline">BOM Hub (CSMIA)</span>
            <span className="sm:hidden">BOM</span>
          </span>
        </div>
      </div>
    </header>
  );
}
