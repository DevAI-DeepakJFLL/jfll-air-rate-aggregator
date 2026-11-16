import io
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from app.services.pdf_extractor import (
    _extract_pdf_bytes,
    extract_tariff_with_gemini_flash,
    parse_airline_rate_sheet,
    GeminiAirlineTariffExtraction,
    GeminiExtractedTariffRecord,
)
from app.schemas.tariff import TariffRateRecord


def test_extract_pdf_bytes_from_various_sources(tmp_path):
    """Verify that _extract_pdf_bytes extracts raw bytes from bytes, stream, or file path."""
    raw_sample = b"%PDF-1.4 test pdf header and content"
    
    # 1. From raw bytes
    assert _extract_pdf_bytes(raw_sample) == raw_sample

    # 2. From BytesIO stream
    buf = io.BytesIO(raw_sample)
    assert _extract_pdf_bytes(buf) == raw_sample
    assert buf.tell() == 0  # Re-seeked to beginning

    # 3. From file path
    f_path = tmp_path / "sample.pdf"
    f_path.write_bytes(raw_sample)
    assert _extract_pdf_bytes(f_path) == raw_sample
    assert _extract_pdf_bytes(str(f_path)) == raw_sample


@pytest.mark.anyio
async def test_extract_tariff_with_gemini_flash_no_api_key():
    """Verify that extract_tariff_with_gemini_flash returns None when no API key is provided."""
    with patch("app.services.pdf_extractor.settings.GEMINI_API_KEY", ""):
        with patch.dict("os.environ", {"GEMINI_API_KEY": ""}, clear=True):
            res = await extract_tariff_with_gemini_flash(b"%PDF-1.4 sample", carrier_hint="WY")
            assert res is None


@pytest.mark.anyio
async def test_extract_tariff_with_gemini_flash_successful_mock():
    """
    Verify Gemini 2.5 Flash parser unrolls compound routes and maps TACT slabs into TariffRateRecord objects.
    """
    mock_extraction = GeminiAirlineTariffExtraction(
        carrier_name="Oman Air",
        carrier_code="WY",
        prefix="910",
        default_fsc_per_kg=20.0,
        default_ssc_per_kg=3.5,
        currency="INR",
        records=[
            GeminiExtractedTariffRecord(
                destination="MCT/AMM/BAH",
                commodity="GCR",
                min_charge=3500.0,
                rate_normal=160.0,
                rate_45=140.0,
                rate_100=120.0,
                rate_300=105.0,
                rate_500=95.0,
                fsc_per_kg=20.0,
                ssc_per_kg=3.5,
                gauge_restriction="Passenger flight belly capacity only.",
            ),
            GeminiExtractedTariffRecord(
                destination="CDG",
                commodity="PILA-CRT",
                min_charge=4500.0,
                rate_normal=220.0,
                rate_45=195.0,
                rate_100=175.0,
                rate_300=160.0,
                rate_500=150.0,
                fsc_per_kg=24.0,
                ssc_per_kg=4.0,
            ),
        ],
    )

    mock_response = MagicMock()
    mock_response.parsed = mock_extraction
    mock_response.text = ""

    mock_client = MagicMock()
    mock_client.aio.models.generate_content = AsyncMock(return_value=mock_response)

    with patch("app.services.pdf_extractor.settings.GEMINI_API_KEY", "test-live-key"):
        with patch("app.services.pdf_extractor.genai.Client", return_value=mock_client):
            records = await extract_tariff_with_gemini_flash(
                b"%PDF-1.4 dummy",
                carrier_hint="WY",
                currency="INR",
            )

            assert records is not None
            # MCT/AMM/BAH should unroll to 3 separate records + 1 CDG record = 4 records
            assert len(records) == 4
            dests = [r.destination for r in records]
            assert "MCT" in dests
            assert "AMM" in dests
            assert "BAH" in dests
            assert "CDG" in dests

            # Verify rate attributes for unrolled route
            mct = next(r for r in records if r.destination == "MCT")
            assert isinstance(mct, TariffRateRecord)
            assert mct.origin == "BOM"
            assert mct.carrier_code == "WY"
            assert mct.airline == "Oman Air"
            assert mct.prefix == "910"
            assert mct.min_charge == 3500.0
            assert mct.rate_100 == 120.0
            assert mct.fsc_per_kg == 20.0
            assert mct.gauge_restriction == "Passenger flight belly capacity only."

            # Verify call passed model gemini-2.5-flash
            call_kwargs = mock_client.aio.models.generate_content.call_args.kwargs
            assert call_kwargs["model"] == "gemini-2.5-flash"


@pytest.mark.anyio
async def test_parse_airline_rate_sheet_routes_to_gemini_flash_on_scanned():
    """Verify that parse_airline_rate_sheet uses Gemini 2.5 Flash when available on scanned PDFs."""
    import pypdf
    writer = pypdf.PdfWriter()
    writer.add_blank_page(width=100, height=100)
    buf = io.BytesIO()
    writer.write(buf)
    pdf_bytes = buf.getvalue()

    mock_records = [
        TariffRateRecord(
            origin="BOM",
            destination="KUL",
            airline="AirAsia X",
            carrier_code="D7",
            prefix="843",
            commodity="GCR",
            min_charge=3000.0,
            rate_normal=160.0,
            rate_45=140.0,
            rate_100=120.0,
            rate_300=110.0,
            fsc_per_kg=16.0,
            ssc_per_kg=3.0,
        )
    ]

    with patch("app.services.pdf_extractor.extract_text_from_pdf", return_value=("", True)):
        # Simulate has_images = True
        with patch("pypdf.PdfReader") as mock_reader_cls:
            mock_reader = MagicMock()
            mock_page = MagicMock()
            mock_page.images = [MagicMock()]
            mock_reader.pages = [mock_page]
            mock_reader_cls.return_value = mock_reader

            with patch("app.services.pdf_extractor.extract_tariff_with_gemini_flash", new_callable=AsyncMock) as mock_gemini:
                mock_gemini.return_value = mock_records

                result = await parse_airline_rate_sheet(
                    pdf_source=pdf_bytes,
                    carrier_hint="D7",
                    currency="INR",
                )

                assert result["mode"] == "GEMINI_2_5_FLASH_VLM"
                assert result["is_scanned"] is True
                assert len(result["records"]) == 1
                assert result["records"][0]["destination"] == "KUL"
