"use client";

import React from "react";
import { Plane } from "lucide-react";

interface EmptyRateStateProps {
  origin: string;
  destination: string;
}

export function EmptyRateState({ origin, destination }: EmptyRateStateProps) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center shadow-xs">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 mb-4">
        <Plane className="h-7 w-7 rotate-45" />
      </div>

      <h3 className="text-base font-bold text-slate-900">
        No active airline tariffs found for {origin} → {destination}
      </h3>

      <p className="mt-1.5 text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
        Published tariffs in our system are currently ingested for high-frequency export corridors.
        Please select a different destination airport from the dropdown or ingest a new tariff sheet via the Admin panel.
      </p>
    </div>
  );
}
