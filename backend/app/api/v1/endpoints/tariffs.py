from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from typing import Optional
from app.services.pdf_extractor import parse_airline_rate_sheet
import shutil
import tempfile
import os

router = APIRouter(prefix="/tariffs", tags=["Tariff Ingestion & Staging"])


@router.post("/upload")
async def upload_rate_sheet(
    file: UploadFile = File(...),
    airline_name: str = Form(...),
    currency: str = Form("INR")
):
    """
    Ingest new airline rate sheet PDF into staging.
    Routes digital PDFs to table extraction, raster scans to Vision OCR.
    """
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")

    with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
        shutil.copyfileobj(file.file, tmp)
        tmp_path = tmp.name

    try:
        result = await parse_airline_rate_sheet(
            pdf_path=tmp_path,
            carrier_hint=airline_name,
            currency=currency
        )
        result["filename"] = file.filename
        return result
    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)
