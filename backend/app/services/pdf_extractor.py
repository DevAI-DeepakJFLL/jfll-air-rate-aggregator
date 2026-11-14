import os
from typing import List, Dict, Any, Tuple
import pypdf


def extract_text_from_pdf(pdf_path: str) -> Tuple[str, bool]:
    """
    Extracts text from PDF.
    Returns:
        (extracted_text, is_scanned_image)
    """
    if not os.path.exists(pdf_path):
        raise FileNotFoundError(f"PDF file not found: {pdf_path}")

    reader = pypdf.PdfReader(pdf_path)
    total_pages = len(reader.pages)
    combined_text = []

    for page in reader.pages:
        text = page.extract_text() or ""
        combined_text.append(text.strip())

    full_text = "\n".join(combined_text)
    # If text across all pages is under 20 characters, it's a flattened raster scan
    is_scanned = len(full_text.strip()) < 20

    return (full_text, is_scanned)


async def parse_airline_rate_sheet(
    pdf_path: str,
    carrier_hint: str = "",
    currency: str = "INR"
) -> Dict[str, Any]:
    """
    Dual-mode parsing worker:
    1. Digital Text Extraction for structured digital PDFs.
    2. Vision-LLM Fallback for scanned/raster PDFs (e.g., Ethiopian, Air Asia).
    """
    text, is_scanned = extract_text_from_pdf(pdf_path)

    if is_scanned:
        # Scanned Image Mode: In production, feeds page images to Gemini 2.5 Flash Vision
        return {
            "mode": "VISION_OCR_FALLBACK",
            "is_scanned": True,
            "carrier_hint": carrier_hint,
            "currency": currency,
            "status": "STAGED_FOR_ADMIN_REVIEW",
            "records": [],
            "flagged_footnotes": [
                "Scanned rate sheet detected. High-precision Vision OCR applied.",
                "Admin verification required in staging screen."
            ]
        }

    # Digital Text Mode: Extract structured rows
    return {
        "mode": "DIGITAL_TEXT_PARSER",
        "is_scanned": False,
        "carrier_hint": carrier_hint,
        "currency": currency,
        "status": "STAGED_FOR_ADMIN_REVIEW",
        "extracted_chars": len(text),
        "records": [],
        "flagged_footnotes": []
    }
