"use client";

import React from "react";

export function AirlineCardSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading airline tariffs">
      <div className="flex items-center justify-between pb-1">
        <div className="h-5 w-48 rounded-md bg-slate-200 animate-pulse" />
        <div className="h-4 w-32 rounded-md bg-slate-100 animate-pulse" />
      </div>

      {[1, 2, 3].map((n) => (
        <div
          key={n}
          className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs animate-pulse space-y-4"
        >
          {/* Top row */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-xl bg-slate-200" />
              <div className="space-y-1.5">
                <div className="h-4 w-36 rounded bg-slate-200" />
                <div className="h-3 w-28 rounded bg-slate-100" />
              </div>
            </div>
            <div className="h-8 w-28 rounded-lg bg-slate-200" />
          </div>

          {/* Center Timetable line */}
          <div className="grid grid-cols-3 gap-4 py-3 border-y border-slate-100">
            <div className="space-y-1">
              <div className="h-3 w-16 rounded bg-slate-100" />
              <div className="h-5 w-20 rounded bg-slate-200" />
            </div>
            <div className="flex flex-col items-center justify-center space-y-1">
              <div className="h-3 w-20 rounded bg-slate-100" />
              <div className="h-0.5 w-full bg-slate-200" />
            </div>
            <div className="space-y-1 text-right flex flex-col items-end">
              <div className="h-3 w-16 rounded bg-slate-100" />
              <div className="h-5 w-20 rounded bg-slate-200" />
            </div>
          </div>

          {/* Bottom row */}
          <div className="flex items-center justify-between pt-1">
            <div className="h-3 w-48 rounded bg-slate-100" />
            <div className="h-8 w-32 rounded-lg bg-slate-200" />
          </div>
        </div>
      ))}
    </div>
  );
}
