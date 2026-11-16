"use client";

import React from "react";
import { Users, Check, X, ShieldCheck } from "lucide-react";

export default function AdminSecurityPage() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
            Governance &amp; Access Policies
          </h1>
          <p className="text-xs text-slate-600 font-medium mt-0.5">
            Operational permissions and commercial authorization policies for tariff, corridor, and surcharge administration.
          </p>
        </div>

        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white border border-slate-200/90 shadow-2xs text-xs font-semibold text-slate-700 shrink-0">
          <ShieldCheck className="h-4 w-4 text-emerald-600" />
          <span>Access Control Active</span>
        </div>
      </div>

      {/* Permissions Matrix Table */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center gap-2">
          <Users className="h-4 w-4 text-jfll-blue" />
          <h2 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
            Commercial Permission Matrix
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-semibold text-slate-700">
            <thead className="bg-slate-50 text-[10px] font-extrabold text-slate-500 uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Capability / Operation</th>
                <th className="px-4 py-3">Admin Portal</th>
                <th className="px-4 py-3">Public Quoting Desk</th>
                <th className="px-4 py-3">Security Policy</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              <tr className="hover:bg-slate-50/70 transition-colors">
                <td className="px-4 py-3 font-bold text-slate-900">
                  Live Pure Buy Rate Quotation Desk
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
                <td className="px-4 py-3 text-slate-500 text-xs">Public Operations Desk</td>
              </tr>

              <tr className="hover:bg-slate-50/70 transition-colors">
                <td className="px-4 py-3 font-bold text-slate-900">
                  Access Commercial Administration Portal
                </td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-1 text-emerald-700 font-bold">
                    <Check className="h-4 w-4 text-emerald-600" /> Allowed
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-1 text-slate-500 font-medium">
                    Restricted
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-500 text-xs">Admin Verification</td>
              </tr>

              <tr className="hover:bg-slate-50/70 transition-colors">
                <td className="px-4 py-3 font-bold text-slate-900">
                  View Active Gateway Charges &amp; Surcharges
                </td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-1 text-emerald-700 font-bold">
                    <Check className="h-4 w-4 text-emerald-600" /> Allowed
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-1 text-emerald-700 font-bold">
                    <Check className="h-4 w-4 text-emerald-600" /> Allowed (Quoting Read-Only)
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-500 text-xs">Standard Tariff Policy</td>
              </tr>

              <tr className="hover:bg-slate-50/70 transition-colors">
                <td className="px-4 py-3 font-bold text-slate-900">
                  Create, Modify &amp; Toggle Surcharge Rules
                </td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-1 text-emerald-700 font-bold">
                    <Check className="h-4 w-4 text-emerald-600" /> Full Access
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-1 text-rose-700 font-bold">
                    <X className="h-4 w-4 text-rose-600" /> Denied
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-500 text-xs">Admin Key Protected</td>
              </tr>

              <tr className="hover:bg-slate-50/70 transition-colors">
                <td className="px-4 py-3 font-bold text-slate-900">
                  Delete Custom Charges &amp; Deactivate Fees
                </td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-1 text-emerald-700 font-bold">
                    <Check className="h-4 w-4 text-emerald-600" /> Full Access
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-1 text-rose-700 font-bold">
                    <X className="h-4 w-4 text-rose-600" /> Denied
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-500 text-xs">Admin Key Protected</td>
              </tr>

              <tr className="hover:bg-slate-50/70 transition-colors">
                <td className="px-4 py-3 font-bold text-slate-900">
                  Ingest, Replace &amp; Publish Airline Tariffs
                </td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-1 text-emerald-700 font-bold">
                    <Check className="h-4 w-4 text-emerald-600" /> Full Access
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-1 text-rose-700 font-bold">
                    <X className="h-4 w-4 text-rose-600" /> Denied
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-500 text-xs">Admin Key Protected</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
