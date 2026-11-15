"use client";

import React, { useState, useRef } from "react";
import {
  UploadCloud,
  FileText,
  Trash2,
  TableProperties,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const circular = carrier.active_circular;
  const hasCircular = carrier.has_active_circular && circular !== null;

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

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.name.toLowerCase().endsWith(".pdf")) {
        onUpload(carrier.carrier_code, droppedFile);
      } else {
        alert("Please upload an authentic PDF rate circular (.pdf).");
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      if (selectedFile.name.toLowerCase().endsWith(".pdf")) {
        onUpload(carrier.carrier_code, selectedFile);
      } else {
        alert("Please upload an authentic PDF rate circular (.pdf).");
      }
    }
    // Reset file input so user can re-upload same file if needed
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  return (
    <div
      className={`rounded-2xl border transition-all duration-200 bg-white flex flex-col justify-between overflow-hidden shadow-xs ${
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
          <div className="shrink-0">
            {hasCircular ? (
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                Active
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                <Clock className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                No Circular
              </span>
            )}
          </div>
        </div>

        {/* Dedicated Parser Signature */}
        <div className="flex items-center gap-2 mt-3 pt-2.5 border-t border-slate-100/80 text-xs">
          <span className="text-slate-600 font-medium">Parser Engine:</span>
          <span className="font-mono font-semibold text-slate-700 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200/60 inline-flex items-center gap-1">
            <Sparkles className="h-3 w-3 text-amber-500" />
            {carrier.parser_id}
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
                    {circular.valid_from || "Current"} &rarr; {circular.valid_to || "Dec 2026"}
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

            {/* Quick Drop Zone Hint */}
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
                  <span className="text-jfll-blue font-bold">Ingesting and parsing circular...</span>
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
                {isUploading ? "Uploading & Extracting..." : "Drag & Drop Carrier Circular PDF"}
              </p>
              <p className="text-[11px] text-slate-600 mt-0.5">
                or click to browse filesystem (.pdf only)
              </p>
            </div>
            <span className="text-[11px] text-slate-600 mt-1">
              Currently serving system baseline ex-BOM
            </span>
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
                ? "Pricing Team Head authorization required to clear circulars"
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
