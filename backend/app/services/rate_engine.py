import math
from typing import List, Dict, Any, Optional
from app.schemas.rate import RateSearchRequest, RateSearchResponse, RateQuoteItem, CostBreakdown
from app.services.break_even import optimize_break_even_pivot


# North American airports requiring US/Canada Automated Manifest System (AMS)
AMS_APPLICABLE_DESTINATIONS = {
    'ORD', 'JFK', 'LAX', 'ATL', 'DFW', 'SFO', 'MIA', 'BOS', 'SEA', 'IAD',
    'IAH', 'EWR', 'DTW', 'MSP', 'PHL', 'CLT', 'DEN', 'YYZ', 'YVR', 'YUL'
}

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


def calculate_chargeable_weight(actual_weight: float, dimensions: Optional[List[Any]] = None) -> float:
    """
    Computes IATA Chargeable Weight rounded up to nearest 0.5 kg.
    TACT Rule 1.3.2.
    """
    vol_weight = 0.0
    if dimensions:
        for dim in dimensions:
            l = getattr(dim, 'length_cm', dim.get('length_cm', 0.0) if isinstance(dim, dict) else 0.0)
            w = getattr(dim, 'width_cm', dim.get('width_cm', 0.0) if isinstance(dim, dict) else 0.0)
            h = getattr(dim, 'height_cm', dim.get('height_cm', 0.0) if isinstance(dim, dict) else 0.0)
            pcs = getattr(dim, 'pieces', dim.get('pieces', 1) if isinstance(dim, dict) else 1)
            vol_weight += (l * w * h * pcs) / 6000.0

    raw_weight = max(actual_weight, vol_weight)
    return math.ceil(raw_weight * 2.0) / 2.0


