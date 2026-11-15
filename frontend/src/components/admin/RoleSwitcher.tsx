"use client";

import React from "react";
import { Crown, Eye, ShieldCheck, ShieldAlert } from "lucide-react";
import { useAdminRole } from "@/context/AdminRoleContext";

export default function RoleSwitcher() {
  const { role, setRole, isPricingHead } = useAdminRole();

  return (
    <div className="flex items-center gap-2">
      <div
        role="group"
        aria-label="Role Simulation Switcher"
        className="inline-flex items-center p-1 rounded-xl bg-slate-100 border border-slate-200 shadow-2xs"
      >
        {/* Pricing Team Head */}
        <button
          type="button"
          onClick={() => setRole("PRICING_HEAD")}
          aria-pressed={isPricingHead}
          title="Simulate Pricing Team Head: Full Read/Write Permissions"
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            isPricingHead
              ? "bg-obsidian-950 text-amber-400 shadow-xs border border-obsidian-900 ring-1 ring-amber-400/30"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
          }`}
        >
          <Crown className={`h-3.5 w-3.5 ${isPricingHead ? "text-amber-400" : "text-slate-400"}`} />
          <span className="hidden sm:inline">Pricing Team Head</span>
          <span className="sm:hidden">Head</span>
          <span
            className={`hidden md:inline-block text-[10px] px-1.5 py-0.2 rounded font-extrabold ${
              isPricingHead
                ? "bg-amber-400/20 text-amber-300 border border-amber-400/30"
                : "text-slate-400"
            }`}
          >
            Full Access
          </span>
        </button>

        {/* Pricing Coordinator */}
        <button
          type="button"
          onClick={() => setRole("COORDINATOR")}
          aria-pressed={!isPricingHead}
          title="Simulate Pricing Coordinator: Read-Only Operations Preview"
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            !isPricingHead
              ? "bg-obsidian-950 text-sky-300 shadow-xs border border-obsidian-900 ring-1 ring-sky-400/30"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
          }`}
        >
          <Eye className={`h-3.5 w-3.5 ${!isPricingHead ? "text-sky-300" : "text-slate-400"}`} />
          <span className="hidden sm:inline">Pricing Coordinator</span>
          <span className="sm:hidden">Coord</span>
          <span
            className={`hidden md:inline-block text-[10px] px-1.5 py-0.2 rounded font-extrabold ${
              !isPricingHead
                ? "bg-sky-400/20 text-sky-200 border border-sky-400/30"
                : "text-slate-400"
            }`}
          >
            Read-Only
          </span>
        </button>
      </div>

      {/* Role State Indicator Pill */}
      <div className="hidden xl:flex items-center gap-1.5 text-[11px] font-semibold px-2 py-1 rounded-lg border bg-white border-slate-200 shadow-2xs">
        {isPricingHead ? (
          <>
            <span className="h-2 w-2 rounded-full bg-amber-400 ring-2 ring-amber-400/20 animate-pulse" />
            <span className="text-slate-700">RBAC:</span>
            <span className="font-bold text-amber-800">Admin Mode</span>
          </>
        ) : (
          <>
            <span className="h-2 w-2 rounded-full bg-sky-400 ring-2 ring-sky-400/20" />
            <span className="text-slate-700">RBAC:</span>
            <span className="font-bold text-sky-700">Preview Mode</span>
          </>
        )}
      </div>
    </div>
  );
}
