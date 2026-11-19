import React from "react";
import { RateQuoteItem, MarginMode, CardMarginOverride } from "../../types/rate";
import { formatINR } from "../../lib/utils";
import { StandardSelect, StandardSelectOption } from "../common/StandardSelect";
import { SlidersHorizontal, TrendingDown, Info } from "lucide-react";

interface RatesTableRowDetailProps {
  quote: RateQuoteItem;
  hasCardOverride: boolean;
  cardOverride?: CardMarginOverride;
  isOverrideActive: boolean;
  overrideMode: MarginMode;
  overrideInputStr: string;
  marginOptions: StandardSelectOption<MarginMode>[];
  onOpenOverride: (e: React.MouseEvent) => void;
  onCloseOverride: () => void;
  onSetOverrideMode: (mode: MarginMode) => void;
  onSetOverrideInput: (val: string) => void;
  onApplyOverride: () => void;
  onRevertOverride: () => void;
}

export function RatesTableRowDetail({
  quote,
  hasCardOverride,
  cardOverride,
  isOverrideActive,
  overrideMode,
  overrideInputStr,
  marginOptions,
  onOpenOverride,
  onCloseOverride,
  onSetOverrideMode,
  onSetOverrideInput,
  onApplyOverride,
  onRevertOverride,
}: RatesTableRowDetailProps) {
  return (
    <tr className="bg-slate-50/90 border-b border-slate-200">
      <td colSpan={7} className="p-4 sm:p-5">
        <div className="space-y-4">
          {/* Sub-row Header & Surcharge Status */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/80 pb-2.5">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-obsidian-900 text-xs">
                {quote.carrier_name} ({quote.carrier_code}) &bull; Flight {quote.flight_number}
              </span>
              <span className="text-slate-300 text-xs">&bull;</span>
              <span className="text-xs font-medium text-slate-500">
                AWB {quote.airline_prefix} &bull; {quote.rate_basis}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onOpenOverride}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors shadow-2xs cursor-pointer"
              >
                <SlidersHorizontal className="h-3 w-3 text-slate-500" />
                <span>
                  {hasCardOverride && cardOverride
                    ? `Override: ${
                        cardOverride.mode === "per_kg"
                          ? "₹" + cardOverride.value + "/kg"
                          : cardOverride.mode === "percent"
                          ? cardOverride.value + "%"
                          : "₹" + cardOverride.value
                      }`
                    : "Custom Airline Margin"}
                </span>
              </button>
            </div>
          </div>

          {/* Inline Carrier Override Editor (If Open) */}
          {isOverrideActive && (
            <div className="p-3.5 rounded-xl bg-white border border-slate-300 shadow-sm space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-obsidian-900 text-xs">
                  Set Custom Margin for {quote.carrier_name}
                </span>
                <button
                  type="button"
                  onClick={onCloseOverride}
                  className="text-slate-600 hover:text-slate-800 text-xs font-bold cursor-pointer"
                >
                  Close
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-2.5">
                <div className="w-32">
                  <StandardSelect
                    size="sm"
                    value={overrideMode}
                    onChange={(val) => onSetOverrideMode(val as MarginMode)}
                    options={marginOptions}
                    ariaLabel="Margin calculation mode"
                  />
                </div>
                <input
                  type="number"
                  value={overrideInputStr}
                  onChange={(e) => onSetOverrideInput(e.target.value)}
                  placeholder="e.g. 20"
                  className="h-8 w-24 rounded-lg border border-slate-300 bg-white px-2.5 font-mono text-xs font-bold text-slate-900 focus-ring"
                />
                <button
                  type="button"
                  onClick={onApplyOverride}
                  className="rounded-lg bg-obsidian-900 px-3 py-1.5 font-bold text-white text-xs hover:bg-slate-800 cursor-pointer"
                >
                  Save Override
                </button>
                {hasCardOverride && (
                  <button
                    type="button"
                    onClick={onRevertOverride}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-bold text-slate-600 text-xs hover:bg-slate-100 cursor-pointer"
                  >
                    Revert to Global
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Itemized Surcharges Grid */}
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-2">
              Landed Buying Cost Line Items (BOM Terminal)
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
              <div className="rounded-xl border border-slate-200 bg-white p-2 text-center">
                <div className="text-[10px] font-semibold text-slate-500">Base Freight</div>
                <div className="font-mono font-bold text-xs text-slate-800 mt-0.5">
                  {formatINR(quote.breakdown.base_freight_total)}
                </div>
                <div className="text-[9px] text-slate-600 font-medium font-mono">
                  ₹{quote.breakdown.base_rate_per_kg}/kg
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-2 text-center">
                <div className="text-[10px] font-semibold text-slate-500">Fuel (FSC)</div>
                <div className="font-mono font-bold text-xs text-slate-800 mt-0.5">
                  {formatINR(quote.breakdown.fsc_total)}
                </div>
                <div className="text-[9px] text-slate-600 font-medium font-mono">
                  ₹{quote.breakdown.fsc_rate_per_kg}/kg
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-2 text-center">
                <div className="text-[10px] font-semibold text-slate-500">Security (SSC)</div>
                <div className="font-mono font-bold text-xs text-slate-800 mt-0.5">
                  {formatINR(quote.breakdown.ssc_total)}
                </div>
                <div className="text-[9px] text-slate-600 font-medium font-mono">
                  ₹{quote.breakdown.ssc_rate_per_kg}/kg
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-2 text-center">
                <div className="text-[10px] font-semibold text-slate-500">MIAL THC</div>
                <div className="font-mono font-bold text-xs text-slate-800 mt-0.5">
                  {formatINR(quote.breakdown.origin_thc_total)}
                </div>
                <div className="text-[9px] text-slate-600 font-medium font-mono">Terminal</div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-2 text-center">
                <div className="text-[10px] font-semibold text-slate-500">X-Ray & Handling</div>
                <div className="font-mono font-bold text-xs text-slate-800 mt-0.5">
                  {formatINR(quote.breakdown.xray_total + quote.breakdown.misc_handling_total)}
                </div>
                <div className="text-[9px] text-slate-600 font-medium font-mono">Screening</div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-2 text-center">
                <div className="text-[10px] font-semibold text-slate-500">e-AWB & Tax</div>
                <div className="font-mono font-bold text-xs text-slate-800 mt-0.5">
                  {formatINR(quote.breakdown.awb_fee + quote.breakdown.gst_tax)}
                </div>
                <div className="text-[9px] text-slate-600 font-medium font-mono">AWB + 5% GST</div>
              </div>
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-2 text-center">
                <div className="text-[10px] font-bold text-emerald-800">Net Buy Total</div>
                <div className="font-mono font-black text-xs text-emerald-900 mt-0.5">
                  {formatINR(quote.breakdown.total_landed_buy)}
                </div>
                <div className="text-[9px] font-extrabold text-emerald-700 font-mono">
                  ₹{quote.breakdown.effective_buy_per_kg.toFixed(2)}/kg
                </div>
              </div>
            </div>
          </div>

          {/* Break-even Pivot Math (If applicable) */}
          {quote.is_pivoted && (
            <div className="rounded-xl border border-amber-300 bg-amber-50/80 p-3 text-xs text-amber-950">
              <div className="flex items-center gap-2 font-bold mb-1">
                <TrendingDown className="h-4 w-4 text-amber-700" />
                <span>IATA TACT Break-Even Pivot Rule Applied</span>
              </div>
              <p className="leading-relaxed">
                {quote.pivot_savings}. Declaring the shipment at the higher weight minimum discounted slab yields a lower total landed invoice than multiplying by the natural tier.
              </p>
            </div>
          )}

          {/* Operational & Regulatory Directives from Audit Report */}
          {quote.regulatory_notes && quote.regulatory_notes.length > 0 && (
            <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-3 text-xs space-y-1.5">
              <div className="flex items-center gap-2 font-extrabold text-obsidian-900">
                <Info className="h-4 w-4 text-jfll-blue shrink-0" />
                <span>Operational Directives &amp; Regulatory Compliance (ex-BOM)</span>
              </div>
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                {quote.regulatory_notes.map((note, nIdx) => (
                  <span
                    key={nIdx}
                    className="inline-flex items-center gap-1 rounded-lg bg-white border border-blue-200/80 px-2.5 py-1 text-[11px] font-semibold text-slate-700 shadow-2xs"
                  >
                    &bull; {note}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </td>
    </tr>
  );
}
