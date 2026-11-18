import json
import logging
import os
from pathlib import Path
import shutil
import tempfile
import threading
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple, Union
from app.data.tariffs import AIRLINE_TARIFFS
from app.services.s3_storage_service import s3_storage_service

logger = logging.getLogger(__name__)

# Base storage paths for uploaded tariff sheets
DATA_DIR = Path(__file__).resolve().parent.parent.parent / "data"
RATES_DIR = Path(__file__).resolve().parent.parent.parent / "rates"
IS_LAMBDA = bool(os.environ.get("AWS_LAMBDA_FUNCTION_NAME"))
DEFAULT_UPLOADS_PATH = Path("/tmp/tariff_uploads.json") if IS_LAMBDA else (DATA_DIR / "tariff_uploads.json")
DEFAULT_PDF_DIR = Path("/tmp/uploads") if IS_LAMBDA else (DATA_DIR / "uploads")


def _atomic_write_json(file_path: Path, data: Any) -> None:
    """
    Atomically writes data to file_path using a temporary file and atomic replace.
    Ensures readers never read partially written or corrupted files.
    """
    file_path.parent.mkdir(parents=True, exist_ok=True)
    temp_file = tempfile.NamedTemporaryFile(
        mode="w",
        dir=str(file_path.parent),
        delete=False,
        encoding="utf-8",
    )
    temp_path = Path(temp_file.name)
    try:
        json.dump(data, temp_file, indent=2, ensure_ascii=False)
        temp_file.flush()
        os.fsync(temp_file.fileno())
        temp_file.close()
        try:
            os.chmod(temp_path, 0o644)
        except OSError:
            pass
        os.replace(temp_path, file_path)
    except (OSError, TypeError, ValueError) as err:
        logger.error(f"Failed to atomically write tariff uploads to {file_path}: {err}")
        temp_file.close()
        if temp_path.exists():
            try:
                temp_path.unlink()
            except OSError:
                pass
        raise

# Known scheduled carriers operating ex-Mumbai (BOM / CSMIA Sahar Air Cargo Complex)
KNOWN_CARRIERS = [
    {
        "carrier_code": "AI",
        "carrier_name": "Air India",
        "prefix": "098",
        "parser_id": "AI-FlagCarrierMatrix",
        "default_pdf": None,
        "valid_from": None,
        "valid_to": None,
        "description": "National flag carrier ex-BOM. Direct widebody flights to UK, Europe, US & Far East.",
    },
    {
        "carrier_code": "EY",
        "carrier_name": "Etihad Airways",
        "prefix": "607",
        "parser_id": "EY-SmallsMatrix",
        "default_pdf": None,
        "valid_from": None,
        "valid_to": None,
        "description": "Mumbai Smalls (<500kg) specialist ex-BOM to GCC, Europe, and North America via AUH.",
    },
    {
        "carrier_code": "WY",
        "carrier_name": "Oman Air",
        "prefix": "910",
        "parser_id": "WY-ZoneMatrix",
        "default_pdf": None,
        "valid_from": None,
        "valid_to": None,
        "description": "Middle East & Gulf feeder specialist ex-BOM via Muscat (MCT) hub.",
    },
    {
        "carrier_code": "EK",
        "carrier_name": "Emirates SkyCargo",
        "prefix": "176",
        "parser_id": "EK-TierGrid",
        "default_pdf": None,
        "valid_from": None,
        "valid_to": None,
        "description": "High-frequency widebody belly & freighter network to DXB and global destinations.",
    },
    {
        "carrier_code": "QR",
        "carrier_name": "Qatar Airways",
        "prefix": "157",
        "parser_id": "QR-TransshipmentGrid",
        "default_pdf": None,
        "valid_from": None,
        "valid_to": None,
        "description": "Global transshipment network ex-BOM via Hamad Int'l (DOH) hub.",
    },
    {
        "carrier_code": "SV",
        "carrier_name": "Saudia Cargo",
        "prefix": "065",
        "parser_id": "SV-RedSeaMatrix",
        "default_pdf": None,
        "valid_from": None,
        "valid_to": None,
        "description": "Kingdom of Saudi Arabia (JED/RUH/DMM) & Red Sea corridor connections.",
    },
    {
        "carrier_code": "6E",
        "carrier_name": "IndiGo CarGo",
        "prefix": "312",
        "parser_id": "6E-DomesticExportGrid",
        "default_pdf": None,
        "valid_from": None,
        "valid_to": None,
        "description": "High-frequency narrowbody export feeder to Southeast Asia & Middle East ex-BOM.",
    },
    {
        "carrier_code": "MH",
        "carrier_name": "Malaysia Airlines",
        "prefix": "232",
        "parser_id": "MH-TabularMatrix",
        "default_pdf": None,
        "valid_from": None,
        "valid_to": None,
        "description": "Southeast Asia, Australasia & Far East network ex-BOM via Kuala Lumpur (KUL).",
    },
    {
        "carrier_code": "ET",
        "carrier_name": "Ethiopian Cargo",
        "prefix": "071",
        "parser_id": "ET-VisionOCRReady",
        "default_pdf": None,
        "valid_from": None,
        "valid_to": None,
        "description": "Pan-African cargo gateway ex-BOM via Addis Ababa (ADD) hub.",
    },
    {
        "carrier_code": "D7",
        "carrier_name": "AirAsia X",
        "prefix": "843",
        "parser_id": "D7-VisionOCRReady",
        "default_pdf": None,
        "valid_from": None,
        "valid_to": None,
        "description": "Direct point-to-point low-cost cargo services to Malaysia & Southeast Asia.",
    },
]


