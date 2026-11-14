from typing import List, Dict, Any
from fastapi import APIRouter
from app.schemas.rate import RateSearchRequest, RateSearchResponse
from app.services.rate_engine import process_rate_search, CorridorRateIndex

router = APIRouter(prefix="/rates", tags=["Rate Discovery"])

# Production sample rate table loaded from airline circulars
SAMPLE_AIRLINE_TARIFFS: List[Dict[str, Any]] = [
    {
        "origin": "BOM",
        "destination": "DXB",
        "airline": "Air India",
        "carrier_code": "AI",
        "prefix": "098",
        "rate_basis": "NET_NET_PLUS_PLUS",
        "min_charge": 3500.0,
        "rate_normal": 250.0,
        "rate_45": 200.0,
        "rate_100": 170.0,
        "rate_250": 145.0,
        "rate_300": 130.0,
        "fsc_per_kg": 20.0,
        "fsc_min": 3500.0,
        "ssc_per_kg": 3.5,
        "ssc_min": 500.0,
        "valid_from": "2026-10-01",
        "valid_to": "2026-12-31"
    },
    {
        "origin": "BOM",
        "destination": "DXB",
        "airline": "Etihad Airways",
        "carrier_code": "EY",
        "prefix": "607",
        "rate_basis": "NET_NET_PLUS_PLUS",
        "min_charge": 4500.0,
        "rate_normal": 240.0,
        "rate_45": 190.0,
        "rate_100": 160.0,
        "rate_250": 138.0,
        "rate_300": 128.0,
        "fsc_per_kg": 22.0,
        "fsc_min": 3500.0,
        "ssc_per_kg": 4.0,
        "ssc_min": 550.0,
        "valid_from": "2026-10-01",
        "valid_to": "2026-12-31"
    },
    {
        "origin": "BOM",
        "destination": "DXB",
        "airline": "Oman Air Cargo",
        "carrier_code": "WY",
        "prefix": "910",
        "rate_basis": "NET_NET_PLUS_PLUS",
        "min_charge": 4000.0,
        "rate_normal": 235.0,
        "rate_45": 185.0,
        "rate_100": 155.0,
        "rate_250": 135.0,
        "rate_300": 125.0,
        "fsc_per_kg": 21.0,
        "fsc_min": 3500.0,
        "ssc_per_kg": 3.5,
        "ssc_min": 500.0,
        "valid_from": "2026-11-01",
        "valid_to": "2027-03-31"
    },
    {
        "origin": "BOM",
        "destination": "KUL",
        "airline": "Malaysia Airlines",
        "carrier_code": "MH",
        "prefix": "232",
        "rate_basis": "NET_NET_PLUS_PLUS",
        "min_charge": 3300.0,
        "rate_normal": 175.0,
        "rate_45": 160.0,
        "rate_100": 140.0,
        "rate_250": 130.0,
        "rate_300": 124.0,
        "fsc_per_kg": 18.0,
        "fsc_min": 2500.0,
        "ssc_per_kg": 3.5,
        "ssc_min": 500.0,
        "valid_from": "2026-10-01",
        "valid_to": "2026-10-31"
    },
    {
        "origin": "BOM",
        "destination": "ORD",
        "airline": "Etihad Airways",
        "carrier_code": "EY",
        "prefix": "607",
        "rate_basis": "NET_NET_PLUS_PLUS",
        "min_charge": 18165.0,
        "rate_normal": 852.0,
        "rate_45": 762.0,
        "rate_100": 686.0,
        "rate_250": 614.0,
        "rate_300": 590.0,
        "fsc_per_kg": 45.0,
        "fsc_min": 4500.0,
        "ssc_per_kg": 5.0,
        "ssc_min": 800.0,
        "valid_from": "2026-10-01",
        "valid_to": "2026-12-31"
    }
]

# DSA: Pre-index all tariffs into an in-memory hash table for O(1) corridor lookups
corridor_index = CorridorRateIndex(SAMPLE_AIRLINE_TARIFFS)


@router.post("/quote", response_model=RateSearchResponse)
async def get_air_cargo_quotes(request: RateSearchRequest):
    """
    Search live buying rates across all carriers for a corridor.
    Employs O(1) Corridor Hash Indexing and O(M log K) Min-Heap Top-K selection.
    """
    return process_rate_search(
        request=request,
        available_tariffs=SAMPLE_AIRLINE_TARIFFS,
        corridor_index=corridor_index,
        limit=25
    )
