"use client";

import React from "react";

export function AirlineCardSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading airline tariffs">
      {/* Top Header Filter Skeleton */}
      <div className="flex items-center justify-between pb-1 border-b border-slate-200">
        <div className="space-y-1">
          <div className="h-5 w-48 rounded-md bg-slate-200 animate-pulse" />
          <div className="h-3 w-64 rounded-md bg-slate-100 animate-pulse" />
        </div>
        <div className="flex gap-2">
          <div className="h-7 w-20 rounded-xl bg-slate-200 animate-pulse" />
          <div className="h-7 w-20 rounded-xl bg-slate-200 animate-pulse" />
        </div>
      </div>

      {/* Table Skeleton Container */}
      <div className="rounded-2xl border border-slate-200/90 bg-white shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/90 py-3 px-4">
                <th className="py-3 px-4"><div className="h-4 w-24 rounded bg-slate-200 animate-pulse" /></th>
                <th className="py-3 px-3.5"><div className="h-4 w-24 rounded bg-slate-200 animate-pulse" /></th>
                <th className="py-3 px-3"><div className="h-4 w-16 rounded bg-slate-200 animate-pulse" /></th>
                <th className="py-3 px-3"><div className="h-4 w-20 rounded bg-slate-200 animate-pulse" /></th>
                <th className="py-3 px-3.5 text-right"><div className="h-4 w-20 rounded bg-slate-200 animate-pulse ml-auto" /></th>
                <th className="py-3 px-4 text-right"><div className="h-4 w-28 rounded bg-slate-200 animate-pulse ml-auto" /></th>
                <th className="py-3 px-4 text-center"><div className="h-4 w-16 rounded bg-slate-200 animate-pulse mx-auto" /></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {[1, 2, 3, 4, 5].map((idx) => (
                <tr key={idx} className={idx % 2 === 1 ? "bg-slate-50/40" : "bg-white"}>
                  {/* Airline & Flight */}
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <div className="flex items-center gap-2.5">
                      <div className="h-8 w-8 rounded-lg bg-slate-200 animate-pulse shrink-0" />
                      <div className="space-y-1.5">
                        <div className="h-3.5 w-28 rounded bg-slate-200 animate-pulse" />
                        <div className="h-2.5 w-20 rounded bg-slate-100 animate-pulse" />
                      </div>
                    </div>
                  </td>

                  {/* Schedule */}
                  <td className="py-3.5 px-3.5 whitespace-nowrap">
                    <div className="space-y-1.5">
                      <div className="h-3.5 w-24 rounded bg-slate-200 animate-pulse" />
                      <div className="h-2.5 w-20 rounded bg-slate-100 animate-pulse" />
                    </div>
                  </td>

                  {/* Cutoff */}
                  <td className="py-3.5 px-3 whitespace-nowrap">
                    <div className="space-y-1.5">
                      <div className="h-3.5 w-16 rounded bg-slate-200 animate-pulse" />
                      <div className="h-2.5 w-20 rounded bg-slate-100 animate-pulse" />
                    </div>
                  </td>

                  {/* Slab */}
                  <td className="py-3.5 px-3 whitespace-nowrap">
                    <div className="space-y-1.5">
                      <div className="h-3.5 w-16 rounded bg-slate-200 animate-pulse" />
                      <div className="h-2.5 w-12 rounded bg-slate-100 animate-pulse" />
                    </div>
                  </td>

                  {/* Net Buy */}
                  <td className="py-3.5 px-3.5 text-right whitespace-nowrap">
                    <div className="space-y-1.5 ml-auto flex flex-col items-end">
                      <div className="h-3.5 w-20 rounded bg-slate-200 animate-pulse" />
                      <div className="h-2.5 w-16 rounded bg-slate-100 animate-pulse" />
                    </div>
                  </td>

                  {/* Sell Price */}
                  <td className="py-3.5 px-4 text-right whitespace-nowrap bg-amber-50/20">
                    <div className="space-y-1.5 ml-auto flex flex-col items-end">
                      <div className="h-4 w-24 rounded bg-slate-200 animate-pulse" />
                      <div className="h-2.5 w-16 rounded bg-slate-100 animate-pulse" />
                    </div>
                  </td>

                  {/* Actions */}
                  <td className="py-3.5 px-4 text-center whitespace-nowrap">
                    <div className="flex items-center justify-center gap-1.5">
                      <div className="h-7 w-16 rounded-lg bg-slate-200 animate-pulse" />
                      <div className="h-7 w-7 rounded-lg bg-slate-200 animate-pulse" />
                      <div className="h-7 w-7 rounded-lg bg-slate-200 animate-pulse" />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
