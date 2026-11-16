"use client";

import React, { useState, useRef, useMemo } from "react";
import {
  UploadCloud,
  FileText,
  Trash2,
  TableProperties,
  CheckCircle2,
  AlertCircle,
  Clock,
  Cpu,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  X,
  Loader2,
} from "lucide-react";
import { AirlineLogo } from "@/components/rates/AirlineLogo";
import { CarrierRegistryItem } from "@/types/tariff";
import { useAdminRole } from "@/context/AdminRoleContext";

interface CarrierTariffTableProps {
  carriers: CarrierRegistryItem[];
  onUpload: (carrierCode: string, file: File) => Promise<void>;
  onPreview: (carrier: CarrierRegistryItem) => void;
  onDeleteRequest: (carrier: CarrierRegistryItem) => void;
  uploadingCarrier: string | null;
}

type SortField = "carrier" | "status" | "validity" | "routes" | "engine";
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

  // Hidden per-row file input ref map or single file input with selected carrier code
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

  // Helper to determine status rank for sorting
  const getStatusRank = (c: CarrierRegistryItem): number => {
    if (!c.has_active_circular || !c.active_circular) return 3; // Baseline
    const circular = c.active_circular;
    const now = new Date();

    let isExpired = circular.status === "EXPIRED";
    let isExpiringSoon = circular.status === "EXPIRING_SOON";

    if (circular.valid_to) {
      const validToDate = new Date(circular.valid_to);
      if (!isNaN(validToDate.getTime())) {
        const diffDays = Math.ceil((validToDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays < 0) isExpired = true;
        else if (diffDays <= 14) isExpiringSoon = true;
      }
    }

    if (isExpired) return 0; // Highest urgency
    if (isExpiringSoon) return 1;
    return 2; // Active
  };

  // Sorted carriers
  const sortedCarriers = useMemo(() => {
    return [...carriers].sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case "carrier":
          comparison = a.carrier_name.localeCompare(b.carrier_name);
          break;
        case "status":
          comparison = getStatusRank(a) - getStatusRank(b);
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
        case "engine":
          comparison = a.parser_id.localeCompare(b.parser_id);
          break;
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

  // Helper for Status Badge
  const renderStatusBadge = (carrier: CarrierRegistryItem) => {
    const circular = carrier.active_circular;
    const hasCircular = carrier.has_active_circular && circular !== null;

    if (!hasCircular || !circular) {
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
          <Clock className="h-3.5 w-3.5 text-slate-500 shrink-0" />
          Baseline
        </span>
      );
    }

    const now = new Date();
    let isExpired = circular.status === "EXPIRED";
    let isExpiringSoon = circular.status === "EXPIRING_SOON";
    let daysRemaining = 0;

    if (circular.valid_to) {
      const validToDate = new Date(circular.valid_to);
      if (!isNaN(validToDate.getTime())) {
        const diffDays = Math.ceil((validToDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        daysRemaining = diffDays;
        if (diffDays < 0) {
          isExpired = true;
        } else if (diffDays <= 14) {
          isExpiringSoon = true;
        }
      }
    }

    if (isExpired) {
      return (
        <span
          className="inline-flex items-center gap-1 text-xs font-bold text-red-800 bg-red-50 px-2 py-0.5 rounded-md border border-red-200"
          title="Expired circular: Quoting will lead to carrier invoice variances"
        >
          <AlertCircle className="h-3 w-3 text-red-600 shrink-0" />
          Expired ({Math.abs(daysRemaining)}d ago)
        </span>
      );
    }

    if (isExpiringSoon) {
      return (
        <span
          className="inline-flex items-center gap-1 text-xs font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200"
          title="Tariff circular expiring soon"
        >
          <AlertCircle className="h-3 w-3 text-amber-600 shrink-0" />
          Expiring ({daysRemaining}d left)
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
        <CheckCircle2 className="h-3 w-3 text-emerald-600 shrink-0" />
        Active ({circular.corridor_count} routes)
      </span>
    );
  };

  return (
    <div className="relative">
      {/* Hidden Global File Input */}
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
                {/* Carrier Column */}
                <th scope="col" className="py-3 px-4 min-w-[220px]">
                  <button
                    type="button"
                    onClick={() => handleSort("carrier")}
                    className="inline-flex items-center gap-1.5 group cursor-pointer font-bold text-slate-700 hover:text-slate-900"
                    aria-label={`Sort by Carrier, current order: ${sortField === "carrier" ? sortDirection : "none"}`}
                  >
                    Carrier
                    {getSortIcon("carrier")}
                  </button>
                </th>

                {/* Status Column */}
                <th scope="col" className="py-3 px-3 min-w-[140px]">
                  <button
                    type="button"
                    onClick={() => handleSort("status")}
                    className="inline-flex items-center gap-1.5 group cursor-pointer font-bold text-slate-700 hover:text-slate-900"
                    aria-label={`Sort by Status, current order: ${sortField === "status" ? sortDirection : "none"}`}
                  >
                    Circular Status
                    {getSortIcon("status")}
                  </button>
                </th>

                {/* Validity Period Column */}
                <th scope="col" className="py-3 px-3 min-w-[160px]">
                  <button
                    type="button"
                    onClick={() => handleSort("validity")}
                    className="inline-flex items-center gap-1.5 group cursor-pointer font-bold text-slate-700 hover:text-slate-900"
                    aria-label={`Sort by Validity, current order: ${sortField === "validity" ? sortDirection : "none"}`}
                  >
                    Validity Range
                    {getSortIcon("validity")}
                  </button>
                </th>

                {/* Corridors Coverage Column */}
                <th scope="col" className="py-3 px-3 min-w-[170px]">
                  <button
                    type="button"
                    onClick={() => handleSort("routes")}
                    className="inline-flex items-center gap-1.5 group cursor-pointer font-bold text-slate-700 hover:text-slate-900"
                    aria-label={`Sort by Route Count, current order: ${sortField === "routes" ? sortDirection : "none"}`}
                  >
                    Corridor Coverage
                    {getSortIcon("routes")}
                  </button>
                </th>

                {/* Parser Engine Column */}
                <th scope="col" className="py-3 px-3 min-w-[140px]">
                  <button
                    type="button"
                    onClick={() => handleSort("engine")}
                    className="inline-flex items-center gap-1.5 group cursor-pointer font-bold text-slate-700 hover:text-slate-900"
                    aria-label={`Sort by Parser Engine, current order: ${sortField === "engine" ? sortDirection : "none"}`}
                  >
                    Parser Engine
                    {getSortIcon("engine")}
                  </button>
                </th>

                {/* Ingested Circular File Column */}
                <th scope="col" className="py-3 px-3 min-w-[180px]">
                  Active File
                </th>

                {/* Actions Column */}
                <th scope="col" className="py-3 px-4 w-40 text-right">
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
                    {/* Carrier Info */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <AirlineLogo
                          carrierCode={carrier.carrier_code}
                          carrierName={carrier.carrier_name}
                          size="sm"
                          className="shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-slate-900 text-xs truncate max-w-[140px] sm:max-w-[180px]">
                              {carrier.carrier_name}
                            </span>
                            <span className="font-mono text-[10px] font-bold text-slate-600 bg-slate-100 px-1 py-0.5 rounded border border-slate-200">
                              {carrier.carrier_code}
                            </span>
                            <span className="text-[10px] text-slate-600 font-mono">
                              ({carrier.prefix})
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-600 truncate max-w-[200px]" title={carrier.description}>
                            {carrier.description}
                          </p>
                        </div>
                      </div>

                      {/* Inline Error Toast */}
                      {rowHasError && (
                        <div className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-semibold text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded">
                          <AlertCircle className="h-3 w-3 shrink-0" />
                          <span>{fileError.message}</span>
                          <button
                            type="button"
                            onClick={() => setFileError(null)}
                            className="ml-1 text-red-500 hover:text-red-800"
                            aria-label="Dismiss error"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      )}
                    </td>

                    {/* Status Badge */}
                    <td className="py-3 px-3">
                      {isUploadingThis ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-sky-700 bg-sky-50 px-2.5 py-1 rounded-lg border border-sky-200 animate-pulse">
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          Ingesting...
                        </span>
                      ) : (
                        renderStatusBadge(carrier)
                      )}
                    </td>

                    {/* Validity Period */}
                    <td className="py-3 px-3">
                      {hasCircular && circular ? (
                        <div>
                          <div className="font-mono text-xs text-slate-800 font-medium">
                            {circular.valid_from || "Current"} &rarr; {circular.valid_to || "Open"}
                          </div>
                          <div className="text-[11px] text-slate-600">
                            Effective period
                          </div>
                        </div>
                      ) : (
                        <div>
                          <span className="text-xs text-slate-600 font-medium">Continuous</span>
                          <div className="text-[11px] text-slate-600">Baseline fallback</div>
                        </div>
                      )}
                    </td>

                    {/* Corridor Coverage */}
                    <td className="py-3 px-3">
                      <div className="space-y-1">
                        <div className="font-bold text-xs text-slate-800">
                          {hasCircular && circular
                            ? `${circular.corridor_count} active routes`
                            : `${carrier.total_corridors} default routes`}
                        </div>
                        {carrier.corridors_sample && carrier.corridors_sample.length > 0 && (
                          <div className="flex items-center gap-1 flex-wrap max-w-[200px]">
                            {carrier.corridors_sample.slice(0, 3).map((dest) => (
                              <span
                                key={dest}
                                className="font-mono text-[10px] font-semibold text-slate-700 bg-slate-100 px-1 py-0.2 rounded border border-slate-200"
                              >
                                {dest}
                              </span>
                            ))}
                            {carrier.total_corridors > 3 && (
                              <span className="text-[10px] text-slate-600">
                                +{carrier.total_corridors - 3} more
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Parser Engine */}
                    <td className="py-3 px-3">
                      <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-50 border border-slate-200 text-slate-700 font-mono text-[11px]">
                        <Cpu className="h-3 w-3 text-slate-500 shrink-0" />
                        <span className="truncate max-w-[110px]" title={carrier.parser_id}>
                          {carrier.parser_id}
                        </span>
                      </div>
                    </td>

                    {/* Ingested Circular File / Drop Area */}
                    <td className="py-3 px-3">
                      {isDragOver ? (
                        <div className="border border-dashed border-jfll-blue bg-blue-100/60 rounded-lg p-2 text-center text-xs font-bold text-jfll-blue animate-pulse">
                          Drop PDF to replace circular
                        </div>
                      ) : hasCircular && circular ? (
                        <div className="flex items-center gap-1.5 max-w-[180px]">
                          <FileText className="h-3.5 w-3.5 text-jfll-blue shrink-0" />
                          <span
                            className="font-medium text-xs text-slate-800 truncate"
                            title={circular.filename}
                          >
                            {circular.filename}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-600 italic">
                          No circular (Baseline)
                        </span>
                      )}
                    </td>

                    {/* Action Buttons */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Preview Rates Button */}
                        {hasCircular && (
                          <button
                            type="button"
                            onClick={() => onPreview(carrier)}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-2xs cursor-pointer"
                            title={`Preview extracted rates for ${carrier.carrier_name}`}
                          >
                            <TableProperties className="h-3.5 w-3.5 text-slate-600" />
                            <span className="hidden sm:inline">Preview</span>
                          </button>
                        )}

                        {/* Upload / Replace PDF Button */}
                        <button
                          type="button"
                          onClick={() => triggerUploadForCarrier(carrier.carrier_code)}
                          disabled={isUploadingThis}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-bold text-jfll-blue bg-blue-50/80 hover:bg-blue-100/80 transition-colors cursor-pointer disabled:opacity-50"
                          title={`Upload rate circular PDF for ${carrier.carrier_name}`}
                        >
                          <UploadCloud className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline">
                            {hasCircular ? "Replace" : "Upload"}
                          </span>
                        </button>

                        {/* Delete / Revert Button */}
                        {hasCircular && (
                          <button
                            type="button"
                            onClick={() => onDeleteRequest(carrier)}
                            disabled={!isPricingHead}
                            title={
                              !isPricingHead
                                ? "Pricing Team Head authorization required to clear circulars"
                                : `Clear active circular for ${carrier.carrier_name}`
                            }
                            className="p-1 rounded-md text-slate-500 hover:text-red-700 hover:bg-red-50 transition-colors cursor-pointer disabled:opacity-30 disabled:hover:text-slate-500 disabled:hover:bg-transparent"
                            aria-label={`Clear circular for ${carrier.carrier_name}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
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

        {/* Table Footer with Operational Dropzone Hint */}
        <div className="p-3 bg-slate-50/80 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-600">
          <div className="flex items-center gap-1.5 font-medium">
            <UploadCloud className="h-3.5 w-3.5 text-jfll-blue" />
            <span>
              Tip: Drag and drop any airline PDF circular directly onto its row to ingest and parse rates instantly.
            </span>
          </div>
          <span className="font-semibold text-slate-600">
            Showing {sortedCarriers.length} of {carriers.length} airlines
          </span>
        </div>
      </div>
    </div>
  );
}
