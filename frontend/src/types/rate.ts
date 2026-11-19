export interface CargoDimension {
  length_cm: number;
  width_cm: number;
  height_cm: number;
  pieces: number;
}

export interface RateSearchRequest {
  origin: string;
  destination: string;
  actual_weight_kg?: number;
  dimensions?: CargoDimension[];
  commodity?: string;
  packaging_type?: string;
  pieces?: number;
}

export interface CostBreakdown {
  base_rate_per_kg: number;
  base_freight_total: number;
  fsc_rate_per_kg: number;
  fsc_total: number;
  ssc_rate_per_kg: number;
  ssc_total: number;
  fuel_security_total: number;
  xray_total: number;
  misc_handling_total: number;
  commodity_fee: number;
  origin_thc_total: number;
  awb_fee: number;
  ams_fee: number;
  net_subtotal: number;
  gst_tax: number;
  total_landed_buy: number;
  effective_buy_per_kg: number;
  dynamic_charges?: Array<{
    code: string;
    name: string;
    amount: number;
    category: string;
    is_statutory: boolean;
  }>;
}

export interface RateQuoteItem {
  id: string;
  carrier_name: string;
  carrier_code: string;
  airline_prefix: string;
  flight_number: string;
  routing_type: string;
  transit_time: string;
  transit_minutes?: number;
  departure_time: string;
  arrival_time: string;
  cargo_cutoff: string;
  origin: string;
  destination: string;
  cargo_category: string;
  chargeable_weight: number;
  weight_tier_applied: string;
  is_pivoted: boolean;
  pivot_savings?: string;
  breakdown: CostBreakdown;
  rate_basis: string;
  valid_from?: string;
  valid_to?: string;
  validity_status: string;
  gauge_restriction?: string;
  recommended: boolean;
  regulatory_notes?: string[];
  packaging_restricted?: boolean;
}

export interface DestinationItem {
  code: string;
  city: string;
  country: string;
  region: string;
}

export interface RateSearchResponse {
  origin: string;
  destination: string;
  chargeable_weight: number;
  is_heavy_cargo: boolean;
  message?: string;
  rates: RateQuoteItem[];
}

export type MarginMode = "per_kg" | "percent" | "flat";

export interface MarginInfo {
  mode: MarginMode;
  value: number;
  totalMargin: number;
  sellTotal: number;
  sellPerKg: number;
  marginPerKg: number;
}

export interface CardMarginOverride {
  mode: MarginMode;
  value: number;
}

