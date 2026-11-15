"use client";

import React, { useState, useMemo } from "react";
import {
  Edit3,
  Trash2,
  AlertTriangle,
  Search,
  Filter,
  Shield,
  Lock,
} from "lucide-react";
import { ChargeRule, ChargeCategory } from "@/types/charge";
import { useAdminRole } from "@/context/AdminRoleContext";

interface ChargesConfigTableProps {
  charges: ChargeRule[];
  isLoading: boolean;
  onEdit: (charge: ChargeRule) => void;
  onToggleActive: (charge: ChargeRule) => Promise<void>;
  onDelete: (charge: ChargeRule) => Promise<void>;
}

export default function ChargesConfigTable({
  charges,
  isLoading,
  onEdit,
  onToggleActive,
  onDelete,
}: ChargesConfigTableProps) {
  const { isPricingHead } = useAdminRole();

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");

  // Interaction State
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [chargeToDelete, setChargeToDelete] = useState<ChargeRule | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Filtered charges
  const filteredCharges = useMemo(() => {
    return charges
      .filter((c) => {
        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchCode = c.code.toLowerCase().includes(q);
          const matchName = c.name.toLowerCase().includes(q);
          const matchDesc = (c.description || "").toLowerCase().includes(q);
          if (!matchCode && !matchName && !matchDesc) return false;
        }

        // Category filter
        if (selectedCategory !== "ALL" && c.category !== selectedCategory) {
          return false;
        }

        // Status filter
        if (statusFilter === "ACTIVE" && !c.is_active) return false;
        if (statusFilter === "INACTIVE" && c.is_active) return false;

        return true;
      })
      .sort((a, b) => a.display_order - b.display_order);
  }, [charges, searchQuery, selectedCategory, statusFilter]);

  // Handle toggle active
  const handleToggle = async (charge: ChargeRule) => {
    if (!isPricingHead || togglingId) return;
    setTogglingId(charge.id);
    try {
      await onToggleActive(charge);
    } finally {
      setTogglingId(null);
    }
  };

  // Handle confirm delete
  const handleConfirmDelete = async () => {
    if (!chargeToDelete || !isPricingHead) return;
    setIsDeleting(true);
    try {
      await onDelete(chargeToDelete);
      setChargeToDelete(null);
    } finally {
      setIsDeleting(false);
    }
  };

  // Helper: Category badge styling
  const getCategoryBadge = (cat: ChargeCategory) => {
    switch (cat) {
      case "TERMINAL":
        return "bg-sky-50 text-sky-700 border-sky-200";
      case "COMMODITY":
        return "bg-teal-50 text-teal-800 border-teal-200";
      case "DOCUMENTATION":
        return "bg-indigo-50 text-indigo-700 border-indigo-200";
      case "CUSTOMS":
        return "bg-teal-50 text-teal-700 border-teal-200";
      case "STATUTORY_TAX":
        return "bg-amber-50 text-amber-800 border-amber-200";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  // Helper: Formula display text
  const formatFormula = (charge: ChargeRule) => {
    switch (charge.calculation_type) {
      case "PER_KG_WITH_MIN":
        return (
          <div className="font-mono text-xs">
            <span className="font-bold text-slate-900">
              ₹{Number(charge.rate_per_kg ?? 0).toFixed(2)}
            </span>
            <span className="text-slate-500"> / kg</span>
            {charge.min_amount != null && (
              <span className="block text-[11px] text-slate-500">
                Min: ₹{Number(charge.min_amount).toLocaleString("en-IN")}
              </span>
            )}
          </div>
        );
      case "FLAT":
        return (
          <div className="font-mono text-xs font-bold text-slate-900">
            <span>Flat ₹{Number(charge.flat_amount ?? 0).toLocaleString("en-IN")}</span>
          </div>
        );
      case "PERCENTAGE":
        return (
          <div className="font-mono text-xs">
            <span className="font-bold text-amber-900">
              {Number(charge.percentage_rate ?? 0).toFixed(1)}%
            </span>
            <span className="text-slate-500"> of Freight</span>
          </div>
        );
      case "PER_PIECE":
        return (
          <div className="font-mono text-xs">
            <span className="font-bold text-slate-900">
              ₹{Number(charge.rate_per_piece ?? 0).toFixed(2)}
            </span>
            <span className="text-slate-500"> / piece</span>
          </div>
        );
      default:
        return <span className="text-slate-500 font-mono text-xs">N/A</span>;
    }
  };

  // Helper: Applicability display
  const formatApplicability = (charge: ChargeRule) => {
    const app = charge.applicability || {};
    const items: React.ReactNode[] = [];

    // Corridor
    if (app.corridor_scope === "GLOBAL") {
      items.push(
        <span key="corridor" className="text-slate-700 font-medium">
          Global (All Hubs)
        </span>
      );
    } else {
      const dests = app.destination_codes || [];
      items.push(
        <span key="corridor" className="text-slate-900 font-semibold" title={dests.join(", ")}>
          {app.corridor_scope === "SPECIFIC_PORTS" ? "Ports: " : "Countries: "}
          {dests.slice(0, 3).join(", ")}
          {dests.length > 3 && ` +${dests.length - 3}`}
        </span>
      );
    }

    // Commodity
    if (app.commodity_scope === "SPECIFIC_COMMODITIES") {
      const kws = app.commodity_keywords || [];
      items.push(
        <span
          key="commodity"
          className="inline-block bg-teal-50 text-teal-800 border border-teal-200 px-1.5 py-0.5 rounded text-[10px] font-bold"
        >
          {kws.join(", ")}
        </span>
      );
    }

    // Min CW
    if (app.min_chargeable_weight != null && app.min_chargeable_weight > 0) {
      items.push(
        <span key="min_cw" className="text-[10px] text-slate-500 font-mono">
          Min CW: {app.min_chargeable_weight}kg
        </span>
      );
    }

    return <div className="flex flex-col gap-0.5 text-xs">{items}</div>;
  };

  return (
    <div className="space-y-3">
      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by code, name, or keywords..."
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-1 text-slate-900 placeholder-slate-400 font-medium"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          {/* Category Dropdown */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider hidden md:inline">
              Category:
            </span>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="text-xs rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 font-semibold text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-1"
            >
              <option value="ALL">All Categories</option>
              <option value="TERMINAL">Terminal Handling</option>
              <option value="COMMODITY">Commodity Specific</option>
              <option value="DOCUMENTATION">Documentation</option>
              <option value="CUSTOMS">Customs / ICEGATE</option>
              <option value="STATUTORY_TAX">Statutory Tax (GST)</option>
              <option value="OTHER">Other Ancillaries</option>
            </select>
          </div>

          {/* Status Segment */}
          <div className="flex items-center rounded-lg border border-slate-200 bg-slate-100 p-0.5 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setStatusFilter("ALL")}
              className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                statusFilter === "ALL"
                  ? "bg-white text-slate-900 shadow-2xs font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("ACTIVE")}
              className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                statusFilter === "ACTIVE"
                  ? "bg-white text-emerald-800 shadow-2xs font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Active
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("INACTIVE")}
              className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                statusFilter === "INACTIVE"
                  ? "bg-white text-slate-700 shadow-2xs font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Inactive
            </button>
          </div>
        </div>
      </div>

      {/* High-Density Charges Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-2xs overflow-hidden">
        <div
          className="overflow-x-auto focus-visible:outline-2 focus-visible:outline-sky-600"
          tabIndex={0}
          role="region"
          aria-label="Statutory and gateway charges list"
        >
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                <th className="py-2.5 px-3.5 w-12 text-center">#</th>
                <th className="py-2.5 px-3.5 w-28">Code</th>
                <th className="py-2.5 px-3.5 min-w-[200px]">Charge Details</th>
                <th className="py-2.5 px-3.5 w-36">Category</th>
                <th className="py-2.5 px-3.5 min-w-[150px]">Formula &amp; Rate</th>
                <th className="py-2.5 px-3.5 min-w-[160px]">Applicability</th>
                <th className="py-2.5 px-3.5 w-24 text-center">Status</th>
                <th className="py-2.5 px-3.5 w-28 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="h-6 w-6 border-2 border-jfll-blue border-t-transparent rounded-full animate-spin" />
                      <span className="text-xs font-semibold">Loading statutory &amp; gateway charges...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredCharges.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    <div className="max-w-sm mx-auto space-y-1">
                      <p className="font-bold text-slate-800 text-sm">No charges match your filters</p>
                      <p className="text-xs text-slate-500">
                        Try resetting your search query or selecting &quot;All Categories&quot;.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredCharges.map((charge) => {
                  const isToggling = togglingId === charge.id;
                  return (
                    <tr
                      key={charge.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        !charge.is_active ? "opacity-60 bg-slate-50/40" : ""
                      }`}
                    >
                      {/* Order */}
                      <td className="py-2.5 px-3.5 text-center font-mono text-slate-500 font-medium text-[11px]">
                        {charge.display_order}
                      </td>

                      {/* Code */}
                      <td className="py-2.5 px-3.5">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-slate-800 text-xs">
                            {charge.code}
                          </span>
                          {charge.is_statutory && (
                            <span title="Statutory Charge">
                              <Shield className="h-3 w-3 text-amber-600 shrink-0" />
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Charge Details (Name + Description) */}
                      <td className="py-2.5 px-3.5">
                        <div className="space-y-0.5">
                          <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                            <span>{charge.name}</span>
                          </div>
                          {charge.description && (
                            <p className="text-[11px] text-slate-500 line-clamp-1" title={charge.description}>
                              {charge.description}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-2.5 px-3.5 text-xs font-semibold text-slate-600">
                        {charge.category}
                      </td>

                      {/* Formula & Rate */}
                      <td className="py-2.5 px-3.5">{formatFormula(charge)}</td>

                      {/* Applicability */}
                      <td className="py-2.5 px-3.5">{formatApplicability(charge)}</td>

                      {/* Status Toggle Switch */}
                      <td className="py-2.5 px-3.5 text-center">
                        <button
                          type="button"
                          role="switch"
                          aria-checked={charge.is_active}
                          aria-label={`Toggle active status for charge ${charge.code}`}
                          disabled={!isPricingHead || isToggling}
                          onClick={() => handleToggle(charge)}
                          title={
                            isPricingHead
                              ? charge.is_active
                                ? "Click to deactivate charge"
                                : "Click to activate charge"
                              : "Read-only: Pricing Head required to toggle"
                          }
                          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 ${
                            charge.is_active ? "bg-emerald-600" : "bg-slate-300"
                          } disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                              charge.is_active ? "translate-x-4" : "translate-x-0"
                            }`}
                          />
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="py-2.5 px-3.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => onEdit(charge)}
                            title={isPricingHead ? "Edit Charge Configuration" : "View Charge Details (Read-only)"}
                            className="rounded-lg p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>

                          {isPricingHead ? (
                            <button
                              type="button"
                              onClick={() => setChargeToDelete(charge)}
                              title="Delete / Deactivate Charge"
                              className="rounded-lg p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          ) : (
                            <button
                              type="button"
                              disabled
                              title="Delete restricted to Pricing Team Head"
                              className="rounded-lg p-1.5 text-slate-300 cursor-not-allowed"
                            >
                              <Lock className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer info banner */}
        <div className="bg-slate-50/80 border-t border-slate-200 px-4 py-2 text-[11px] text-slate-500 flex items-center justify-between">
          <span>
            Showing <strong>{filteredCharges.length}</strong> of <strong>{charges.length}</strong> charges
          </span>
          <span className="font-mono text-slate-600 font-medium">Hub: BOM / MIAL T2</span>
        </div>
      </div>

      {/* Delete / Deactivate Confirmation Dialog */}
      {chargeToDelete && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
            onClick={() => !isDeleting && setChargeToDelete(null)}
          />
          <div className="relative bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-rose-100 border border-rose-200 flex items-center justify-center text-rose-600 shrink-0">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">
                  Confirm Charge Removal
                </h3>
                <p className="text-xs text-slate-500">
                  {chargeToDelete.is_statutory
                    ? "Statutory baseline charge will be deactivated"
                    : "Custom surcharge will be permanently deleted"}
                </p>
              </div>
            </div>

            <div className="rounded-xl bg-slate-50 border border-slate-200 p-3.5 text-xs text-slate-700 space-y-1">
              <div className="font-bold text-slate-900 flex items-center gap-2">
                <span className="font-mono bg-slate-200 px-1.5 py-0.5 rounded text-[11px]">
                  {chargeToDelete.code}
                </span>
                <span>{chargeToDelete.name}</span>
              </div>
              <p className="text-[11px] text-slate-500">
                {chargeToDelete.description || "No description provided."}
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setChargeToDelete(null)}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 px-4 py-2 text-xs font-bold text-white shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? (
                  <span>Deleting...</span>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4" />
                    <span>Confirm Delete</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
