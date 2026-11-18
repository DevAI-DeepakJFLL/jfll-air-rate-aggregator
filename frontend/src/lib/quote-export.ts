import { RateQuoteItem } from "../types/rate";
import { formatINR } from "./utils";
import { MarginInfo } from "../components/rates/CostBreakdownModal";

/**
 * Builds customer-facing air freight quotation text for clipboard export.
 */
export function formatCustomerQuoteText(
  quote: RateQuoteItem,
  margin: MarginInfo | null
): string {
  if (margin && margin.totalMargin > 0) {
    return [
      `✈ AIR FREIGHT QUOTATION | JET FREIGHT LOGISTICS`,
      `Route: ${quote.origin} → ${quote.destination} (${quote.flight_number})`,
      `Carrier: ${quote.carrier_name} (${quote.carrier_code})`,
      `Routing: ${quote.routing_type} • Transit: ${quote.transit_time}`,
      `Chargeable Weight: ${quote.chargeable_weight} kg (${quote.weight_tier_applied})`,
      `Commodity: ${quote.cargo_category}`,
      `-----------------------------------------`,
      `ALL-IN CLIENT SELLING RATE: ₹${margin.sellPerKg.toFixed(2)} / kg`,
      `TOTAL ESTIMATED FREIGHT: ${formatINR(margin.sellTotal)}`,
      `Includes: Base Air Freight, Fuel (FSC), Security (SSC), Origin MIAL Terminal Charges & 5% GST`,
      `-----------------------------------------`,
      `Departure: ${quote.departure_time} | Arrival: ${quote.arrival_time}`,
      `Cargo Acceptance Cutoff: ${quote.cargo_cutoff}`,
      `Terms: Subject to space confirmation and airline booking acceptance at Mumbai Hub (BOM).`,
    ].join("\n");
  }

  return [
    `✈ AIR CARGO BUYING TARIFF | JET FREIGHT LOGISTICS`,
    `Route: ${quote.origin} → ${quote.destination} (${quote.flight_number})`,
    `Carrier: ${quote.carrier_name} (${quote.carrier_code})`,
    `Routing: ${quote.routing_type} • Transit: ${quote.transit_time}`,
    `Chargeable Weight: ${quote.chargeable_weight} kg (${quote.weight_tier_applied})`,
    `Base Freight: ₹${quote.breakdown.base_rate_per_kg}/kg (Total: ${formatINR(quote.breakdown.base_freight_total)})`,
    `Fuel (FSC): ${formatINR(quote.breakdown.fsc_total)} | Security (SSC): ${formatINR(quote.breakdown.ssc_total)}`,
    `Origin THC & Screening: ${formatINR(quote.breakdown.origin_thc_total)} | e-AWB: ${formatINR(quote.breakdown.awb_fee)}`,
    `-----------------------------------------`,
    `TOTAL LANDED BUY COST: ${formatINR(quote.breakdown.total_landed_buy)} (Zero Margin)`,
    `EFFECTIVE RATE / KG: ₹${quote.breakdown.effective_buy_per_kg.toFixed(2)} / kg`,
    `Cutoff: ${quote.cargo_cutoff}`,
  ].join("\n");
}

/**
 * Builds internal pricing desk audit sheet text for clipboard export.
 */
export function formatInternalAuditText(
  quote: RateQuoteItem,
  margin: MarginInfo | null
): string {
  const totalMargin = margin ? margin.totalMargin : 0;
  const marginPerKg = margin ? margin.marginPerKg.toFixed(2) : "0.00";
  const sellTotal = margin ? margin.sellTotal : quote.breakdown.total_landed_buy;
  const sellPerKg = margin
    ? margin.sellPerKg.toFixed(2)
    : quote.breakdown.effective_buy_per_kg.toFixed(2);
  const profitMarginPercent = margin
    ? ((margin.totalMargin / quote.breakdown.total_landed_buy) * 100).toFixed(1)
    : "0.0";

  return [
    `✈ INTERNAL PRICING AUDIT SHEET | JET FREIGHT LOGISTICS (BOM)`,
    `Route: ${quote.origin} → ${quote.destination} (${quote.flight_number})`,
    `Carrier: ${quote.carrier_name} (${quote.carrier_code})`,
    `Chargeable Weight: ${quote.chargeable_weight} kg (${quote.weight_tier_applied})`,
    `Commodity: ${quote.cargo_category}`,
    `-----------------------------------------`,
    `NET AIRLINE BUY COST: ${formatINR(quote.breakdown.total_landed_buy)} (₹${quote.breakdown.effective_buy_per_kg.toFixed(2)} / kg)`,
    `COORDINATOR MARGIN: +${formatINR(totalMargin)} (+₹${marginPerKg} / kg)`,
    `FINAL CLIENT SELL PRICE: ${formatINR(sellTotal)} (₹${sellPerKg} / kg)`,
    `Gross Profit Margin: ${profitMarginPercent}% on buy cost`,
    `-----------------------------------------`,
    `Base Freight: ₹${quote.breakdown.base_rate_per_kg}/kg | FSC: ${formatINR(quote.breakdown.fsc_total)} | SSC: ${formatINR(quote.breakdown.ssc_total)}`,
    `MIAL Terminal THC: ${formatINR(quote.breakdown.origin_thc_total)} | e-AWB: ${formatINR(quote.breakdown.awb_fee)} | GST (5%): ${formatINR(quote.breakdown.gst_tax)}`,
    `Cutoff: ${quote.cargo_cutoff}`,
  ].join("\n");
}
