import json
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
import pytest
from pydantic import ValidationError

from app.schemas.charge import (
    CalculationType,
    ChargeApplicability,
    ChargeCategory,
    ChargeRule,
    ChargeRuleBase,
    ChargeRuleCreate,
    ChargeRuleUpdate,
    CommodityScope,
    CorridorScope,
    CarrierScope,
)
from app.services.charges_service import ChargesService, DEFAULT_SEED_PATH


def test_default_charges_json_baseline_integrity():
    """
    Verifies that backend/data/default_charges.json contains the exact 7 verified
    baseline statutory & gateway charges with correct attributes.
    """
    assert DEFAULT_SEED_PATH.exists(), f"Seed file missing: {DEFAULT_SEED_PATH}"
    with open(DEFAULT_SEED_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)

    assert len(data) == 7
    rules = [ChargeRule(**item) for item in data]
    assert len(rules) == 7

    rule_by_code = {r.code: r for r in rules}
    expected_codes = {"XBC", "CTG", "RAC", "COL", "CGC", "CCC", "GST"}
    assert set(rule_by_code.keys()) == expected_codes

    # 1. XBC - Airport X-Ray Screening
    xbc = rule_by_code["XBC"]
    assert xbc.id == "chg_xray"
    assert xbc.category == ChargeCategory.TERMINAL
    assert xbc.calculation_type == CalculationType.PER_KG_WITH_MIN
    assert xbc.rate_per_kg == 3.50
    assert xbc.min_amount == 550.00
    assert xbc.is_statutory is True
    assert xbc.display_order == 1

    # 2. CTG - Terminal Handling & Carting
    ctg = rule_by_code["CTG"]
    assert ctg.id == "chg_carting"
    assert ctg.category == ChargeCategory.TERMINAL
    assert ctg.calculation_type == CalculationType.PER_KG_WITH_MIN
    assert ctg.rate_per_kg == 3.00
    assert ctg.min_amount == 500.00
    assert ctg.is_statutory is True
    assert ctg.display_order == 2

    # 3. RAC - Statutory DGR Physical Inspection
    rac = rule_by_code["RAC"]
    assert rac.id == "chg_dgr"
    assert rac.category == ChargeCategory.COMMODITY
    assert rac.calculation_type == CalculationType.FLAT
    assert rac.flat_amount == 3500.00
    assert rac.is_statutory is True
    assert rac.applicability.commodity_scope == CommodityScope.SPECIFIC_COMMODITIES
    assert "DGR" in rac.applicability.commodity_keywords

    # 4. COL - Cold Chain / Pharma CRT Handling
    col = rule_by_code["COL"]
    assert col.id == "chg_cold_chain"
    assert col.category == ChargeCategory.COMMODITY
    assert col.calculation_type == CalculationType.PER_KG_WITH_MIN
    assert col.rate_per_kg == 2.50
    assert col.min_amount == 1500.00
    assert col.is_statutory is False
    assert col.applicability.commodity_scope == CommodityScope.SPECIFIC_COMMODITIES
    assert "PHARMA" in col.applicability.commodity_keywords

    # 5. CGC - Electronic AWB Fee
    cgc = rule_by_code["CGC"]
    assert cgc.id == "chg_eawb"
    assert cgc.category == ChargeCategory.DOCUMENTATION
    assert cgc.calculation_type == CalculationType.FLAT
    assert cgc.flat_amount == 800.00
    assert cgc.is_statutory is False

    # 6. CCC - Customs Advance Manifest Fee (AMS)
    ccc = rule_by_code["CCC"]
    assert ccc.id == "chg_ams"
    assert ccc.category == ChargeCategory.CUSTOMS
    assert ccc.calculation_type == CalculationType.FLAT
    assert ccc.flat_amount == 950.00
    assert ccc.is_statutory is True
    assert ccc.applicability.corridor_scope == CorridorScope.SPECIFIC_COUNTRIES
    assert "US" in ccc.applicability.destination_codes
    assert "CA" in ccc.applicability.destination_codes
    assert "JFK" in ccc.applicability.destination_codes

    # 7. GST - Statutory Indian Air Export GST
    gst = rule_by_code["GST"]
    assert gst.id == "chg_gst"
    assert gst.category == ChargeCategory.STATUTORY_TAX
    assert gst.calculation_type == CalculationType.PERCENTAGE
    assert gst.percentage_rate == 5.0
    assert gst.is_statutory is True
    assert gst.display_order == 7


def test_service_initialization_from_seed(tmp_path):
    """
    Verifies that ChargesService automatically seeds config_path if it doesn't exist.
    """
    config_file = tmp_path / "charges_config.json"
    assert not config_file.exists()

    service = ChargesService(config_path=config_file, seed_path=DEFAULT_SEED_PATH)
    assert config_file.exists()

    charges = service.get_all_charges()
    assert len(charges) == 7
    # Verify sorted by display_order
    display_orders = [c.display_order for c in charges]
    assert display_orders == sorted(display_orders)


