"use client";

import React, { useState, useEffect } from "react";
import {
  UploadCloud,
  CheckCircle,
  FileSpreadsheet,
  AlertTriangle,
  Lock,
  Search,
  RefreshCw,
  ShieldAlert,
  Plane,
} from "lucide-react";
import { useAdminRole } from "@/context/AdminRoleContext";
import { CarrierRegistryItem } from "@/types/tariff";
import { CarrierTariffCard } from "@/components/admin/CarrierTariffCard";
import { TariffPreviewDrawer } from "@/components/admin/TariffPreviewDrawer";
import { DeleteCircularModal } from "@/components/admin/DeleteCircularModal";
import {
  fetchTariffRegistry,
  uploadTariffPdf,
  deleteTariffCircular,
} from "@/lib/api-client";

export default function AdminTariffsPage() {
  const { isPricingHead, role } = useAdminRole();
  const [carriers, setCarriers] = useState<CarrierRegistryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [uploadingCarrier, setUploadingCarrier] = useState<string | null>(null);
  const [activePreviewCarrier, setActivePreviewCarrier] = useState<CarrierRegistryItem | null>(null);
  const [carrierToDelete, setCarrierToDelete] = useState<CarrierRegistryItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Fetch carriers registry
  const fetchRegistry = async () => {
    setLoading(true);
    try {
      const data = await fetchTariffRegistry();
      setCarriers(data);
    } catch (err: unknown) {
      console.error("Error fetching registry:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRegistry();
  }, []);

  // Upload handler bound to carrier code
  const handleCarrierUpload = async (carrierCode: string, file: File) => {
    setUploadingCarrier(carrierCode);
    setNotification(null);

    try {
      const data = await uploadTariffPdf(carrierCode, file, role);
      const carrierInfo = data.registry_status;

      // Update state locally
      setCarriers((prev) =>
        prev.map((c) =>
          c.carrier_code === carrierCode && carrierInfo ? { ...c, ...carrierInfo } : c
        )
      );

      setNotification({
        type: "success",
        message: `Successfully ingested ${file.name} for ${carrierInfo?.carrier_name || carrierCode}. Dedicated parser verified ${carrierInfo?.total_corridors || "active"} corridors.`,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error uploading rate circular";
      setNotification({
        type: "error",
        message: msg,
      });
    } finally {
      setUploadingCarrier(null);
    }
  };

  // Delete circular handler
  const handleDeleteConfirm = async (carrierCode: string) => {
    if (!isPricingHead) {
      alert("Unauthorized: Pricing Team Head authorization required.");
      return;
    }

    setIsDeleting(true);
    try {
      const data = await deleteTariffCircular(carrierCode, role);
      const updatedCarrier = data.carrier;

      setCarriers((prev) =>
        prev.map((c) =>
          c.carrier_code === carrierCode ? { ...c, ...updatedCarrier } : c
        )
      );

      setCarrierToDelete(null);
      setNotification({
        type: "success",
        message: `Active circular for ${updatedCarrier.carrier_name} (${carrierCode}) has been cleared. System reverted to default baseline.`,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error clearing circular";
      setNotification({
        type: "error",
        message: msg,
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // Filtered carriers
  const filteredCarriers = carriers.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      c.carrier_code.toLowerCase().includes(q) ||
      c.carrier_name.toLowerCase().includes(q) ||
      c.prefix.includes(q) ||
      (c.corridors_sample && c.corridors_sample.some((dest) => dest.toLowerCase().includes(q)))
    );
  });

  const activeCount = carriers.filter((c) => c.has_active_circular).length;
  const fallbackCount = carriers.length - activeCount;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Admin &bull; Tariff Management
            </span>
          </div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
            Air Cargo Tariff Ingestion Desk
          </h1>
          <p className="text-xs text-slate-600 font-medium mt-0.5">
            Ex-Mumbai (BOM / CSMIA Sahar ACC) Gateway &bull; Dedicated Airline Circular Parsers
          </p>
        </div>

        <button
          type="button"
          onClick={fetchRegistry}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 transition-colors shadow-2xs self-start sm:self-auto cursor-pointer"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh Registry
        </button>
      </div>

      {/* Role Notice for Coordinator */}
      {!isPricingHead && (
        <div className="rounded-xl border border-sky-200 bg-sky-50 p-4 text-xs text-sky-900 flex items-center gap-3">
          <Lock className="h-5 w-5 text-sky-600 shrink-0" />
          <div>
            <span className="font-bold">Coordinator Preview Mode:</span> You can test drag-and-drop parsing and preview extracted corridor rates. Deactivating active circulars or altering master pricing requires{" "}
            <strong>Pricing Team Head</strong> authorization.
          </div>
        </div>
      )}

      {/* Notification Banner */}
      {notification && (
        <div
          className={`rounded-xl border p-4 text-xs flex items-center justify-between gap-3 shadow-xs animate-in fade-in duration-150 ${
            notification.type === "success"
              ? "border-emerald-300 bg-emerald-50 text-emerald-900"
              : "border-red-300 bg-red-50 text-red-900"
          }`}
        >
          <div className="flex items-center gap-2.5">
            {notification.type === "success" ? (
              <CheckCircle className="h-4 w-4 text-emerald-700 shrink-0" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-red-700 shrink-0" />
            )}
            <span className="font-semibold">{notification.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setNotification(null)}
            className="text-xs font-bold underline hover:opacity-80 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Operational Summary & Filter Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Metric Badges */}
        <div className="flex items-center gap-3 sm:gap-6 flex-wrap">
          <div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              Tracked Fleet
            </span>
            <span className="font-bold text-slate-900 text-sm">
              {carriers.length} Carriers ex-BOM
            </span>
          </div>
          <div className="h-8 w-px bg-slate-200 hidden sm:block" />
          <div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              Active Circulars
            </span>
            <span className="font-bold text-emerald-700 text-sm">
              {activeCount} Parsed & Live
            </span>
          </div>
          <div className="h-8 w-px bg-slate-200 hidden sm:block" />
          <div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              Fallback Baseline
            </span>
            <span className="font-bold text-slate-600 text-sm">
              {fallbackCount} Benchmark Rates
            </span>
          </div>
        </div>

        {/* Carrier Search / Filter Input */}
        <div className="relative w-full md:w-80">
          <Search className="h-4 w-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter by airline, code (e.g. EY, AI)..."
            className="w-full h-10 pl-9 pr-4 rounded-xl border border-slate-300 text-xs font-semibold placeholder:text-slate-500 focus-ring bg-slate-50/50"
          />
        </div>
      </div>

      {/* Known Carriers Deck Grid */}
      {loading ? (
        <div className="h-64 flex flex-col items-center justify-center gap-2 text-slate-500">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-jfll-blue border-t-transparent" />
          <p className="text-xs font-semibold">Loading carrier registry...</p>
        </div>
      ) : filteredCarriers.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <Plane className="h-10 w-10 text-slate-300 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-slate-800">No airlines match your filter</h3>
          <p className="text-xs text-slate-500 mt-1">
            Try adjusting your search query or clear the filter.
          </p>
        </div>
      ) : (
        <section aria-labelledby="fleet-circulars-heading">
          <h2 id="fleet-circulars-heading" className="sr-only">
            Known Airline Fleet Circulars ex-BOM
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {filteredCarriers.map((carrier) => (
              <CarrierTariffCard
                key={carrier.carrier_code}
                carrier={carrier}
                onUpload={handleCarrierUpload}
                onPreview={(c) => setActivePreviewCarrier(c)}
                onDeleteRequest={(c) => setCarrierToDelete(c)}
                isUploading={uploadingCarrier === carrier.carrier_code}
              />
            ))}
          </div>
        </section>
      )}

      {/* Preview Extracted Corridors Drawer */}
      <TariffPreviewDrawer
        carrier={activePreviewCarrier}
        isOpen={activePreviewCarrier !== null}
        onClose={() => setActivePreviewCarrier(null)}
      />

      {/* Delete Confirmation Modal */}
      <DeleteCircularModal
        carrier={carrierToDelete}
        isOpen={carrierToDelete !== null}
        onClose={() => setCarrierToDelete(null)}
        onConfirm={handleDeleteConfirm}
        isDeleting={isDeleting}
      />
    </div>
  );
}
