from typing import List, Dict, Any, Optional
from fastapi import APIRouter, HTTPException, status
from app.schemas.rate import (
    RateSearchRequest,
    RateSearchResponse,
    FlightLegSchema,
    RoutingPathResponse,
    DestinationItemSchema,
)
from app.services.rate_engine import process_rate_search, CorridorRateIndex
from app.services.routing_graph import GLOBAL_CARGO_GRAPH
from app.data.tariffs import AIRLINE_TARIFFS, RATE_SHEET_DESTINATIONS

router = APIRouter(prefix="/rates", tags=["Rate Discovery"])

# Production tariff table loaded from authentic airline circulars ex-BOM Hub
ALL_AIRLINE_TARIFFS: List[Dict[str, Any]] = AIRLINE_TARIFFS

# DSA: Pre-index all tariffs into an in-memory hash table for O(1) corridor lookups
corridor_index = CorridorRateIndex(ALL_AIRLINE_TARIFFS)


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
    """
    return process_rate_search(
        request=request,
        available_tariffs=ALL_AIRLINE_TARIFFS,
        corridor_index=corridor_index,
        limit=25
    )


@router.get("/routing/{origin}/{destination}", response_model=RoutingPathResponse)
async def get_transshipment_route(
    origin: str,
    destination: str,
    criterion: str = "fastest"
):
    """
    DSA Dijkstra Shortest Path Solver for Air Cargo Transshipment Networks.
    Computes Pareto-optimal connection path minimizing transit time or cost in O((E + V) log V).
    """
    orig_clean = origin.upper().strip()
    dest_clean = destination.upper().strip()
    route = GLOBAL_CARGO_GRAPH.find_shortest_route(orig_clean, dest_clean, criterion=criterion)
    if not route:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No viable flight connection discovered in network for corridor {orig_clean} -> {dest_clean}."
        )
    return RoutingPathResponse(
        origin=route.origin,
        destination=route.destination,
        is_direct=route.is_direct,
        stops=route.stops,
        total_transit_minutes=route.total_transit_minutes,
        total_rate_per_kg=route.total_rate_per_kg,
        legs=[
            FlightLegSchema(
                origin=l.origin,
                destination=l.destination,
                carrier_code=l.carrier_code,
                flight_number=l.flight_number,
                transit_minutes=l.transit_minutes,
                base_rate_per_kg=l.base_rate_per_kg
            )
            for l in route.legs
        ]
    )
