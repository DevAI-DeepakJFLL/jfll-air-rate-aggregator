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
    """Verify PDF upload bound to carrier code enforces PRICING_HEAD RBAC."""
    import pypdf
    writer = pypdf.PdfWriter()
    writer.add_blank_page(width=72, height=72)
    buf = io.BytesIO()
    writer.write(buf)
    pdf_bytes = buf.getvalue()

    file_tuple = ("AI_BOM_Q1.pdf", pdf_bytes, "application/pdf")

    # 1. Unprivileged coordinator upload returns 403 Forbidden
    headers_coord = {"X-Admin-Key": ADMIN_KEY, "X-Admin-Role": "COORDINATOR"}
    res_coord = client.post(
        "/api/v1/tariffs/upload",
        data={"carrier_code": "AI", "currency": "INR"},
        files={"file": file_tuple},
        headers=headers_coord,
    )
    assert res_coord.status_code == 403

    # 2. PRICING_HEAD upload succeeds with 200 OK
    headers_head = {"X-Admin-Key": ADMIN_KEY, "X-Admin-Role": "PRICING_HEAD"}
    response = client.post(
        "/api/v1/tariffs/upload",
        data={"carrier_code": "AI", "currency": "INR"},
        files={"file": file_tuple},
        headers=headers_head,
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


def test_parse_rate_number_comma_and_placeholders():
    """Verify that parse_rate_number correctly strips commas and handles placeholders."""
    from app.services.pdf_extractor import parse_rate_number
    assert parse_rate_number("18,800") == 18800.0
    assert parse_rate_number("1,035.50") == 1035.5
    assert parse_rate_number(" 20,400 ") == 20400.0
    assert parse_rate_number("-") is None
    assert parse_rate_number("--") is None
    assert parse_rate_number("N/A") is None
    assert parse_rate_number(None) is None


def test_unroll_destinations_slashes_and_brackets():
    """Verify unrolling compound destination strings with slashes and parens."""
    from app.services.pdf_extractor import unroll_destinations
    assert unroll_destinations("MCT/AMM/BAH/CAI/") == ["MCT", "AMM", "BAH", "CAI"]
    assert unroll_destinations("JED/MED") == ["JED", "MED"]
    assert unroll_destinations("CGK (JKT)") == ["CGK"]
    assert unroll_destinations("CDG/FRA/IST/LHR/MUC/MXP/FCO/AMS") == [
        "CDG", "FRA", "IST", "LHR", "MUC", "MXP", "FCO", "AMS"
    ]


def test_multi_commodity_regex_matches_without_column_shift():
    """Verify multi-word commodities match and do not displace numeric columns."""
    from app.services.pdf_extractor import MULTI_COMMODITY_REGEX
    matches = [
        "COL ( 2 to 8 degree)",
        "CRT(15 to 25 degree)",
        "DGR - PAX",
        "PILA - CRT",
        "AXS-COL / DG PAX / AXM",
        "GCR - Offline Tariff",
    ]
    for text in matches:
        m = MULTI_COMMODITY_REGEX.search(text)
        assert m is not None, f"Failed to match commodity in: {text}"


@pytest.mark.anyio
async def test_scanned_pdf_heuristic_character_density():
    """Verify character density heuristic accurately flags scanned image PDFs."""
    import pypdf
    from app.services.pdf_extractor import parse_airline_rate_sheet
    writer = pypdf.PdfWriter()
    writer.add_blank_page(width=100, height=100)
    buf = io.BytesIO()
    writer.write(buf)
    blank_bytes = buf.getvalue()

    result_blank = await parse_airline_rate_sheet(pdf_source=blank_bytes, carrier_hint="D7")
    assert result_blank["is_scanned"] is True
    assert result_blank["mode"] == "VISION_OCR_FALLBACK"
    assert result_blank["records"] == []


@pytest.mark.anyio
async def test_digital_rate_sheet_extraction_real_files():
    """Verify digital extractor parses real rates from authentic rate circulars."""
    from pathlib import Path
    from app.services.pdf_extractor import parse_airline_rate_sheet
    repo_root = Path(__file__).resolve().parents[2]
    rates_dir = repo_root / "rates"

    mh_pdf = rates_dir / "BOM RATE 01OCT-31OCT.pdf"
    if mh_pdf.exists():
        result = await parse_airline_rate_sheet(pdf_path=str(mh_pdf), carrier_hint="MH")
        assert result["is_scanned"] is False
        assert result["mode"] == "DIGITAL_TEXT_PARSER"
        assert len(result["records"]) >= 40
        kul_records = [r for r in result["records"] if r["destination"] == "KUL"]
        assert len(kul_records) > 0
        assert kul_records[0]["min_charge"] == 3300.0

    wy_pdf = rates_dir / "WY Tariff Effective 01st Nov 2026 to 31st March 2027 (1).pdf"
    if wy_pdf.exists():
        result_wy = await parse_airline_rate_sheet(pdf_path=str(wy_pdf), carrier_hint="WY")
        assert result_wy["is_scanned"] is False
        assert len(result_wy["records"]) >= 100
        mct_records = [r for r in result_wy["records"] if r["destination"] == "MCT"]
        assert len(mct_records) > 0


def test_map_numeric_slabs_boundary_safety():
    """Verify numeric mapper guards against IndexError and eliminates column shift."""
    from app.services.pdf_extractor import map_numeric_slabs

    # 1. Test 3 numbers without upfront MIN (Normal, +45, +100)
    # Previously crashed with IndexError: list index out of range
    min_c, n, r45, r100, r300, r500 = map_numeric_slabs([160.0, 140.0, 120.0])
    assert min_c == 3500.0
    assert n == 160.0
    assert r45 == 140.0
    assert r100 == 120.0
    assert r300 == 120.0
    assert r500 is None

    # 2. Test 3 numbers with upfront MIN (MIN >= 1000, +45, +100)
    min_c, n, r45, r100, r300, r500 = map_numeric_slabs([4500.0, 140.0, 120.0])
    assert min_c == 4500.0
    assert n == 140.0
    assert r45 == 140.0
    assert r100 == 120.0

    # 3. Test 4 numbers without upfront MIN (Normal, +45, +100, +300)
    min_c, n, r45, r100, r300, r500 = map_numeric_slabs([180.0, 160.0, 140.0, 120.0])
    assert min_c == 3500.0
    assert n == 180.0
    assert r45 == 160.0
    assert r100 == 140.0
    assert r300 == 120.0

    # 4. Test 4 numbers with upfront MIN (MIN, Normal, +45, +100)
    min_c, n, r45, r100, r300, r500 = map_numeric_slabs([5000.0, 180.0, 160.0, 140.0])
    assert min_c == 5000.0
    assert n == 180.0
    assert r45 == 160.0
    assert r100 == 140.0
    assert r300 == 140.0


def test_tariff_rate_record_schema():
    """Verify TariffRateRecord Pydantic schema validation and serialization."""
    from app.schemas.tariff import TariffRateRecord

    rec = TariffRateRecord(
        origin="BOM",
        destination="DXB",
        airline="Emirates SkyCargo",
        carrier_code="EK",
        prefix="176",
        commodity="GCR",
        min_charge=4000.0,
        rate_normal=180.0,
        rate_45=150.0,
        rate_100=130.0,
        rate_300=115.0,
        fsc_per_kg=24.0,
        ssc_per_kg=4.5,
    )
    d = rec.to_dict()
    assert d["origin"] == "BOM"
    assert d["destination"] == "DXB"
    assert d["carrier_code"] == "EK"
    assert d["min_charge"] == 4000.0


@pytest.mark.anyio
async def test_scanned_circular_ocr_fallback_populates_records():
    """Verify scanned circular with embedded images extracts populated records via OCR fallback."""
    from pathlib import Path
    from app.services.pdf_extractor import parse_airline_rate_sheet
    repo_root = Path(__file__).resolve().parents[2]
    airasia_pdf = repo_root / "rates" / "air asis rate sheet.pdf"

    if airasia_pdf.exists():
        result = await parse_airline_rate_sheet(pdf_path=str(airasia_pdf), carrier_hint="D7")
        assert result["is_scanned"] is True
        assert result["mode"] == "VISION_OCR_FALLBACK"
        assert len(result["records"]) > 0
        kul = [r for r in result["records"] if r["destination"] == "KUL"]
        assert len(kul) > 0
        assert kul[0]["min_charge"] == 3000.0
        assert kul[0]["rate_normal"] == 160.0


def test_tariff_registry_service_live_corridor_index_cache():
    """Verify thread-safe corridor index caching and generation invalidation in service."""
    from app.services.tariff_registry_service import tariff_registry_service

    idx1, tariffs1 = tariff_registry_service.get_live_corridor_index()
    assert idx1 is not None
    assert len(tariffs1) > 0

    # Calling again without generation bump returns cached object reference
    idx2, tariffs2 = tariff_registry_service.get_live_corridor_index()
    assert idx1 is idx2
    assert tariffs1 is tariffs2

    # Uploading a new circular bumps generation and invalidates cache
    tariff_registry_service.register_circular_upload(
        carrier_code="D7",
        filename="air_asia_test.pdf",
        extracted_records=[
            {
                "origin": "BOM",
                "destination": "KUL",
                "airline": "AirAsia X",
                "carrier_code": "D7",
                "prefix": "843",
                "min_charge": 3000.0,
                "rate_normal": 160.0,
                "rate_45": 140.0,
                "rate_100": 120.0,
                "fsc_per_kg": 16.0,
                "ssc_per_kg": 3.0,
            }
        ],
    )
    idx3, tariffs3 = tariff_registry_service.get_live_corridor_index()
    assert idx3 is not idx1
    # Check that new corridor is present in index
    d7_corridors = idx3.get_corridor_tariffs("BOM", "KUL")
    assert any(t.get("carrier_code") == "D7" for t in d7_corridors)
