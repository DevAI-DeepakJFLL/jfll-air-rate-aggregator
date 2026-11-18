import pytest
from app.services.rate_engine import (
    calculate_chargeable_weight,
    calculate_pure_buy_rate,
    process_rate_search,
    get_airline_schedule,
    build_rate_quote,
    is_charge_applicable,
)
from app.schemas.rate import RateSearchRequest, CargoDimension
from app.services.break_even import optimize_break_even_pivot
from app.services.charges_service import charges_service
from app.schemas.charge import (
    CalculationType,
    ChargeCategory,
    ChargeRuleCreate,
    ChargeRuleUpdate,
    CorridorScope,
)


@pytest.fixture(autouse=True)
def reset_charges_state():
    charges_service.reset_to_defaults()
    yield
    charges_service.reset_to_defaults()


def test_iata_chargeable_weight_rounding():
    # Exactly rounds up to nearest 0.5 kg (Rule 1.3.2)
    assert calculate_chargeable_weight(100.1) == 100.5
    assert calculate_chargeable_weight(100.5) == 100.5
    assert calculate_chargeable_weight(100.6) == 101.0
    assert calculate_chargeable_weight(45.0) == 45.0


def test_volumetric_weight_calculation():
    # 1 package: 100cm x 60cm x 50cm = 300,000 cm3 / 6,000 = 50.0 kg
    dims = [CargoDimension(length_cm=100, width_cm=60, height_cm=50, pieces=1)]
    # Actual weight 30 kg vs Volumetric 50 kg -> Chargeable should be 50.0 kg
    cw = calculate_chargeable_weight(30.0, dims)
    assert cw == 50.0


def test_500kg_calculates_rates_seamlessly(sample_tariffs):
    # Weight up to 500 kg ceiling calculates quotes seamlessly using published slabs (+500kg or active slabs)
    req = RateSearchRequest(
        origin="BOM",
        destination="DXB",
        actual_weight_kg=500.0,
        commodity="General Cargo"
    )
    res = process_rate_search(req, sample_tariffs)
    assert res.is_heavy_cargo is False
    assert res.chargeable_weight == 500.0
    assert len(res.rates) > 0


def test_hard_constraint_rejects_above_500kg_ceiling(sample_tariffs):
    # Chargeable weight exceeding MAX_CHARGEABLE_WEIGHT_KG (500 kg) via volumetric dimensions halts calculation
    dims = [CargoDimension(length_cm=100, width_cm=100, height_cm=100, pieces=4)]
    req = RateSearchRequest(
        origin="BOM",
        destination="DXB",
        actual_weight_kg=100.0,
        dimensions=dims,
        commodity="General Cargo"
    )
    res = process_rate_search(req, sample_tariffs)
    assert res.is_heavy_cargo is True
    assert len(res.rates) == 0
    assert "exceeds the maximum allowed limit of 500 kg" in res.message


def test_request_schema_rejects_actual_weight_above_500kg():
    import pytest
    from pydantic import ValidationError
    with pytest.raises(ValidationError):
        RateSearchRequest(
            origin="BOM",
            destination="DXB",
            actual_weight_kg=501.0,
            commodity="General Cargo"
        )


def test_break_even_pivot_optimization():
    tiers = [
        {"min_weight": 0.0, "rate": 250.0, "label": "Normal"},
        {"min_weight": 45.0, "rate": 200.0, "label": "+45 kg"},
        {"min_weight": 100.0, "rate": 170.0, "label": "+100 kg"},
        {"min_weight": 250.0, "rate": 145.0, "label": "+250 kg"},
        {"min_weight": 300.0, "rate": 110.0, "label": "+300 kg"},
    ]
    # Chargeable weight = 280 kg
    # Natural cost: 280 kg * 145 = 40,600
    # Higher tier: 300 kg * 110 = 33,000
    # Bumping saves 7,600!
    freight, rate, label, is_pivoted, savings = optimize_break_even_pivot(280.0, tiers)
    assert is_pivoted is True
    assert freight == 33000.0
    assert rate == 110.0
    assert savings == 7600.0
    assert "300 kg" in label


