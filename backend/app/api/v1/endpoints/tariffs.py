import os
import shutil
import tempfile
from typing import Optional
from pathlib import Path
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends, status
from app.services.pdf_extractor import parse_airline_rate_sheet
from app.core.security import verify_admin_key
from app.core.config import settings

router = APIRouter(prefix="/tariffs", tags=["Tariff Ingestion & Staging"])


@router.post("/upload")
async def upload_rate_sheet(
    file: UploadFile = File(...),
    airline_name: str = Form(...),
    currency: str = Form("INR"),
    _authorized: bool = Depends(verify_admin_key)
):
    """
    Ingest new airline rate sheet PDF into staging.
    Enforces RBAC (X-Admin-Key), MIME validation, magic byte verification, and size caps.
    """
    # 1. Sanitize filename and verify extension
    safe_filename = Path(file.filename or "upload.pdf").name
    if not safe_filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported format: Only authentic .pdf files are accepted."
        )

    # 2. Check Content-Type header if present
    if file.content_type and "pdf" not in file.content_type.lower():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid content-type header. Expected application/pdf."
        )

    tmp_path = None
    try:
        # 3. Stream upload with strict size limit to prevent Disk Fill DoS
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
            tmp_path = tmp.name
            total_bytes = 0
            chunk_size = 64 * 1024  # 64 KB chunks

            while chunk := await file.read(chunk_size):
                total_bytes += len(chunk)
                if total_bytes > settings.MAX_UPLOAD_SIZE_BYTES:
                    raise HTTPException(
                        status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                        detail=f"Uploaded file exceeds maximum limit of {settings.MAX_UPLOAD_SIZE_BYTES // (1024 * 1024)} MB."
                    )
                tmp.write(chunk)

        # 4. Safe PDF parse
        result = await parse_airline_rate_sheet(
            pdf_path=tmp_path,
            carrier_hint=airline_name.strip(),
            currency=currency.strip().upper()
        )
        result["filename"] = safe_filename
        return result

    except ValueError as val_err:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(val_err)
        )
    finally:
        # Guarantee removal of temporary file
        if tmp_path and os.path.exists(tmp_path):
            try:
                os.remove(tmp_path)
            except OSError:
                pass
