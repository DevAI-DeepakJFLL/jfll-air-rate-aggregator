from pathlib import Path
import pytest
from fastapi.testclient import TestClient

from app.api.v1.endpoints.charges import get_charges_service
from app.core.config import settings
from app.core.security import Role, verify_admin_key
from app.main import app
from app.services.charges_service import ChargesService, DEFAULT_SEED_PATH


@pytest.fixture
def isolated_client(tmp_path: Path):
    """
    Provides an isolated FastAPI TestClient with its own temporary
    charges_config.json file so tests never touch production storage.
    """
    temp_config = tmp_path / "charges_config.json"
    service = ChargesService(config_path=temp_config, seed_path=DEFAULT_SEED_PATH)

    app.dependency_overrides[get_charges_service] = lambda: service

    with TestClient(app) as client:
        yield client, service

    app.dependency_overrides.clear()


# ============================================================================
# 1. Authentication & 401 Unauthorized Checks
# ============================================================================

def test_unauthenticated_requests_fail_with_401(isolated_client):
    """
    Security: All charges endpoints require a valid X-Admin-Key header.
    Unauthenticated requests or invalid keys must return HTTP 401.
    """
    client, _ = isolated_client

    endpoints = [
        ("GET", "/api/v1/charges"),
        ("GET", "/api/v1/charges/chg_xray"),
        ("POST", "/api/v1/charges"),
        ("PUT", "/api/v1/charges/chg_xray"),
        ("DELETE", "/api/v1/charges/chg_xray"),
        ("POST", "/api/v1/charges/reset-defaults"),
    ]

    for method, path in endpoints:
        # Request with missing X-Admin-Key header
        if method == "GET":
            res = client.get(path)
        elif method == "POST":
            res = client.post(path, json={})
        elif method == "PUT":
            res = client.put(path, json={})
        elif method == "DELETE":
            res = client.delete(path)

        assert res.status_code == 401, f"{method} {path} should return 401 without key"
        assert "Valid X-Admin-Key header required" in res.json()["detail"]
        assert res.headers.get("WWW-Authenticate") == "ApiKey"

        # Request with invalid X-Admin-Key header
        bad_headers = {"X-Admin-Key": "completely-invalid-key-xyz"}
        if method == "GET":
            res = client.get(path, headers=bad_headers)
        elif method == "POST":
            res = client.post(path, json={}, headers=bad_headers)
        elif method == "PUT":
            res = client.put(path, json={}, headers=bad_headers)
        elif method == "DELETE":
            res = client.delete(path, headers=bad_headers)

        assert res.status_code == 401, f"{method} {path} should return 401 with bad key"
        assert "Valid X-Admin-Key header required" in res.json()["detail"]


# ============================================================================
# 2. Pricing Coordinator Role (Read Allowed, Write Denied with 403)
# ============================================================================

