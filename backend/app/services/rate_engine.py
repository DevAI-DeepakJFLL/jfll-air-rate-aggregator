import math
import hashlib
import heapq
import re
from typing import List, Dict, Any, Optional, Tuple, Set
from collections import defaultdict, OrderedDict
from app.schemas.rate import RateSearchRequest, RateSearchResponse, RateQuoteItem, CostBreakdown, PackagingType
from app.schemas.charge import (
    CalculationType,
    ChargeCategory,
    CommodityScope,
    CorridorScope,
    CarrierScope,
    ChargeRule,
)
from app.services.charges_service import (
    get_active_charges,
    get_charges_generation,
    register_charges_invalidation_callback,
)
from app.services.break_even import optimize_break_even_pivot


# Airport IATA Code to ISO Country Code Mapping for Corridor Evaluation
AIRPORT_TO_COUNTRY: Dict[str, str] = {
    # United States
    "JFK": "US", "ORD": "US", "LAX": "US", "MIA": "US", "SFO": "US",
    "ATL": "US", "DFW": "US", "BOS": "US", "IAD": "US", "IAH": "US",
    "SEA": "US", "EWR": "US", "DTW": "US", "MSP": "US", "PHL": "US",
    "CLT": "US", "DEN": "US", "LAS": "US", "MCO": "US", "PHX": "US",
    # Canada
    "YYZ": "CA", "YVR": "CA", "YUL": "CA", "YYC": "CA", "YEG": "CA", "YOW": "CA", "YHZ": "CA",
    # United Kingdom
    "LHR": "GB", "LGW": "GB", "MAN": "GB", "EDI": "GB", "BHX": "GB", "GLA": "GB", "STN": "GB", "LTN": "GB",
    # United Arab Emirates
    "DXB": "AE", "AUH": "AE", "SHJ": "AE", "DWC": "AE",
    # Middle East
    "DOH": "QA",
    "MCT": "OM", "SLL": "OM",
    "KWI": "KW",
    "BAH": "BH",
    "RUH": "SA", "JED": "SA", "DMM": "SA", "MED": "SA",
    "AMM": "JO", "BEY": "LB",
    # Europe
    "FRA": "DE", "MUC": "DE", "BER": "DE", "HAM": "DE", "DUS": "DE",
    "CDG": "FR", "ORY": "FR", "NCE": "FR", "LYS": "FR",
    "AMS": "NL",
    "BRU": "BE",
    "MXP": "IT", "FCO": "IT",
    "MAD": "ES", "BCN": "ES",
    "ZRH": "CH", "GVA": "CH",
    "VIE": "AT",
    "DUB": "IE",
    "CPH": "DK",
    "WAW": "PL",
    "IST": "TR",
    "LIS": "PT",
    "ATH": "GR",
    # Asia-Pacific
    "SIN": "SG",
    "BKK": "TH", "HKT": "TH",
    "KUL": "MY",
    "NRT": "JP", "HND": "JP", "KIX": "JP",
    "ICN": "KR",
    "HKG": "HK",
    "PVG": "CN", "PEK": "CN", "PKX": "CN", "CAN": "CN", "SZX": "CN",
    "SYD": "AU", "MEL": "AU", "BNE": "AU", "PER": "AU",
    "BOM": "IN", "DEL": "IN", "BLR": "IN", "MAA": "IN", "HYD": "IN", "CCU": "IN", "COK": "IN", "AMD": "IN",
    "CMB": "LK", "MLE": "MV",
    "CGK": "ID", "DPS": "ID", "KNO": "ID", "KTI": "ID",
    "MNL": "PH",
    # Africa
    "JNB": "ZA", "CPT": "ZA",
    "NBO": "KE",
    "ADD": "ET",
    "CAI": "EG",
    "CMN": "MA",
    "SEZ": "SC",
}

