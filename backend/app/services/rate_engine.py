import math
import heapq
import re
from typing import List, Dict, Any, Optional, Tuple
from collections import defaultdict
from app.schemas.rate import RateSearchRequest, RateSearchResponse, RateQuoteItem, CostBreakdown
from app.services.break_even import optimize_break_even_pivot


# Frozen set for O(1) membership lookup
AMS_APPLICABLE_DESTINATIONS = frozenset({
    'ORD', 'JFK', 'LAX', 'ATL', 'DFW', 'SFO', 'MIA', 'BOS', 'SEA', 'IAD',
    'IAH', 'EWR', 'DTW', 'MSP', 'PHL', 'CLT', 'DEN', 'YYZ', 'YVR', 'YUL'
})

AIRLINE_SCHEDULES: Dict[str, Dict[str, Any]] = {
    'EK': {'flight': 'EK-505', 'departure': '10:10 IST', 'arrival': '11:55 GST', 'transit': 'Direct Flight (3h 15m)', 'cutoff': '05:30 IST'},
    'AI': {'flight': 'AI-995', 'departure': '17:05 IST', 'arrival': '19:00 GST', 'transit': 'Direct Flight (3h 25m)', 'cutoff': '11:30 IST'},
    '6E': {'flight': '6E-1453', 'departure': '19:20 IST', 'arrival': '21:10 GST', 'transit': 'Direct Flight (3h 20m)', 'cutoff': '13:30 IST'},
    'EY': {'flight': 'EY-205', 'departure': '04:20 IST', 'arrival': '09:30 GST', 'transit': 'Connecting via AUH (5h 10m)', 'cutoff': '22:00 IST (-1d)'},
    'WY': {'flight': 'WY-202', 'departure': '09:40 IST', 'arrival': '15:15 GST', 'transit': 'Connecting via MCT (5h 35m)', 'cutoff': '04:30 IST'},
    'ET': {'flight': 'ET-641', 'departure': '11:05 IST', 'arrival': '22:40 GST', 'transit': 'Connecting via ADD (11h 35m)', 'cutoff': '05:00 IST'},
    'QR': {'flight': 'QR-557', 'departure': '04:10 IST', 'arrival': '10:30 GST', 'transit': 'Connecting via DOH (6h 20m)', 'cutoff': '22:00 IST (-1d)'},
    'D7': {'flight': 'D7-183', 'departure': '23:00 IST', 'arrival': '15:20 CST (+1)', 'transit': 'Connecting via KUL (13h 50m)', 'cutoff': '17:00 IST'},
    'MH': {'flight': 'MH-195', 'departure': '23:25 IST', 'arrival': '15:35 CST (+1)', 'transit': 'Connecting via KUL (13h 40m)', 'cutoff': '17:30 IST'},
    'SV': {'flight': 'SV-773', 'departure': '07:30 IST', 'arrival': '15:45 GST', 'transit': 'Connecting via RUH (8h 15m)', 'cutoff': '02:00 IST'},
}


class CorridorRateIndex:
    """
    DSA Inverted Index for Air Cargo Tariffs.
    Maps Corridor Tuple (Origin, Destination) -> List of Candidate Tariffs.
    Provides O(1) corridor lookups instead of O(N) full table scans.
    """
    def __init__(self, tariffs: Optional[List[Dict[str, Any]]] = None):
        self._index: Dict[Tuple[str, str], List[Dict[str, Any]]] = defaultdict(list)
        if tariffs:
            self.build_index(tariffs)

    def build_index(self, tariffs: List[Dict[str, Any]]) -> None:
        """Constructs hash buckets in O(N) time and O(N) space."""
        self._index.clear()
        for t in tariffs:
            orig = (t.get('origin') or '').upper().strip()
            dest = (t.get('destination') or '').upper().strip()
            if orig and dest:
                self._index[(orig, dest)].append(t)

    def get_corridor_tariffs(self, origin: str, destination: str) -> List[Dict[str, Any]]:
        """O(1) average time complexity retrieval."""
        return self._index.get((origin.upper().strip(), destination.upper().strip()), [])


RE_HOURS = re.compile(r'(\d+)\s*h', re.IGNORECASE)
RE_MINUTES = re.compile(r'(\d+)\s*m', re.IGNORECASE)

# Canonical IATA weight slab definitions (< 500kg Smalls Desk)
SLAB_SPECS: Tuple[Tuple[str, float, str], ...] = (
    ('rate_normal', 0.0, 'Normal'),
    ('rate_45', 45.0, '+45 kg'),
    ('rate_100', 100.0, '+100 kg'),
    ('rate_250', 250.0, '+250 kg'),
    ('rate_300', 300.0, '+300 kg'),
)


