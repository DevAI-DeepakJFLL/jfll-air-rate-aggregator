import io
import os
import tempfile
from pathlib import Path
from typing import Optional
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends, status
from app.services.pdf_extractor import parse_airline_rate_sheet
from app.services.tariff_registry_service import tariff_registry_service
from app.core.security import verify_pricing_head, UserSession
from app.core.config import settings

router = APIRouter(prefix="/tariffs", tags=["Tariff Ingestion & Staging"])


@router.get("/registry")
async def get_tariff_registry():
    """
    Returns the Known Carrier Registry ex-BOM with active circular metadata,
    corridor counts, validity windows, and parser statuses.
    """
    return tariff_registry_service.get_registry()


@router.get("/{carrier_code}/rates")
async def get_carrier_rates(carrier_code: str):
    """
    Retrieve all active or extracted corridor rates for a specific carrier.
    """
    code = carrier_code.strip().upper()
    info = tariff_registry_service.get_carrier_info(code)
    if not info:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Carrier '{code}' not found in known registry.",
        )
    rates = tariff_registry_service.get_carrier_rates(code)
    return {
        "carrier_code": code,
        "carrier_name": info["carrier_name"],
        "prefix": info["prefix"],
        "parser_id": info["parser_id"],
        "active_circular": info["active_circular"],
        "total_corridors": len(rates),
        "rates": rates,
    }


@router.post("/upload")
async def upload_rate_sheet(
    file: UploadFile = File(...),
    carrier_code: Optional[str] = Form(None),
    airline_name: Optional[str] = Form(None),
    currency: str = Form("INR"),
    _authorized: UserSession = Depends(verify_pricing_head),
):
    """
    Ingest new airline rate sheet PDF directly bound to carrier code.
    Enforces RBAC (X-Admin-Key + PRICING_HEAD role), MIME validation, magic byte verification, and size caps.
    """
    # Resolve carrier code from either carrier_code or airline_name
    resolved_code = (carrier_code or airline_name or "").strip().upper()
    if not resolved_code:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Carrier code or airline name is required for ingestion.",
        )

    # 1. Sanitize filename and verify extension
    safe_filename = Path(file.filename or "upload.pdf").name
    if not safe_filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported format: Only authentic .pdf files are accepted.",
        )

    # 2. Check Content-Type header if present
    if file.content_type and "pdf" not in file.content_type.lower():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid content-type header. Expected application/pdf.",
        )

    MAX_IN_MEMORY_BYTES = 2 * 1024 * 1024  # 2 MB in-memory buffer threshold
    tmp_path = None
    spilled_temp = None
    try:
        # 3. Stream upload with strict size limit to prevent Disk Fill DoS
        chunk_size = 64 * 1024  # 64 KB chunks
        in_memory_buf = io.BytesIO()
        total_bytes = 0

        while chunk := await file.read(chunk_size):
            total_bytes += len(chunk)
            if total_bytes > settings.MAX_UPLOAD_SIZE_BYTES:
                raise HTTPException(
                    status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                    detail=f"Uploaded file exceeds maximum limit of {settings.MAX_UPLOAD_SIZE_BYTES // (1024 * 1024)} MB.",
                )
            if spilled_temp is not None:
                spilled_temp.write(chunk)
            elif total_bytes > MAX_IN_MEMORY_BYTES:
                # Spill to temporary file on disk for files > 2 MB
                spilled_temp = tempfile.NamedTemporaryFile(delete=False, suffix=".pdf")
                tmp_path = spilled_temp.name
                spilled_temp.write(in_memory_buf.getvalue())
                spilled_temp.write(chunk)
                in_memory_buf = None
            else:
                in_memory_buf.write(chunk)

        if spilled_temp is not None:
            spilled_temp.close()
            pdf_source = tmp_path
        else:
            in_memory_buf.seek(0)
            pdf_source = in_memory_buf

        # 4. Safe PDF parse
        result = await parse_airline_rate_sheet(
            pdf_source=pdf_source,
            carrier_hint=resolved_code,
            currency=currency.strip().upper(),
        )
        result["filename"] = safe_filename
        result["carrier_code"] = resolved_code

        # Extract full raw PDF bytes for permanent persistence
        pdf_bytes = None
        if isinstance(pdf_source, io.BytesIO):
            pdf_bytes = pdf_source.getvalue()
        elif tmp_path and os.path.exists(tmp_path):
            with open(tmp_path, "rb") as f_tmp:
                pdf_bytes = f_tmp.read()

        # 5. Register circular in registry service
        extracted = result.get("records", [])
        carrier_info = tariff_registry_service.register_circular_upload(
            carrier_code=resolved_code,
            filename=safe_filename,
            extracted_records=extracted,
            currency=currency.strip().upper(),
            pdf_bytes=pdf_bytes,
        )
        result["registry_status"] = carrier_info

        return result

    except ValueError as val_err:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(val_err),
        )
    finally:
        # Guarantee removal of temporary file if spilled to disk
        if tmp_path and os.path.exists(tmp_path):
            try:
                os.remove(tmp_path)
            except OSError:
                pass


@router.get("/{carrier_code}/pdf")
async def get_carrier_pdf(carrier_code: str):
    """
    Download or view the active airline rate circular PDF for a carrier.
    """
    from fastapi.responses import FileResponse

    code = carrier_code.strip().upper()
    pdf_path = tariff_registry_service.get_carrier_pdf_path(code)
    if not pdf_path or not pdf_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No PDF rate circular currently available for carrier '{code}'.",
        )

    info = tariff_registry_service.get_carrier_info(code)
    circ = (info and info.get("active_circular")) or {}
    download_filename = circ.get("filename") or f"{code}_rate_circular.pdf"

    return FileResponse(
        path=str(pdf_path),
        media_type="application/pdf",
        filename=download_filename,
    )


@router.delete("/{carrier_code}")
async def delete_carrier_circular(
    carrier_code: str,
    _pricing_head: UserSession = Depends(verify_pricing_head),
):
    """
    Deactivate and clear an active circular for a carrier.
    Strictly restricted to PRICING_HEAD role.
    """
    code = carrier_code.strip().upper()
    cleared = tariff_registry_service.clear_carrier_circular(code)
    if not cleared:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Carrier '{code}' not found in known registry.",
        )
    return {
        "success": True,
        "message": f"Active circular for {cleared['carrier_name']} ({code}) cleared successfully.",
        "carrier": cleared,
    }