COUNTRY_ALIASES: Dict[str, Set[str]] = {
    "US": {"US", "USA", "UNITED STATES"},
    "CA": {"CA", "CAN", "CANADA"},
    "GB": {"GB", "UK", "GBR", "UNITED KINGDOM"},
    "AE": {"AE", "UAE", "ARE", "UNITED ARAB EMIRATES"},
    "SA": {"SA", "KSA", "SAU", "SAUDI ARABIA"},
    "DE": {"DE", "DEU", "GERMANY"},
    "FR": {"FR", "FRA", "FRANCE"},
    "NL": {"NL", "NLD", "NETHERLANDS"},
    "IN": {"IN", "IND", "INDIA"},
    "SG": {"SG", "SGP", "SINGAPORE"},
    "MY": {"MY", "MYS", "MALAYSIA"},
    "QA": {"QA", "QAT", "QATAR"},
    "OM": {"OM", "OMN", "OMAN"},
    "KW": {"KW", "KWT", "KUWAIT"},
    "BH": {"BH", "BHR", "BAHRAIN"},
    "JP": {"JP", "JPN", "JAPAN"},
    "CN": {"CN", "CHN", "CHINA"},
    "AU": {"AU", "AUS", "AUSTRALIA"},
}

# Pre-computed frozensets for O(1) set operations
COUNTRY_AND_ALIASES: Dict[str, frozenset] = {
    k: frozenset({k} | v) for k, v in COUNTRY_ALIASES.items()
}


def _get_applicability_cache(app: Any) -> Tuple[frozenset, frozenset, Tuple[str, ...]]:
    """
    DSA Optimization: Lazily caches normalized frozensets on applicability model.
    Eliminates redundant string upper/strip and dynamic set allocations across thousands of evaluations.
    """
    cached = getattr(app, "_dsa_cache", None)
    if cached is None:
        dest_set = frozenset(c.upper().strip() for c in app.destination_codes) if app.destination_codes else frozenset()
        carrier_set = frozenset(c.upper().strip() for c in app.carrier_codes) if app.carrier_codes else frozenset()
        comm_tuple = tuple(kw.lower().strip() for kw in app.commodity_keywords) if app.commodity_keywords else ()
        cached = (dest_set, carrier_set, comm_tuple)
        setattr(app, "_dsa_cache", cached)
    return cached


def get_country_for_airport(airport_code: str) -> Optional[str]:
    """Returns ISO country code for common airport IATA codes."""
    if not airport_code:
        return None
    return AIRPORT_TO_COUNTRY.get(airport_code.upper().strip())

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
                # Pre-cache extracted weight tiers in O(1) amortized setup
                if '_cached_tiers' not in t:
                    t['_cached_tiers'] = extract_active_weight_tiers(t)
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
            is_dict = isinstance(dim, dict)
            l = dim.get('length_cm', 0.0) if is_dict else getattr(dim, 'length_cm', 0.0)
            w = dim.get('width_cm', 0.0) if is_dict else getattr(dim, 'width_cm', 0.0)
            h = dim.get('height_cm', 0.0) if is_dict else getattr(dim, 'height_cm', 0.0)
            pcs = dim.get('pieces', 1) if is_dict else getattr(dim, 'pieces', 1)
            vol_weight += (l * w * h * pcs) / 6000.0

    raw_weight = max(actual_weight, vol_weight)
    return math.ceil(raw_weight * 2.0) / 2.0


# DSA: LRU Memoization Cache for Calculated Landed Costs
# Eliminates repeated TACT break-even and surcharge math for frequent queries
_PURE_BUY_RATE_CACHE: OrderedDict[Tuple[Any, ...], CostBreakdown] = OrderedDict()
_CACHE_MAX_ENTRIES = 2048


def get_pure_buy_rate_cache_size() -> int:
    """Returns current cached entries count."""
    return len(_PURE_BUY_RATE_CACHE)