def test_pure_buying_rate_zero_margin(sample_tariffs):
    # Calculate pure buying rate for BOM-DXB 100 kg
    tariff = sample_tariffs[0]
    breakdown = calculate_pure_buy_rate(tariff, 100.0, "DXB", "General Cargo")

    # Base freight: 100 kg * 170 = 17,000
    assert breakdown.base_freight_total == 17000.0
    # Fuel: max(100 * 20, 3500) = 3,500
    assert breakdown.fsc_total == 3500.0
    # Security: max(100 * 3.5, 500) = 500
    assert breakdown.ssc_total == 500.0
    # Fuel & Security total = 4,000
    assert breakdown.fuel_security_total == 4000.0
    # X-ray: max(100 * 3.5, 550) = 550
    assert breakdown.xray_total == 550.0
    # e-AWB fee: 800
    assert breakdown.awb_fee == 800.0
    # DXB is NOT US/Canada -> AMS fee must be 0
    assert breakdown.ams_fee == 0.0

    # Ensure net subtotal matches exact sum
    expected_subtotal = (
        breakdown.base_freight_total +
        breakdown.fuel_security_total +
        breakdown.origin_thc_total +
        breakdown.awb_fee +
        breakdown.ams_fee
    )
    assert breakdown.net_subtotal == expected_subtotal
    # GST is exactly 5%
    assert breakdown.gst_tax == round(expected_subtotal * 0.05)
    # Total landed buy is exactly Subtotal + GST (NO 4% MARKUP)
    assert breakdown.total_landed_buy == expected_subtotal + breakdown.gst_tax


def test_ams_fee_applied_only_for_us_canada(sample_tariffs):
    # ORD is in US -> AMS fee must be 950.0
    breakdown_ord = calculate_pure_buy_rate(sample_tariffs[1], 100.0, "ORD", "General Cargo")
    assert breakdown_ord.ams_fee == 950.0

    # DXB is not US -> AMS fee must be 0
    breakdown_dxb = calculate_pure_buy_rate(sample_tariffs[0], 100.0, "DXB", "General Cargo")
    assert breakdown_dxb.ams_fee == 0.0


def test_dgr_inspection_statutory_fee(sample_tariffs):
    # DGR commodity receives statutory MIAL fee of 3,500
    breakdown_dgr = calculate_pure_buy_rate(sample_tariffs[0], 100.0, "DXB", "DGR - PAX")
    assert breakdown_dgr.commodity_fee == 3500.0

    # General cargo has 0 commodity fee
    breakdown_gen = calculate_pure_buy_rate(sample_tariffs[0], 100.0, "DXB", "General Cargo")
    assert breakdown_gen.commodity_fee == 0.0


def test_get_airline_schedule_known_and_fallback():
    # Known carrier EK
    ek_sched = get_airline_schedule("EK")
    assert ek_sched["flight"] == "EK-505"
    assert "Direct" in ek_sched["transit"]

    # Unknown carrier XX fallback
    fallback_sched = get_airline_schedule("XX")
    assert fallback_sched["flight"] == "XX-204"
    assert "Connecting" in fallback_sched["transit"]


def test_build_rate_quote(sample_tariffs):
    tariff = sample_tariffs[0]
    pivot_res = (17000.0, 170.0, "+100 kg", False, 0.0)
    breakdown = calculate_pure_buy_rate(tariff, 100.0, "DXB", "General Cargo")
    quote = build_rate_quote(
        tariff=tariff,
        cw=100.0,
        orig="BOM",
        dest="DXB",
        commodity="General Cargo",
        idx=0,
        pivot_res=pivot_res,
        breakdown=breakdown
    )

    assert quote.carrier_code == "AI"
    assert quote.routing_type == "Direct"
    assert quote.origin == "BOM"
    assert quote.destination == "DXB"
    assert quote.chargeable_weight == 100.0
    assert quote.weight_tier_applied == "+100 kg"
    assert quote.is_pivoted is False
    assert quote.breakdown.total_landed_buy == breakdown.total_landed_buy