def calculate_pure_buy_rate(
    tariff: Dict[str, Any],
    cw: float,
    destination: str,
    commodity: str = "General Cargo"
) -> CostBreakdown:
    """
    Computes pure landed airline buying cost for shipments under 500 kg.
    Strictly excludes all commercial margins.
    """
    # 1. Build sorted active slabs (<500kg only)
    tiers = []
    if tariff.get('rate_normal') and float(tariff['rate_normal']) > 0:
        tiers.append({'min_weight': 0.0, 'rate': float(tariff['rate_normal']), 'label': 'Normal'})
    if tariff.get('rate_45') and float(tariff['rate_45']) > 0:
        tiers.append({'min_weight': 45.0, 'rate': float(tariff['rate_45']), 'label': '+45 kg'})
    if tariff.get('rate_100') and float(tariff['rate_100']) > 0:
        tiers.append({'min_weight': 100.0, 'rate': float(tariff['rate_100']), 'label': '+100 kg'})
    if tariff.get('rate_250') and float(tariff['rate_250']) > 0:
        tiers.append({'min_weight': 250.0, 'rate': float(tariff['rate_250']), 'label': '+250 kg'})
    if tariff.get('rate_300') and float(tariff['rate_300']) > 0:
        tiers.append({'min_weight': 300.0, 'rate': float(tariff['rate_300']), 'label': '+300 kg'})

    min_charge = float(tariff.get('min_charge') or 0.0)
    base_freight, effective_rate, _, _, _ = optimize_break_even_pivot(cw, tiers, min_charge)

    # 2. Surcharges (FSC & Security)
    rate_basis = tariff.get('rate_basis', 'NET_NET_PLUS_PLUS').upper()
    if rate_basis == 'ALL_IN':
        fsc_rate = 0.0
        fsc_total = 0.0
        ssc_rate = 0.0
        ssc_total = 0.0
    else:
        fsc_rate = float(tariff.get('fsc_per_kg') or 0.0)
        fsc_min = float(tariff.get('fsc_min') or 0.0)
        fsc_total = round(max(fsc_rate * cw, fsc_min))

        ssc_rate = float(tariff.get('ssc_per_kg') or 0.0)
        ssc_min = float(tariff.get('ssc_min') or 0.0)
        ssc_total = round(max(ssc_rate * cw, ssc_min))

    fuel_security_total = fsc_total + ssc_total

    # 3. Origin Terminal Handling Charges (BOM Gateway Standards)
    xray_total = round(max(3.50 * cw, 550.0))
    misc_handling = round(max(2.00 * cw, 200.0) + max(1.00 * cw, 300.0))

    commodity_fee = 0.0
    norm_comm = commodity.lower()
    if 'dangerous' in norm_comm or 'dgr' in norm_comm:
        commodity_fee = 3500.0  # MIAL DGR acceptance inspection
    elif 'pharma' in norm_comm or 'cold' in norm_comm or 'perishable' in norm_comm:
        commodity_fee = round(max(cw * 2.50, 1500.0))

    origin_thc_total = xray_total + misc_handling + commodity_fee

    # 4. Regulatory & Documentation Fees
    awb_fee = 800.0
    ams_fee = 950.0 if destination.upper() in AMS_APPLICABLE_DESTINATIONS else 0.0

    # 5. Grand Totals (Zero Margin)
    net_subtotal = round(base_freight + fuel_security_total + origin_thc_total + awb_fee + ams_fee)
    gst_tax = round(net_subtotal * 0.05)  # 5% statutory Indian Air Export GST
    total_landed_buy = net_subtotal + gst_tax
    effective_buy_per_kg = round(total_landed_buy / cw, 2)

    return CostBreakdown(
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


def process_rate_search(
    request: RateSearchRequest,
    available_tariffs: List[Dict[str, Any]]
) -> RateSearchResponse:
    """
    Main aggregator entry point with strict < 500kg Smalls constraint.
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

    matched_quotes = []
    for idx, tariff in enumerate(available_tariffs):
        if tariff.get('origin', '').upper() == orig and tariff.get('destination', '').upper() == dest:
            breakdown = calculate_pure_buy_rate(tariff, cw, dest, request.commodity)
            
            # Check pivot details
            tiers = []
            for slab, wt in [('rate_normal', 0.0), ('rate_45', 45.0), ('rate_100', 100.0), ('rate_250', 250.0), ('rate_300', 300.0)]:
                if tariff.get(slab) and float(tariff[slab]) > 0:
                    tiers.append({'min_weight': wt, 'rate': float(tariff[slab]), 'label': slab})
            
            _, _, applied_label, is_pivoted, savings = optimize_break_even_pivot(
                cw, tiers, float(tariff.get('min_charge') or 0.0)
            )

            carrier_code = tariff.get('carrier_code', 'JF')
            sched = AIRLINE_SCHEDULES.get(carrier_code, {
                'flight': f"{carrier_code}-204",
                'departure': '04:30 IST',
                'arrival': '10:00 Local',
                'transit': 'Direct / Connecting Hub',
                'cutoff': '22:00 IST (-1d)'
            })

            quote = RateQuoteItem(
                id=f"quote-{carrier_code}-{idx}",
                carrier_name=tariff.get('airline', 'Air Cargo Partner'),
                carrier_code=carrier_code,
                airline_prefix=tariff.get('prefix', '000'),
                flight_number=sched['flight'],
                routing_type='Direct' if 'Direct' in sched['transit'] else 'Connecting Hub',
                transit_time=sched['transit'],
                departure_time=sched['departure'],
                arrival_time=sched['arrival'],
                cargo_cutoff=sched['cutoff'],
                origin=orig,
                destination=dest,
                cargo_category=request.commodity,
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
            matched_quotes.append(quote)

    # Sort strictly by lowest total landed buy cost
    matched_quotes.sort(key=lambda x: x.breakdown.total_landed_buy)
    if matched_quotes:
        matched_quotes[0].recommended = True

    return RateSearchResponse(
        origin=orig,
        destination=dest,
        chargeable_weight=cw,
        is_heavy_cargo=False,
        rates=matched_quotes
    )
