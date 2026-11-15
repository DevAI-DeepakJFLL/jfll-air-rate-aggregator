export interface ActiveCircular {
  filename: string;
  uploaded_at: string | null;
  valid_from: string | null;
  valid_to: string | null;
  currency: string;
  corridor_count: number;
  status: "ACTIVE" | "EXPIRING_SOON" | "EXPIRED" | "NO_CIRCULAR";
}

export interface CarrierRegistryItem {
  carrier_code: string;
  carrier_name: string;
  prefix: string;
  parser_id: string;
  parser_status: string;
  description: string;
  has_active_circular: boolean;
  active_circular: ActiveCircular | null;
  corridors_sample: string[];
  total_corridors: number;
}

export interface CarrierRateRow {
  origin?: string;
  destination: string;
  airline?: string;
  carrier_code?: string;
  prefix?: string;
  commodity?: string;
  min_charge: number;
  rate_normal: number;
  rate_45: number;
  rate_100: number;
  rate_250: number;
  rate_300: number;
  fsc_per_kg: number;
  ssc_per_kg: number;
  valid_from?: string;
  valid_to?: string;
}