def clear_pure_buy_rate_cache() -> None:
    """Evicts all cached rate calculations."""
    _PURE_BUY_RATE_CACHE.clear()


# Wire cache invalidation hook from charges_service with graceful degradation
try:
    register_charges_invalidation_callback(clear_pure_buy_rate_cache)
except (ImportError, AttributeError, RuntimeError):
    pass


def is_charge_applicable(
    rule: ChargeRule,
    cw: float,
    destination: str,
    commodity: str,
    carrier_code: str
) -> bool:
    """
    Evaluates whether a charge rule applies to a specific shipment.
    Checks min chargeable weight, corridor, commodity keywords, and carrier airline.
    DSA: Uses cached frozensets for O(1) membership checks, eliminating allocation loops.
    """
    app = rule.applicability
    if not app:
        return True

    # 1. Minimum chargeable weight threshold (O(1) float comparison)
    if app.min_chargeable_weight is not None and cw < app.min_chargeable_weight:
        return False

    dest_set, carrier_set, comm_tuple = _get_applicability_cache(app)

    # 2. Corridor Scope (SPECIFIC_PORTS or SPECIFIC_COUNTRIES)
    scope = app.corridor_scope
    dest_upper = (destination or '').upper().strip()

    if scope in (CorridorScope.SPECIFIC_PORTS, "SPECIFIC_PORTS"):
        if dest_upper not in dest_set:
            return False
    elif scope in (CorridorScope.SPECIFIC_COUNTRIES, "SPECIFIC_COUNTRIES"):
        if dest_upper in dest_set:
            pass  # Direct port match in country corridor spec
        else:
            country = AIRPORT_TO_COUNTRY.get(dest_upper)
            if not country:
                return False
            country_set = COUNTRY_AND_ALIASES.get(country, frozenset({country}))
            if country_set.isdisjoint(dest_set):
                return False

    # 3. Commodity Scope (SPECIFIC_COMMODITIES)
    comm_scope = app.commodity_scope
    if comm_scope in (CommodityScope.SPECIFIC_COMMODITIES, "SPECIFIC_COMMODITIES"):
        comm_lower = (commodity or '').lower().strip()
        if not any(kw in comm_lower for kw in comm_tuple):
            return False

    # 4. Carrier Scope (SPECIFIC_CARRIERS)
    carr_scope = app.carrier_scope
    if carr_scope in (CarrierScope.SPECIFIC_CARRIERS, "SPECIFIC_CARRIERS"):
        carrier_upper = (carrier_code or '').upper().strip()
        if carrier_upper not in carrier_set:
            return False

    return True


def calculate_charge_amount(
    rule: ChargeRule,
    cw: float,
    pieces: int = 1,
    net_subtotal: float = 0.0
) -> float:
    """
    Evaluates charge fee amount based on calculation_type formula.
    """
    calc_type = rule.calculation_type
    if calc_type in (CalculationType.PER_KG_WITH_MIN, "PER_KG_WITH_MIN"):
        rate = rule.rate_per_kg or 0.0
        minimum = rule.min_amount or 0.0
        return float(round(max(rate * cw, minimum)))
    elif calc_type in (CalculationType.FLAT, "FLAT"):
        return float(round(rule.flat_amount or 0.0))
    elif calc_type in (CalculationType.PER_PIECE, "PER_PIECE"):
        rate = rule.rate_per_piece or 0.0
        pcs = max(pieces, 1)
        return float(round(rate * pcs))
    elif calc_type in (CalculationType.PERCENTAGE, "PERCENTAGE"):
        pct = rule.percentage_rate or 0.0
        return float(round(net_subtotal * (pct / 100.0)))
    return 0.0


