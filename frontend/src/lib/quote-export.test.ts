import { describe, it, expect } from "vitest";
import { formatCustomerQuoteText, formatInternalAuditText } from "./quote-export";
import { RateQuoteItem } from "../types/rate";
import { MarginInfo } from "../components/rates/CostBreakdownModal";

const mockQuote: RateQuoteItem = {
  id: "quote-1",
  carrier_code: "EK",
  carrier_name: "Emirates",
  airline_prefix: "176",
  flight_number: "EK-505",
  origin: "BOM",
  destination: "DXB",
  routing_type: "Non-Stop Direct",
  departure_time: "10:10 IST",
  arrival_time: "11:55 GST",
  transit_time: "3h 15m",
  cargo_cutoff: "05:30 IST",
  chargeable_weight: 100,
  weight_tier_applied: "+100 kg",
  is_pivoted: false,
  rate_basis: "NET_NET_PLUS_PLUS",
  cargo_category: "General Cargo",
  recommended: true,
  validity_status: "Active",
  breakdown: {
    base_rate_per_kg: 120,
    base_freight_total: 12000,
    fsc_rate_per_kg: 20,
    fsc_total: 2000,
    ssc_rate_per_kg: 4,
    ssc_total: 400,
    origin_thc_total: 800,
    xray_total: 200,
    misc_handling_total: 100,
    awb_fee: 450,
    gst_tax: 797.5,
    fuel_security_total: 2400,
    commodity_fee: 0,
    ams_fee: 0,
    net_subtotal: 15950,
    total_landed_buy: 16747.5,
    effective_buy_per_kg: 167.48,
  },
};

const mockMargin: MarginInfo = {
  mode: "per_kg",
  value: 25,
  totalMargin: 2500,
  sellTotal: 19247.5,
  sellPerKg: 192.48,
  marginPerKg: 25,
};

describe("quote-export utility", () => {
  it("formats zero-margin customer quote correctly", () => {
    const text = formatCustomerQuoteText(mockQuote, null);
    expect(text).toContain("AIR CARGO BUYING TARIFF");
    expect(text).toContain("TOTAL LANDED BUY COST");
    expect(text).toContain("BOM → DXB (EK-505)");
  });

  it("formats customer quote with coordinator selling margin", () => {
    const text = formatCustomerQuoteText(mockQuote, mockMargin);
    expect(text).toContain("AIR FREIGHT QUOTATION");
    expect(text).toContain("ALL-IN CLIENT SELLING RATE: ₹192.48 / kg");
    expect(text).toContain("TOTAL ESTIMATED FREIGHT");
  });

  it("formats internal pricing audit sheet with margin breakdown", () => {
    const text = formatInternalAuditText(mockQuote, mockMargin);
    expect(text).toContain("INTERNAL PRICING AUDIT SHEET");
    expect(text).toContain("COORDINATOR MARGIN: +");
    expect(text).toContain("FINAL CLIENT SELL PRICE");
    expect(text).toContain("Gross Profit Margin");
  });
});
