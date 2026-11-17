from enum import Enum
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class PackagingType(str, Enum):
    """Packaging material types evaluated against airline equipment circular rules."""
    CARTON = "Carton"
    WOODEN_BOX_OR_PALLET = "Wooden Box/Pallet"


class CargoDimension(BaseModel):
    length_cm: float = Field(..., gt=0, description="Length in centimeters")
    width_cm: float = Field(..., gt=0, description="Width in centimeters")
    height_cm: float = Field(..., gt=0, description="Height in centimeters")
    pieces: int = Field(default=1, ge=1, description="Number of identical packages")

    @property
    def volumetric_weight_kg(self) -> float:
        # IATA standard divisor: 6,000 cm³ per kg (1:6 ratio)
        return round((self.length_cm * self.width_cm * self.height_cm * self.pieces) / 6000.0, 2)

    @property
    def cbm(self) -> float:
        return round((self.length_cm * self.width_cm * self.height_cm * self.pieces) / 1_000_000.0, 3)


class RateSearchRequest(BaseModel):
    origin: str = Field(
        ...,
        min_length=3,
        max_length=3,
        pattern=r"^[A-Za-z]{3}$",
        description="Origin 3-letter IATA code, e.g., BOM"
    )
    destination: str = Field(
        ...,
        min_length=3,
        max_length=3,
        pattern=r"^[A-Za-z]{3}$",
        description="Destination 3-letter IATA code, e.g., DXB, ORD"
    )
    actual_weight_kg: float = Field(
        ...,
        gt=0,
        le=5000.0,
        description="Actual scale gross weight in kg (max 5,000 kg)"
    )
    dimensions: Optional[List[CargoDimension]] = Field(
        default=None,
        max_length=100,
        description="Package dimensions (bounded to max 100 entries to prevent DoS)"
    )
    commodity: str = Field(
        default="General Cargo",
        max_length=64,
        description="Commodity type: General Cargo, DGR - PAX, Pharma CRT, Cold Chain, Express Courier, etc."
    )
    packaging_type: Optional[PackagingType] = Field(
        default=PackagingType.CARTON,
        description="Packaging material type: Carton or Wooden Box/Pallet (evaluates circular equipment rules)"
    )
    pieces: Optional[int] = Field(
        default=1,
        ge=1,
        description="Total package piece count"
    )


class CostBreakdown(BaseModel):
    base_rate_per_kg: float = Field(..., description="Base tariff rate per kg (INR)")
    base_freight_total: float = Field(..., description="Base freight cost (INR)")
    fsc_rate_per_kg: float = Field(..., description="Fuel surcharge rate per kg (INR)")
    fsc_total: float = Field(..., description="Total fuel surcharge (INR)")
    ssc_rate_per_kg: float = Field(..., description="Security surcharge rate per kg (INR)")
    ssc_total: float = Field(..., description="Total security surcharge (INR)")
    fuel_security_total: float = Field(..., description="Sum of FSC and SSC (INR)")
    xray_total: float = Field(..., description="Airport X-Ray screening charge (INR)")
    misc_handling_total: float = Field(..., description="Terminal handling and CTG (INR)")
    commodity_fee: float = Field(default=0.0, description="Statutory DGR or Cool Chain handling fee (INR)")
    origin_thc_total: float = Field(..., description="Total origin terminal handling (INR)")
    awb_fee: float = Field(default=800.0, description="e-AWB transmission and issuance fee (INR)")
    ams_fee: float = Field(default=0.0, description="Customs AMS manifest fee for US/Canada (INR)")
    net_subtotal: float = Field(..., description="Total net airline cost before tax (INR)")
    gst_tax: float = Field(..., description="5% Indian Air Export GST (INR)")
    total_landed_buy: float = Field(..., description="Grand Total Net Buying Cost (INR) - Zero Margin")
    effective_buy_per_kg: float = Field(..., description="True landed buying rate per kg (INR/kg)")
    dynamic_charges: List[Dict[str, Any]] = Field(
        default_factory=list,
        description="List of all evaluated dynamic statutory, gateway, and customs charges"
    )


class RateQuoteItem(BaseModel):
    id: str
    carrier_name: str
    carrier_code: str
    airline_prefix: str
    flight_number: str
    routing_type: str
    transit_time: str
    transit_minutes: int = Field(default=0, description="Precomputed transit duration in minutes for O(1) sort")
    departure_time: str
    arrival_time: str
    cargo_cutoff: str
    origin: str
    destination: str
    cargo_category: str
    chargeable_weight: float
    weight_tier_applied: str
    is_pivoted: bool = False
    pivot_savings: Optional[str] = None
    breakdown: CostBreakdown
    rate_basis: str = "NET_NET_PLUS_PLUS"
    valid_from: Optional[str] = None
    valid_to: Optional[str] = None
    validity_status: str = "ACTIVE"
    gauge_restriction: Optional[str] = None
    recommended: bool = False
    regulatory_notes: List[str] = Field(
        default_factory=list,
        description="Operational directives and regulatory notes extracted from carrier rate sheet"
    )
    packaging_restricted: bool = Field(
        default=False,
        description="Flag indicating if the packaging type is prohibited by carrier equipment"
    )


class RateSearchResponse(BaseModel):
    origin: str
    destination: str
    chargeable_weight: float
    is_heavy_cargo: bool = False
    message: Optional[str] = None
    rates: List[RateQuoteItem] = []


class DestinationItemSchema(BaseModel):
    code: str
    city: str
    country: str
    region: str

