"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  UploadCloud,
  FileText,
  Trash2,
  TableProperties,
  CheckCircle2,
  AlertCircle,
  Clock,
  Globe,
  X,
} from "lucide-react";
import { AirlineLogo } from "@/components/rates/AirlineLogo";
import { CarrierRegistryItem } from "@/types/tariff";
import { useAdminRole } from "@/context/AdminRoleContext";

interface CarrierTariffCardProps {
  carrier: CarrierRegistryItem;
  onUpload: (carrierCode: string, file: File) => Promise<void>;
  onPreview: (carrier: CarrierRegistryItem) => void;
  onDeleteRequest: (carrier: CarrierRegistryItem) => void;
  isUploading?: boolean;
}

export function CarrierTariffCard({
  carrier,
  onUpload,
  onPreview,
  onDeleteRequest,
  isUploading = false,
}: CarrierTariffCardProps) {
  const { isPricingHead } = useAdminRole();
  const [isDragOver, setIsDragOver] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const circular = carrier.active_circular;
  const hasCircular = carrier.has_active_circular && circular !== null;

  // Auto-dismiss file error after 4 seconds
  useEffect(() => {
    if (fileError) {
      const timer = setTimeout(() => setFileError(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [fileError]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const validateAndProcessFile = (file: File) => {
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setFileError("Only authentic airline PDF rate circulars (.pdf) are supported.");
      return;
    }
    setFileError(null);
    onUpload(carrier.carrier_code, file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndProcessFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndProcessFile(e.target.files[0]);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  // Determine operational lifecycle status badge
  const renderStatusBadge = () => {
    if (!hasCircular || !circular) {
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
          <Clock className="h-3.5 w-3.5 text-slate-500 shrink-0" />
          No Circular
        </span>
      );
    }

    const now = new Date();
    let isExpired = circular.status === "EXPIRED";
    let isExpiringSoon = circular.status === "EXPIRING_SOON";

    if (circular.valid_to) {
      const validToDate = new Date(circular.valid_to);
      if (!isNaN(validToDate.getTime())) {
        const diffDays = Math.ceil((validToDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
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
          className="inline-flex items-center gap-1.5 text-xs font-bold text-red-800 bg-red-50 px-2.5 py-1 rounded-lg border border-red-200"
          title="Expired circular - quoting will result in carrier invoice variances"
        >
          <AlertCircle className="h-3.5 w-3.5 text-red-600 shrink-0" />
          Expired (Action Required)
        </span>
      );
    }

    if (isExpiringSoon) {
      return (
        <span
          className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-800 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200"
          title="Tariff circular expiring within 14 days"
        >
          <AlertCircle className="h-3.5 w-3.5 text-amber-600 shrink-0" />
          Expiring Soon
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
        Active
      </span>
    );
  };

  return (
    <div
      className={`rounded-2xl border transition-all duration-200 bg-white flex flex-col justify-between overflow-hidden shadow-xs relative ${
        isDragOver
          ? "border-jfll-blue ring-2 ring-blue-500/30 bg-blue-50/20"
          : hasCircular
          ? "border-slate-200/90 hover:border-slate-300 hover:shadow-sm"
          : "border-dashed border-slate-300 bg-slate-50/40 hover:border-slate-400"
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".pdf"
        className="hidden"
        aria-label={`Upload rate sheet PDF for ${carrier.carrier_name}`}
      />

      {/* Inline Non-Blocking File Error Alert */}
      {fileError && (
        <div className="absolute top-2 left-2 right-2 z-20 bg-red-50 border border-red-300 text-red-900 rounded-xl p-2.5 text-xs flex items-center justify-between shadow-md animate-in fade-in duration-150">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
            <span className="font-semibold">{fileError}</span>
          </div>
          <button
            type="button"
            onClick={() => setFileError(null)}
            className="p-1 text-red-700 hover:text-red-900 cursor-pointer"
            aria-label="Dismiss alert"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Card Header: Airline Identity & Status */}
      <div className="p-4 sm:p-5 border-b border-slate-100">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <AirlineLogo
              carrierCode={carrier.carrier_code}
              carrierName={carrier.carrier_name}
              size="md"
              className="shrink-0"
            />
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-bold text-slate-900 text-sm truncate">
                  {carrier.carrier_name}
                </h2>
                <span className="font-mono text-xs font-bold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                  {carrier.carrier_code} ({carrier.prefix})
                </span>
              </div>
              <p className="text-xs text-slate-600 truncate mt-0.5" title={carrier.description}>
                {carrier.description}
              </p>
            </div>
          </div>

          {/* Operational Status Indicator */}
          <div className="shrink-0">{renderStatusBadge()}</div>
        </div>

        {/* Cargo Network & Coverage Strip */}
        <div className="flex items-center justify-between gap-2 mt-3 pt-2.5 border-t border-slate-100/80 text-xs">
          <div className="flex items-center gap-1.5 min-w-0">
            <Globe className="h-3.5 w-3.5 text-slate-500 shrink-0" />
            <span className="text-slate-600 font-medium">AWB Prefix:</span>
            <span className="font-mono font-bold text-slate-800 bg-slate-50 px-2 py-0.5 rounded border border-slate-200/80 text-xs">
              {carrier.prefix}
            </span>
          </div>
          <span className="text-xs font-semibold text-slate-700 shrink-0">
            {hasCircular && circular ? `${circular.corridor_count} active routes` : "0 active routes"}
          </span>
        </div>
      </div>

      {/* Card Body: Active Circular Details or Dropzone Chute */}
      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-center">
        {hasCircular && circular ? (
          <div className="space-y-3">
            <div className="bg-slate-50/80 rounded-xl p-3.5">
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="h-4 w-4 text-jfll-blue shrink-0" />
                <span
                  className="font-medium text-xs text-slate-800 truncate"
                  title={circular.filename}
                >
                  {circular.filename}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 mt-2.5 pt-2 border-t border-slate-200/60 text-xs">
                <div>
                  <span className="text-slate-500 block text-xs">Active Corridors:</span>
                  <span className="font-mono font-bold text-slate-900 text-xs">
                    {circular.corridor_count} routes
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-xs">Validity Period:</span>
                  <span className="font-mono text-slate-800 text-xs">
                    {circular.valid_from || "Current"} &rarr; {circular.valid_to || "Open Tariff"}
                  </span>
                </div>
              </div>

              {carrier.corridors_sample && carrier.corridors_sample.length > 0 && (
                <div className="mt-2.5 pt-2 border-t border-slate-200/60 flex items-center gap-1.5 text-xs">
                  <span className="text-slate-500 shrink-0">Coverage:</span>
                  <div className="flex items-center gap-1 overflow-hidden truncate">
                    {carrier.corridors_sample.map((dest) => (
                      <span
                        key={dest}
                        className="font-mono font-semibold text-xs text-slate-700 bg-white px-1.5 py-0.5 rounded border border-slate-200"
                      >
                        {dest}
                      </span>
                    ))}
                    {carrier.total_corridors > carrier.corridors_sample.length && (
                      <span className="text-slate-500 text-xs">
                        +{carrier.total_corridors - carrier.corridors_sample.length} more
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Quick Drop Zone Chute */}
            <div
              onClick={triggerFileSelect}
              className={`rounded-xl border border-dashed py-2.5 px-3 text-center cursor-pointer transition-colors ${
                isDragOver
                  ? "border-jfll-blue bg-blue-50 text-jfll-blue"
                  : "border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-600"
              }`}
            >
              <p className="text-xs font-medium">
                {isUploading ? (
                  <span className="text-jfll-blue font-bold">Ingesting & extracting rate matrix (VLM vision parsing may take 20-60s)...</span>
                ) : (
                  <>
                    Drag new PDF here or <span className="text-jfll-blue font-bold">browse</span> to replace
                  </>
                )}
              </p>
            </div>
          </div>
        ) : (
          /* Empty State Chute */
          <div
            onClick={triggerFileSelect}
            className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2 ${
              isDragOver
                ? "border-jfll-blue bg-blue-50 text-jfll-blue scale-[0.99]"
                : "border-slate-200 hover:border-slate-300 hover:bg-white text-slate-600"
            }`}
          >
            <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500">
              <UploadCloud className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-800">
                {isUploading ? "Uploading & Extracting Matrix (VLM In Progress)..." : "Upload Carrier Circular PDF"}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                Drop PDF here or click to browse
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Card Action Footer */}
      <div className="p-3.5 sm:px-5 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {hasCircular && (
            <button
              type="button"
              onClick={() => onPreview(carrier)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-2xs cursor-pointer"
            >
              <TableProperties className="h-3.5 w-3.5 text-slate-600" />
              Preview Rates
            </button>
          )}

          <button
            type="button"
            onClick={triggerFileSelect}
            disabled={isUploading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-jfll-blue bg-blue-50/80 hover:bg-blue-100/80 transition-colors cursor-pointer disabled:opacity-50"
          >
            <UploadCloud className="h-3.5 w-3.5" />
            {hasCircular ? "Replace PDF" : "Upload PDF"}
          </button>
        </div>

        {hasCircular && (
          <button
            type="button"
            onClick={() => onDeleteRequest(carrier)}
            disabled={!isPricingHead}
            title={
              !isPricingHead
                ? "Admin authorization required to clear circulars"
                : `Clear active circular for ${carrier.carrier_name}`
            }
            className="p-1.5 rounded-lg text-slate-500 hover:text-red-700 hover:bg-red-50 transition-colors cursor-pointer disabled:opacity-40 disabled:hover:text-slate-500 disabled:hover:bg-transparent"
            aria-label={`Clear active circular for ${carrier.carrier_name}`}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
