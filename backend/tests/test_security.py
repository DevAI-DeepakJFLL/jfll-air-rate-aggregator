import os
import tempfile
import pytest
from pydantic import ValidationError
from fastapi.testclient import TestClient
from app.main import app
from app.schemas.rate import RateSearchRequest, CargoDimension
from app.services.pdf_extractor import validate_pdf_file_signature
from app.core.config import settings

client = TestClient(app)


def test_schema_rejects_malformed_iata_codes():
    """Security: Enforces ^[A-Za-z]{3}$ pattern against SQLi/injection attempts."""
    # Valid
    req = RateSearchRequest(origin="BOM", destination="DXB", actual_weight_kg=100.0)
    assert req.origin == "BOM"

    # Invalid: Numbers, symbols, script tags
    with pytest.raises(ValidationError):
        RateSearchRequest(origin="123", destination="DXB", actual_weight_kg=100.0)

    with pytest.raises(ValidationError):
        RateSearchRequest(origin="B'M", destination="DXB", actual_weight_kg=100.0)

    with pytest.raises(ValidationError):
        RateSearchRequest(origin="BOM", destination="<script>", actual_weight_kg=100.0)


def test_schema_bounds_package_dimensions_to_mitigate_dos():
    """Security: Enforces max 100 dimensions items to prevent CPU/memory exhaustion."""
    excessive_dims = [
        CargoDimension(length_cm=10, width_cm=10, height_cm=10, pieces=1)
        for _ in range(101)
    ]
    with pytest.raises(ValidationError):
        RateSearchRequest(
            origin="BOM",
            destination="DXB",
            actual_weight_kg=100.0,
            dimensions=excessive_dims
        )


def test_schema_bounds_scale_gross_weight():
    """Security: Enforces upper bound of 5,000 kg on scale input."""
    with pytest.raises(ValidationError):
        RateSearchRequest(
            origin="BOM",
            destination="DXB",
            actual_weight_kg=10000.0
        )


def test_pdf_magic_byte_validation():
    """Security: Blocks non-PDF files disguised with .pdf extension."""
    with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as f:
        f.write(b"NOT_A_REAL_PDF_FILE_HEADER")
        f_path = f.name

    try:
        with pytest.raises(ValueError, match="%PDF- magic signature"):
            validate_pdf_file_signature(f_path)
    finally:
        if os.path.exists(f_path):
            os.remove(f_path)


def test_admin_upload_endpoint_requires_auth():
    """Security: /tariffs/upload endpoint must reject unauthenticated requests."""
    fake_pdf = b"%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF"
    files = {"file": ("test.pdf", fake_pdf, "application/pdf")}
    data = {"airline_name": "Test Airlines", "currency": "INR"}

    # Request without X-Admin-Key should be rejected with 401
    res = client.post("/api/v1/tariffs/upload", files=files, data=data)
    assert res.status_code == 401
    assert "Valid X-Admin-Key" in res.json()["detail"]


def test_admin_upload_endpoint_accepts_valid_auth():
    """Security: /tariffs/upload endpoint accepts requests with valid X-Admin-Key and PRICING_HEAD role."""
    import io
    import pypdf
    writer = pypdf.PdfWriter()
    writer.add_blank_page(width=72, height=72)
    buf = io.BytesIO()
    writer.write(buf)
    valid_pdf_bytes = buf.getvalue()

    files = {"file": ("test.pdf", valid_pdf_bytes, "application/pdf")}
    data = {"airline_name": "Test Airlines", "currency": "INR"}

    # 1. Unprivileged COORDINATOR attempt is rejected with 403 Forbidden
    headers_coord = {
        "X-Admin-Key": settings.ADMIN_API_KEY,
        "X-Admin-Role": "COORDINATOR",
    }
    res_coord = client.post("/api/v1/tariffs/upload", files=files, data=data, headers=headers_coord)
    assert res_coord.status_code == 403

    # 2. PRICING_HEAD authorization succeeds with 200 OK
    headers_head = {
        "X-Admin-Key": settings.ADMIN_API_KEY,
        "X-Admin-Role": "PRICING_HEAD",
    }
    files_head = {"file": ("test.pdf", valid_pdf_bytes, "application/pdf")}
    res_head = client.post("/api/v1/tariffs/upload", files=files_head, data=data, headers=headers_head)
    assert res_head.status_code == 200
    assert res_head.json()["status"] == "STAGED_FOR_ADMIN_REVIEW"

    # 3. Dedicated COORDINATOR key cannot self-escalate by claiming PRICING_HEAD role
    headers_spoof = {
        "X-Admin-Key": settings.COORDINATOR_API_KEY,
        "X-Admin-Role": "PRICING_HEAD",
    }
    files_spoof = {"file": ("test.pdf", valid_pdf_bytes, "application/pdf")}
    res_spoof = client.post("/api/v1/tariffs/upload", files=files_spoof, data=data, headers=headers_spoof)
    assert res_spoof.status_code == 403
    assert "Operation restricted to Pricing Team Head" in res_spoof.json()["detail"]


def test_cors_origin_restriction():
    """Security: Verifies CORS policy restricts origins to configured endpoints."""
    # Origin in allowed list
    res_allowed = client.options(
        "/api/v1/rates/destinations",
        headers={
            "Origin": "http://localhost:3000",
            "Access-Control-Request-Method": "GET",
        },
    )
    assert res_allowed.headers.get("access-control-allow-origin") == "http://localhost:3000"

    # Origin not in allowed list
    res_disallowed = client.options(
        "/api/v1/rates/destinations",
        headers={
            "Origin": "https://malicious-external-site.com",
            "Access-Control-Request-Method": "GET",
        },
    )
    assert res_disallowed.headers.get("access-control-allow-origin") != "https://malicious-external-site.com"


def test_security_headers_present():
    """Security: Verifies defense-in-depth HTTP security headers."""
    res = client.get("/")
    assert res.status_code == 200
    assert res.headers.get("X-Content-Type-Options") == "nosniff"
    assert res.headers.get("X-Frame-Options") == "DENY"
    assert res.headers.get("Referrer-Policy") == "strict-origin-when-cross-origin"
    assert "camera=()" in res.headers.get("Permissions-Policy", "")