def test_volumetric_weight_multiple_pieces_and_cbm_equivalence():
    # 2 pieces of 80cm x 60cm x 50cm = 480,000 cm³ = 0.48 CBM
    # 480,000 / 6,000 = 80.0 kg volumetric weight
    dims = [CargoDimension(length_cm=80.0, width_cm=60.0, height_cm=50.0, pieces=2)]
    # Actual weight 50 kg vs Volumetric 80 kg -> CW must be 80.0 kg
    cw = calculate_chargeable_weight(50.0, dims)
    assert cw == 80.0
    # Also verify cbm property on schema
    assert dims[0].cbm == 0.48
    assert dims[0].volumetric_weight_kg == 80.0


def test_rate_sheet_destinations_endpoint(client):
    response = client.get("/api/v1/rates/destinations")
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 80
    codes = {item["code"] for item in data}
    assert "DXB" in codes
    assert "LHR" in codes
    assert "FRA" in codes
    assert "SIN" in codes
    assert "KUL" in codes
    assert "JFK" in codes


def test_dynamic_charge_update_immediately_reflects_in_rate(sample_tariffs):
    tariff = sample_tariffs[0]
    # Baseline: 100 kg ex-BOM to DXB -> X-Ray min is 550.0 (3.5 * 100 = 350 < 550)
    bd_baseline = calculate_pure_buy_rate(tariff, 100.0, "DXB", "General Cargo")
    assert bd_baseline.xray_total == 550.0

    # Pricing Head updates X-ray screening minimum to 650.0 and rate to 4.0/kg
    updated = charges_service.update_charge(
        "chg_xray",
        ChargeRuleUpdate(min_amount=650.0, rate_per_kg=4.0),
        user="pricing_head"
    )
    assert updated is not None

    # Immediate query with same parameters must reflect the updated cost (cache invalidation verified)
    bd_updated = calculate_pure_buy_rate(tariff, 100.0, "DXB", "General Cargo")
    assert bd_updated.xray_total == 650.0
    # Net subtotal must increase exactly by 100 (650 - 550)
    assert bd_updated.net_subtotal == bd_baseline.net_subtotal + 100.0
    # Total landed buy must be net_subtotal + 5% GST
    assert bd_updated.gst_tax == round(bd_updated.net_subtotal * 0.05)
    assert bd_updated.total_landed_buy == bd_updated.net_subtotal + bd_updated.gst_tax

    # Query with 200 kg: 4.0 * 200 = 800.0 > 650.0
    bd_200 = calculate_pure_buy_rate(tariff, 200.0, "DXB", "General Cargo")
    assert bd_200.xray_total == 800.0


def test_custom_charge_addition_and_evaluation(sample_tariffs):
    tariff = sample_tariffs[0]
    bd_before = calculate_pure_buy_rate(tariff, 100.0, "DXB", "General Cargo")

    # Add custom war risk surcharge: FLAT ₹1,200 ex-BOM
    war_charge = ChargeRuleCreate(
        code="WAR",
        name="War Risk Insurance Surcharge",
        description="Gulf corridor conflict zone supplementary airline premium",
        category=ChargeCategory.OTHER,
        calculation_type=CalculationType.FLAT,
        flat_amount=1200.0,
        is_statutory=False
    )
    created = charges_service.create_charge(war_charge, user="pricing_head")
    assert created.code == "WAR"

    # Query rate: custom charge must evaluate, appear in dynamic_charges, and increment totals
    bd_after = calculate_pure_buy_rate(tariff, 100.0, "DXB", "General Cargo")

    # Check presence in dynamic_charges list
    war_entry = next((c for c in bd_after.dynamic_charges if c["code"] == "WAR"), None)
    assert war_entry is not None
    assert war_entry["name"] == "War Risk Insurance Surcharge"
    assert war_entry["amount"] == 1200.0
    assert war_entry["category"] == "OTHER"
    assert war_entry["is_statutory"] is False

    # Check financial totals
    assert bd_after.net_subtotal == bd_before.net_subtotal + 1200.0
    # 5% GST on 1200 is 60 -> total increments by 1260
    assert bd_after.total_landed_buy == bd_before.total_landed_buy + 1260.0


