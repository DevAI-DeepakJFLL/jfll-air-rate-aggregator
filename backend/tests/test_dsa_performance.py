import time
import pytest
from app.services.rate_engine import (
    CorridorRateIndex,
    parse_transit_minutes,
    process_rate_search
)
from app.services.break_even import optimize_break_even_pivot
from app.schemas.rate import RateSearchRequest


def test_dsa_corridor_index_o1_lookup():
    # Generate 1,500 synthetic tariff records across 50 corridors
    synthetic_tariffs = []
    destinations = [f"DST{i:02d}" for i in range(50)]
    for i in range(1500):
        dest = destinations[i % len(destinations)]
        synthetic_tariffs.append({
            "origin": "BOM",
            "destination": dest,
            "airline": f"Airline {i % 10}",
            "carrier_code": f"A{i % 10}",
            "prefix": f"{100 + i % 10}",
            "rate_basis": "NET_NET_PLUS_PLUS",
            "min_charge": 3000.0,
            "rate_normal": 200.0 + (i % 20),
            "rate_45": 180.0 + (i % 20),
            "rate_100": 150.0 + (i % 20),
            "rate_250": 130.0 + (i % 20),
            "rate_300": 120.0 + (i % 20),
            "fsc_per_kg": 20.0,
            "ssc_per_kg": 3.5,
        })

    # Benchmark building index: O(N)
    start_build = time.perf_counter()
    index = CorridorRateIndex(synthetic_tariffs)
    build_time = time.perf_counter() - start_build
    assert build_time < 0.05  # Index build must be sub-50ms

    # Benchmark O(1) hash table lookup vs O(N) linear search
    start_lookup = time.perf_counter()
    for _ in range(100):
        results = index.get_corridor_tariffs("BOM", "DST05")
    lookup_time = (time.perf_counter() - start_lookup) / 100

    assert len(results) == 30  # 1500 / 50 = 30 records per corridor
    assert lookup_time < 0.0001  # Sub-100 microseconds per query (O(1))


def test_dsa_bisect_break_even_pivot_boundary_cases():
    tiers = [
        {"min_weight": 0.0, "rate": 300.0, "label": "Normal"},
        {"min_weight": 45.0, "rate": 220.0, "label": "+45 kg"},
        {"min_weight": 100.0, "rate": 180.0, "label": "+100 kg"},
        {"min_weight": 250.0, "rate": 150.0, "label": "+250 kg"},
        {"min_weight": 300.0, "rate": 115.0, "label": "+300 kg"},
    ]

    # Exact boundary 44.5 kg: Natural tier is Normal (<45kg)
    # 44.5 * 300 = 13,350 vs Pivot to +45kg (45 * 220 = 9,900)
    # Bumping 44.5kg to 45kg saves 3,450!
    freight, rate, label, is_pivoted, savings = optimize_break_even_pivot(44.5, tiers)
    assert is_pivoted is True
    assert freight == 9900.0
    assert savings == 3450.0

    # Exact boundary 45.0 kg: Natural tier is +45kg
    freight45, rate45, label45, is_pivoted45, _ = optimize_break_even_pivot(45.0, tiers)
    assert freight45 == 45.0 * 220.0
    assert label45 == "+45 kg"

    # Exact boundary 299.5 kg: Bumping to 300kg saves money
    # 299.5 * 150 = 44,925 vs 300 * 115 = 34,500
    freight299, _, _, is_pivoted299, savings299 = optimize_break_even_pivot(299.5, tiers)
    assert is_pivoted299 is True
    assert freight299 == 34500.0
    assert savings299 == 44925.0 - 34500.0


def test_dsa_top_k_heap_selection(sample_tariffs):
    req = RateSearchRequest(
        origin="BOM",
        destination="DXB",
        actual_weight_kg=120.0,
        commodity="General Cargo"
    )
    # Run process_rate_search with limit=1
    res = process_rate_search(req, sample_tariffs, limit=1)
    assert len(res.rates) == 1
    # Ensure the returned single rate is indeed the absolute cheapest
    assert res.rates[0].recommended is True


def test_dsa_parse_transit_minutes():
    assert parse_transit_minutes("3h 15m") == 195
    assert parse_transit_minutes("Direct Flight (3h 25m)") == 205
    assert parse_transit_minutes("Connecting via AUH (5h 10m)") == 310
    assert parse_transit_minutes("Freighter via GYD (16h 05m)") == 965
    assert parse_transit_minutes("Unknown transit") == 9999


def test_dsa_dijkstra_shortest_routing():
    from app.services.routing_graph import GLOBAL_CARGO_GRAPH

    # 1. Direct Route: BOM -> DXB
    route_dxb = GLOBAL_CARGO_GRAPH.find_shortest_route("BOM", "DXB", criterion="fastest")
    assert route_dxb is not None
    assert route_dxb.is_direct is True
    assert route_dxb.stops == 0
    assert route_dxb.origin == "BOM"
    assert route_dxb.destination == "DXB"

    # 2. Multi-Hop Transshipment Route: BOM -> ORD (via AUH, DXB, or DOH)
    route_ord = GLOBAL_CARGO_GRAPH.find_shortest_route("BOM", "ORD", criterion="fastest")
    assert route_ord is not None
    assert route_ord.stops == 1  # 1 transshipment stop
    assert route_ord.legs[0].origin == "BOM"
    assert route_ord.legs[-1].destination == "ORD"
    assert route_ord.total_transit_minutes > 0

    # 3. Disconnected / Unknown corridor
    route_unknown = GLOBAL_CARGO_GRAPH.find_shortest_route("BOM", "XYZ_UNKNOWN")
    assert route_unknown is None


