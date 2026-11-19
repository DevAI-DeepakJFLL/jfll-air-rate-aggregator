import pytest
from app.schemas.rate import RateSearchRequest
from app.services.rate_engine import (
    process_rate_search,
    evaluate_regulatory_and_operational_directives,
)
from app.data.tariffs import AIRLINE_TARIFFS
from app.services.break_even import optimize_break_even_pivot
from app.services.charges_service import charges_service
from app.schemas.charge import ChargeRuleCreate, ChargeCategory, CalculationType
from app.core.security import get_current_user
from app.core.config import settings
from app.services.s3_storage_service import s3_storage_service
from app.services.pdf_extractor import validate_tariff_record_domain


def test_finding_1_dictionary_dimensions_do_not_crash():
    """Finding 1: Dictionary dimensions should not raise AttributeError in regulatory checks."""
    notes, restricted = evaluate_regulatory_and_operational_directives(
        carrier_code="WY",
        destination="MCT",
        commodity="Pharma CRT",
        actual_weight_kg=50.0,
        total_pieces=1,
        dimensions=[{"length_cm": 120.0, "width_cm": 90.0, "height_cm": 70.0, "pieces": 1}],
    )
    assert len(notes) > 0
    assert any("exceeding 100x80x60" in n for n in notes)
    assert restricted is False


def test_finding_2_standalone_pieces_without_dimensions():
    """Finding 2: Pieces count must not be dropped when dimensions are omitted."""
    req = RateSearchRequest(
        origin="BOM",
        destination="DXB",
        actual_weight_kg=100.0,
        commodity="General Cargo",
        pieces=15,
        dimensions=None,
    )
    res = process_rate_search(req, AIRLINE_TARIFFS)
    assert len(res.rates) > 0
    assert res.rates[0].chargeable_weight == 100.0


@pytest.mark.anyio
async def test_finding_3_rbac_least_privilege_and_pricing_head():
    """Finding 3: RBAC least privilege default and explicit PRICING_HEAD grant verification."""
    # 1. Master admin key with explicit PRICING_HEAD role grants PRICING_HEAD
    head_session = await get_current_user(api_key=settings.ADMIN_API_KEY, role="PRICING_HEAD", user="admin_user")
    assert head_session.role == "PRICING_HEAD"
    assert head_session.username == "admin_user"

    # 2. Master admin key with omitted role defaults to COORDINATOR (Least Privilege)
    default_session = await get_current_user(api_key=settings.ADMIN_API_KEY, role=None, user="admin_user")
    assert default_session.role == "COORDINATOR"

    # 3. Coordinator key cannot escalate even with PRICING_HEAD header
    coord_session = await get_current_user(api_key=settings.COORDINATOR_API_KEY, role="PRICING_HEAD", user="coord")
    assert coord_session.role == "COORDINATOR"


def test_finding_5_duplicate_charge_code_rejected():
    """Finding 5: Creating a duplicate active charge code must raise ValueError."""
    # XBC is existing baseline airport screening
    with pytest.raises(ValueError, match="already exists"):
        charges_service.create_charge(
            ChargeRuleCreate(
                code="XBC",
                name="Duplicate XBC",
                category=ChargeCategory.TERMINAL,
                calculation_type=CalculationType.FLAT,
                flat_amount=500.0,
            )
        )


def test_finding_6_unsorted_weight_slabs_binary_search():
    """Finding 6: Unsorted tiers must be sorted before binary search."""
    unsorted_tiers = [
        {"min_weight": 300.0, "rate": 115.0, "label": "+300 kg"},
        {"min_weight": 0.0, "rate": 300.0, "label": "Normal"},
        {"min_weight": 100.0, "rate": 180.0, "label": "+100 kg"},
        {"min_weight": 45.0, "rate": 220.0, "label": "+45 kg"},
        {"min_weight": 250.0, "rate": 150.0, "label": "+250 kg"},
    ]
    freight, rate, label, is_pivoted, savings = optimize_break_even_pivot(50.0, unsorted_tiers)
    assert rate == 220.0
    assert label == "+45 kg"


def test_finding_7_same_city_corridor_rejected():
    """Finding 7: Origin and destination airport cannot be identical."""
    with pytest.raises(ValueError, match="cannot be identical"):
        RateSearchRequest(
            origin="BOM",
            destination="BOM",
            actual_weight_kg=100.0,
        )


def test_finding_8_s3_storage_delete_file():
    """Finding 8: S3 storage service supports delete_file method."""
    assert hasattr(s3_storage_service, "delete_file")
    # If S3 is enabled in environment and upload succeeds, test real delete
    if s3_storage_service.is_enabled:
        uploaded = s3_storage_service.upload_json("uploads/test_del_unit.json", {"test": True})
        if uploaded:
            ok = s3_storage_service.delete_file("uploads/test_del_unit.json")
            assert ok is True


def test_finding_9_usd_currency_no_false_warning():
    """Finding 9: Non-INR currency should not trigger foreign currency warning for normal low rates."""
    _, _, _, _, _, warnings_usd, _, _ = validate_tariff_record_domain(
        destination="JFK",
        commodity="GCR",
        rate_basis="NET_NET_PLUS_PLUS",
        min_charge=50.0,
        rate_normal=3.5,
        rate_45=3.0,
        rate_100=2.5,
        rate_250=2.2,
        rate_300=2.0,
        rate_500=1.8,
        fsc_per_kg=0.5,
        ssc_per_kg=0.15,
        valid_from="2026-01-01",
        valid_to="2026-12-31",
        currency="USD",
    )
    assert not any("foreign currency" in w for w in warnings_usd)


def test_flexible_weight_entry_dimensions_only():
    """Verify quoting with only dimensions when actual_weight_kg is omitted."""
    from app.schemas.rate import CargoDimension
    from app.services.rate_engine import calculate_chargeable_weight, process_rate_search
    from app.data.tariffs import AIRLINE_TARIFFS

    # 1. Schema allows actual_weight_kg to be omitted if dimensions are provided
    dims = [CargoDimension(length_cm=60, width_cm=50, height_cm=40, pieces=2)]
    req = RateSearchRequest(
        origin="BOM",
        destination="DXB",
        dimensions=dims,
    )
    assert req.actual_weight_kg is None
    assert len(req.dimensions) == 1

    # 2. Chargeable weight correctly derived from dimensions (60x50x40x2 / 6000 = 40 kg)
    cw = calculate_chargeable_weight(req.actual_weight_kg, req.dimensions)
    assert cw == 40.0

    # 3. Rate search succeeds with dimensions only
    res = process_rate_search(req, AIRLINE_TARIFFS)
    assert res.chargeable_weight == 40.0
    assert len(res.rates) > 0


def test_flexible_weight_entry_validation_rejection():
    """Verify validation fails if neither actual_weight_kg nor dimensions are provided."""
    with pytest.raises(ValueError, match="Either actual scale weight"):
        RateSearchRequest(
            origin="BOM",
            destination="DXB",
        )

