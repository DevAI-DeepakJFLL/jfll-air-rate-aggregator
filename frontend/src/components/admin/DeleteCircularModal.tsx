"use client";

import React, { useEffect } from "react";
import { AlertTriangle, Trash2, X } from "lucide-react";
import { AirlineLogo } from "@/components/rates/AirlineLogo";
import { CarrierRegistryItem } from "@/types/tariff";

interface DeleteCircularModalProps {
  carrier: CarrierRegistryItem | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (carrierCode: string) => Promise<void>;
  isDeleting: boolean;
}

export function DeleteCircularModal({
  carrier,
  isOpen,
  onClose,
  onConfirm,
  isDeleting,
}: DeleteCircularModalProps) {
  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !isDeleting) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isDeleting, onClose]);

  if (!isOpen || !carrier) return null;

  const circular = carrier.active_circular;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-circular-title"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-obsidian-950/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 z-10 animate-in zoom-in-95 duration-150">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-red-100 flex items-center justify-center text-red-600 shrink-0">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <h3 id="delete-circular-title" className="text-sm font-bold text-slate-900">
                Clear Active Rate Circular
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Admin Authorization Required
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Carrier Focus Summary */}
        <div className="mt-4 p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center gap-3">
          <AirlineLogo
            carrierCode={carrier.carrier_code}
            carrierName={carrier.carrier_name}
            size="sm"
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="font-bold text-xs text-slate-900 truncate">
                {carrier.carrier_name}
              </span>
              <span className="font-mono text-xs font-bold text-slate-600 bg-slate-200 px-1.5 py-0.5 rounded">
                {carrier.carrier_code}
              </span>
            </div>
            <p className="text-xs text-slate-500 truncate mt-0.5">
              Active File: {circular?.filename || "None"}
            </p>
          </div>
        </div>

        {/* Warning Copy */}
        <p className="mt-3.5 text-xs text-slate-600 leading-relaxed">
          Are you sure you want to clear this active circular? Live quote searches for{" "}
          <strong className="text-slate-900">{carrier.carrier_name}</strong> will be deactivated with
          0 active routes until a new rate sheet is uploaded.
        </p>

        {/* Action Buttons */}
        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onConfirm(carrier.carrier_code)}
            disabled={isDeleting}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-700 transition-colors shadow-xs cursor-pointer disabled:opacity-50"
          >
            <Trash2 className="h-3.5 w-3.5" />
            {isDeleting ? "Deactivating..." : "Deactivate Circular"}
          </button>
        </div>
      </div>
    </div>
  );
}