def test_baseline_charge_deactivation_omits_from_dynamic_charges_and_zeros_legacy_field(sample_tariffs):
    tariff = sample_tariffs[0]
    bd_active = calculate_pure_buy_rate(tariff, 100.0, "DXB", "General Cargo")
    assert bd_active.awb_fee == 800.0
    assert any(c["code"] == "CGC" for c in bd_active.dynamic_charges)

    # Deactivate e-AWB fee
    success = charges_service.delete_charge("chg_eawb", user="pricing_head")
    assert success is True

    # Immediate query: awb_fee must be 0.0 and CGC omitted from dynamic_charges
    bd_inactive = calculate_pure_buy_rate(tariff, 100.0, "DXB", "General Cargo")
    assert bd_inactive.awb_fee == 0.0
    assert not any(c["code"] == "CGC" for c in bd_inactive.dynamic_charges)

    # Net subtotal must decrease by 800
    assert bd_inactive.net_subtotal == bd_active.net_subtotal - 800.0
    # Landed buy must decrease by 800 + 5% GST (40) = 840
    assert bd_inactive.total_landed_buy == bd_active.total_landed_buy - 840.0


def test_dynamic_charge_per_piece_and_applicability_filtering(sample_tariffs):
    tariff = sample_tariffs[0]

    # Add PER_PIECE handling charge: ₹50 / piece
    piece_charge = ChargeRuleCreate(
        code="LBL",
        name="Pallet Barcode Labeling",
        category=ChargeCategory.TERMINAL,
        calculation_type=CalculationType.PER_PIECE,
        rate_per_piece=50.0,
        is_statutory=False
    )
    charges_service.create_charge(piece_charge, user="pricing_head")

    # 1. Evaluate with 4 pieces
    bd_4pcs = calculate_pure_buy_rate(tariff, 100.0, "DXB", "General Cargo", pieces=4)
    lbl_entry = next((c for c in bd_4pcs.dynamic_charges if c["code"] == "LBL"), None)
    assert lbl_entry is not None
    assert lbl_entry["amount"] == 200.0  # 4 * 50

    # 2. Add corridor-specific charge: EUF applicable only to FRA, LHR
    eu_charge = ChargeRuleCreate(
        code="EUF",
        name="EU Customs Security Surcharge",
        category=ChargeCategory.CUSTOMS,
        calculation_type=CalculationType.FLAT,
        flat_amount=500.0,
        applicability={
            "corridor_scope": "SPECIFIC_PORTS",
            "destination_codes": ["FRA", "LHR"]
        },
        is_statutory=True
    )
    charges_service.create_charge(eu_charge, user="pricing_head")

    # DXB query: EUF must NOT apply
    bd_dxb = calculate_pure_buy_rate(tariff, 100.0, "DXB", "General Cargo")
    assert not any(c["code"] == "EUF" for c in bd_dxb.dynamic_charges)

    # FRA query: EUF MUST apply
    bd_fra = calculate_pure_buy_rate(tariff, 100.0, "FRA", "General Cargo")
    euf_entry = next((c for c in bd_fra.dynamic_charges if c["code"] == "EUF"), None)
    assert euf_entry is not None
    assert euf_entry["amount"] == 500.0


def test_cost_breakdown_full_backward_compatibility(sample_tariffs):
    tariff = sample_tariffs[0]
    bd = calculate_pure_buy_rate(tariff, 100.0, "DXB", "General Cargo")

    # All 16 legacy fields must exist and be valid floats
    legacy_fields = [
        "base_rate_per_kg", "base_freight_total", "fsc_rate_per_kg", "fsc_total",
        "ssc_rate_per_kg", "ssc_total", "fuel_security_total", "xray_total",
        "misc_handling_total", "commodity_fee", "origin_thc_total", "awb_fee",
        "ams_fee", "net_subtotal", "gst_tax", "total_landed_buy", "effective_buy_per_kg"
    ]
    for field_name in legacy_fields:
        val = getattr(bd, field_name)
        assert isinstance(val, (int, float)), f"{field_name} must be numeric"

    # dynamic_charges must be a populated list of dictionaries
    assert isinstance(bd.dynamic_charges, list)
    assert len(bd.dynamic_charges) >= 3  # At least XBC, CTG, CGC, GST
    for item in bd.dynamic_charges:
        assert "code" in item
        assert "name" in item
        assert "amount" in item
        assert "category" in item
        assert "is_statutory" in item