def test_coordinator_role_can_read_charges(isolated_client):
    """
    RBAC: Pricing Coordinators (X-Admin-Role: COORDINATOR) have read-only access.
    Can list all charges, filter active charges, and inspect individual charges.
    """
    client, _ = isolated_client
    headers = {
        "X-Admin-Key": settings.ADMIN_API_KEY,
        "X-Admin-Role": Role.COORDINATOR.value,
        "X-Admin-User": "coordinator.analyst@jfll.com",
    }

    # 1. List all charges
    res = client.get("/api/v1/charges", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert len(data) == 7
    codes = [item["code"] for item in data]
    assert "XBC" in codes
    assert "GST" in codes

    # 2. Filter active charges
    res_active = client.get("/api/v1/charges?active_only=true", headers=headers)
    assert res_active.status_code == 200
    assert len(res_active.json()) == 7

    # 3. Get single charge
    res_single = client.get("/api/v1/charges/chg_xray", headers=headers)
    assert res_single.status_code == 200
    single = res_single.json()
    assert single["id"] == "chg_xray"
    assert single["code"] == "XBC"
    assert single["rate_per_kg"] == 3.50


def test_coordinator_role_forbidden_from_write_operations(isolated_client):
    """
    RBAC: Pricing Coordinators (X-Admin-Role: COORDINATOR) are blocked from mutating
    statutory or gateway charges. Must return HTTP 403 Forbidden.
    """
    client, _ = isolated_client
    headers = {
        "X-Admin-Key": settings.ADMIN_API_KEY,
        "X-Admin-Role": "COORDINATOR",
        "X-Admin-User": "coordinator.analyst@jfll.com",
    }

    create_payload = {
        "code": "TEST",
        "name": "Test Charge",
        "category": "TERMINAL",
        "calculation_type": "FLAT",
        "flat_amount": 500.0,
    }

    # 1. POST /api/v1/charges -> 403 Forbidden
    res_create = client.post("/api/v1/charges", json=create_payload, headers=headers)
    assert res_create.status_code == 403
    assert res_create.json()["detail"] == "Operation restricted to Pricing Team Head."

    # 2. PUT /api/v1/charges/chg_xray -> 403 Forbidden
    res_update = client.put(
        "/api/v1/charges/chg_xray", json={"rate_per_kg": 4.0}, headers=headers
    )
    assert res_update.status_code == 403
    assert res_update.json()["detail"] == "Operation restricted to Pricing Team Head."

    # 3. DELETE /api/v1/charges/chg_xray -> 403 Forbidden
    res_delete = client.delete("/api/v1/charges/chg_xray", headers=headers)
    assert res_delete.status_code == 403
    assert res_delete.json()["detail"] == "Operation restricted to Pricing Team Head."

    # 4. POST /api/v1/charges/reset-defaults -> 403 Forbidden
    res_reset = client.post("/api/v1/charges/reset-defaults", headers=headers)
    assert res_reset.status_code == 403
    assert res_reset.json()["detail"] == "Operation restricted to Pricing Team Head."


# ============================================================================
# 3. Pricing Head Role (Full CRUD & Administration)
# ============================================================================

def test_pricing_head_role_can_create_update_and_delete_custom_charge(isolated_client):
    """
    RBAC: Pricing Team Head (X-Admin-Role: PRICING_HEAD) has full write privileges:
    Create custom charge, update parameters, and permanently delete custom charge.
    Audit attribution is recorded using X-Admin-User.
    """
    client, _ = isolated_client
    head_headers = {
        "X-Admin-Key": settings.ADMIN_API_KEY,
        "X-Admin-Role": "PRICING_HEAD",
        "X-Admin-User": "pricing.head@jfll.com",
    }

    # 1. Create custom charge
    new_charge_payload = {
        "code": "XPU",
        "name": "Export Off-Airport CFS Transfer",
        "description": "CFS transfer charge to BOM airside terminal",
        "category": "TERMINAL",
        "calculation_type": "PER_KG_WITH_MIN",
        "rate_per_kg": 1.75,
        "min_amount": 350.00,
        "applicability": {
            "corridor_scope": "GLOBAL",
            "destination_codes": [],
            "commodity_scope": "ALL",
            "commodity_keywords": [],
            "carrier_scope": "ALL",
            "carrier_codes": [],
        },
        "is_active": True,
        "is_statutory": False,
        "display_order": 8,
    }

    res_create = client.post("/api/v1/charges", json=new_charge_payload, headers=head_headers)
    assert res_create.status_code == 201
    created_charge = res_create.json()
    created_id = created_charge["id"]
    assert created_id.startswith("chg_custom_")
    assert created_charge["code"] == "XPU"
    assert created_charge["rate_per_kg"] == 1.75
    assert created_charge["min_amount"] == 350.00
    assert created_charge["updated_by"] == "pricing.head@jfll.com"

    # Verify listing now has 8 charges
    res_list = client.get("/api/v1/charges", headers=head_headers)
    assert res_list.status_code == 200
    assert len(res_list.json()) == 8

    # 2. Update the custom charge
    update_payload = {
        "rate_per_kg": 2.25,
        "min_amount": 450.00,
        "description": "Updated CFS transfer rate ex-BOM",
    }
    res_update = client.put(f"/api/v1/charges/{created_id}", json=update_payload, headers=head_headers)
    assert res_update.status_code == 200
    updated_charge = res_update.json()
    assert updated_charge["rate_per_kg"] == 2.25
    assert updated_charge["min_amount"] == 450.00
    assert updated_charge["description"] == "Updated CFS transfer rate ex-BOM"
    assert updated_charge["updated_by"] == "pricing.head@jfll.com"

    # 3. Delete the custom charge (purges from persistence)
    res_delete = client.delete(f"/api/v1/charges/{created_id}", headers=head_headers)
    assert res_delete.status_code == 200
    assert res_delete.json() == {"status": "deleted", "charge_id": created_id}

    # Verify charge is completely gone (404)
    res_get_deleted = client.get(f"/api/v1/charges/{created_id}", headers=head_headers)
    assert res_get_deleted.status_code == 404

    # Verify list is back to 7
    res_list_after = client.get("/api/v1/charges", headers=head_headers)
    assert len(res_list_after.json()) == 7


def test_pricing_head_deactivates_baseline_charge(isolated_client):
    """
    RBAC: Deleting a baseline charge deactivates it (is_active = False) rather than
    purging it, ensuring operational safety and historical integrity.
    """
    client, _ = isolated_client
    headers = {
        "X-Admin-Key": settings.ADMIN_API_KEY,
        "X-Admin-Role": "PRICING_HEAD",
        "X-Admin-User": "lead.pricing@jfll.com",
    }

    # Delete baseline charge chg_carting
    res_del = client.delete("/api/v1/charges/chg_carting", headers=headers)
    assert res_del.status_code == 200
    assert res_del.json() == {"status": "deleted", "charge_id": "chg_carting"}

    # Still present in all charges, but is_active is False
    res_get = client.get("/api/v1/charges/chg_carting", headers=headers)
    assert res_get.status_code == 200
    assert res_get.json()["is_active"] is False
    assert res_get.json()["updated_by"] == "lead.pricing@jfll.com"

    # Excluded from active_only filter
    res_active = client.get("/api/v1/charges?active_only=true", headers=headers)
    assert res_active.status_code == 200
    active_ids = [c["id"] for c in res_active.json()]
    assert "chg_carting" not in active_ids
    assert len(active_ids) == 6


def test_pricing_head_reset_to_defaults(isolated_client):
    """
    RBAC: Pricing Team Head can restore default baseline MIAL tariffs.
    Deactivated charges are reactivated, and custom charges are removed.
    """
    client, _ = isolated_client
    headers = {
        "X-Admin-Key": settings.ADMIN_API_KEY,
        "X-Admin-Role": "PRICING_HEAD",
    }

    # 1. Deactivate a baseline charge
    client.delete("/api/v1/charges/chg_xray", headers=headers)

    # 2. Add a custom charge
    client.post(
        "/api/v1/charges",
        json={
            "code": "TMP",
            "name": "Temporary Charge",
            "category": "OTHER",
            "calculation_type": "FLAT",
            "flat_amount": 100.0,
        },
        headers=headers,
    )

    # List now has 8 charges (1 inactive baseline, 1 custom)
    res_before = client.get("/api/v1/charges", headers=headers)
    assert len(res_before.json()) == 8

    # 3. Call reset-defaults
    res_reset = client.post("/api/v1/charges/reset-defaults", headers=headers)
    assert res_reset.status_code == 200
    charges = res_reset.json()
    assert len(charges) == 7

    # Verify chg_xray is back to active
    xray = next(c for c in charges if c["id"] == "chg_xray")
    assert xray["is_active"] is True


# ============================================================================
# 4. Defaults & Header Normalization
# ============================================================================

def test_default_role_and_user_fallback(isolated_client):
    """
    Tests default behavior when X-Admin-Role and X-Admin-User are omitted:
    - X-Admin-Role defaults to COORDINATOR (Principle of Least Privilege).
    - Unprivileged coordinator is blocked from writing (403 Forbidden).
    - Coordinator can safely read active charges (200 OK).
    - Supplying explicit PRICING_HEAD role with omitted user records default user deepak.naidu@jfll.com.
    """
    client, _ = isolated_client
    headers = {"X-Admin-Key": settings.ADMIN_API_KEY}

    # 1. Read is permitted under default COORDINATOR role
    read_res = client.get("/api/v1/charges", headers=headers)
    assert read_res.status_code == 200

    # 2. Write is blocked under default COORDINATOR role (Least Privilege)
    res_blocked = client.post(
        "/api/v1/charges",
        json={
            "code": "DEF",
            "name": "Default Header Charge",
            "category": "OTHER",
            "calculation_type": "FLAT",
            "flat_amount": 200.0,
        },
        headers=headers,
    )
    assert res_blocked.status_code == 403

    # 3. Explicit PRICING_HEAD succeeds and adopts default user deepak.naidu@jfll.com
    headers_head = {
        "X-Admin-Key": settings.ADMIN_API_KEY,
        "X-Admin-Role": Role.PRICING_HEAD.value,
    }
    res_success = client.post(
        "/api/v1/charges",
        json={
            "code": "DEF",
            "name": "Default Header Charge",
            "category": "OTHER",
            "calculation_type": "FLAT",
            "flat_amount": 200.0,
        },
        headers=headers_head,
    )
    assert res_success.status_code == 201
    created = res_success.json()
    assert created["updated_by"] == "deepak.naidu@jfll.com"


def test_header_case_insensitivity_and_whitespace(isolated_client):
    """
    Ensures role header handles case-insensitivity and extra whitespace properly:
    - 'coordinator ' -> COORDINATOR (write blocked)
    - ' pricing_head ' -> PRICING_HEAD (write allowed)
    """
    client, _ = isolated_client

    coord_headers = {
        "X-Admin-Key": settings.ADMIN_API_KEY,
        "X-Admin-Role": "  coordinator  ",
    }
    res_coord = client.post(
        "/api/v1/charges",
        json={"code": "FOO", "name": "Foo", "category": "OTHER", "calculation_type": "FLAT"},
        headers=coord_headers,
    )
    assert res_coord.status_code == 403

    head_headers = {
        "X-Admin-Key": settings.ADMIN_API_KEY,
        "X-Admin-Role": "  pricing_head  ",
    }
    res_head = client.post(
        "/api/v1/charges",
        json={"code": "BAR", "name": "Bar", "category": "OTHER", "calculation_type": "FLAT", "flat_amount": 50.0},
        headers=head_headers,
    )
    assert res_head.status_code == 201


def test_unrecognized_role_falls_back_to_coordinator(isolated_client):
    """
    Security RBAC: If an unknown/unrecognized role is supplied (e.g., SUPER_ADMIN, GUEST),
    it safely defaults to COORDINATOR (least privilege), blocking write operations.
    """
    client, _ = isolated_client
    unrecognized_headers = {
        "X-Admin-Key": settings.ADMIN_API_KEY,
        "X-Admin-Role": "SUPER_ADMIN",
    }
    res = client.post(
        "/api/v1/charges",
        json={"code": "FOO", "name": "Foo", "category": "OTHER", "calculation_type": "FLAT"},
        headers=unrecognized_headers,
    )
    assert res.status_code == 403
    assert "Operation restricted to Pricing Team Head" in res.json()["detail"]


# ============================================================================
# 5. Error Handling: 404 Not Found & 422 Unprocessable Entity
# ============================================================================

def test_not_found_on_nonexistent_charge_id(isolated_client):
    """
    Verifies that GET, PUT, and DELETE on non-existent charge IDs return 404 Not Found.
    """
    client, _ = isolated_client
    headers = {
        "X-Admin-Key": settings.ADMIN_API_KEY,
        "X-Admin-Role": "PRICING_HEAD",
    }

    # GET nonexistent
    res_get = client.get("/api/v1/charges/chg_unknown_9999", headers=headers)
    assert res_get.status_code == 404
    assert "not found" in res_get.json()["detail"].lower()

    # PUT nonexistent
    res_put = client.put(
        "/api/v1/charges/chg_unknown_9999",
        json={"rate_per_kg": 5.0},
        headers=headers,
    )
    assert res_put.status_code == 404

    # DELETE nonexistent
    res_del = client.delete("/api/v1/charges/chg_unknown_9999", headers=headers)
    assert res_del.status_code == 404


def test_payload_validation_rejects_malformed_requests(isolated_client):
    """
    Verifies Pydantic schema validation returns HTTP 422 for malformed payloads.
    """
    client, _ = isolated_client
    headers = {
        "X-Admin-Key": settings.ADMIN_API_KEY,
        "X-Admin-Role": "PRICING_HEAD",
    }

    # 1. Missing required fields (code, name, category, calculation_type)
    res_empty = client.post("/api/v1/charges", json={}, headers=headers)
    assert res_empty.status_code == 422

    # 2. Invalid category
    res_bad_cat = client.post(
        "/api/v1/charges",
        json={
            "code": "BAD",
            "name": "Bad Category",
            "category": "INVALID_CAT",
            "calculation_type": "FLAT",
        },
        headers=headers,
    )
    assert res_bad_cat.status_code == 422

    # 3. Negative rate_per_kg
    res_neg_rate = client.post(
        "/api/v1/charges",
        json={
            "code": "NEG",
            "name": "Negative Rate",
            "category": "TERMINAL",
            "calculation_type": "PER_KG_WITH_MIN",
            "rate_per_kg": -10.0,
        },
        headers=headers,
    )
    assert res_neg_rate.status_code == 422


# ============================================================================
# 6. Backward Compatibility for verify_admin_key
# ============================================================================

def test_verify_admin_key_backward_compatibility():
    """
    Verifies that legacy verify_admin_key dependency used by tariffs ingestion
    remains completely functional and rejects invalid keys.
    """
    import asyncio

    # Valid key returns True
    res = asyncio.run(verify_admin_key(api_key=settings.ADMIN_API_KEY))
    assert res is True

    # Invalid key raises HTTPException 401
    from fastapi import HTTPException
    with pytest.raises(HTTPException) as exc_info:
        asyncio.run(verify_admin_key(api_key="wrong-key"))
    assert exc_info.value.status_code == 401
    assert "tariff ingestion" in exc_info.value.detail
