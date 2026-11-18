import React from "react";
import Link from "next/link";
import { JfllLogo } from "@/components/common/BrandAssets";

export function CalculatorHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/90 bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 py-2.5 sm:py-3">
        {/* Brand Identity / Home Anchor */}
        <Link
          href="/"
          className="flex items-center gap-3 focus-ring rounded-xl group min-w-0"
          aria-label="Jet Freight Logistics Home"
        >
          <JfllLogo
            size="md"
            variant="badge"
            className="group-hover:border-jfll-blue group-hover:shadow-xs transition-all"
          />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm sm:text-base font-black tracking-tight text-obsidian-900">
                JET FREIGHT
              </span>
              <span className="hidden md:inline-flex items-center text-[10px] font-extrabold uppercase tracking-wider text-jfll-blue bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200/60">
                Rate Aggregator
              </span>
            </div>
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
