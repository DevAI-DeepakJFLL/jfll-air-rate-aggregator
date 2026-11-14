"use client";

import React from "react";

interface CarrierBadgeProps {
  carrierCode: string;
  carrierName: string;
  className?: string;
}

const CARRIER_THEMES: Record<string, { bg: string; text: string; border: string }> = {
  AI: { bg: "bg-red-50", text: "text-red-700", border: "border-red-200" },
  EY: { bg: "bg-amber-50", text: "text-amber-800", border: "border-amber-200" },
  WY: { bg: "bg-teal-50", text: "text-teal-800", border: "border-teal-200" },
  MH: { bg: "bg-blue-50", text: "text-blue-800", border: "border-blue-200" },
  ET: { bg: "bg-emerald-50", text: "text-emerald-800", border: "border-emerald-200" },
  EK: { bg: "bg-red-50", text: "text-red-800", border: "border-red-200" },
  QR: { bg: "bg-purple-50", text: "text-purple-800", border: "border-purple-200" },
  D7: { bg: "bg-rose-50", text: "text-rose-800", border: "border-rose-200" },
  SV: { bg: "bg-green-50", text: "text-green-800", border: "border-green-200" },
};

export function CarrierBadge({ carrierCode, carrierName, className = "" }: CarrierBadgeProps) {
  const code = (carrierCode || "JF").toUpperCase().trim();
  const theme = CARRIER_THEMES[code] || {
    bg: "bg-slate-100",
    text: "text-slate-800",
    border: "border-slate-200",
  };

  return (
    <div
      className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${theme.bg} ${theme.text} ${theme.border} font-mono text-sm font-black tracking-wider shadow-xs select-none ${className}`}
      title={carrierName}
      aria-label={`${carrierName} (${carrierCode})`}
    >
      {code}
    </div>
  );
}