def test_external_file_change_invalidates_pure_buy_rate_cache(sample_tariffs):
    import json
    import os
    tariff = sample_tariffs[0]

    # Baseline query (cached)
    bd1 = calculate_pure_buy_rate(tariff, 100.0, "DXB", "General Cargo")
    assert bd1.xray_total == 550.0

    # Simulate external file edit by directly modifying charges_config.json on disk
    with open(charges_service.config_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    for item in data:
        if item["id"] == "chg_xray":
            item["min_amount"] = 999.0

    # Write back and advance mtime to simulate external edit
    with open(charges_service.config_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)

    new_mtime = os.path.getmtime(charges_service.config_path) + 2.0
    os.utime(charges_service.config_path, (new_mtime, new_mtime))

    # Next query must detect file mtime change and reflect ₹999.0 minimum
    bd2 = calculate_pure_buy_rate(tariff, 100.0, "DXB", "General Cargo")
    assert bd2.xray_total == 999.0


def test_corridor_scope_country_and_airport_matching(sample_tariffs):
    """
    CorridorScope.SPECIFIC_COUNTRIES:
    Matches either by airport IATA code or mapped country code (e.g. US -> JFK, GB/UK -> LHR).
    """
    tariff_us = sample_tariffs[1]  # ORD
    tariff_dxb = sample_tariffs[0]  # DXB

    # Charge configured with country code "US" only
    charge_us = ChargeRuleCreate(
        code="USF",
        name="US Entry Security",
        category=ChargeCategory.CUSTOMS,
        calculation_type=CalculationType.FLAT,
        flat_amount=500.0,
        applicability={
            "corridor_scope": "SPECIFIC_COUNTRIES",
            "destination_codes": ["US"]
        },
        is_statutory=True
    )
    rule_us = charges_service.create_charge(charge_us, user="pricing_head")

    # JFK is in US -> must match
    assert is_charge_applicable(rule_us, 100.0, "JFK", "General Cargo", "EK") is True
    # ORD is in US -> must match
    assert is_charge_applicable(rule_us, 100.0, "ORD", "General Cargo", "EK") is True
    # DXB is in AE -> must NOT match
    assert is_charge_applicable(rule_us, 100.0, "DXB", "General Cargo", "EK") is False
    # LHR is in GB -> must NOT match
    assert is_charge_applicable(rule_us, 100.0, "LHR", "General Cargo", "EK") is False

    # Also verify calculate_pure_buy_rate includes USF for ORD/JFK and excludes for DXB
    bd_ord = calculate_pure_buy_rate(tariff_us, 100.0, "ORD", "General Cargo")
    assert any(c["code"] == "USF" for c in bd_ord.dynamic_charges)

    bd_dxb = calculate_pure_buy_rate(tariff_dxb, 100.0, "DXB", "General Cargo")
    assert not any(c["code"] == "USF" for c in bd_dxb.dynamic_charges)

    # Charge configured with UK / GB alias
    charge_gb = ChargeRuleCreate(
        code="GBF",
        name="UK Border Fee",
        category=ChargeCategory.CUSTOMS,
        calculation_type=CalculationType.FLAT,
        flat_amount=400.0,
        applicability={
            "corridor_scope": "SPECIFIC_COUNTRIES",
            "destination_codes": ["UK"]
        },
        is_statutory=True
    )
    rule_gb = charges_service.create_charge(charge_gb, user="pricing_head")

    # LHR is in UK/GB -> matches
    assert is_charge_applicable(rule_gb, 100.0, "LHR", "General Cargo", "EK") is True
    # JFK -> does not match
    assert is_charge_applicable(rule_gb, 100.0, "JFK", "General Cargo", "EK") is False


def test_regulatory_and_operational_directives(sample_tariffs):
    """Verify regulatory alerts and packaging checks from carrier circulars."""
    # 1. Test Nigeria Form 'M' note
    req_nigeria = RateSearchRequest(
        origin="BOM",
        destination="LOS",
        actual_weight_kg=120.0,
        commodity="General Cargo"
    )
    res_nigeria = process_rate_search(req_nigeria, sample_tariffs)
    # Check that any generated quote has the Nigeria Form M note
    if res_nigeria.rates:
        assert any("Form 'M'" in note for note in res_nigeria.rates[0].regulatory_notes)

    # 2. Test Manila Destination Terminal Charge note
    req_manila = RateSearchRequest(
        origin="BOM",
        destination="MNL",
        actual_weight_kg=100.0,
        commodity="General Cargo"
    )
    res_manila = process_rate_search(req_manila, sample_tariffs)
    if res_manila.rates:
        assert any("Manila" in note for note in res_manila.rates[0].regulatory_notes)

    # 3. Test AirAsia wooden box restriction
    d7_tariff = {
        "origin": "BOM",
        "destination": "KUL",
        "airline": "AirAsia X",
        "carrier_code": "D7",
        "prefix": "843",
        "rate_basis": "ALL_IN",
        "min_charge": 3000.0,
        "rate_normal": 160.0,
        "rate_45": 140.0,
        "rate_100": 120.0,
        "rate_300": 110.0,
        "fsc_per_kg": 0.0,
        "ssc_per_kg": 0.0,
    }
    req_d7_wood = RateSearchRequest(
        origin="BOM",
        destination="KUL",
        actual_weight_kg=100.0,
        packaging_type="Wooden Box/Pallet",
        commodity="General Cargo"
    )
    res_d7 = process_rate_search(req_d7_wood, [d7_tariff])
    assert len(res_d7.rates) == 1
    assert res_d7.rates[0].packaging_restricted is True
    assert any("Wooden boxes" in n for n in res_d7.rates[0].regulatory_notes)


def test_packaging_type_enum_validation():
    """Verify PackagingType enum deserializes strings and validates correctly."""
    from app.schemas.rate import PackagingType, RateSearchRequest

    req_carton = RateSearchRequest(
        origin="BOM", destination="DXB", actual_weight_kg=50.0,
        packaging_type=PackagingType.CARTON
    )
    assert req_carton.packaging_type == PackagingType.CARTON
    assert req_carton.packaging_type == "Carton"

    req_wood = RateSearchRequest(
        origin="BOM", destination="DXB", actual_weight_kg=50.0,
        packaging_type="Wooden Box/Pallet"
    )
    assert req_wood.packaging_type == PackagingType.WOODEN_BOX_OR_PALLET


def test_commodity_specific_tariff_matching():
    """Verify search selects specific commodity tariff when available instead of generic GCR."""
    from app.services.rate_engine import process_rate_search

    ai_gcr = {
        "origin": "BOM", "destination": "LHR", "airline": "Air India",
        "carrier_code": "AI", "prefix": "098", "commodity": "GCR",
        "min_charge": 5000.0, "rate_normal": 220.0, "rate_45": 190.0,
        "rate_100": 170.0, "rate_300": 150.0, "fsc_per_kg": 22.0, "ssc_per_kg": 4.0,
    }
    ai_crt = {
        "origin": "BOM", "destination": "LHR", "airline": "Air India",
        "carrier_code": "AI", "prefix": "098", "commodity": "CRT",
        "min_charge": 7000.0, "rate_normal": 310.0, "rate_45": 280.0,
        "rate_100": 260.0, "rate_300": 240.0, "fsc_per_kg": 22.0, "ssc_per_kg": 4.0,
    }

    # When searching for Pharma CRT, carrier's CRT tariff should be matched
    req_pharma = RateSearchRequest(
        origin="BOM", destination="LHR", actual_weight_kg=100.0,
        commodity="Pharma CRT"
    )
    res_pharma = process_rate_search(req_pharma, [ai_gcr, ai_crt])
    assert len(res_pharma.rates) == 1
    # Base rate for CRT at +100kg is 260.0 (GCR is 170.0)
    assert res_pharma.rates[0].breakdown.base_rate_per_kg == 260.0

    # When searching for General Cargo, carrier's GCR tariff should be matched
    req_gcr = RateSearchRequest(
        origin="BOM", destination="LHR", actual_weight_kg=100.0,
        commodity="General Cargo"
    )
    res_gcr = process_rate_search(req_gcr, [ai_gcr, ai_crt])
    assert len(res_gcr.rates) == 1
    assert res_gcr.rates[0].breakdown.base_rate_per_kg == 170.0






