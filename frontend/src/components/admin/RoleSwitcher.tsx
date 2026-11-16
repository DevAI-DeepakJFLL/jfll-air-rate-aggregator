"use client";

import React from "react";
import { Crown, Eye } from "lucide-react";
import { useAdminRole } from "@/context/AdminRoleContext";

export default function RoleSwitcher() {
  const { setRole, isPricingHead } = useAdminRole();

  return (
    <div
      role="group"
      aria-label="Admin Role Switcher"
      className="inline-flex items-center p-1 rounded-xl bg-slate-100 border border-slate-200 shadow-2xs"
    >
      {/* Pricing Team Head */}
      <button
        type="button"
        onClick={() => setRole("PRICING_HEAD")}
        aria-pressed={isPricingHead}
        title="Pricing Team Head"
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
          isPricingHead
            ? "bg-obsidian-950 text-amber-400 shadow-xs border border-obsidian-900"
            : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
        }`}
      >
        <Crown className={`h-3.5 w-3.5 ${isPricingHead ? "text-amber-400" : "text-slate-400"}`} />
        <span className="hidden sm:inline">Pricing Team Head</span>
        <span className="sm:hidden">Head</span>
      </button>

      {/* Pricing Coordinator */}
      <button
        type="button"
        onClick={() => setRole("COORDINATOR")}
        aria-pressed={!isPricingHead}
        title="Pricing Coordinator"
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
          !isPricingHead
            ? "bg-obsidian-950 text-sky-300 shadow-xs border border-obsidian-900"
            : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
        }`}
      >
        <Eye className={`h-3.5 w-3.5 ${!isPricingHead ? "text-sky-300" : "text-slate-400"}`} />
        <span className="hidden sm:inline">Pricing Coordinator</span>
        <span className="sm:hidden">Coord</span>
      </button>
    </div>
  );
}
