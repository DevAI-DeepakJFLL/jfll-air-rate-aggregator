export type ChargeCategory =
  | "TERMINAL"
  | "COMMODITY"
  | "DOCUMENTATION"
  | "CUSTOMS"
  | "STATUTORY_TAX"
  | "OTHER";

export type CalculationType =
  | "PER_KG_WITH_MIN"
  | "FLAT"
  | "PERCENTAGE"
  | "PER_PIECE";

export type CorridorScope = "GLOBAL" | "SPECIFIC_PORTS" | "SPECIFIC_COUNTRIES";
export type CommodityScope = "ALL" | "SPECIFIC_COMMODITIES";
export type CarrierScope = "ALL" | "SPECIFIC_CARRIERS";

export interface ChargeApplicability {
  corridor_scope: CorridorScope;
  destination_codes: string[];
  commodity_scope: CommodityScope;
  commodity_keywords: string[];
  carrier_scope: CarrierScope;
  carrier_codes: string[];
  min_chargeable_weight?: number | null;
}

export interface ChargeRule {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  category: ChargeCategory;
  calculation_type: CalculationType;
  rate_per_kg?: number | null;
  min_amount?: number | null;
  flat_amount?: number | null;
  percentage_rate?: number | null;
  rate_per_piece?: number | null;
  applicability: ChargeApplicability;
  is_active: boolean;
  is_statutory: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
  updated_by: string;
}

export type ChargeRuleCreate = Omit<ChargeRule, "id" | "created_at" | "updated_at" | "updated_by">;
export type ChargeRuleUpdate = Partial<ChargeRuleCreate>;
