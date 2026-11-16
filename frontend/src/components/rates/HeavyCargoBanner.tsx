"use client";

import React from "react";
import { AlertTriangle, Mail } from "lucide-react";

interface HeavyCargoBannerProps {
  chargeableWeight: number;
  message?: string;
}

export function HeavyCargoBanner({ chargeableWeight, message }: HeavyCargoBannerProps) {
  return (
    <div
      role="region"
      aria-label="Heavy cargo rate policy notice"
      className="rounded-2xl border border-amber-300 bg-amber-50 p-6 shadow-sm"
    >
      <div className="flex items-start gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-800">
          <AlertTriangle className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <h3 className="text-base font-extrabold text-amber-950">
            Heavy Cargo Threshold Exceeded ({chargeableWeight.toFixed(1)} kg)
          </h3>
          <p className="mt-1 text-xs font-semibold text-amber-900 leading-relaxed">
            {message ||
              "Published smalls tariffs apply to shipments under 500 kg. Shipments 500 kg and above require ad-hoc carrier spot rates."}
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <a
              href="mailto:pricing@jfll.com?subject=Heavy%20Cargo%20Spot%20Enquiry%20(500kg%2B)"
              className="inline-flex items-center gap-2 rounded-xl bg-amber-900 px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-amber-950 focus-ring transition-colors"
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