def _map_legacy_cost_fields(dynamic_charges: List[Dict[str, Any]]) -> Dict[str, float]:
    """
    Helper to extract baseline legacy cost breakdown fields from dynamic charges
    for 100% backward compatibility with consumers expecting specific field names.
    """
    xray_total = 0.0
    misc_handling = 0.0
    commodity_fee = 0.0
    terminal_charges_total = 0.0
    awb_fee = 0.0
    ams_fee = 0.0
    gst_tax = 0.0

    for chg in dynamic_charges:
        code = chg.get("code")
        amt = float(chg.get("amount", 0.0))
        cat = chg.get("category")

        if code == "XBC":
            xray_total = amt
        elif code == "CTG":
            misc_handling = amt
        elif code in ("RAC", "COL"):
            commodity_fee += amt
        elif code == "CGC":
            awb_fee = amt
        elif code == "CCC":
            ams_fee = amt

        if cat == "TERMINAL":
            terminal_charges_total += amt
        elif cat == "STATUTORY_TAX":
            gst_tax += amt

    origin_thc_total = terminal_charges_total + commodity_fee

    return {
        "xray_total": xray_total,
        "misc_handling": misc_handling,
        "commodity_fee": commodity_fee,
        "origin_thc_total": origin_thc_total,
        "awb_fee": awb_fee,
        "ams_fee": ams_fee,
        "gst_tax": gst_tax,
    }


