"use client";

import React from "react";
import Link from "next/link";
import { Receipt, Plus, ShieldCheck, ShieldAlert, Sparkles, Sliders } from "lucide-react";
import { useAdminRole } from "@/context/AdminRoleContext";

export default function AdminChargesPage() {
  const { isPricingHead } = useAdminRole();

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
            Charges & Surcharges Engine
          </h1>
          <p className="text-xs text-slate-600 font-medium">
            Dynamic fuel surcharges (FSC), security (SSC), screening, and handling fees applied to pure buy rates.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isPricingHead ? (
            <button
              type="button"
              disabled
              title="Full charge creation modal will be unlocked in Task 6"
              className="inline-flex items-center gap-1.5 rounded-xl bg-obsidian-950 px-4 py-2 text-xs font-bold text-amber-400 opacity-90 shadow-xs cursor-not-allowed"
            >
              <Plus className="h-4 w-4" />
              <span>+ Add Custom Charge</span>
            </button>
          ) : (
            <div className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-500">
              <ShieldAlert className="h-3.5 w-3.5 text-slate-400" />
              <span>Read-Only Preview</span>
            </div>
          )}
        </div>
      </div>

      {/* Role Notice */}
      <div
        className={`rounded-xl border p-4 text-xs ${
          isPricingHead
            ? "border-amber-200 bg-amber-50/70 text-amber-900"
            : "border-sky-200 bg-sky-50 text-sky-900"
        }`}
      >
        <div className="flex items-center gap-2">
          <ShieldCheck className={`h-4 w-4 ${isPricingHead ? "text-amber-700" : "text-sky-700"}`} />
          <span className="font-bold">
            {isPricingHead
              ? "Pricing Team Head Authorized:"
              : "Pricing Coordinator Simulation:"}
          </span>
          <span>
            {isPricingHead
              ? "You possess write permissions to create, edit, and toggle active status on all surcharge rules."
              : "Read-only access. Mutation controls are disabled in preview mode."}
          </span>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
            <span>Baseline Rules</span>
            <Receipt className="h-4 w-4 text-jfll-blue" />
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono">5 Rules</div>
          <p className="text-xs text-slate-500 mt-1">
            System defaults: FSC, SSC, Screening, X-Ray, Terminal Handling.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
            <span>Evaluation Mode</span>
            <Sliders className="h-4 w-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono">Dynamic</div>
          <p className="text-xs text-slate-500 mt-1">
            Pure Buy Engine dynamically evaluates per-kg and flat fee rules per corridor.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
            <span>CRUD Desk</span>
            <Sparkles className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="text-sm font-bold text-emerald-700 mt-1">Ready for Task 6</div>
          <p className="text-xs text-slate-500 mt-1">
            Full interactive modal &amp; table interface will mount here in Task 6.
          </p>
        </div>
      </div>

      {/* Information Banner */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
        <h3 className="text-sm font-bold text-slate-900 mb-2">
          Configurable Surcharges Architecture
        </h3>
        <p className="text-xs text-slate-600 leading-relaxed">
          Air cargo buy rates are composed of base weight-break freight tariffs plus mandatory ancillary fees:
          Fuel Surcharge (FSC), Security Surcharge (SSC), Screening, and Terminal Handling. All rules are managed through the RBAC-protected API (<code className="font-mono bg-slate-100 px-1 py-0.5 rounded text-slate-800">/api/admin/charges</code>).
        </p>
      </div>
    </div>
  );
}