def test_service_fallback_when_seed_missing(tmp_path):
    """
    Verifies that ChargesService falls back gracefully to built-in baseline
    when neither config_path nor seed_path exists on disk.
    """
    config_file = tmp_path / "charges_config.json"
    dummy_seed = tmp_path / "non_existent_seed.json"

    service = ChargesService(config_path=config_file, seed_path=dummy_seed)
    assert config_file.exists()

    charges = service.get_all_charges()
    assert len(charges) == 7
    assert service.get_charge_by_id("chg_xray") is not None


def test_get_active_charges(tmp_path):
    """
    Verifies get_active_charges filters out inactive charges.
    """
    config_file = tmp_path / "charges_config.json"
    service = ChargesService(config_path=config_file, seed_path=DEFAULT_SEED_PATH)

    active_before = service.get_active_charges()
    assert len(active_before) == 7

    # Deactivate one charge
    service.update_charge("chg_eawb", ChargeRuleUpdate(is_active=False))

    all_charges = service.get_all_charges()
    assert len(all_charges) == 7

    active_after = service.get_active_charges()
    assert len(active_after) == 6
    assert all(c.id != "chg_eawb" for c in active_after)


def test_get_charge_by_id(tmp_path):
    """
    Verifies get_charge_by_id retrieves correct charge or None.
    """
    config_file = tmp_path / "charges_config.json"
    service = ChargesService(config_path=config_file, seed_path=DEFAULT_SEED_PATH)

    rule = service.get_charge_by_id("chg_ams")
    assert rule is not None
    assert rule.code == "CCC"
    assert rule.category == ChargeCategory.CUSTOMS

    non_existent = service.get_charge_by_id("chg_missing_123")
    assert non_existent is None


def test_create_custom_charge(tmp_path):
    """
    Verifies create_charge adds a new custom charge with proper ID, timestamps,
    and audit metadata.
    """
    config_file = tmp_path / "charges_config.json"
    service = ChargesService(config_path=config_file, seed_path=DEFAULT_SEED_PATH)

    new_charge_data = ChargeRuleCreate(
        code="WAR",
        name="Gulf War Risk Surcharge",
        description="Emergency insurance surcharge for Middle East corridors",
        category=ChargeCategory.OTHER,
        calculation_type=CalculationType.PER_KG_WITH_MIN,
        rate_per_kg=1.50,
        min_amount=300.0,
        applicability=ChargeApplicability(
            corridor_scope=CorridorScope.SPECIFIC_PORTS,
            destination_codes=["dxb", "auh", "doh"],
            commodity_scope=CommodityScope.ALL,
        ),
        is_active=True,
        is_statutory=False,
        display_order=8,
    )

    created = service.create_charge(new_charge_data, user="pricing.head@jfll.com")
    assert created.id.startswith("chg_custom_")
    assert created.code == "WAR"
    assert created.name == "Gulf War Risk Surcharge"
    assert created.rate_per_kg == 1.50
    assert created.min_amount == 300.0
    assert created.applicability.destination_codes == ["DXB", "AUH", "DOH"]
    assert created.updated_by == "pricing.head@jfll.com"
    assert created.created_at is not None
    assert created.updated_at is not None

    # Check persistence
    all_charges = service.get_all_charges()
    assert len(all_charges) == 8
    persisted = service.get_charge_by_id(created.id)
    assert persisted is not None
    assert persisted.name == "Gulf War Risk Surcharge"


def test_update_charge_partial(tmp_path):
    """
    Verifies partial update of charge rule attributes.
    """
    config_file = tmp_path / "charges_config.json"
    service = ChargesService(config_path=config_file, seed_path=DEFAULT_SEED_PATH)

    # Update X-Ray screening rates
    updated = service.update_charge(
        "chg_xray",
        ChargeRuleUpdate(rate_per_kg=4.25, min_amount=650.0),
        user="pricing.head@jfll.com",
    )
    assert updated is not None
    assert updated.rate_per_kg == 4.25
    assert updated.min_amount == 650.0
    assert updated.code == "XBC"  # unchanged
    assert updated.updated_by == "pricing.head@jfll.com"

    # Verify reloading from disk preserves the update
    reloaded_service = ChargesService(config_path=config_file, seed_path=DEFAULT_SEED_PATH)
    persisted = reloaded_service.get_charge_by_id("chg_xray")
    assert persisted.rate_per_kg == 4.25
    assert persisted.min_amount == 650.0

    # Non-existent update returns None
    result = service.update_charge("non_existent_id", ChargeRuleUpdate(name="Test"))
    assert result is None