def calculate_pure_buy_rate(
    tariff: Dict[str, Any],
    cw: float,
    destination: str,
    commodity: str = "General Cargo",
    tiers: Optional[List[Dict[str, Any]]] = None,
    pivot_result: Optional[Tuple[float, float, str, bool, float]] = None,
    pieces: int = 1,
    active_charges: Optional[List[ChargeRule]] = None,
) -> CostBreakdown:
    """
    Computes pure landed airline buying cost for shipments under 500 kg.
    Strictly excludes all commercial margins.
    Dynamically evaluates statutory and gateway charges from active configuration.
    Employs true O(1) OrderedDict LRU memoization cache and O(log T) binary search break-even pivot.
    """
    dest_norm = (destination or '').upper().strip()
    rate_basis = tariff.get('rate_basis', 'NET_NET_PLUS_PLUS').upper()
    min_charge = float(tariff.get('min_charge') or 0.0)
    fsc_rate = 0.0 if rate_basis == 'ALL_IN' else float(tariff.get('fsc_per_kg') or 0.0)
    ssc_rate = 0.0 if rate_basis == 'ALL_IN' else float(tariff.get('ssc_per_kg') or 0.0)
    carrier_code = (tariff.get('carrier_code') or '').upper().strip()

    # Determine deterministic charges generation/signature for cache key
    if active_charges is not None:
        raw_repr = "|".join(
            f"{c.id}:{c.code}:{c.calculation_type}:{c.rate_per_kg}:{c.min_amount}:{c.flat_amount}:{c.percentage_rate}:{c.rate_per_piece}:{c.is_active}:{getattr(c, 'updated_at', '')}"
            for c in active_charges
        )
        charges_sig = hashlib.md5(raw_repr.encode("utf-8")).hexdigest()
    else:
        charges_sig = get_charges_generation()

    # DSA Cache Key Tuple for O(1) retrieval
    # Note: Index 3 MUST remain cw for LRU eviction test backward compatibility!
    cache_key = (
        carrier_code,
        tariff.get('origin', ''),
        dest_norm,
        cw,
        (commodity or '').lower().strip(),
        min_charge,
        rate_basis,
        tariff.get('rate_normal'),
        tariff.get('rate_45'),
        tariff.get('rate_100'),
        tariff.get('rate_250'),
        tariff.get('rate_300'),
        tariff.get('rate_500'),
        tariff.get('rate_1000'),
        fsc_rate,
        ssc_rate,
        pieces,
        charges_sig
    )

    if cache_key in _PURE_BUY_RATE_CACHE:
        # Move accessed entry to end of OrderedDict to maintain true LRU order
        _PURE_BUY_RATE_CACHE.move_to_end(cache_key)
        return _PURE_BUY_RATE_CACHE[cache_key]

    if tiers is None:
        tiers = tariff.get('_cached_tiers') or extract_active_weight_tiers(tariff)

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

    # Load active charges if not supplied
    rules = active_charges if active_charges is not None else get_active_charges()

    # Separate into non-tax charges (pre-tax charges: category != STATUTORY_TAX and calculation_type != PERCENTAGE)
    # and percentage tax charges.
    pre_tax_rules: List[ChargeRule] = []
    tax_rules: List[ChargeRule] = []
    for r in rules:
        if not getattr(r, 'is_active', True):
            continue
        calc_type = r.calculation_type
        cat = r.category
        if calc_type in (CalculationType.PERCENTAGE, "PERCENTAGE") or cat in (ChargeCategory.STATUTORY_TAX, "STATUTORY_TAX"):
            tax_rules.append(r)
        else:
            pre_tax_rules.append(r)

    # Evaluate applicable pre-tax charges
    dynamic_charges: List[Dict[str, Any]] = []
    pre_tax_total = 0.0

    for rule in pre_tax_rules:
        if is_charge_applicable(rule, cw, dest_norm, commodity, carrier_code):
            amt = calculate_charge_amount(rule, cw, pieces=pieces)
            pre_tax_total += amt
            cat_str = rule.category.value if hasattr(rule.category, "value") else str(rule.category)
            dynamic_charges.append({
                "code": rule.code,
                "name": rule.name,
                "amount": float(amt),
                "category": cat_str,
                "is_statutory": bool(rule.is_statutory)
            })

    # Net subtotal before statutory percentage taxes
    net_subtotal = round(base_freight + fuel_security_total + pre_tax_total)

    # Evaluate applicable percentage tax charges (e.g. 5% GST on net_subtotal)
    tax_total = 0.0
    for rule in tax_rules:
        if is_charge_applicable(rule, cw, dest_norm, commodity, carrier_code):
            tax_amt = calculate_charge_amount(rule, cw, pieces=pieces, net_subtotal=net_subtotal)
            tax_total += tax_amt
            cat_str = rule.category.value if hasattr(rule.category, "value") else str(rule.category)
            dynamic_charges.append({
                "code": rule.code,
                "name": rule.name,
                "amount": float(tax_amt),
                "category": cat_str,
                "is_statutory": bool(rule.is_statutory)
            })

    # Grand Totals (Zero Margin)
    total_landed_buy = net_subtotal + round(tax_total)
    effective_buy_per_kg = round(total_landed_buy / max(cw, 0.5), 2)

    # Map baseline legacy fields from dynamic charges for 100% backward compatibility
    legacy_costs = _map_legacy_cost_fields(dynamic_charges)

    breakdown = CostBreakdown(
        base_rate_per_kg=effective_rate,
        base_freight_total=base_freight,
        fsc_rate_per_kg=fsc_rate,
        fsc_total=fsc_total,
        ssc_rate_per_kg=ssc_rate,
        ssc_total=ssc_total,
        fuel_security_total=fuel_security_total,
        xray_total=legacy_costs["xray_total"],
        misc_handling_total=legacy_costs["misc_handling"],
        commodity_fee=legacy_costs["commodity_fee"],
        origin_thc_total=legacy_costs["origin_thc_total"],
        awb_fee=legacy_costs["awb_fee"],
        ams_fee=legacy_costs["ams_fee"],
        net_subtotal=net_subtotal,
        gst_tax=legacy_costs["gst_tax"],
        total_landed_buy=total_landed_buy,
        effective_buy_per_kg=effective_buy_per_kg,
        dynamic_charges=dynamic_charges
    )

    # Store in bounded true LRU Cache (evicts least recently accessed entry from front in O(1))
    if len(_PURE_BUY_RATE_CACHE) >= _CACHE_MAX_ENTRIES:
        _PURE_BUY_RATE_CACHE.popitem(last=False)
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


