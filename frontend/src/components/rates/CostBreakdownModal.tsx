"use client";

import React, { useEffect, useRef } from "react";
import { X, ShieldCheck } from "lucide-react";
import { RateQuoteItem } from "../../types/rate";
import { formatINR } from "../../lib/utils";
import { AirlineLogo } from "./AirlineLogo";
import { JfllLogo } from "@/components/common/BrandAssets";

export interface MarginInfo {
  mode: "per_kg" | "percent" | "flat";
  value: number;
  totalMargin: number;
  sellTotal: number;
  sellPerKg: number;
  marginPerKg: number;
}

interface CostBreakdownModalProps {
  quote: RateQuoteItem | null;
  marginInfo?: MarginInfo | null;
  onClose: () => void;
}

export function CostBreakdownModal({ quote, marginInfo, onClose }: CostBreakdownModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  // Keyboard accessibility: Escape key to dismiss (scroll containment handled via CSS)
  useEffect(() => {
    if (!quote) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [quote, onClose]);

  if (!quote) return null;

  const { breakdown } = quote;
  const hasDynamicCharges = Boolean(breakdown.dynamic_charges && breakdown.dynamic_charges.length > 0);
  const gatewayCharges = hasDynamicCharges
    ? (breakdown.dynamic_charges?.filter((c) => c.category !== "STATUTORY_TAX") ?? [])
    : [];
  const taxCharges = hasDynamicCharges
    ? (breakdown.dynamic_charges?.filter((c) => c.category === "STATUTORY_TAX") ?? [])
    : [];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="breakdown-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={modalRef}
        className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-slate-200"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <AirlineLogo
              carrierCode={quote.carrier_code}
              carrierName={quote.carrier_name}
              size="md"
            />
            <div>
              <h3 id="breakdown-modal-title" className="text-lg font-bold text-slate-900">
                {quote.carrier_name}
              </h3>
              <p className="text-xs font-semibold text-slate-600 mt-0.5">
                {quote.origin} → {quote.destination} &bull; Flight {quote.flight_number} &bull; AWB {quote.airline_prefix} &bull; CW:{" "}
                <span className="font-mono tabular-nums font-bold text-slate-800">
                  {quote.chargeable_weight} kg
                </span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close cost breakdown dialog"
            className="rounded-xl p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors cursor-pointer focus-ring"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="mt-4 space-y-3 text-sm">
          {marginInfo && marginInfo.totalMargin > 0 ? (
            <div className="flex items-center justify-between gap-2 rounded-xl bg-amber-50 p-3 text-xs font-semibold text-amber-900 border border-amber-200">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 shrink-0 text-amber-600" />
                <span>Commercial Client Quotation (Net Buy + Active Coordinator Margin)</span>
              </div>
              <span className="font-mono font-bold text-amber-800 bg-amber-100/80 px-2 py-0.5 rounded text-[11px] shrink-0">
                +{formatINR(marginInfo.totalMargin)} Margin
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-xl bg-blue-50/80 p-3 text-xs font-semibold text-jfll-blue border border-blue-200">
              <ShieldCheck className="h-4 w-4 shrink-0 text-jfll-blue" />
              <span>Pure Net Buying Rate: Zero commercial markups applied.</span>
            </div>
          )}

          <div className="space-y-2.5 divide-y divide-slate-100">
            <div className="flex justify-between py-1">
              <span className="text-slate-600">Base Freight ({quote.weight_tier_applied})</span>
              <span className="font-mono tabular-nums font-bold text-slate-900">
                {formatINR(breakdown.base_freight_total)}
              </span>
            </div>

            <div className="flex justify-between py-1">
              <span className="text-slate-600">
                Fuel Surcharge (FSC @ ₹{breakdown.fsc_rate_per_kg}/kg)
              </span>
              <span className="font-mono tabular-nums font-bold text-slate-900">
                {formatINR(breakdown.fsc_total)}
              </span>
            </div>

            <div className="flex justify-between py-1">
              <span className="text-slate-600">
                Security Surcharge (MYC/SSC @ ₹{breakdown.ssc_rate_per_kg}/kg)
              </span>
              <span className="font-mono tabular-nums font-bold text-slate-900">
                {formatINR(breakdown.ssc_total)}
              </span>
            </div>

            {/* 2. Gateway & Handling Ancillaries (Dynamic or Fallback) */}
            {gatewayCharges.length > 0 ? (
              gatewayCharges.map((charge, idx) => (
                <div key={`${charge.code}-${idx}`} className="flex justify-between py-1 items-center">
                  <span className="text-slate-700 font-medium">{charge.name}</span>
                  <span className="font-mono tabular-nums font-bold text-slate-900">
                    {formatINR(charge.amount)}
                  </span>
                </div>
              ))
            ) : !hasDynamicCharges ? (
              <>
                <div className="flex justify-between py-1">
                  <span className="text-slate-600">Airport X-Ray Screening</span>
                  <span className="font-mono tabular-nums font-bold text-slate-900">
                    {formatINR(breakdown.xray_total)}
                  </span>
                </div>

                <div className="flex justify-between py-1">
                  <span className="text-slate-600">Terminal Handling & CTG</span>
                  <span className="font-mono tabular-nums font-bold text-slate-900">
                    {formatINR(breakdown.misc_handling_total)}
                  </span>
                </div>

                {breakdown.commodity_fee > 0 && (
                  <div className="flex justify-between py-1 text-amber-800 font-semibold">
                    <span>Commodity Handling ({quote.cargo_category})</span>
                    <span className="font-mono tabular-nums font-bold">
                      {formatINR(breakdown.commodity_fee)}
                    </span>
                  </div>
                )}

                <div className="flex justify-between py-1">
                  <span className="text-slate-600">e-AWB Issuance Fee</span>
                  <span className="font-mono tabular-nums font-bold text-slate-900">
                    {formatINR(breakdown.awb_fee)}
                  </span>
                </div>

                {breakdown.ams_fee > 0 && (
                  <div className="flex justify-between py-1 text-teal-800 font-semibold">
                    <span>Customs AMS Manifest (US/Canada)</span>
                    <span className="font-mono tabular-nums font-bold">
                      {formatINR(breakdown.ams_fee)}
                    </span>
                  </div>
                )}
              </>
            ) : null}

            {/* 3. Net Subtotal */}
            <div className="flex justify-between pt-2.5 text-base font-bold text-slate-900">
              <span>Net Airline Subtotal</span>
              <span className="font-mono tabular-nums">{formatINR(breakdown.net_subtotal)}</span>
            </div>

            {/* 4. Statutory Taxes (Dynamic or Fallback) */}
            {taxCharges.length > 0 ? (
              taxCharges.map((charge, idx) => (
                <div key={`${charge.code}-${idx}`} className="flex justify-between py-1 text-xs font-semibold text-slate-500 items-center">
                  <span>{charge.name}</span>
                  <span className="font-mono tabular-nums font-bold text-slate-700">
                    {formatINR(charge.amount)}
                  </span>
                </div>
              ))
            ) : (
              <div className="flex justify-between py-1 text-xs font-semibold text-slate-500">
                <span>Statutory Air Export GST (5%)</span>
                <span className="font-mono tabular-nums">{formatINR(breakdown.gst_tax)}</span>
              </div>
            )}

            <div className="flex justify-between items-center pt-3 text-lg font-black text-slate-900 border-t border-slate-200">
              <div className="flex items-center gap-2">
                <AirlineLogo
                  carrierCode={quote.carrier_code}
                  carrierName={quote.carrier_name}
                  size="xs"
                />
                <span>Total Landed Buy Cost</span>
              </div>
              <span className="font-mono tabular-nums text-emerald-700 text-xl">
                {formatINR(breakdown.total_landed_buy)}
              </span>
            </div>

            <div className="flex justify-between py-1 text-xs font-extrabold text-emerald-800">
              <span>Effective Buying Rate / kg</span>
              <span className="font-mono tabular-nums">
                ₹{breakdown.effective_buy_per_kg.toFixed(2)} / kg
              </span>
            </div>
          </div>

          {/* Coordinator Commercial Margin Section */}
          {marginInfo && marginInfo.totalMargin > 0 && (
            <div className="mt-4 pt-3 border-t border-dashed border-amber-300 bg-amber-50/80 -mx-6 px-6 py-3 space-y-2 rounded-b-2xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-amber-600"></span>
                  <span className="font-black text-xs text-amber-950 uppercase tracking-wider">
                    Coordinator Margin
                  </span>
                  <span className="text-[11px] font-bold text-amber-800">
                    ({marginInfo.mode === "per_kg"
                      ? `+₹${marginInfo.value.toFixed(2)}/kg`
                      : marginInfo.mode === "percent"
                      ? `+${marginInfo.value}% on buy`
                      : `+Flat ₹${marginInfo.value}`})
                  </span>
                </div>
                <span className="font-mono tabular-nums font-black text-amber-900 text-sm">
                  +{formatINR(marginInfo.totalMargin)}
                </span>
              </div>

              <div className="flex justify-between items-center pt-2 border-t border-amber-200">
                <div className="flex flex-col">
                  <span className="text-xs font-black text-obsidian-900 uppercase tracking-tight">
                    Client Selling Price
                  </span>
                  <span className="text-[11px] font-extrabold text-emerald-800 font-mono">
                    ₹{marginInfo.sellPerKg.toFixed(2)} / kg all-in
                  </span>
                </div>
                <span className="font-mono tabular-nums text-2xl font-black text-obsidian-900">
                  {formatINR(marginInfo.sellTotal)}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Footer with JFLL Brand Mark & Close Action */}
        <div className="mt-6 flex items-center justify-between pt-3.5 border-t border-slate-100">
          <div className="flex items-center gap-2">
            <JfllLogo size="xs" variant="badge" />
            <span className="text-[11px] font-bold text-slate-500">
              Jet Freight Logistics Ltd.
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-bold text-white hover:bg-slate-800 focus-ring cursor-pointer transition-colors"
          >
            Close Breakdown
          </button>
        </div>
      </div>
    </div>
  );
}
