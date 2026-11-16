"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Receipt,
  Plus,
  RotateCcw,
  ShieldCheck,
  ShieldAlert,
  CheckCircle2,
  AlertCircle,
  Layers,
  Globe,
  Settings,
} from "lucide-react";
import { useAdminRole } from "@/context/AdminRoleContext";
import { ChargeRule } from "@/types/charge";
import {
  fetchCharges,
  updateCharge,
  deleteCharge,
  resetChargesToDefaults,
  getApiBase,
  setCustomApiUrl,
} from "@/lib/api-client";
import ChargesConfigTable from "@/components/admin/ChargesConfigTable";
import AddChargeDrawer from "@/components/admin/AddChargeDrawer";

// Baseline IDs tracked by default seed
const BASELINE_CHARGE_IDS = new Set([
  "chg_xray",
  "chg_carting",
  "chg_dgr",
  "chg_cold_chain",
  "chg_eawb",
  "chg_ams",
  "chg_gst",
]);

export default function AdminChargesPage() {
  const { role, isPricingHead } = useAdminRole();

  // Data state
  const [charges, setCharges] = useState<ChargeRule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Drawer state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingCharge, setEditingCharge] = useState<ChargeRule | null>(null);

  // Reset confirmation state
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  // Runtime API Endpoint override state
  const [showApiSettings, setShowApiSettings] = useState(false);
  const [apiEndpointInput, setApiEndpointInput] = useState("");

  useEffect(() => {
    setApiEndpointInput(getApiBase());
  }, []);

  const handleSaveApiUrl = (e: React.FormEvent) => {
    e.preventDefault();
    setCustomApiUrl(apiEndpointInput);
    setShowApiSettings(false);
    showToast("API Endpoint saved to browser storage. Reconnecting...");
    loadCharges();
  };

  const handleResetApiUrl = () => {
    setCustomApiUrl("");
    setApiEndpointInput(getApiBase());
    setShowApiSettings(false);
    showToast("Reset API Endpoint to default.");
    loadCharges();
  };

  // Show transient toast
  const showToast = useCallback((msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => {
      setSuccessToast((prev) => (prev === msg ? null : prev));
    }, 4000);
  }, []);

  // Fetch all charges
  const loadCharges = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const data = await fetchCharges(role, false);
      setCharges(data);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to load statutory charges.");
    } finally {
      setIsLoading(false);
    }
  }, [role]);

  useEffect(() => {
    loadCharges();
  }, [loadCharges]);

  // Handle open drawer for creation
  const handleOpenCreateDrawer = () => {
    if (!isPricingHead) return;
    setEditingCharge(null);
    setIsDrawerOpen(true);
  };

  // Handle open drawer for editing
  const handleOpenEditDrawer = (charge: ChargeRule) => {
    setEditingCharge(charge);
    setIsDrawerOpen(true);
  };

  // Handle toggle active status
  const handleToggleActive = async (charge: ChargeRule) => {
    try {
      const nextState = !charge.is_active;
      const updated = await updateCharge(charge.id, { is_active: nextState }, role);
      setCharges((prev) =>
        prev.map((c) => (c.id === updated.id ? updated : c))
      );
      showToast(
        `Charge '${charge.code}' is now ${nextState ? "Active" : "Inactive"}.`
      );
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to toggle charge status.");
    }
  };

  // Handle delete / deactivate charge
  const handleDeleteCharge = async (charge: ChargeRule) => {
    try {
      await deleteCharge(charge.id, role);
      // Reload charges to reflect whether it was removed or deactivated
      await loadCharges();
      showToast(
        charge.is_statutory
          ? `Statutory charge '${charge.code}' deactivated.`
          : `Custom charge '${charge.code}' permanently removed.`
      );
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to delete charge.");
    }
  };

  // Handle reset to baseline defaults
  const handleConfirmReset = async () => {
    setIsResetting(true);
    try {
      const resetList = await resetChargesToDefaults(role);
      setCharges(resetList);
      setIsResetConfirmOpen(false);
      showToast("All charges successfully restored to baseline MIAL ex-BOM tariffs.");
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to reset charges to defaults.");
    } finally {
      setIsResetting(false);
    }
  };

  // Handle drawer success callback
  const handleDrawerSuccess = (savedCharge: ChargeRule) => {
    setCharges((prev) => {
      const exists = prev.some((c) => c.id === savedCharge.id);
      if (exists) {
        return prev.map((c) => (c.id === savedCharge.id ? savedCharge : c));
      }
      return [...prev, savedCharge];
    });
    showToast(
      editingCharge
        ? `Charge '${savedCharge.code}' updated successfully.`
        : `Charge '${savedCharge.code}' created and published.`
    );
  };

  // Metrics computation
  const totalCharges = charges.length;
  const activeCharges = charges.filter((c) => c.is_active).length;
  const statutoryCharges = charges.filter((c) => c.is_statutory).length;
  const customAncillaries = charges.filter(
    (c) => !BASELINE_CHARGE_IDS.has(c.id)
  ).length;

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {successToast && (
        <div className="fixed bottom-6 right-6 z-50 rounded-xl bg-slate-900 border border-slate-700 px-4 py-3 text-xs font-semibold text-white shadow-xl flex items-center gap-2.5 animate-in slide-in-from-bottom-2 duration-200">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>{successToast}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <span>Statutory &amp; Gateway Charges</span>
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full">
              BOM Desk
            </span>
          </h1>
          <p className="text-xs text-slate-600 font-medium">
            Configure mandatory statutory taxes, MIAL gateway handling tariffs, and custom ancillary fees applied to airline pure buy rates.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Reset to Defaults Button */}
          {isPricingHead && (
            <button
              type="button"
              onClick={() => setIsResetConfirmOpen(true)}
              title="Restore factory baseline MIAL and statutory tariffs"
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-slate-900 shadow-2xs transition-all cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5 text-slate-500" />
              <span>Reset Defaults</span>
            </button>
          )}

          {/* Add Charge Button */}
          <button
            type="button"
            onClick={handleOpenCreateDrawer}
            className="inline-flex items-center gap-1.5 rounded-xl bg-slate-950 hover:bg-slate-900 active:bg-black px-4 py-2 text-xs font-extrabold text-amber-400 shadow-xs transition-all cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Add Custom Charge</span>
          </button>
        </div>
      </div>

      {/* Error alert if load failed */}
      {errorMessage && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-900 space-y-3">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-bold">System Error: </span>
              <span>{errorMessage}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={loadCharges}
                className="text-xs font-bold text-rose-700 hover:text-rose-900 underline"
              >
                Retry
              </button>
              <button
                type="button"
                onClick={() => setShowApiSettings((prev) => !prev)}
                className="inline-flex items-center gap-1 rounded-lg border border-rose-300 bg-white px-2 py-1 text-[11px] font-bold text-rose-800 hover:bg-rose-100 transition-colors cursor-pointer"
              >
                <Settings className="h-3 w-3" />
                <span>Configure API URL</span>
              </button>
            </div>
          </div>

          {showApiSettings && (
            <form
              onSubmit={handleSaveApiUrl}
              className="mt-2 rounded-lg border border-rose-200 bg-white p-3 space-y-2 text-slate-800 shadow-2xs"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                  <Globe className="h-3.5 w-3.5 text-blue-600" />
                  API Endpoint Settings (Browser Override)
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  Current: {getApiBase() || "(relative /)"}
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Enter your AWS Lambda Function URL (e.g. <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-700">https://xxxx.lambda-url.ap-south-1.on.aws</code>).
                Ensure Function URL CORS is enabled in AWS Console.
              </p>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={apiEndpointInput}
                  onChange={(e) => setApiEndpointInput(e.target.value)}
                  placeholder="https://YOUR_LAMBDA_ID.lambda-url.ap-south-1.on.aws"
                  className="flex-1 rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
                />
                <button
                  type="submit"
                  className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-700 transition-colors cursor-pointer"
                >
                  Save &amp; Reconnect
                </button>
                <button
                  type="button"
                  onClick={handleResetApiUrl}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Reset Default
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Metric Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
            <span>Total Charges</span>
            <Receipt className="h-4 w-4 text-jfll-blue" />
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono">
            {isLoading ? "-" : totalCharges}
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Registered MIAL &amp; gateway rules
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
            <span>Active Gateway Fees</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-700 font-mono">
            {isLoading ? "-" : activeCharges}
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Live on rate engine calculations
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
            <span>Statutory Mandatory</span>
            <ShieldCheck className="h-4 w-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-amber-700 font-mono">
            {isLoading ? "-" : statutoryCharges}
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Govt GST, XBC, AMS regulations
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
            <span>Custom Ancillaries</span>
            <span className="inline-flex items-center justify-center rounded-lg bg-teal-50 border border-teal-200 p-1">
              <Layers className="h-4 w-4 text-aero-teal" />
            </span>
          </div>
          <div className="text-2xl font-black text-teal-700 font-mono">
            {isLoading ? "-" : customAncillaries}
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Custom rules added by Desk
          </p>
        </div>
      </div>

      {/* High-Density Charges Management Table */}
      <ChargesConfigTable
        charges={charges}
        isLoading={isLoading}
        onEdit={handleOpenEditDrawer}
        onToggleActive={handleToggleActive}
        onDelete={handleDeleteCharge}
      />

      {/* Slide-Over Drawer for Add / Edit */}
      <AddChargeDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        chargeToEdit={editingCharge}
        onSuccess={handleDrawerSuccess}
      />

      {/* Reset Confirmation Modal */}
      {isResetConfirmOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
            onClick={() => !isResetting && setIsResetConfirmOpen(false)}
          />
          <div className="relative bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-amber-100 border border-amber-200 flex items-center justify-center text-amber-700 shrink-0">
                <RotateCcw className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">
                  Restore Baseline Tariff Defaults?
                </h3>
                <p className="text-xs text-slate-500">
                  Reset charges ex-BOM to standard MIAL regulatory values.
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              This action will restore all standard statutory and gateway rules (X-Ray XBC, Carting CTG, DGR RAC, Cold Chain COL, e-AWB CGC, AMS CCC, GST) to factory defaults. Custom ancillary charges will be discarded.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                disabled={isResetting}
                onClick={() => setIsResetConfirmOpen(false)}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isResetting}
                onClick={handleConfirmReset}
                className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 active:bg-amber-600 px-4 py-2 text-xs font-extrabold text-slate-950 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                {isResetting ? (
                  <span>Resetting...</span>
                ) : (
                  <>
                    <RotateCcw className="h-4 w-4" />
                    <span>Confirm Restore</span>
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