def extract_active_weight_tiers(tariff: Dict[str, Any]) -> List[Dict[str, Any]]:
    """
    Extracts and validates sorted active rate slabs (< 500kg) from a tariff record.
    Guarantees ascending order for binary search break-even pivot.
    """
    tiers = []
    for key, min_wt, label in SLAB_SPECS:
        val = tariff.get(key)
        if val is not None:
            try:
                rate_val = float(val)
                if rate_val > 0:
                    tiers.append({'min_weight': min_wt, 'rate': rate_val, 'label': label})
            except (ValueError, TypeError):
                continue
    return tiers


def parse_transit_minutes(transit_str: str) -> int:
    """
    Parses strings like '3h 15m' or 'Connecting via AUH (5h 10m)' into total integer minutes.
    DSA: Precomputed once in O(1) time to enable O(1) integer comparisons during sorting.
    """
    if not transit_str:
        return 9999
    h_match = RE_HOURS.search(transit_str)
    m_match = RE_MINUTES.search(transit_str)
    minutes = 0
    if h_match:
        minutes += int(h_match.group(1)) * 60
    if m_match:
        minutes += int(m_match.group(1))
    return minutes if minutes > 0 else 9999


def calculate_chargeable_weight(actual_weight: float, dimensions: Optional[List[Any]] = None) -> float:
    """
    Computes IATA Chargeable Weight rounded up to nearest 0.5 kg.
    TACT Rule 1.3.2.
    Time Complexity: O(D) where D is number of dimension records.
    """
    vol_weight = 0.0
    if dimensions:
        for dim in dimensions:
            if isinstance(dim, dict):
                l = dim.get('length_cm', 0.0)
                w = dim.get('width_cm', 0.0)
                h = dim.get('height_cm', 0.0)
                pcs = dim.get('pieces', 1)
            else:
                l = getattr(dim, 'length_cm', 0.0)
                w = getattr(dim, 'width_cm', 0.0)
                h = getattr(dim, 'height_cm', 0.0)
                pcs = getattr(dim, 'pieces', 1)
            vol_weight += (l * w * h * pcs) / 6000.0

    raw_weight = max(actual_weight, vol_weight)
    return math.ceil(raw_weight * 2.0) / 2.0


# DSA: LRU Memoization Cache for Calculated Landed Costs
# Eliminates repeated TACT break-even and surcharge math for frequent queries
_PURE_BUY_RATE_CACHE: Dict[Tuple[Any, ...], CostBreakdown] = {}
_CACHE_MAX_ENTRIES = 2048


def get_pure_buy_rate_cache_size() -> int:
    """Returns current cached entries count."""
    return len(_PURE_BUY_RATE_CACHE)


def clear_pure_buy_rate_cache() -> None:
    """Evicts all cached rate calculations."""
    _PURE_BUY_RATE_CACHE.clear()


