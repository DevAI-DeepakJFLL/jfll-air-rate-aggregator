"use client";

import React from "react";
import { AlertTriangle, Mail } from "lucide-react";

interface HeavyCargoBannerProps {
  chargeableWeight: number;
  message?: string;
}

export function HeavyCargoBanner({ chargeableWeight, message }: HeavyCargoBannerProps) {
  return (
    <div className="rounded-xl border border-amber-300 bg-amber-50 p-6 shadow-sm">
      <div className="flex items-start gap-4">
        <div className="rounded-full bg-amber-100 p-2 text-amber-700">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-bold text-amber-900">
            Heavy Cargo Threshold Exceeded ({chargeableWeight.toFixed(1)} kg)
          </h3>
          <p className="mt-1 text-sm text-amber-800">
            {message ||
              "Published airline smalls tariffs only apply to shipments strictly under 500 kg. Shipments 500 kg and above require ad-hoc spot rate negotiation from the airline cargo desk."}
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <a
              href="mailto:pricing@jfll.com?subject=Heavy%20Cargo%20Spot%20Enquiry%20(500kg%2B)"
              className="inline-flex items-center gap-2 rounded-lg bg-amber-800 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-amber-900 transition-colors"
            >
              <Mail className="h-4 w-4" />
              Request Spot Rate from Carrier Desk
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
