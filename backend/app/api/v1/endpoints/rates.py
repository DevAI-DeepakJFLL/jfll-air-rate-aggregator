from typing import List
from fastapi import APIRouter
from app.schemas.rate import (
    RateSearchRequest,
    RateSearchResponse,
    DestinationItemSchema,
)
from app.services.rate_engine import process_rate_search
from app.data.tariffs import RATE_SHEET_DESTINATIONS
from app.services.tariff_registry_service import tariff_registry_service

router = APIRouter(prefix="/rates", tags=["Rate Discovery"])


@router.get("/destinations", response_model=List[DestinationItemSchema])
async def get_rate_sheet_destinations():
    """
    Returns all valid export destination airports indexed directly from verified airline rate sheets.
    Origin is strictly anchored at Mumbai Gateway Hub (BOM).
    """
    return RATE_SHEET_DESTINATIONS


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