def calculate_pure_buy_rate(
    tariff: Dict[str, Any],
    cw: float,
    destination: str,
    commodity: str = "General Cargo",
    tiers: Optional[List[Dict[str, Any]]] = None,
    pivot_result: Optional[Tuple[float, float, str, bool, float]] = None
) -> CostBreakdown:
    """
    Computes pure landed airline buying cost for shipments under 500 kg.
    Strictly excludes all commercial margins.
    Employs O(1) LRU memoization cache and O(log T) binary search break-even pivot.
    """
    dest_norm = destination.upper().strip()
    rate_basis = tariff.get('rate_basis', 'NET_NET_PLUS_PLUS').upper()
    min_charge = float(tariff.get('min_charge') or 0.0)
    fsc_rate = 0.0 if rate_basis == 'ALL_IN' else float(tariff.get('fsc_per_kg') or 0.0)
    ssc_rate = 0.0 if rate_basis == 'ALL_IN' else float(tariff.get('ssc_per_kg') or 0.0)

    # DSA Cache Key Tuple for O(1) retrieval
    cache_key = (
        tariff.get('carrier_code', ''),
        tariff.get('origin', ''),
        dest_norm,
        cw,
        commodity.lower().strip(),
        min_charge,
        rate_basis,
        tariff.get('rate_normal'),
        tariff.get('rate_45'),
        tariff.get('rate_100'),
        tariff.get('rate_250'),
        tariff.get('rate_300'),
        fsc_rate,
        ssc_rate
    )

    if cache_key in _PURE_BUY_RATE_CACHE:
        return _PURE_BUY_RATE_CACHE[cache_key]

    if tiers is None:
        tiers = extract_active_weight_tiers(tariff)

    if pivot_result is None:
        base_freight, effective_rate, _, _, _ = optimize_break_even_pivot(cw, tiers, min_charge)
    else:
        base_freight, effective_rate, _, _, _ = pivot_result

    # Surcharges (FSC & Security)
    if rate_basis == 'ALL_IN':
        fsc_total = 0.0
        ssc_total = 0.0
    else:
        fsc_min = float(tariff.get('fsc_min') or 0.0)
        fsc_total = round(max(fsc_rate * cw, fsc_min))

        ssc_min = float(tariff.get('ssc_min') or 0.0)
        ssc_total = round(max(ssc_rate * cw, ssc_min))

    fuel_security_total = fsc_total + ssc_total

    # Origin Terminal Handling Charges (BOM Gateway Standards)
    xray_total = round(max(3.50 * cw, 550.0))
    misc_handling = round(max(2.00 * cw, 200.0) + max(1.00 * cw, 300.0))

    commodity_fee = 0.0
    norm_comm = commodity.lower()
    if 'dangerous' in norm_comm or 'dgr' in norm_comm:
        commodity_fee = 3500.0  # MIAL statutory DGR acceptance inspection
    elif 'pharma' in norm_comm or 'cold' in norm_comm or 'perishable' in norm_comm:
        commodity_fee = round(max(cw * 2.50, 1500.0))

    origin_thc_total = xray_total + misc_handling + commodity_fee

    # Regulatory & Documentation Fees (O(1) frozenset check)
    awb_fee = 800.0
    ams_fee = 950.0 if dest_norm in AMS_APPLICABLE_DESTINATIONS else 0.0

    # Grand Totals (Zero Margin)
    net_subtotal = round(base_freight + fuel_security_total + origin_thc_total + awb_fee + ams_fee)
    gst_tax = round(net_subtotal * 0.05)  # 5% statutory Indian Air Export GST
    total_landed_buy = net_subtotal + gst_tax
    effective_buy_per_kg = round(total_landed_buy / max(cw, 0.5), 2)

    breakdown = CostBreakdown(
        base_rate_per_kg=effective_rate,
        base_freight_total=base_freight,
        fsc_rate_per_kg=fsc_rate,
        fsc_total=fsc_total,
        ssc_rate_per_kg=ssc_rate,
        ssc_total=ssc_total,
        fuel_security_total=fuel_security_total,
        xray_total=xray_total,
        misc_handling_total=misc_handling,
        commodity_fee=commodity_fee,
        origin_thc_total=origin_thc_total,
        awb_fee=awb_fee,
        ams_fee=ams_fee,
        net_subtotal=net_subtotal,
        gst_tax=gst_tax,
        total_landed_buy=total_landed_buy,
        effective_buy_per_kg=effective_buy_per_kg
    )

    # Store in bounded LRU Cache
    if len(_PURE_BUY_RATE_CACHE) >= _CACHE_MAX_ENTRIES:
        _PURE_BUY_RATE_CACHE.pop(next(iter(_PURE_BUY_RATE_CACHE)))
    _PURE_BUY_RATE_CACHE[cache_key] = breakdown

    return breakdown


def get_airline_schedule(carrier_code: str) -> Dict[str, str]:
    """
    Retrieve airline operational flight schedule, routing, and cargo cutoffs.
    Falls back to a standard connecting flight template if carrier is not statically mapped.
    """
    return AIRLINE_SCHEDULES.get(carrier_code, {
        'flight': f"{carrier_code}-204",
        'departure': '04:30 IST',
        'arrival': '10:00 Local',
        'transit': 'Direct / Connecting Hub',
        'cutoff': '22:00 IST (-1d)'
    })


