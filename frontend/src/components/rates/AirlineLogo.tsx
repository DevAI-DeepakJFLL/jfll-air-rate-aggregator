"use client";

import React, { useState } from "react";

interface AirlineLogoProps {
  carrierCode: string;
  carrierName: string;
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
}

const SIZE_MAP = {
  xs: {
    container: "h-6 w-6 rounded-md p-0.5",
    img: "h-5 w-5",
    fallbackText: "text-[9px]",
    width: 20,
    height: 20,
  },
  sm: {
    container: "h-8 w-8 rounded-lg p-1",
    img: "h-6 w-6",
    fallbackText: "text-[10px]",
    width: 24,
    height: 24,
  },
  md: {
    container: "h-11 w-11 rounded-xl p-1.5",
    img: "h-8 w-8",
    fallbackText: "text-xs",
    width: 32,
    height: 32,
  },
  lg: {
    container: "h-14 w-14 rounded-2xl p-2",
    img: "h-10 w-10",
    fallbackText: "text-sm",
    width: 40,
    height: 40,
  },
};

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
  "6E": { bg: "bg-indigo-50", text: "text-indigo-900", border: "border-indigo-300" },
  LH: { bg: "bg-amber-50", text: "text-amber-950", border: "border-amber-300" },
  SQ: { bg: "bg-blue-50", text: "text-blue-900", border: "border-blue-300" },
  TK: { bg: "bg-red-50", text: "text-red-950", border: "border-red-300" },
};

export function AirlineLogo({
  carrierCode,
  carrierName,
  size = "md",
  className = "",
}: AirlineLogoProps) {
  const [hasError, setHasError] = useState(false);
  const code = (carrierCode || "JF").toUpperCase().trim();
  const config = SIZE_MAP[size] || SIZE_MAP.md;

  const theme = CARRIER_THEMES[code] || {
    bg: "bg-slate-100",
    text: "text-slate-800",
    border: "border-slate-300",
  };

  // If image fails to load or error occurs, render initial code badge
  if (hasError) {
    return (
      <div
        className={`inline-flex items-center justify-center font-mono font-black select-none border shrink-0 ${theme.bg} ${theme.text} ${theme.border} ${config.container} ${config.fallbackText} ${className}`}
        title={`${carrierName} (${code})`}
        aria-label={`${carrierName} logo`}
      >
        {code}
      </div>
    );
  }

  return (
    <div
      className={`inline-flex items-center justify-center bg-white border border-slate-200/90 shadow-2xs shrink-0 select-none ${config.container} ${className}`}
      title={`${carrierName} (${code})`}
      aria-label={`${carrierName} logo`}
    >
      <img
        src={`/airlines/${code}.png`}
        alt={`${carrierName} authorized logo`}
        width={config.width}
        height={config.height}
        className={`${config.img} object-contain`}
        loading="eager"
        decoding="async"
        onError={() => setHasError(true)}
      />
    </div>
  );
}