def test_delete_custom_charge_vs_baseline(tmp_path):
    """
    Verifies deletion behavior:
    - Custom charges are permanently removed.
    - Baseline / statutory charges are deactivated (is_active = False).
    """
    config_file = tmp_path / "charges_config.json"
    service = ChargesService(config_path=config_file, seed_path=DEFAULT_SEED_PATH)

    # 1. Create a custom charge
    custom = service.create_charge(
        ChargeRuleCreate(
            code="TMP",
            name="Temporary Handling",
            category=ChargeCategory.OTHER,
            calculation_type=CalculationType.FLAT,
            flat_amount=500.0,
        )
    )
    assert len(service.get_all_charges()) == 8

    # 2. Delete the custom charge (hard delete)
    assert service.delete_charge(custom.id) is True
    assert len(service.get_all_charges()) == 7
    assert service.get_charge_by_id(custom.id) is None

    # 3. Delete baseline charge (soft deactivate)
    assert service.delete_charge("chg_carting") is True
    # Still exists in all_charges
    all_charges = service.get_all_charges()
    assert len(all_charges) == 7
    ctg = service.get_charge_by_id("chg_carting")
    assert ctg is not None
    assert ctg.is_active is False
    # Filtered out of active
    assert all(c.id != "chg_carting" for c in service.get_active_charges())

    # 4. Delete non-existent charge returns False
    assert service.delete_charge("ghost_id") is False


def test_reset_to_defaults(tmp_path):
    """
    Verifies reset_to_defaults wipes custom additions and resets baseline charges.
    """
    config_file = tmp_path / "charges_config.json"
    service = ChargesService(config_path=config_file, seed_path=DEFAULT_SEED_PATH)

    # Add custom charge
    service.create_charge(
        ChargeRuleCreate(
            code="XYZ",
            name="Custom XYZ",
            category=ChargeCategory.OTHER,
            calculation_type=CalculationType.FLAT,
            flat_amount=100.0,
        )
    )
    # Modify baseline charge
    service.update_charge("chg_xray", ChargeRuleUpdate(rate_per_kg=99.0))
    assert len(service.get_all_charges()) == 8
    assert service.get_charge_by_id("chg_xray").rate_per_kg == 99.0

    # Reset
    reset_list = service.reset_to_defaults()
    assert len(reset_list) == 7
    assert service.get_charge_by_id("chg_xray").rate_per_kg == 3.50
    assert service.get_charge_by_id("XYZ") is None


def test_atomic_persistence_and_concurrent_writes(tmp_path):
    """
    Tests thread-safe concurrent writes and verifies file integrity.
    """
    config_file = tmp_path / "charges_config.json"
    service = ChargesService(config_path=config_file, seed_path=DEFAULT_SEED_PATH)

    def worker(i: int):
        new_charge = ChargeRuleCreate(
            code=f"C{i:02d}",
            name=f"Concurrent Charge {i}",
            category=ChargeCategory.OTHER,
            calculation_type=CalculationType.FLAT,
            flat_amount=float(i * 10),
            display_order=10 + i,
        )
        return service.create_charge(new_charge, user=f"worker_{i}")

    with ThreadPoolExecutor(max_workers=8) as executor:
        results = list(executor.map(worker, range(20)))

    assert len(results) == 20
    all_charges = service.get_all_charges()
    # 7 baseline + 20 created = 27
    assert len(all_charges) == 27

    # Verify file is valid JSON and readable directly
    with open(config_file, "r", encoding="utf-8") as f:
        data = json.load(f)
    assert len(data) == 27


def test_schema_validations():
    """
    Verifies Pydantic schema validation rules.
    """
    # 1. Code auto-uppercasing
    rule = ChargeRuleBase(
        code="xbc",
        name="Test",
        category=ChargeCategory.TERMINAL,
        calculation_type=CalculationType.FLAT,
    )
    assert rule.code == "XBC"

    # 2. Applicability code normalization
    app = ChargeApplicability(
        destination_codes=["jfk", " ord "],
        commodity_keywords=["dgr ", " pharma"],
        carrier_codes=["ey", "ek "],
    )
    assert app.destination_codes == ["JFK", "ORD"]
    assert app.commodity_keywords == ["DGR", "PHARMA"]
    assert app.carrier_codes == ["EY", "EK"]

    # 3. Negative rate validation
    with pytest.raises(ValidationError):
        ChargeRuleBase(
            code="NEG",
            name="Negative Rate",
            category=ChargeCategory.TERMINAL,
            calculation_type=CalculationType.PER_KG_WITH_MIN,
            rate_per_kg=-5.0,
        )

    # 4. Invalid calculation type
    with pytest.raises(ValidationError):
        ChargeRuleBase(
            code="INV",
            name="Invalid Calc",
            category=ChargeCategory.TERMINAL,
            calculation_type="UNKNOWN_FORMULA",  # type: ignore
        )