def evaluate_regulatory_and_operational_directives(
    carrier_code: str,
    destination: str,
    commodity: str,
    actual_weight_kg: float,
    total_pieces: int,
    dimensions: Optional[List[Any]] = None,
    packaging_type: Optional[PackagingType] = None,
) -> Tuple[List[str], bool]:
    """
    Evaluates regulatory compliance directives and carrier operational equipment rules ex-BOM.
    Consolidates corridor-specific customs mandates, carrier piece limits, pharma dimensional caps,
    and packaging material restrictions.
    """
    notes: List[str] = []
    packaging_restricted = False
    dest_norm = destination.upper().strip()
    country_code = AIRPORT_TO_COUNTRY.get(dest_norm)
    piece_weight = actual_weight_kg / max(total_pieces, 1)

    # 1. Nigeria Form 'M' Requirement
    if dest_norm in ("LOS", "ABV", "KAN", "ENU"):
        notes.append("Mandatory Form 'M' number must be declared and typed on AWB.")

    # 2. Manila Destination Terminal Charge
    if dest_norm == "MNL":
        notes.append("Destination Terminal Charge (TC) of INR 0.50/kg applicable at Manila.")

    # 3. North America Customs Manifest Transmission
    if country_code in ("US", "CA"):
        notes.append("Customs AMS / ACI electronic security manifest transmission required.")

    # 4. Bulk Aircraft Feasibility / Piece Weight Limits (Malaysia Airlines & narrowbodies)
    if carrier_code == "MH" and piece_weight > 60.0:
        notes.append("Piece weight exceeds 60 kg bulk aircraft loading limit (check equipment type).")

    # 5. Oman Air Pharma Carton Dimension Limits (< 100x80x60 cm and < 100 kg)
    if carrier_code == "WY" and any(k in commodity.lower() for k in ("pharma", "crt", "cold", "col")):
        has_oversize = False
        if dimensions:
            for dim in dimensions:
                is_dict = isinstance(dim, dict)
                l = dim.get('length_cm', 0.0) if is_dict else getattr(dim, 'length_cm', 0.0)
                w = dim.get('width_cm', 0.0) if is_dict else getattr(dim, 'width_cm', 0.0)
                h = dim.get('height_cm', 0.0) if is_dict else getattr(dim, 'height_cm', 0.0)
                if l > 100 or w > 80 or h > 60:
                    has_oversize = True
                    break
        if has_oversize or piece_weight > 100.0:
            notes.append("Loose cartons exceeding 100x80x60 cm or 100 kg require carrier sales pre-clearance.")

    # 6. AirAsia Packaging Restriction (Wooden boxes/pallets strictly prohibited)
    if carrier_code in ("D7", "AK") and packaging_type == PackagingType.WOODEN_BOX_OR_PALLET:
        packaging_restricted = True
        notes.append("Wooden boxes and pallets are prohibited on AirAsia (loose corrugated cartons only).")

    return notes, packaging_restricted


def build_rate_quote(
    tariff: Dict[str, Any],
    cw: float,
    orig: str,
    dest: str,
    commodity: str,
    idx: int,
    pivot_res: Tuple[float, float, str, bool, float],
    breakdown: CostBreakdown,
    request: Optional[RateSearchRequest] = None,
) -> RateQuoteItem:
    """
    Constructs a validated RateQuoteItem from tariff data, schedule info, and calculated landed cost.
    Applies regulatory, operational, packaging, and commercial discount rules ex-BOM.
    """
    _, _, applied_label, is_pivoted, savings = pivot_res
    carrier_code = (tariff.get('carrier_code') or 'JF').upper().strip()
    sched = get_airline_schedule(carrier_code)
    transit_str = sched['transit']

    total_pieces = 1
    if request and request.dimensions:
        total_pieces = sum(d.pieces for d in request.dimensions)
    elif request and request.pieces:
        total_pieces = request.pieces

    regulatory_notes, packaging_restricted = evaluate_regulatory_and_operational_directives(
        carrier_code=carrier_code,
        destination=dest,
        commodity=commodity,
        actual_weight_kg=request.actual_weight_kg if request else cw,
        total_pieces=total_pieces,
        dimensions=request.dimensions if request else None,
        packaging_type=request.packaging_type if request else None,
    )

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
        recommended=False,
        regulatory_notes=regulatory_notes,
        packaging_restricted=packaging_restricted,
    )


