"use client";

import React from "react";
import { Plane, ArrowRight, RotateCcw } from "lucide-react";

interface EmptyRateStateProps {
  origin: string;
  destination: string;
  onSelectRoute: (origin: string, destination: string) => void;
}

const ACTIVE_CORRIDORS = [
  { origin: "BOM", destination: "DXB", label: "Mumbai → Dubai (Middle East)" },
  { origin: "BOM", destination: "KUL", label: "Mumbai → Kuala Lumpur (SE Asia)" },
  { origin: "BOM", destination: "ORD", label: "Mumbai → Chicago (North America)" },
];

export function EmptyRateState({ origin, destination, onSelectRoute }: EmptyRateStateProps) {
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
        Try selecting an active hub or upload a new rate circular in Admin Ingestion.
      </p>

      <div className="mt-5">
        <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
          Quick-load active corridors:
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          {ACTIVE_CORRIDORS.map((corridor) => (
            <button
              key={`${corridor.origin}-${corridor.destination}`}
              type="button"
              onClick={() => onSelectRoute(corridor.origin, corridor.destination)}
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:border-jfll-blue hover:bg-blue-50/50 hover:text-jfll-blue transition-colors cursor-pointer"
            >
              <span>{corridor.label}</span>
              <ArrowRight className="h-3 w-3" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
