import os
import tempfile
import pytest
from pydantic import ValidationError
from fastapi.testclient import TestClient
from app.main import app
from app.schemas.rate import RateSearchRequest, CargoDimension
from app.services.pdf_extractor import validate_pdf_file_signature, extract_text_from_pdf
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
    """Security: /tariffs/upload endpoint accepts requests with valid X-Admin-Key."""
    import io
    import pypdf
    writer = pypdf.PdfWriter()
    writer.add_blank_page(width=72, height=72)
    buf = io.BytesIO()
    writer.write(buf)
    valid_pdf_bytes = buf.getvalue()

    files = {"file": ("test.pdf", valid_pdf_bytes, "application/pdf")}
    data = {"airline_name": "Test Airlines", "currency": "INR"}
    headers = {"X-Admin-Key": settings.ADMIN_API_KEY}

    res = client.post("/api/v1/tariffs/upload", files=files, data=data, headers=headers)
    assert res.status_code == 200
    assert res.json()["status"] == "STAGED_FOR_ADMIN_REVIEW"


def test_security_headers_present():
    """Security: Verifies defense-in-depth HTTP security headers."""
    res = client.get("/")
    assert res.status_code == 200
    assert res.headers.get("X-Content-Type-Options") == "nosniff"
    assert res.headers.get("X-Frame-Options") == "DENY"
    assert res.headers.get("Referrer-Policy") == "strict-origin-when-cross-origin"
    assert "camera=()" in res.headers.get("Permissions-Policy", "")