def is_commodity_match(tariff_comm: Optional[str], requested_comm: Optional[str]) -> bool:
    """
    Evaluates whether a circular tariff's commodity matches the requested commodity search tier.
    Handles IATA aliases and category equivalences:
      - Pharma CRT: PILA, CRT, PHARMA, PILA-CRT
      - Cold Chain: COL, 2 TO 8, COOL
      - Dangerous Goods: DGR, DG PAX, DG CAO
      - Express Courier: XPS, COU
      - Valuable: VAL
      - General: GCR, GEN, GENERAL
    """
    if not tariff_comm or not requested_comm:
        return True

    t = tariff_comm.upper().strip()
    r = requested_comm.upper().strip()

    if t == r:
        return True

    if r in ("GENERAL CARGO", "GCR", "GEN"):
        return t in ("GCR", "GEN", "GENERAL", "GENERAL CARGO")

    if "PHARMA" in r or "CRT" in r or "PILA" in r:
        return any(k in t for k in ("PILA", "CRT", "PHARMA"))

    if "COL" in r or "COLD" in r:
        return any(k in t for k in ("COL", "2 TO 8"))

    if "DGR" in r or "DANGEROUS" in r or "DG" in r:
        return any(k in t for k in ("DGR", "DG"))

    if "XPS" in r or "EXPRESS" in r or "COU" in r:
        return any(k in t for k in ("XPS", "COU", "EXPRESS"))

    if "VAL" in r:
        return "VAL" in t

    return t in r or r in t


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
    active_charges = get_active_charges()
    total_pieces = sum(d.pieces for d in request.dimensions) if request.dimensions else (request.pieces or 1)

    # Filter and match candidate tariffs by commodity preference per carrier
    carrier_tariff_map: Dict[str, List[Dict[str, Any]]] = {}
    for t in candidate_tariffs:
        c_code = (t.get('carrier_code') or 'XX').upper().strip()
        carrier_tariff_map.setdefault(c_code, []).append(t)

    matched_candidates: List[Dict[str, Any]] = []
    for c_code, c_tariffs in carrier_tariff_map.items():
        # Look for circular tariffs specifically matching requested commodity
        specific = [t for t in c_tariffs if is_commodity_match(t.get('commodity'), request.commodity)]
        if specific:
            matched_candidates.extend(specific)
        else:
            # Fall back to carrier standard GCR / general tariff
            gcr = [t for t in c_tariffs if is_commodity_match(t.get('commodity'), "General Cargo")]
            if gcr:
                matched_candidates.extend(gcr)
            else:
                matched_candidates.extend(c_tariffs)

    for idx, tariff in enumerate(matched_candidates):
        tiers = tariff.get('_cached_tiers') or extract_active_weight_tiers(tariff)
        min_charge = float(tariff.get('min_charge') or 0.0)
        pivot_res = optimize_break_even_pivot(cw, tiers, min_charge)

        breakdown = calculate_pure_buy_rate(
            tariff=tariff,
            cw=cw,
            destination=dest,
            commodity=request.commodity,
            tiers=tiers,
            pivot_result=pivot_res,
            pieces=total_pieces,
            active_charges=active_charges
        )

        quote = build_rate_quote(
            tariff=tariff,
            cw=cw,
            orig=orig,
            dest=dest,
            commodity=request.commodity,
            idx=idx,
            pivot_res=pivot_res,
            breakdown=breakdown,
            request=request,
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