class TariffRegistryService:
    """
    Manages known airline carriers, their active rate circulars, and corridor tariffs.
    Thread-safe in-memory state with baseline seeding from AIRLINE_TARIFFS.
    """

    def __init__(
        self,
        uploads_path: Optional[Union[str, Path]] = None,
        pdf_dir: Optional[Union[str, Path]] = None,
    ):
        self._lock = threading.RLock()
        self.uploads_path = Path(uploads_path) if uploads_path else DEFAULT_UPLOADS_PATH
        self.pdf_dir = Path(pdf_dir) if pdf_dir else DEFAULT_PDF_DIR
        try:
            self.pdf_dir.mkdir(parents=True, exist_ok=True)
        except OSError:
            pass
        self._registry: Dict[str, Dict[str, Any]] = {}
        self._custom_rates: Dict[str, List[Dict[str, Any]]] = {}
        self._baseline_carrier_rates: Dict[str, List[Dict[str, Any]]] = {}
        self._generation: int = 1
        self._cached_index: Optional[Any] = None
        self._cached_generation: int = -1
        self._cached_tariffs: List[Dict[str, Any]] = []
        self._last_mtime: float = 0.0
        self._initialize_registry()
        self._load_persisted_uploads()

    def _sync_from_disk_if_modified(self) -> None:
        """Reloads persisted state if another worker process modified uploads_path."""
        if not self.uploads_path.exists():
            return
        try:
            current_mtime = self.uploads_path.stat().st_mtime
            if current_mtime != self._last_mtime:
                self._load_persisted_uploads()
        except OSError:
            pass

    def _load_persisted_uploads(self) -> None:
        """Loads previously uploaded circular rates and registry state from S3 or atomic disk storage."""
        # 1. On AWS Lambda (or when uploads_path is missing), attempt restore from S3 or bundled seed
        if not self.uploads_path.exists():
            if s3_storage_service.is_enabled and self.uploads_path == DEFAULT_UPLOADS_PATH:
                s3_data = s3_storage_service.download_json("data/tariff_uploads.json")
                if s3_data:
                    try:
                        _atomic_write_json(self.uploads_path, s3_data)
                        logger.info("Restored tariff_uploads.json from S3 into local cache.")
                    except Exception as s3_wr_err:
                        logger.warning(f"Failed to cache S3 tariff uploads locally: {s3_wr_err}")

            if not self.uploads_path.exists() and (DATA_DIR / "tariff_uploads.json").exists():
                try:
                    shutil.copy2(DATA_DIR / "tariff_uploads.json", self.uploads_path)
                    logger.info("Copied bundled tariff_uploads.json seed to active uploads path.")
                except Exception as seed_copy_err:
                    logger.debug(f"Could not copy bundled seed: {seed_copy_err}")

        if not self.uploads_path.exists():
            return

        try:
            current_mtime = self.uploads_path.stat().st_mtime
            with open(self.uploads_path, "r", encoding="utf-8") as f:
                data = json.load(f)
            custom_rates = data.get("custom_rates", {})
            for code, rates in custom_rates.items():
                if isinstance(rates, list):
                    self._custom_rates[code] = rates

            registry_overrides = data.get("registry_overrides", {})
            for code, info in registry_overrides.items():
                if code in self._registry and isinstance(info, dict):
                    self._registry[code].update(info)
            self._generation += 1
            self._cached_index = None
            self._last_mtime = current_mtime
        except Exception as e:
            logger.warning(f"Failed to load persisted tariff uploads from {self.uploads_path}: {e}")

    def _persist_uploads(self) -> None:
        """Persists custom circular rates and active status overrides to disk and S3 atomically."""
        try:
            payload = {
                "custom_rates": self._custom_rates,
                "registry_overrides": {
                    code: {
                        "has_active_circular": bool(info.get("has_active_circular")),
                        "active_circular": info.get("active_circular"),
                        "total_corridors": info.get("total_corridors", 0),
                        "corridors_sample": info.get("corridors_sample", []),
                    }
                    for code, info in self._registry.items()
                },
            }
            _atomic_write_json(self.uploads_path, payload)
            try:
                self._last_mtime = self.uploads_path.stat().st_mtime
            except OSError:
                pass

            # Sync to AWS S3 if configured
            if s3_storage_service.is_enabled and self.uploads_path == DEFAULT_UPLOADS_PATH:
                s3_storage_service.upload_json("data/tariff_uploads.json", payload)
        except Exception as e:
            logger.error(f"Failed to persist tariff uploads: {e}")

    def get_generation(self) -> int:
        """Returns the current registry cache generation counter."""
        with self._lock:
            self._sync_from_disk_if_modified()
            return self._generation

    def _initialize_registry(self) -> None:
        """Seed initial state from known carriers and baseline rate database."""
        now_iso = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

        # DSA Inverted Index: Map existing corridors from AIRLINE_TARIFFS per carrier
        carrier_corridors: Dict[str, List[Dict[str, Any]]] = {}
        for tariff in AIRLINE_TARIFFS:
            code = tariff.get("carrier_code", "").upper().strip()
            if code:
                carrier_corridors.setdefault(code, []).append(tariff)

        self._baseline_carrier_rates = carrier_corridors

        for carrier in KNOWN_CARRIERS:
            code = carrier["carrier_code"]
            existing = carrier_corridors.get(code, [])
            corridor_count = len(existing)

            has_circular = carrier["default_pdf"] is not None and corridor_count > 0

            self._registry[code] = {
                "carrier_code": code,
                "carrier_name": carrier["carrier_name"],
                "prefix": carrier["prefix"],
                "parser_id": carrier["parser_id"],
                "parser_status": "DEDICATED_PARSER_READY",
                "description": carrier["description"],
                "has_active_circular": has_circular,
                "active_circular": {
                    "filename": carrier["default_pdf"],
                    "uploaded_at": now_iso if has_circular else None,
                    "valid_from": carrier["valid_from"],
                    "valid_to": carrier["valid_to"],
                    "currency": "INR",
                    "corridor_count": corridor_count,
                    "status": "ACTIVE" if has_circular else "NO_CIRCULAR",
                } if has_circular else None,
                "corridors_sample": [t["destination"] for t in existing[:4]] if has_circular else [],
                "total_corridors": corridor_count if has_circular else 0,
            }

    def get_registry(self) -> List[Dict[str, Any]]:
        """Return the current known carrier registry with active circular statuses."""
        with self._lock:
            self._sync_from_disk_if_modified()
            # Return list in canonical order
            order = [c["carrier_code"] for c in KNOWN_CARRIERS]
            result = []
            for code in order:
                if code in self._registry:
                    result.append(dict(self._registry[code]))
            return result

    def get_carrier_info(self, carrier_code: str) -> Optional[Dict[str, Any]]:
        """Get details for a specific carrier."""
        code = carrier_code.upper().strip()
        with self._lock:
            self._sync_from_disk_if_modified()
            info = self._registry.get(code)
            return dict(info) if info else None

    def get_carrier_rates(self, carrier_code: str) -> List[Dict[str, Any]]:
        """
        Return all active corridor rates for this carrier.
        DSA: O(1) hash bucket lookup via inverted index, replacing O(N) scan over ~3000 tariffs.
        """
        code = carrier_code.upper().strip()
        with self._lock:
            self._sync_from_disk_if_modified()
            # Check custom uploaded rates first
            if code in self._custom_rates and self._custom_rates[code]:
                return [dict(r) for r in self._custom_rates[code]]

            # If carrier does not have an active circular, return empty list
            carrier_info = self._registry.get(code)
            if not carrier_info or not carrier_info.get("has_active_circular"):
                return []

            # Retrieve active baseline rates
            rates = self._baseline_carrier_rates.get(code, [])
            return [dict(t) for t in rates]

    def get_all_active_tariffs(self) -> List[Dict[str, Any]]:
        """
        Returns all active corridor rates across all registered carriers:
        - If carrier has uploaded custom circular rates, uses custom rates.
        - If carrier has active baseline circular, uses baseline rates.
        - If carrier circular is deactivated/cleared, rates are suppressed.
        DSA: Fast O(C) carrier aggregation over inverted indices.
        """
        with self._lock:
            self._sync_from_disk_if_modified()
            all_tariffs: List[Dict[str, Any]] = []
            for code, carrier in self._registry.items():
                if not carrier.get("has_active_circular"):
                    continue
                if code in self._custom_rates and self._custom_rates[code]:
                    all_tariffs.extend(self._custom_rates[code])
                else:
                    all_tariffs.extend(self._baseline_carrier_rates.get(code, []))
            return [dict(t) for t in all_tariffs]

    def get_live_corridor_index(self) -> Tuple[Any, List[Dict[str, Any]]]:
        """
        Thread-safe retrieval of CorridorRateIndex and active tariff list.
        Rebuilds index in O(N) only when registry generation increments, otherwise O(1).
        Encapsulates cache lifecycle to prevent Feature Envy in API endpoint modules.
        """
        from app.services.rate_engine import CorridorRateIndex

        with self._lock:
            self._sync_from_disk_if_modified()
            if self._cached_index is None or self._cached_generation != self._generation:
                self._cached_tariffs = self.get_all_active_tariffs()
                self._cached_index = CorridorRateIndex(self._cached_tariffs)
                self._cached_generation = self._generation
            return self._cached_index, self._cached_tariffs

    def register_circular_upload(
        self,
        carrier_code: str,
        filename: str,
        extracted_records: List[Dict[str, Any]],
        currency: str = "INR",
        valid_from: Optional[str] = None,
        valid_to: Optional[str] = None,
        pdf_bytes: Optional[bytes] = None,
        surcharge_source: Optional[str] = None,
        surcharge_notice: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Register a newly parsed PDF circular for a carrier.
        Updates metadata, persists the raw PDF file, stores extracted records, and sets status to ACTIVE.
        """
        code = carrier_code.upper().strip()
        now_iso = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

        with self._lock:
            self._sync_from_disk_if_modified()
            if code not in self._registry:
                # If unknown code, auto-register it
                self._registry[code] = {
                    "carrier_code": code,
                    "carrier_name": f"Carrier ({code})",
                    "prefix": "000",
                    "parser_id": f"{code}-StandardParser",
                    "parser_status": "DEDICATED_PARSER_READY",
                    "description": f"Air carrier {code} operating ex-BOM.",
                    "has_active_circular": True,
                    "active_circular": None,
                    "corridors_sample": [],
                    "total_corridors": 0,
                }

            # Extract dynamic validity window from records if available
            if not valid_from and extracted_records and extracted_records[0].get("valid_from"):
                valid_from = extracted_records[0].get("valid_from")
            if not valid_to and extracted_records and extracted_records[0].get("valid_to"):
                valid_to = extracted_records[0].get("valid_to")

            v_from = valid_from or datetime.now(timezone.utc).strftime("%Y-%m-01")
            v_to = valid_to or "2026-12-31"

            # Derive surcharge source from records if not explicitly passed
            if not surcharge_source and extracted_records:
                surcharge_source = extracted_records[0].get("surcharge_source", "CIRCULAR")

            # If parser returned records, store them as custom rates
            if extracted_records:
                self._custom_rates[code] = extracted_records
                corridor_count = len(extracted_records)
                sample = [r.get("destination", "") for r in extracted_records[:4] if r.get("destination")]
            else:
                existing = [t for t in AIRLINE_TARIFFS if t.get("carrier_code") == code]
                corridor_count = len(existing)
                sample = [t["destination"] for t in existing[:4]]

            # Persist uploaded raw PDF bytes to disk and S3
            saved_pdf_name = f"{code}_{filename}"
            pdf_saved = False
            if pdf_bytes:
                try:
                    pdf_target = self.pdf_dir / saved_pdf_name
                    with open(pdf_target, "wb") as f_pdf:
                        f_pdf.write(pdf_bytes)
                    pdf_saved = True
                    if s3_storage_service.is_enabled and self.pdf_dir == DEFAULT_PDF_DIR:
                        s3_storage_service.upload_file(pdf_target, f"uploads/{saved_pdf_name}")
                except Exception as pdf_err:
                    logger.warning(f"Could not persist PDF bytes for {code}: {pdf_err}")

            self._registry[code]["has_active_circular"] = True
            self._registry[code]["total_corridors"] = corridor_count
            self._registry[code]["corridors_sample"] = sample
            self._registry[code]["active_circular"] = {
                "filename": filename,
                "saved_filename": saved_pdf_name if pdf_saved else None,
                "uploaded_at": now_iso,
                "valid_from": v_from,
                "valid_to": v_to,
                "currency": currency.upper().strip(),
                "corridor_count": corridor_count,
                "status": "ACTIVE",
                "surcharge_source": surcharge_source or "CIRCULAR",
                "surcharge_notice": surcharge_notice,
            }
            self._generation += 1
            self._persist_uploads()

            return dict(self._registry[code])

    def get_carrier_pdf_path(self, carrier_code: str) -> Optional[Path]:
        """
        Resolves the local Path to the carrier's active rate circular PDF.
        Attempts retrieval from local disk cache, downloads from S3 if absent,
        or falls back to repository rates folder.
        """
        code = carrier_code.upper().strip()
        with self._lock:
            self._sync_from_disk_if_modified()
            info = self._registry.get(code)
            if not info or not info.get("has_active_circular") or not info.get("active_circular"):
                return None

            circular = info["active_circular"]
            filename = circular.get("filename")
            saved_name = circular.get("saved_filename") or f"{code}_{filename}"

            # 1. Check local persistent uploads folder
            local_path = self.pdf_dir / saved_name
            if local_path.exists() and local_path.stat().st_size > 0:
                return local_path

            # 2. Check S3 if enabled
            if s3_storage_service.is_enabled:
                s3_key = f"uploads/{saved_name}"
                if s3_storage_service.download_file(s3_key, local_path):
                    return local_path

            # 3. Fallback to rates directory if filename matches baseline
            if filename:
                repo_path = RATES_DIR / filename
                if repo_path.exists():
                    return repo_path

            return None

    def clear_carrier_circular(self, carrier_code: str) -> Optional[Dict[str, Any]]:
        """
        Deactivate and clear an active circular for a carrier.
        Resets active_circular to None and status to NO_CIRCULAR.
        """
        code = carrier_code.upper().strip()
        with self._lock:
            self._sync_from_disk_if_modified()
            if code not in self._registry:
                return None

            # Remove custom rates
            if code in self._custom_rates:
                del self._custom_rates[code]

            # Remove local saved PDF if present
            circular = self._registry[code].get("active_circular")
            if circular and circular.get("saved_filename"):
                local_pdf = self.pdf_dir / circular["saved_filename"]
                if local_pdf.exists():
                    try:
                        local_pdf.unlink()
                    except OSError:
                        pass

            self._registry[code]["has_active_circular"] = False
            self._registry[code]["active_circular"] = None
            self._registry[code]["total_corridors"] = 0
            self._registry[code]["corridors_sample"] = []
            self._generation += 1
            self._persist_uploads()

            return dict(self._registry[code])


# Global singleton instance
tariff_registry_service = TariffRegistryService()
