import pytest
from app.services.rate_engine import (
    calculate_chargeable_weight,
    calculate_pure_buy_rate,
    process_rate_search
)
from app.schemas.rate import RateSearchRequest, CargoDimension
from app.services.break_even import optimize_break_even_pivot


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


def test_hard_constraint_rejects_heavy_cargo_above_500kg(sample_tariffs):
    # Weight >= 500 kg must halt automated calculation
    req = RateSearchRequest(
        origin="BOM",
        destination="DXB",
        actual_weight_kg=520.0,
        commodity="General Cargo"
    )
    res = process_rate_search(req, sample_tariffs)
    assert res.is_heavy_cargo is True
    assert len(res.rates) == 0
    assert "≥ 500 kg threshold" in res.message


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