def test_dsa_pure_buy_rate_lru_cache_hit(sample_tariffs):
    from app.services.rate_engine import (
        calculate_pure_buy_rate,
        clear_pure_buy_rate_cache,
        get_pure_buy_rate_cache_size
    )

    clear_pure_buy_rate_cache()
    assert get_pure_buy_rate_cache_size() == 0

    tariff = sample_tariffs[0]
    # 1st call: Computes and inserts into LRU cache
    breakdown_1 = calculate_pure_buy_rate(tariff, 100.0, "DXB", "General Cargo")
    assert get_pure_buy_rate_cache_size() == 1

    # 2nd call: O(1) Cache Hit (identical reference returned)
    start = time.perf_counter()
    breakdown_2 = calculate_pure_buy_rate(tariff, 100.0, "DXB", "General Cargo")
    cache_hit_latency = time.perf_counter() - start

    assert breakdown_1 is breakdown_2  # Exact object identity from LRU cache
    assert cache_hit_latency < 0.00005  # Sub-50 microseconds retrieval
    assert get_pure_buy_rate_cache_size() == 1


def test_dsa_lru_cache_ordered_dict_eviction(sample_tariffs):
    from app.services import rate_engine
    from app.services.rate_engine import (
        calculate_pure_buy_rate,
        clear_pure_buy_rate_cache,
        get_pure_buy_rate_cache_size
    )

    clear_pure_buy_rate_cache()
    original_max = rate_engine._CACHE_MAX_ENTRIES
    rate_engine._CACHE_MAX_ENTRIES = 3  # Set small cache size to test eviction
    try:
        tariff = sample_tariffs[0]
        # Insert 3 entries: cw=10, 20, 30
        calculate_pure_buy_rate(tariff, 10.0, "DXB", "General Cargo")
        calculate_pure_buy_rate(tariff, 20.0, "DXB", "General Cargo")
        calculate_pure_buy_rate(tariff, 30.0, "DXB", "General Cargo")
        assert get_pure_buy_rate_cache_size() == 3

        # Access cw=10.0 again -> in true LRU, 10.0 is moved to end, making 20.0 the LRU element!
        calculate_pure_buy_rate(tariff, 10.0, "DXB", "General Cargo")

        # Now insert 4th entry: cw=40.0 -> must evict 20.0, NOT 10.0!
        calculate_pure_buy_rate(tariff, 40.0, "DXB", "General Cargo")
        assert get_pure_buy_rate_cache_size() == 3

        # Check keys present
        cache_cws = [k[3] for k in rate_engine._PURE_BUY_RATE_CACHE.keys()]
        assert 10.0 in cache_cws  # Preserved because accessed
        assert 20.0 not in cache_cws  # Evicted as least recently used
        assert 30.0 in cache_cws
        assert 40.0 in cache_cws
    finally:
        rate_engine._CACHE_MAX_ENTRIES = original_max
        clear_pure_buy_rate_cache()


def test_dsa_transshipment_routing_api(client):
    # Test valid multi-leg corridor: BOM -> ORD
    res = client.get("/api/v1/rates/routing/BOM/ORD?criterion=fastest")
    assert res.status_code == 200
    data = res.json()
    assert data["origin"] == "BOM"
    assert data["destination"] == "ORD"
    assert data["is_direct"] is False
    assert data["stops"] == 1
    assert len(data["legs"]) == 2
    assert data["legs"][0]["origin"] == "BOM"
    assert data["legs"][-1]["destination"] == "ORD"

    # Test unknown corridor -> 404
    res_unknown = client.get("/api/v1/rates/routing/BOM/ZZZ")
    assert res_unknown.status_code == 404


def test_dsa_charges_service_o1_lookup():
    from app.services.charges_service import charges_service

    # Benchmark O(1) hash index retrieval
    start = time.perf_counter()
    for _ in range(500):
        charge = charges_service.get_charge_by_id("chg_xray")
    avg_latency = (time.perf_counter() - start) / 500

    assert charge is not None
    assert charge.code == "XBC"
    assert avg_latency < 0.0001  # Sub-100 microseconds per query

    # Benchmark pre-partitioned active charges retrieval
    start_act = time.perf_counter()
    for _ in range(500):
        active = charges_service.get_active_charges()
    avg_act_latency = (time.perf_counter() - start_act) / 500

    assert len(active) > 0
    assert avg_act_latency < 0.0001


def test_dsa_tariff_registry_inverted_index():
    from app.services.tariff_registry_service import tariff_registry_service

    # Benchmark O(1) inverted index retrieval across ~3000 tariffs
    start = time.perf_counter()
    for _ in range(100):
        rates_ey = tariff_registry_service.get_carrier_rates("EY")
    avg_latency = (time.perf_counter() - start) / 100

    assert len(rates_ey) > 0
    assert avg_latency < 0.0005  # Sub-500 microseconds per query, zero full table scans


def test_dsa_charge_applicability_frozenset_fast_path():
    from app.services.charges_service import charges_service
    from app.services.rate_engine import is_charge_applicable, _get_applicability_cache

    active_charges = charges_service.get_active_charges()
    ams_rule = next((r for r in active_charges if r.code == "CCC"), None)
    assert ams_rule is not None

    # First call initializes cached frozenset
    assert is_charge_applicable(ams_rule, 100.0, "JFK", "General Cargo", "AI") is True
    assert is_charge_applicable(ams_rule, 100.0, "DXB", "General Cargo", "AI") is False

    # Verify frozenset cache is attached
    cache = _get_applicability_cache(ams_rule.applicability)
    assert isinstance(cache[0], frozenset)
    assert "JFK" in cache[0]