def build_rate_quote(
    tariff: Dict[str, Any],
    cw: float,
    orig: str,
    dest: str,
    commodity: str,
    idx: int,
    pivot_res: Tuple[float, float, str, bool, float],
    breakdown: CostBreakdown
) -> RateQuoteItem:
    """
    Constructs a validated RateQuoteItem from tariff data, schedule info, and calculated landed cost.
    """
    _, _, applied_label, is_pivoted, savings = pivot_res
    carrier_code = (tariff.get('carrier_code') or 'JF').upper().strip()
    sched = get_airline_schedule(carrier_code)
    transit_str = sched['transit']

    return RateQuoteItem(
        id=f"quote-{carrier_code}-{idx}",
        carrier_name=tariff.get('airline', 'Air Cargo Partner'),
        carrier_code=carrier_code,
        airline_prefix=tariff.get('prefix', '000'),
        flight_number=sched['flight'],
        routing_type='Direct' if 'Direct' in transit_str else 'Connecting Hub',
        transit_time=transit_str,
        transit_minutes=parse_transit_minutes(transit_str),  # Pre-computed for O(1) sorting
        departure_time=sched['departure'],
        arrival_time=sched['arrival'],
        cargo_cutoff=sched['cutoff'],
        origin=orig,
        destination=dest,
        cargo_category=commodity,
        chargeable_weight=cw,
        weight_tier_applied=applied_label,
        is_pivoted=is_pivoted,
        pivot_savings=f"₹{savings:,.0f} saved via pivot" if is_pivoted else None,
        breakdown=breakdown,
        rate_basis=tariff.get('rate_basis', 'NET_NET_PLUS_PLUS'),
        valid_from=tariff.get('valid_from'),
        valid_to=tariff.get('valid_to'),
        validity_status='ACTIVE',
        gauge_restriction=tariff.get('gauge_restriction'),
        recommended=False
    )


def process_rate_search(
    request: RateSearchRequest,
    available_tariffs: List[Dict[str, Any]],
    corridor_index: Optional[CorridorRateIndex] = None,
    limit: int = 25
) -> RateSearchResponse:
    """
    Main aggregator entry point with DSA optimization and < 500kg Smalls constraint.
    
    Time Complexity:
      - O(1) Corridor candidate retrieval via CorridorRateIndex
      - O(M * log T) where M is matching corridor tariffs (M << N) and T is number of slabs
      - O(M log K) Top-K selection via Min-Heap (heapq.nsmallest)
    Overall: O(M log K) << O(N log N)
    """
    cw = calculate_chargeable_weight(request.actual_weight_kg, request.dimensions)
    orig = request.origin.upper().strip()
    dest = request.destination.upper().strip()

    # HARD CONSTRAINT: Smalls only (< 500 kg)
    if cw >= 500.0:
        return RateSearchResponse(
            origin=orig,
            destination=dest,
            chargeable_weight=cw,
            is_heavy_cargo=True,
            message=(
                f"Chargeable weight is {cw:.1f} kg (≥ 500 kg threshold). "
                "Published airline smalls tariffs do not apply to heavy cargo. "
                "Please request an ad-hoc spot rate from the airline cargo sales desk."
            ),
            rates=[]
        )

    # DSA Optimization: O(1) Corridor retrieval via Hash Table Index
    if corridor_index:
        candidate_tariffs = corridor_index.get_corridor_tariffs(orig, dest)
    else:
        # Fallback O(M) retrieval
        candidate_tariffs = [
            t for t in available_tariffs
            if t.get('origin', '').upper() == orig and t.get('destination', '').upper() == dest
        ]

    matched_quotes: List[RateQuoteItem] = []
    for idx, tariff in enumerate(candidate_tariffs):
        tiers = extract_active_weight_tiers(tariff)
        min_charge = float(tariff.get('min_charge') or 0.0)
        pivot_res = optimize_break_even_pivot(cw, tiers, min_charge)

        breakdown = calculate_pure_buy_rate(
            tariff=tariff,
            cw=cw,
            destination=dest,
            commodity=request.commodity,
            tiers=tiers,
            pivot_result=pivot_res
        )

        quote = build_rate_quote(
            tariff=tariff,
            cw=cw,
            orig=orig,
            dest=dest,
            commodity=request.commodity,
            idx=idx,
            pivot_res=pivot_res,
            breakdown=breakdown
        )
        matched_quotes.append(quote)

    # DSA Optimization: Top-K Selection via Min-Heap (O(M log K) instead of O(M log M))
    if len(matched_quotes) > limit:
        sorted_quotes = heapq.nsmallest(limit, matched_quotes, key=lambda x: x.breakdown.total_landed_buy)
    else:
        sorted_quotes = sorted(matched_quotes, key=lambda x: x.breakdown.total_landed_buy)

    if sorted_quotes:
        sorted_quotes[0].recommended = True

    return RateSearchResponse(
        origin=orig,
        destination=dest,
        chargeable_weight=cw,
        is_heavy_cargo=False,
        rates=sorted_quotes
    )
