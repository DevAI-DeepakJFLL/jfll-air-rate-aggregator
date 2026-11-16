import io
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.core.config import settings

client = TestClient(app)

ADMIN_KEY = settings.ADMIN_API_KEY


def test_get_tariff_registry():
    """Verify that the carrier registry returns known ex-BOM carriers."""
    response = client.get("/api/v1/tariffs/registry")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 10
    codes = [c["carrier_code"] for c in data]
    for required in ["AI", "EY", "WY", "EK", "QR", "SV", "6E", "MH", "ET", "D7"]:
        assert required in codes


def test_get_carrier_rates_known():
    """Verify that rates endpoint returns corridors for known carrier."""
    response = client.get("/api/v1/tariffs/EY/rates")
    assert response.status_code == 200
    data = response.json()
    assert data["carrier_code"] == "EY"
    assert data["carrier_name"] == "Etihad Airways"
    assert data["total_corridors"] > 0
    assert len(data["rates"]) > 0


def test_get_carrier_rates_not_found():
    """Verify that rates endpoint returns 404 for unknown carrier."""
    response = client.get("/api/v1/tariffs/UNKNOWN_AIRLINE/rates")
    assert response.status_code == 404


def test_upload_rate_sheet_with_carrier_code():
    """Verify PDF upload bound to carrier code."""
    import pypdf
    writer = pypdf.PdfWriter()
    writer.add_blank_page(width=72, height=72)
    buf = io.BytesIO()
    writer.write(buf)
    pdf_bytes = buf.getvalue()

    file_tuple = ("AI_BOM_Q1.pdf", pdf_bytes, "application/pdf")

    headers = {"X-Admin-Key": ADMIN_KEY}
    response = client.post(
        "/api/v1/tariffs/upload",
        data={"carrier_code": "AI", "currency": "INR"},
        files={"file": file_tuple},
        headers=headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["carrier_code"] == "AI"
    assert data["filename"] == "AI_BOM_Q1.pdf"
    assert data["registry_status"]["has_active_circular"] is True


def test_delete_carrier_circular_rbac():
    """Verify delete circular requires PRICING_HEAD role."""
    # 1. Unauthenticated -> 401
    resp_unauth = client.delete("/api/v1/tariffs/AI")
    assert resp_unauth.status_code == 401

    # 2. Authenticated as COORDINATOR -> 403 Forbidden
    headers_coord = {
        "X-Admin-Key": ADMIN_KEY,
        "X-Admin-Role": "COORDINATOR",
    }
    resp_coord = client.delete("/api/v1/tariffs/AI", headers=headers_coord)
    assert resp_coord.status_code == 403

    # 3. Authenticated as PRICING_HEAD -> 200 OK
    headers_head = {
        "X-Admin-Key": ADMIN_KEY,
        "X-Admin-Role": "PRICING_HEAD",
    }
    resp_head = client.delete("/api/v1/tariffs/AI", headers=headers_head)
    assert resp_head.status_code == 200
    data = resp_head.json()
    assert data["success"] is True
    assert data["carrier"]["has_active_circular"] is False
    assert data["carrier"]["total_corridors"] == 0

    # Rates for AI should now be empty (0 active routes, no fallback baseline)
    rates_resp = client.get("/api/v1/tariffs/AI/rates")
    assert rates_resp.status_code == 200
    rates_data = rates_resp.json()
    assert rates_data["total_corridors"] == 0
    assert len(rates_data["rates"]) == 0


def test_carrier_no_circular_returns_empty_rates():
    """Verify that a carrier without an active circular returns 0 corridors and no synthetic rates."""
    resp = client.get("/api/v1/tariffs/SV/rates")
    assert resp.status_code == 200
    data = resp.json()
    assert data["carrier_code"] == "SV"
    assert data["total_corridors"] == 0
    assert len(data["rates"]) == 0
