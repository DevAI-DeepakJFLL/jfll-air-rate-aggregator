"use client";

import React, { useState, useRef, useMemo } from "react";
import {
  UploadCloud,
  Trash2,
  TableProperties,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  X,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { AirlineLogo } from "@/components/rates/AirlineLogo";
import { CarrierRegistryItem } from "@/types/tariff";
import { useAdminRole } from "@/context/AdminRoleContext";
import { getCarrierPdfUrl } from "@/lib/api-client";

interface CarrierTariffTableProps {
  carriers: CarrierRegistryItem[];
  onUpload: (carrierCode: string, file: File) => Promise<void>;
  onPreview: (carrier: CarrierRegistryItem) => void;
  onDeleteRequest: (carrier: CarrierRegistryItem) => void;
  uploadingCarrier: string | null;
}

type SortField = "carrier" | "validity" | "routes";
type SortDirection = "asc" | "desc";

export function CarrierTariffTable({
  carriers,
  onUpload,
  onPreview,
  onDeleteRequest,
  uploadingCarrier,
}: CarrierTariffTableProps) {
  const { isPricingHead } = useAdminRole();
  const [sortField, setSortField] = useState<SortField>("carrier");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [dragOverCode, setDragOverCode] = useState<string | null>(null);
  const [fileError, setFileError] = useState<{ carrierCode: string; message: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedCarrierForUpload, setSelectedCarrierForUpload] = useState<string | null>(null);

  // Auto-dismiss file errors after 4 seconds
  React.useEffect(() => {
    if (fileError) {
      const timer = setTimeout(() => setFileError(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [fileError]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-3.5 w-3.5 text-slate-400 group-hover:text-slate-600" />;
    }
    return sortDirection === "asc" ? (
      <ArrowUp className="h-3.5 w-3.5 text-jfll-blue" />
    ) : (
      <ArrowDown className="h-3.5 w-3.5 text-jfll-blue" />
    );
  };

  // Helper: Extract lifecycle status and urgency metadata
  const getLifecycleStatus = (carrier: CarrierRegistryItem) => {
    const circular = carrier.active_circular;
    if (!carrier.has_active_circular || !circular) {
      return {
        type: "NO_CIRCULAR",
        label: "No Circular",
        badgeClass: "text-slate-600 bg-slate-100 border-slate-200",
        icon: Clock,
        iconColor: "text-slate-400",
        daysRemaining: null,
      };
    }

    const now = new Date();
    let isExpired = circular.status === "EXPIRED";
    let isExpiringSoon = circular.status === "EXPIRING_SOON";
    let daysRemaining = 0;

    if (circular.valid_to) {
      const validToDate = new Date(circular.valid_to);
      if (!isNaN(validToDate.getTime())) {
        daysRemaining = Math.ceil((validToDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        if (daysRemaining < 0) {
          isExpired = true;
        } else if (daysRemaining <= 14) {
          isExpiringSoon = true;
        }
      }
    }

    if (isExpired) {
      return {
        type: "EXPIRED",
        label: `Expired (${Math.abs(daysRemaining)}d ago)`,
        badgeClass: "text-red-800 bg-red-50 border-red-200",
        icon: AlertCircle,
        iconColor: "text-red-600",
        daysRemaining,
      };
    }

    if (isExpiringSoon) {
      return {
        type: "EXPIRING_SOON",
        label: `Expiring (${daysRemaining}d left)`,
        badgeClass: "text-amber-800 bg-amber-50 border-amber-200",
        icon: AlertCircle,
        iconColor: "text-amber-600",
        daysRemaining,
      };
    }

    return {
      type: "ACTIVE",
      label: "Active Circular",
      badgeClass: "text-emerald-800 bg-emerald-50 border-emerald-200",
      icon: CheckCircle2,
      iconColor: "text-emerald-600",
      daysRemaining,
    };
  };

  // Memoized sort
  const sortedCarriers = useMemo(() => {
    return [...carriers].sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case "carrier":
          comparison = a.carrier_name.localeCompare(b.carrier_name);
          break;
        case "validity": {
          const dateA = a.active_circular?.valid_to ? new Date(a.active_circular.valid_to).getTime() : 0;
          const dateB = b.active_circular?.valid_to ? new Date(b.active_circular.valid_to).getTime() : 0;
          comparison = dateA - dateB;
          break;
        }
        case "routes": {
          const routesA = a.active_circular?.corridor_count ?? a.total_corridors ?? 0;
          const routesB = b.active_circular?.corridor_count ?? b.total_corridors ?? 0;
          comparison = routesA - routesB;
          break;
        }
        default:
          comparison = 0;
      }
      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [carriers, sortField, sortDirection]);

  // File drop validation
  const validateAndProcessFile = (carrierCode: string, file: File) => {
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setFileError({
        carrierCode,
        message: "Only authentic airline PDF rate circulars (.pdf) are supported.",
      });
      return;
    }
    setFileError(null);
    onUpload(carrierCode, file);
  };

  const handleRowDragOver = (e: React.DragEvent, carrierCode: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverCode(carrierCode);
  };

  const handleRowDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverCode(null);
  };

  const handleRowDrop = (e: React.DragEvent, carrierCode: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverCode(null);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndProcessFile(carrierCode, e.dataTransfer.files[0]);
    }
  };

  const triggerUploadForCarrier = (carrierCode: string) => {
    setSelectedCarrierForUpload(carrierCode);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
      fileInputRef.current.click();
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0 && selectedCarrierForUpload) {
      validateAndProcessFile(selectedCarrierForUpload, e.target.files[0]);
    }
    setSelectedCarrierForUpload(null);
  };

  return (
    <div className="relative">
      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileInputChange}
        accept=".pdf"
        className="hidden"
        aria-label="Upload airline tariff PDF"
      />

      {/* Main Table Container */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        <div
          className="overflow-x-auto focus-visible:outline-2 focus-visible:outline-sky-600"
          tabIndex={0}
          role="region"
          aria-label="Air cargo tariff registry table"
        >
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/90 text-[11px] font-bold text-slate-600 uppercase tracking-wider select-none">
                {/* 1. Carrier Identity & Status */}
                <th scope="col" className="py-3 px-4 min-w-[260px]">
                  <button
                    type="button"
                    onClick={() => handleSort("carrier")}
                    className="inline-flex items-center gap-1.5 group cursor-pointer font-bold text-slate-700 hover:text-slate-900"
                    aria-label={`Sort by Carrier, current order: ${sortField === "carrier" ? sortDirection : "none"}`}
                  >
                    Airline &amp; Contract Status
                    {getSortIcon("carrier")}
                  </button>
                </th>

                {/* 2. Validity Range */}
                <th scope="col" className="py-3 px-4 min-w-[190px]">
                  <button
                    type="button"
                    onClick={() => handleSort("validity")}
                    className="inline-flex items-center gap-1.5 group cursor-pointer font-bold text-slate-700 hover:text-slate-900"
                    aria-label={`Sort by Validity, current order: ${sortField === "validity" ? sortDirection : "none"}`}
                  >
                    Validity &amp; Expiry
                    {getSortIcon("validity")}
                  </button>
                </th>

                {/* 3. Corridors Coverage */}
                <th scope="col" className="py-3 px-4 min-w-[200px]">
                  <button
                    type="button"
                    onClick={() => handleSort("routes")}
                    className="inline-flex items-center gap-1.5 group cursor-pointer font-bold text-slate-700 hover:text-slate-900"
                    aria-label={`Sort by Corridor Count, current order: ${sortField === "routes" ? sortDirection : "none"}`}
                  >
                    Corridor Coverage
                    {getSortIcon("routes")}
                  </button>
                </th>

                {/* 4. Actions */}
                <th scope="col" className="py-3 px-4 w-48 text-right">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {sortedCarriers.map((carrier) => {
                const isDragOver = dragOverCode === carrier.carrier_code;
                const isUploadingThis = uploadingCarrier === carrier.carrier_code;
                const circular = carrier.active_circular;
                const hasCircular = carrier.has_active_circular && circular !== null;
                const rowHasError = fileError?.carrierCode === carrier.carrier_code;
                const status = getLifecycleStatus(carrier);
                const StatusIcon = status.icon;

                return (
                  <tr
                    key={carrier.carrier_code}
                    onDragOver={(e) => handleRowDragOver(e, carrier.carrier_code)}
                    onDragLeave={handleRowDragLeave}
                    onDrop={(e) => handleRowDrop(e, carrier.carrier_code)}
                    className={`transition-colors duration-150 relative ${
                      isDragOver
                        ? "bg-blue-50/90 ring-2 ring-inset ring-jfll-blue text-blue-900"
                        : isUploadingThis
                        ? "bg-sky-50/60"
                        : "hover:bg-slate-50/70"
                    }`}
                  >
                    {/* 1. Carrier Identity & Status */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <AirlineLogo
                          carrierCode={carrier.carrier_code}
                          carrierName={carrier.carrier_name}
                          size="md"
                          className="shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          {/* Airline Name + IATA + Prefix + Status Badge */}
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-slate-900 text-xs truncate">
                              {carrier.carrier_name}
                            </span>
                            <span className="font-mono text-[10px] font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                              {carrier.carrier_code}
                            </span>
                            <span className="text-[10px] text-slate-500 font-mono">
                              ({carrier.prefix})
                            </span>

                            {/* Integrated Status Badge */}
                            {isUploadingThis ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded border border-sky-200 animate-pulse">
                                <Loader2 className="h-3 w-3 animate-spin" />
                                Ingesting PDF...
                              </span>
                            ) : (
                              <span
                                className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded border ${status.badgeClass}`}
                              >
                                <StatusIcon className={`h-3 w-3 ${status.iconColor} shrink-0`} />
                                {status.label}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Inline Error Toast */}
                      {rowHasError && (
                        <div className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-red-700 bg-red-50 border border-red-200 px-2.5 py-1 rounded-lg">
                          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                          <span>{fileError.message}</span>
                          <button
                            type="button"
                            onClick={() => setFileError(null)}
                            className="ml-1 text-red-500 hover:text-red-800 p-0.5 cursor-pointer"
                            aria-label="Dismiss error"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      )}
                    </td>

                    {/* 2. Validity Range */}
                    <td className="py-3.5 px-4">
                      {hasCircular && circular ? (
                        <div className="space-y-0.5">
                          <div className="font-mono text-xs text-slate-900 font-semibold">
                            {circular.valid_from || "Current"} &rarr; {circular.valid_to || "Open"}
                          </div>
                          {circular.filename && (
                            <div>
                              <a
                                href={getCarrierPdfUrl(carrier.carrier_code)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[11px] text-jfll-blue hover:underline font-medium inline-flex items-center gap-1 truncate max-w-[200px]"
                                title={`View or download ${circular.filename}`}
                              >
                                <span className="truncate">{circular.filename}</span>
                                <ExternalLink className="h-2.5 w-2.5 shrink-0" />
                              </a>
                            </div>
                          )}
                          <div className="text-[11px] text-slate-600 font-medium">
                            {status.daysRemaining !== null && status.daysRemaining >= 0
                              ? `${status.daysRemaining} days remaining in cycle`
                              : status.daysRemaining !== null
                              ? `Expired ${Math.abs(status.daysRemaining)} days ago`
                              : "Continuous rate cycle"}
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 font-medium italic">
                          No active circular
                        </span>
                      )}
                    </td>

                    {/* 3. Corridor Coverage */}
                    <td className="py-3.5 px-4">
                      {hasCircular && circular ? (
                        <div className="space-y-1">
                          <div className="font-bold text-xs text-slate-900">
                            {circular.corridor_count} active routes
                          </div>
                          {carrier.corridors_sample && carrier.corridors_sample.length > 0 && (
                            <div className="flex items-center gap-1 flex-wrap max-w-[240px]">
                              {carrier.corridors_sample.slice(0, 4).map((dest) => (
                                <span
                                  key={dest}
                                  className="font-mono text-[10px] font-semibold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200"
                                >
                                  {dest}
                                </span>
                              ))}
                              {carrier.total_corridors > 4 && (
                                <span className="text-[10px] text-slate-500 font-medium">
                                  +{carrier.total_corridors - 4} more
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 font-medium">
                          0 active routes
                        </span>
                      )}
                    </td>

                    {/* 4. Action Buttons */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {/* Preview Rates Button */}
                        {hasCircular && (
                          <button
                            type="button"
                            onClick={() => onPreview(carrier)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-2xs cursor-pointer focus-visible:ring-2 focus-visible:ring-jfll-blue"
                            title={`Preview extracted corridor rates for ${carrier.carrier_name}`}
                          >
                            <TableProperties className="h-3.5 w-3.5 text-slate-600" />
                            <span>Preview</span>
                          </button>
                        )}

                        {/* Upload / Replace PDF Button */}
                        <button
                          type="button"
                          onClick={() => triggerUploadForCarrier(carrier.carrier_code)}
                          disabled={isUploadingThis}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold text-jfll-blue bg-blue-50/80 hover:bg-blue-100/80 transition-colors cursor-pointer disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-jfll-blue"
                          title={`Upload rate circular PDF for ${carrier.carrier_name}`}
                        >
                          <UploadCloud className="h-3.5 w-3.5" />
                          <span>{hasCircular ? "Replace" : "Upload PDF"}</span>
                        </button>

                        {/* Delete / Revert Button */}
                        {hasCircular && (
                          <button
                            type="button"
                            onClick={() => onDeleteRequest(carrier)}
                            disabled={!isPricingHead}
                            title={`Clear active circular for ${carrier.carrier_name}`}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-red-700 hover:bg-red-50 transition-colors cursor-pointer disabled:opacity-30 disabled:hover:text-slate-500 disabled:hover:bg-transparent focus-visible:ring-2 focus-visible:ring-red-500"
                            aria-label={`Clear active circular for ${carrier.carrier_name}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Table Footer */}
        <div className="p-3 bg-slate-50/80 border-t border-slate-200/80 flex items-center justify-between text-xs text-slate-600">
          <span className="font-medium text-slate-500">
            Air Cargo Master Tariffs ex-BOM
          </span>
          <span className="font-semibold text-slate-700">
            Showing {sortedCarriers.length} of {carriers.length} airlines
          </span>
        </div>
      </div>
    </div>
  );
}
