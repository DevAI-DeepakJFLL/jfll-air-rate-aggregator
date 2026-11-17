from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


class TariffRateRecord(BaseModel):
    """
    Strongly-typed representation of an air cargo corridor rate record ex-BOM.
    Parsed from carrier circulars or indexed from active tariff registry.
    """
    origin: str = Field(default="BOM", description="Origin IATA airport code (fixed at BOM)")
    destination: str = Field(description="Destination 3-letter IATA airport code")
    airline: str = Field(description="Carrier commercial airline name")
    carrier_code: str = Field(description="2-letter IATA airline code")
    prefix: str = Field(default="000", description="3-digit AWB prefix")
    commodity: str = Field(default="GCR", description="IATA commodity tier (GCR, PILA, COL, DGR, XPS, VAL, etc.)")
    rate_basis: str = Field(default="NET_NET_PLUS_PLUS", description="Rate calculation basis")
    min_charge: Optional[float] = Field(default=None, description="Minimum shipment charge in currency")
    rate_normal: Optional[float] = Field(default=None, description="Base normal rate per kg (<45 kg)")
    rate_45: Optional[float] = Field(default=None, description="Rate per kg for 45+ kg break")
    rate_100: Optional[float] = Field(default=None, description="Rate per kg for 100+ kg break")
    rate_250: Optional[float] = Field(default=None, description="Rate per kg for 250+ kg break")
    rate_300: Optional[float] = Field(default=None, description="Rate per kg for 300+ kg break")
    rate_500: Optional[float] = Field(default=None, description="Rate per kg for 500+ kg break")
    fsc_per_kg: float = Field(default=0.0, description="Fuel Surcharge per kg")
    fsc_min: Optional[float] = Field(default=None, description="Minimum FSC charge")
    ssc_per_kg: float = Field(default=0.0, description="Security Surcharge per kg")
    ssc_min: Optional[float] = Field(default=None, description="Minimum SSC charge")
    valid_from: Optional[str] = Field(default=None, description="Validity start date in YYYY-MM-DD")
    valid_to: Optional[str] = Field(default=None, description="Validity end date in YYYY-MM-DD")
    gauge_restriction: Optional[str] = Field(default=None, description="Aircraft gauge restriction note")
    validation_warnings: List[str] = Field(default_factory=list, description="Sanity checks and quality warnings")
    is_flagged: bool = Field(default=False, description="Flagged for manual review if anomalies detected")
    confidence_score: float = Field(default=1.0, description="Extraction confidence score from 0.0 to 1.0")

    def to_dict(self) -> Dict[str, Any]:
        """Convert to standard dictionary representation for rate engine indexing."""
        return self.model_dump()


class TariffUploadResponse(BaseModel):
    """
    Response schema for rate sheet circular upload and staging.
    """
    mode: str = Field(description="Extraction mode: DIGITAL_TEXT_PARSER or VISION_OCR_FALLBACK")
    is_scanned: bool = Field(description="True if circular was identified as a flattened raster scan")
    carrier_hint: str = Field(description="Carrier code hint supplied during upload")
    carrier_code: Optional[str] = Field(default=None, description="Resolved carrier code")
    filename: Optional[str] = Field(default=None, description="Sanitized PDF filename")
    currency: str = Field(default="INR", description="Tariff currency")
    status: str = Field(default="STAGED_FOR_ADMIN_REVIEW", description="Workflow staging status")
    extracted_chars: Optional[int] = Field(default=None, description="Characters extracted from PDF")
    total_records: int = Field(default=0, description="Total rate records extracted")
    flagged_count: int = Field(default=0, description="Number of records flagged for review")
    validation_summary: Optional[Dict[str, Any]] = Field(default=None, description="Aggregated quality metrics")
    records: List[TariffRateRecord] = Field(default_factory=list, description="Typed corridor rate records")
    flagged_footnotes: List[str] = Field(default_factory=list, description="Carrier footnotes and compliance alerts")
    registry_status: Optional[Dict[str, Any]] = Field(default=None, description="Updated registry item state")
