"use client";

import React from "react";

interface CarrierBadgeProps {
  carrierCode: string;
  carrierName: string;
  className?: string;
}

const CARRIER_THEMES: Record<string, { bg: string; text: string; border: string }> = {
  AI: { bg: "bg-rose-50", text: "text-rose-900", border: "border-rose-300" },
  EY: { bg: "bg-amber-50", text: "text-amber-900", border: "border-amber-300" },
  WY: { bg: "bg-teal-50", text: "text-teal-900", border: "border-teal-300" },
  MH: { bg: "bg-sky-50", text: "text-sky-900", border: "border-sky-300" },
  ET: { bg: "bg-emerald-50", text: "text-emerald-900", border: "border-emerald-300" },
  EK: { bg: "bg-red-50", text: "text-red-900", border: "border-red-300" },
  QR: { bg: "bg-purple-50", text: "text-purple-900", border: "border-purple-300" },
  D7: { bg: "bg-rose-50", text: "text-rose-900", border: "border-rose-300" },
  SV: { bg: "bg-emerald-50", text: "text-emerald-900", border: "border-emerald-300" },
};

export function CarrierBadge({ carrierCode, carrierName, className = "" }: CarrierBadgeProps) {
  const code = (carrierCode || "JF").toUpperCase().trim();
  const theme = CARRIER_THEMES[code] || {
    bg: "bg-slate-100",
    text: "text-slate-900",
    border: "border-slate-300",
  };

  return (
    <div
      className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${theme.bg} ${theme.text} ${theme.border} font-mono text-sm font-black tracking-wider shadow-2xs select-none ${className}`}
      title={carrierName}
      aria-label={`${carrierName} (${carrierCode})`}
    >
      {code}
    </div>
  );
}
