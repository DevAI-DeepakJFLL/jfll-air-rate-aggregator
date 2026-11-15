"use client";

import React from "react";
import { ShieldCheck, Lock, Key, Users, Check, X, ShieldAlert } from "lucide-react";
import { useAdminRole } from "@/context/AdminRoleContext";

export default function AdminSecurityPage() {
  const { role, isPricingHead } = useAdminRole();

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
            Security &amp; Role-Based Access Control (RBAC)
          </h1>
          <p className="text-xs text-slate-600 font-medium">
            Commercial governance policies, permission tiers, and audit trail ledger for tariff alterations.
          </p>
        </div>
      </div>

      {/* Active Role Simulation Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-obsidian-950 text-amber-400">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Active Client Simulation Profile
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Changes in the top bar switch the local state and the <code className="font-mono text-slate-800 bg-slate-100 px-1 py-0.5 rounded">X-Admin-Role</code> header.
              </p>
            </div>
          </div>

          <div>
            {isPricingHead ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-400/10 px-3 py-1 text-xs font-bold text-amber-800 border border-amber-400/30">
                <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                PRICING_HEAD (Full Access)
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-50 px-3 py-1 text-xs font-bold text-sky-800 border border-sky-300">
                <span className="h-2 w-2 rounded-full bg-sky-500" />
                COORDINATOR (Read-Only)
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
            <div className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">
              Effective Role
            </div>
            <div className="font-mono font-extrabold text-slate-900 text-sm">
              {role}
            </div>
            <div className="text-[11px] text-slate-500">
              {isPricingHead ? "Senior commercial oversight" : "Standard quotation desk"}
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
            <div className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">
              Mutations Permitted
            </div>
            <div className={`font-mono font-extrabold text-sm ${isPricingHead ? "text-emerald-700" : "text-rose-700"}`}>
              {isPricingHead ? "YES (POST / PUT / DELETE)" : "NO (Blocked by RBAC)"}
            </div>
            <div className="text-[11px] text-slate-500">
              {isPricingHead ? "Can publish rates and update charges" : "Mutations return HTTP 403 Forbidden"}
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
            <div className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">
              API Header Dispatched
            </div>
            <div className="font-mono font-extrabold text-slate-900 text-sm">
              X-Admin-Role: {role}
            </div>
            <div className="text-[11px] text-slate-500">
              Validated on backend RBAC middleware
            </div>
          </div>
        </div>
      </div>

      {/* Permissions Matrix Table */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center gap-2">
          <Users className="h-4 w-4 text-jfll-blue" />
          <h2 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
            Role Permission Matrix
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-semibold text-slate-700">
            <thead className="bg-slate-50 text-[10px] font-extrabold text-slate-500 uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Capability / Operation</th>
                <th className="px-4 py-3">Pricing Team Head</th>
                <th className="px-4 py-3">Pricing Coordinator</th>
                <th className="px-4 py-3">Enforcement Layer</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              <tr className="hover:bg-slate-50/70 transition-colors">
                <td className="px-4 py-3 font-bold text-slate-900">
                  Search &amp; Calculate Pure Buy Rates (<code className="font-mono text-slate-600">/</code>)
                </td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-1 text-emerald-700 font-bold">
                    <Check className="h-4 w-4 text-emerald-600" /> Allowed
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-1 text-emerald-700 font-bold">
                    <Check className="h-4 w-4 text-emerald-600" /> Allowed
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-500 font-mono text-[11px]">Public Client</td>
              </tr>

              <tr className="hover:bg-slate-50/70 transition-colors">
                <td className="px-4 py-3 font-bold text-slate-900">
                  Access Admin CRM Suite (<code className="font-mono text-slate-600">/admin/*</code>)
                </td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-1 text-emerald-700 font-bold">
                    <Check className="h-4 w-4 text-emerald-600" /> Allowed
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-1 text-emerald-700 font-bold">
                    <Check className="h-4 w-4 text-emerald-600" /> Allowed (Read-only)
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-500 font-mono text-[11px]">Admin Layout Shell</td>
              </tr>

              <tr className="hover:bg-slate-50/70 transition-colors">
                <td className="px-4 py-3 font-bold text-slate-900">
                  Read Configured Charges (<code className="font-mono text-slate-600">GET /api/admin/charges</code>)
                </td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-1 text-emerald-700 font-bold">
                    <Check className="h-4 w-4 text-emerald-600" /> Allowed
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-1 text-emerald-700 font-bold">
                    <Check className="h-4 w-4 text-emerald-600" /> Allowed
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-500 font-mono text-[11px]">RBAC Dependency</td>
              </tr>

              <tr className="hover:bg-slate-50/70 transition-colors">
                <td className="px-4 py-3 font-bold text-slate-900">
                  Create / Edit / Toggle Charges (<code className="font-mono text-slate-600">POST / PUT</code>)
                </td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-1 text-emerald-700 font-bold">
                    <Check className="h-4 w-4 text-emerald-600" /> Full Access
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-1 text-rose-700 font-bold">
                    <X className="h-4 w-4 text-rose-600" /> Denied (403)
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-500 font-mono text-[11px]">require_pricing_head</td>
              </tr>

              <tr className="hover:bg-slate-50/70 transition-colors">
                <td className="px-4 py-3 font-bold text-slate-900">
                  Delete Custom Charges (<code className="font-mono text-slate-600">DELETE</code>)
                </td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-1 text-emerald-700 font-bold">
                    <Check className="h-4 w-4 text-emerald-600" /> Full Access
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-1 text-rose-700 font-bold">
                    <X className="h-4 w-4 text-rose-600" /> Denied (403)
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-500 font-mono text-[11px]">require_pricing_head</td>
              </tr>

              <tr className="hover:bg-slate-50/70 transition-colors">
                <td className="px-4 py-3 font-bold text-slate-900">
                  Approve &amp; Publish Airline Tariffs to Live
                </td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-1 text-emerald-700 font-bold">
                    <Check className="h-4 w-4 text-emerald-600" /> Full Access
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-1 text-rose-700 font-bold">
                    <X className="h-4 w-4 text-rose-600" /> Denied (Preview Only)
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-500 font-mono text-[11px]">UI &amp; Ingestion Guard</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
