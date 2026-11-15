import React from "react";

export function CalculatorFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white py-4">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between text-xs font-semibold text-slate-500 gap-2">
        <div>Jet Freight Logistics Ltd. &bull; Chhatrapati Shivaji Maharaj International Airport (BOM)</div>
        <div className="flex items-center gap-3 text-[11px] text-slate-400">
          <span>IATA TACT 0.5kg Rule Active</span>
          <span>&bull;</span>
          <span>Break-Even Pivot Engine v1.0</span>
        </div>
      </div>
    </footer>
  );
}
