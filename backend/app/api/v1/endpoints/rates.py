from typing import List
from fastapi import APIRouter
from app.schemas.rate import (
    RateSearchRequest,
    RateSearchResponse,
    DestinationItemSchema,
)
from app.services.rate_engine import process_rate_search, AIRPORT_TO_COUNTRY
from app.data.tariffs import RATE_SHEET_DESTINATIONS
from app.services.tariff_registry_service import tariff_registry_service

router = APIRouter(prefix="/rates", tags=["Rate Discovery"])


@router.get("/destinations", response_model=List[DestinationItemSchema])
async def get_rate_sheet_destinations():
    """
    Returns all valid export destination airports indexed directly and dynamically from active airline rate sheets.
    Origin is strictly anchored at Mumbai Gateway Hub (BOM).
    """
    seen_codes = set()
    result: List[dict] = []

    for item in RATE_SHEET_DESTINATIONS:
        code = item["code"].upper().strip()
        if code not in seen_codes:
            seen_codes.add(code)
            result.append(dict(item))

    _, live_tariffs = tariff_registry_service.get_live_corridor_index()
    for t in live_tariffs:
        dest = (t.get("destination") or "").upper().strip()
        if dest and len(dest) == 3 and dest not in seen_codes:
            seen_codes.add(dest)
            country = AIRPORT_TO_COUNTRY.get(dest, "International")
            result.append({
                "code": dest,
                "city": t.get("destination_city") or dest,
                "country": t.get("destination_country") or country,
                "region": t.get("destination_region") or "Global",
            })

    return result


@router.post("/quote", response_model=RateSearchResponse)
async def get_air_cargo_quotes(request: RateSearchRequest):
    """
    Search live buying rates across all carriers for a corridor.
    Employs O(1) Corridor Hash Indexing and O(M log K) Min-Heap Top-K selection.
    Synchronized dynamically with the active Tariff Registry ex-BOM.
    """
    index, live_tariffs = tariff_registry_service.get_live_corridor_index()
    return process_rate_search(
        request=request,
        available_tariffs=live_tariffs,
        corridor_index=index,
        limit=25
    )
