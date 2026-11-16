import logging
import threading
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from app.data.tariffs import AIRLINE_TARIFFS

logger = logging.getLogger(__name__)

# Known scheduled carriers operating ex-Mumbai (BOM / CSMIA Sahar Air Cargo Complex)
KNOWN_CARRIERS = [
    {
        "carrier_code": "AI",
        "carrier_name": "Air India",
        "prefix": "098",
        "parser_id": "AI-FlagCarrierMatrix",
        "default_pdf": "AI_BOM_Tariffs_2026.pdf",
        "valid_from": "2026-10-01",
        "valid_to": "2026-12-31",
        "description": "National flag carrier ex-BOM. Direct widebody flights to UK, Europe, US & Far East.",
    },
    {
        "carrier_code": "EY",
        "carrier_name": "Etihad Airways",
        "prefix": "607",
        "parser_id": "EY-SmallsMatrix",
        "default_pdf": "Etihad -Mumbai Smalls Oct 2026.pdf",
        "valid_from": "2026-10-01",
        "valid_to": "2026-12-31",
        "description": "Mumbai Smalls (<500kg) specialist ex-BOM to GCC, Europe, and North America via AUH.",
    },
    {
        "carrier_code": "WY",
        "carrier_name": "Oman Air",
        "prefix": "910",
        "parser_id": "WY-ZoneMatrix",
        "default_pdf": "WY Tariff Effective 01st Nov 2026 to 31st March 2027.pdf",
        "valid_from": "2026-11-01",
        "valid_to": "2027-03-31",
        "description": "Middle East & Gulf feeder specialist ex-BOM via Muscat (MCT) hub.",
    },
    {
        "carrier_code": "EK",
        "carrier_name": "Emirates SkyCargo",
        "prefix": "176",
        "parser_id": "EK-TierGrid",
        "default_pdf": "EK_SkyCargo_BOM_Nov2026.pdf",
        "valid_from": "2026-10-01",
        "valid_to": "2026-12-31",
        "description": "High-frequency widebody belly & freighter network to DXB and global destinations.",
    },
    {
        "carrier_code": "QR",
        "carrier_name": "Qatar Airways",
        "prefix": "157",
        "parser_id": "QR-TransshipmentGrid",
        "default_pdf": "QR_Cargo_BOM_2026.pdf",
        "valid_from": "2026-10-01",
        "valid_to": "2026-12-31",
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
        "default_pdf": "6E_BOM_CarGo_Q4.pdf",
        "valid_from": "2026-10-01",
        "valid_to": "2026-12-31",
        "description": "High-frequency narrowbody export feeder to Southeast Asia & Middle East ex-BOM.",
    },
    {
        "carrier_code": "MH",
        "carrier_name": "Malaysia Airlines",
        "prefix": "232",
        "parser_id": "MH-TabularMatrix",
        "default_pdf": "BOM RATE 01OCT-31OCT.pdf",
        "valid_from": "2026-10-01",
        "valid_to": "2026-12-31",
        "description": "Southeast Asia, Australasia & Far East network ex-BOM via Kuala Lumpur (KUL).",
    },
    {
        "carrier_code": "ET",
        "carrier_name": "Ethiopian Cargo",
        "prefix": "071",
        "parser_id": "ET-VisionOCRReady",
        "default_pdf": "Revised BOM ET Rates eff 09 Nov 2026.pdf",
        "valid_from": "2026-11-09",
        "valid_to": "2026-12-31",
        "description": "Pan-African cargo gateway ex-BOM via Addis Ababa (ADD) hub.",
    },
    {
        "carrier_code": "D7",
        "carrier_name": "AirAsia X",
        "prefix": "843",
        "parser_id": "D7-VisionOCRReady",
        "default_pdf": "air asis rate sheet.pdf",
        "valid_from": "2026-09-01",
        "valid_to": "2026-12-31",
        "description": "Direct point-to-point low-cost cargo services to Malaysia & Southeast Asia.",
    },
]


class TariffRegistryService:
    """
    Manages known airline carriers, their active rate circulars, and corridor tariffs.
    Thread-safe in-memory state with baseline seeding from AIRLINE_TARIFFS.
    """

    def __init__(self):
        self._lock = threading.Lock()
        self._registry: Dict[str, Dict[str, Any]] = {}
        self._custom_rates: Dict[str, List[Dict[str, Any]]] = {}
        self._baseline_carrier_rates: Dict[str, List[Dict[str, Any]]] = {}
        self._initialize_registry()

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
            info = self._registry.get(code)
            return dict(info) if info else None

    def get_carrier_rates(self, carrier_code: str) -> List[Dict[str, Any]]:
        """
        Return all active corridor rates for this carrier.
        DSA: O(1) hash bucket lookup via inverted index, replacing O(N) scan over ~3000 tariffs.
        """
        code = carrier_code.upper().strip()
        with self._lock:
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

    def register_circular_upload(
        self,
        carrier_code: str,
        filename: str,
        extracted_records: List[Dict[str, Any]],
        currency: str = "INR",
        valid_from: Optional[str] = None,
        valid_to: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Register a newly parsed PDF circular for a carrier.
        Updates metadata, stores extracted records, and sets status to ACTIVE.
        """
        code = carrier_code.upper().strip()
        now_iso = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

        with self._lock:
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

            # Update or fallback dates
            v_from = valid_from or datetime.now(timezone.utc).strftime("%Y-%m-01")
            v_to = valid_to or "2026-12-31"

            # If parser returned records, store them as custom rates
            if extracted_records:
                self._custom_rates[code] = extracted_records
                corridor_count = len(extracted_records)
                sample = [r.get("destination", "") for r in extracted_records[:4] if r.get("destination")]
            else:
                existing = [t for t in AIRLINE_TARIFFS if t.get("carrier_code") == code]
                corridor_count = len(existing)
                sample = [t["destination"] for t in existing[:4]]

            self._registry[code]["has_active_circular"] = True
            self._registry[code]["total_corridors"] = corridor_count
            self._registry[code]["corridors_sample"] = sample
            self._registry[code]["active_circular"] = {
                "filename": filename,
                "uploaded_at": now_iso,
                "valid_from": v_from,
                "valid_to": v_to,
                "currency": currency.upper().strip(),
                "corridor_count": corridor_count,
                "status": "ACTIVE",
            }

            return dict(self._registry[code])

    def clear_carrier_circular(self, carrier_code: str) -> Optional[Dict[str, Any]]:
        """
        Deactivate and clear an active circular for a carrier.
        Resets active_circular to None and status to NO_CIRCULAR.
        """
        code = carrier_code.upper().strip()
        with self._lock:
            if code not in self._registry:
                return None

            # Remove custom rates
            if code in self._custom_rates:
                del self._custom_rates[code]

            self._registry[code]["has_active_circular"] = False
            self._registry[code]["active_circular"] = None
            self._registry[code]["total_corridors"] = 0
            self._registry[code]["corridors_sample"] = []

            return dict(self._registry[code])


# Global singleton instance
tariff_registry_service = TariffRegistryService()
