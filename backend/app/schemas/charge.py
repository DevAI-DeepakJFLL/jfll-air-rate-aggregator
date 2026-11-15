from enum import Enum
from typing import List, Optional
from pydantic import BaseModel, Field, field_validator


class ChargeCategory(str, Enum):
    TERMINAL = "TERMINAL"
    COMMODITY = "COMMODITY"
    DOCUMENTATION = "DOCUMENTATION"
    CUSTOMS = "CUSTOMS"
    STATUTORY_TAX = "STATUTORY_TAX"
    OTHER = "OTHER"


class CalculationType(str, Enum):
    PER_KG_WITH_MIN = "PER_KG_WITH_MIN"
    FLAT = "FLAT"
    PERCENTAGE = "PERCENTAGE"
    PER_PIECE = "PER_PIECE"


class CorridorScope(str, Enum):
    GLOBAL = "GLOBAL"
    SPECIFIC_PORTS = "SPECIFIC_PORTS"
    SPECIFIC_COUNTRIES = "SPECIFIC_COUNTRIES"


class CommodityScope(str, Enum):
    ALL = "ALL"
    SPECIFIC_COMMODITIES = "SPECIFIC_COMMODITIES"


class CarrierScope(str, Enum):
    ALL = "ALL"
    SPECIFIC_CARRIERS = "SPECIFIC_CARRIERS"


class ChargeApplicability(BaseModel):
    corridor_scope: CorridorScope = Field(default=CorridorScope.GLOBAL, description="Geographic scope of applicability")
    destination_codes: List[str] = Field(default_factory=list, description="Target uppercase IATA / ISO-2 codes")
    commodity_scope: CommodityScope = Field(default=CommodityScope.ALL, description="Commodity type scope")
    commodity_keywords: List[str] = Field(default_factory=list, description="Keywords to match (e.g. DGR, PHARMA, COLD)")
    carrier_scope: CarrierScope = Field(default=CarrierScope.ALL, description="Carrier airline scope")
    carrier_codes: List[str] = Field(default_factory=list, description="Carrier 2-letter codes (e.g. EY, EK)")
    min_chargeable_weight: Optional[float] = Field(default=None, ge=0, description="Minimum CW threshold in kg")

    @field_validator("destination_codes", "commodity_keywords", "carrier_codes", mode="before")
    @classmethod
    def normalize_list_strings(cls, v: Optional[List[str]]) -> List[str]:
        if not v:
            return []
        return [str(item).strip().upper() for item in v if item and str(item).strip()]


class ChargeRuleBase(BaseModel):
    code: str = Field(..., min_length=2, max_length=10, description="AWB / charge code e.g. XBC, CTG, RAC")
    name: str = Field(..., min_length=1, max_length=128, description="Display name of the charge")
    description: Optional[str] = Field(default=None, max_length=500, description="Regulatory reference or operational context")
    category: ChargeCategory = Field(..., description="Category classification of charge")
    calculation_type: CalculationType = Field(..., description="Formula type for calculating the charge amount")
    rate_per_kg: Optional[float] = Field(default=None, ge=0, description="Rate per kg in INR (for PER_KG_WITH_MIN)")
    min_amount: Optional[float] = Field(default=None, ge=0, description="Minimum invoice floor amount in INR")
    flat_amount: Optional[float] = Field(default=None, ge=0, description="Flat charge amount in INR (for FLAT)")
    percentage_rate: Optional[float] = Field(default=None, ge=0, description="Percentage of subtotal (for PERCENTAGE)")
    rate_per_piece: Optional[float] = Field(default=None, ge=0, description="Charge per piece in INR (for PER_PIECE)")
    applicability: ChargeApplicability = Field(default_factory=ChargeApplicability, description="Targeting criteria")
    is_active: bool = Field(default=True, description="Immediate operational toggle")
    is_statutory: bool = Field(default=False, description="Flag indicating government / regulatory fee")
    display_order: int = Field(default=10, description="Presentation sorting order")

    @field_validator("code", mode="before")
    @classmethod
    def normalize_code(cls, v: str) -> str:
        if isinstance(v, str):
            return v.strip().upper()
        return v


class ChargeRuleCreate(ChargeRuleBase):
    pass


class ChargeRuleUpdate(BaseModel):
    code: Optional[str] = Field(default=None, min_length=2, max_length=10)
    name: Optional[str] = Field(default=None, min_length=1, max_length=128)
    description: Optional[str] = Field(default=None, max_length=500)
    category: Optional[ChargeCategory] = None
    calculation_type: Optional[CalculationType] = None
    rate_per_kg: Optional[float] = Field(default=None, ge=0)
    min_amount: Optional[float] = Field(default=None, ge=0)
    flat_amount: Optional[float] = Field(default=None, ge=0)
    percentage_rate: Optional[float] = Field(default=None, ge=0)
    rate_per_piece: Optional[float] = Field(default=None, ge=0)
    applicability: Optional[ChargeApplicability] = None
    is_active: Optional[bool] = None
    is_statutory: Optional[bool] = None
    display_order: Optional[int] = None

    @field_validator("code", mode="before")
    @classmethod
    def normalize_code(cls, v: Optional[str]) -> Optional[str]:
        if isinstance(v, str):
            return v.strip().upper()
        return v


class ChargeRule(ChargeRuleBase):
    id: str = Field(..., description="Unique charge identifier e.g. chg_xray, chg_custom_1a2b3c4d")
    created_at: str = Field(..., description="ISO 8601 creation timestamp UTC")
    updated_at: str = Field(..., description="ISO 8601 update timestamp UTC")
    updated_by: str = Field(default="system", description="Audit trail author")
