"use client";

import React from "react";
import { X, CheckCircle, ShieldAlert } from "lucide-react";
import { RateQuoteItem } from "../../types/rate";
import { formatINR } from "../../lib/utils";

interface CostBreakdownModalProps {
  quote: RateQuoteItem | null;
  onClose: () => void;
}

export function CostBreakdownModal({ quote, onClose }: CostBreakdownModalProps) {
  if (!quote) return null;

  const { breakdown } = quote;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 pb-4">
          <div>
            <h3 className="text-xl font-bold text-gray-900">{quote.carrier_name}</h3>
            <p className="text-xs text-gray-500">
              {quote.origin} → {quote.destination} | {quote.flight_number} | CW: {quote.chargeable_weight} kg
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-4 space-y-3 text-sm">
          <div className="rounded-lg bg-blue-50/70 p-3 text-xs text-blue-900 border border-blue-100">
            <span className="font-semibold">Pure Airline Buying Rate:</span> Excludes all commercial
            markups (zero margin applied).
          </div>

          <div className="space-y-2 divide-y divide-gray-100">
            <div className="flex justify-between py-1">
              <span className="text-gray-600">Base Freight ({quote.weight_tier_applied})</span>
              <span className="font-medium text-gray-900">{formatINR(breakdown.base_freight_total)}</span>
            </div>

            <div className="flex justify-between py-1">
              <span className="text-gray-600">
                Fuel Surcharge (FSC @ ₹{breakdown.fsc_rate_per_kg}/kg)
              </span>
              <span className="font-medium text-gray-900">{formatINR(breakdown.fsc_total)}</span>
            </div>

            <div className="flex justify-between py-1">
              <span className="text-gray-600">
                Security Surcharge (MYC/SSC @ ₹{breakdown.ssc_rate_per_kg}/kg)
              </span>
              <span className="font-medium text-gray-900">{formatINR(breakdown.ssc_total)}</span>
            </div>

            <div className="flex justify-between py-1">
              <span className="text-gray-600">Airport X-Ray Screening</span>
              <span className="font-medium text-gray-900">{formatINR(breakdown.xray_total)}</span>
            </div>

            <div className="flex justify-between py-1">
              <span className="text-gray-600">Terminal Handling & CTG</span>
              <span className="font-medium text-gray-900">{formatINR(breakdown.misc_handling_total)}</span>
            </div>

            {breakdown.commodity_fee > 0 && (
              <div className="flex justify-between py-1 text-amber-700">
                <span>Commodity Handling ({quote.cargo_category})</span>
                <span className="font-medium">{formatINR(breakdown.commodity_fee)}</span>
              </div>
            )}

            <div className="flex justify-between py-1">
              <span className="text-gray-600">e-AWB Issuance Fee</span>
              <span className="font-medium text-gray-900">{formatINR(breakdown.awb_fee)}</span>
            </div>

            {breakdown.ams_fee > 0 && (
              <div className="flex justify-between py-1 text-purple-700">
                <span>Customs AMS Manifest (US/Canada)</span>
                <span className="font-medium">{formatINR(breakdown.ams_fee)}</span>
              </div>
            )}

            <div className="flex justify-between pt-2 text-base font-semibold text-gray-900">
              <span>Net Airline Subtotal</span>
              <span>{formatINR(breakdown.net_subtotal)}</span>
            </div>

            <div className="flex justify-between py-1 text-xs text-gray-500">
              <span>Statutory Air Export GST (5%)</span>
              <span>{formatINR(breakdown.gst_tax)}</span>
            </div>

            <div className="flex justify-between pt-3 text-lg font-bold text-jfll-navy">
              <span>Total Landed Buy Cost</span>
              <span className="text-emerald-700">{formatINR(breakdown.total_landed_buy)}</span>
            </div>

            <div className="flex justify-between py-1 text-xs text-emerald-800 font-semibold">
              <span>Effective Buying Rate / kg</span>
              <span>₹{breakdown.effective_buy_per_kg.toFixed(2)} / kg</span>
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="rounded-lg bg-gray-900 px-5 py-2 text-sm font-semibold text-white hover:bg-gray-800"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
