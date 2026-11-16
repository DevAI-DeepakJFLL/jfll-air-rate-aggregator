import json
import logging
import os
import tempfile
import threading
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, List, Optional, Union

from app.schemas.charge import (
    ChargeRule,
    ChargeRuleCreate,
    ChargeRuleUpdate,
)

logger = logging.getLogger(__name__)

# Base storage paths
DATA_DIR = Path(__file__).resolve().parent.parent.parent / "data"
IS_LAMBDA = bool(os.environ.get("AWS_LAMBDA_FUNCTION_NAME"))
DEFAULT_CONFIG_PATH = Path("/tmp/charges_config.json") if IS_LAMBDA else (DATA_DIR / "charges_config.json")
DEFAULT_SEED_PATH = DATA_DIR / "default_charges.json"

# Fallback baseline charges for self-healing
FALLBACK_BASELINE_CHARGES = [
    {
        "id": "chg_xray",
        "code": "XBC",
        "name": "Airport X-Ray Screening",
        "description": "MIAL mandatory physical security screening ex-BOM",
        "category": "TERMINAL",
        "calculation_type": "PER_KG_WITH_MIN",
        "rate_per_kg": 3.50,
        "min_amount": 550.00,
        "flat_amount": None,
        "percentage_rate": None,
        "rate_per_piece": None,
        "applicability": {
            "corridor_scope": "GLOBAL",
            "destination_codes": [],
            "commodity_scope": "ALL",
            "commodity_keywords": [],
            "carrier_scope": "ALL",
            "carrier_codes": [],
            "min_chargeable_weight": None,
        },
        "is_active": True,
        "is_statutory": True,
        "display_order": 1,
        "created_at": "2025-01-01T00:00:00Z",
        "updated_at": "2025-01-01T00:00:00Z",
        "updated_by": "system",
    },
    {
        "id": "chg_carting",
        "code": "CTG",
        "name": "Terminal Handling & Carting",
        "description": "MIAL terminal cargo handling and carting verification ex-BOM",
        "category": "TERMINAL",
        "calculation_type": "PER_KG_WITH_MIN",
        "rate_per_kg": 3.00,
        "min_amount": 500.00,
        "flat_amount": None,
        "percentage_rate": None,
        "rate_per_piece": None,
        "applicability": {
            "corridor_scope": "GLOBAL",
            "destination_codes": [],
            "commodity_scope": "ALL",
            "commodity_keywords": [],
            "carrier_scope": "ALL",
            "carrier_codes": [],
            "min_chargeable_weight": None,
        },
        "is_active": True,
        "is_statutory": True,
        "display_order": 2,
        "created_at": "2025-01-01T00:00:00Z",
        "updated_at": "2025-01-01T00:00:00Z",
        "updated_by": "system",
    },
    {
        "id": "chg_dgr",
        "code": "RAC",
        "name": "Statutory DGR Physical Inspection",
        "description": "MIAL Dangerous Goods Desk mandatory physical acceptance checklist & verification",
        "category": "COMMODITY",
        "calculation_type": "FLAT",
        "rate_per_kg": None,
        "min_amount": None,
        "flat_amount": 3500.00,
        "percentage_rate": None,
        "rate_per_piece": None,
        "applicability": {
            "corridor_scope": "GLOBAL",
            "destination_codes": [],
            "commodity_scope": "SPECIFIC_COMMODITIES",
            "commodity_keywords": ["DGR", "DANGEROUS", "HAZARDOUS", "RADIOACTIVE"],
            "carrier_scope": "ALL",
            "carrier_codes": [],
            "min_chargeable_weight": None,
        },
        "is_active": True,
        "is_statutory": True,
        "display_order": 3,
        "created_at": "2025-01-01T00:00:00Z",
        "updated_at": "2025-01-01T00:00:00Z",
        "updated_by": "system",
    },
    {
        "id": "chg_cold_chain",
        "code": "COL",
        "name": "Cold Chain / Pharma CRT Handling",
        "description": "MIAL Export Cold Zone temperature-controlled storage and tarmac reefer-dolly transfer",
        "category": "COMMODITY",
        "calculation_type": "PER_KG_WITH_MIN",
        "rate_per_kg": 2.50,
        "min_amount": 1500.00,
        "flat_amount": None,
        "percentage_rate": None,
        "rate_per_piece": None,
        "applicability": {
            "corridor_scope": "GLOBAL",
            "destination_codes": [],
            "commodity_scope": "SPECIFIC_COMMODITIES",
            "commodity_keywords": ["PHARMA", "COLD", "CRT", "PERISHABLE"],
            "carrier_scope": "ALL",
            "carrier_codes": [],
            "min_chargeable_weight": None,
        },
        "is_active": True,
        "is_statutory": False,
        "display_order": 4,
        "created_at": "2025-01-01T00:00:00Z",
        "updated_at": "2025-01-01T00:00:00Z",
        "updated_by": "system",
    },
    {
        "id": "chg_eawb",
        "code": "CGC",
        "name": "Electronic AWB Fee",
        "description": "Airline CCS & Indian Customs ICEGATE EDI message transmission fee",
        "category": "DOCUMENTATION",
        "calculation_type": "FLAT",
        "rate_per_kg": None,
        "min_amount": None,
        "flat_amount": 800.00,
        "percentage_rate": None,
        "rate_per_piece": None,
        "applicability": {
            "corridor_scope": "GLOBAL",
            "destination_codes": [],
            "commodity_scope": "ALL",
            "commodity_keywords": [],
            "carrier_scope": "ALL",
            "carrier_codes": [],
            "min_chargeable_weight": None,
        },
        "is_active": True,
        "is_statutory": False,
        "display_order": 5,
        "created_at": "2025-01-01T00:00:00Z",
        "updated_at": "2025-01-01T00:00:00Z",
        "updated_by": "system",
    },
    {
        "id": "chg_ams",
        "code": "CCC",
        "name": "Customs Advance Manifest Fee (AMS)",
        "description": "US CBP / Canada CBSA Air Automated Manifest System advance security filing",
        "category": "CUSTOMS",
        "calculation_type": "FLAT",
        "rate_per_kg": None,
        "min_amount": None,
        "flat_amount": 950.00,
        "percentage_rate": None,
        "rate_per_piece": None,
        "applicability": {
            "corridor_scope": "SPECIFIC_COUNTRIES",
            "destination_codes": [
                "US", "CA", "JFK", "ORD", "LAX", "SFO", "MIA", "ATL",
                "DFW", "BOS", "IAD", "IAH", "SEA", "YYZ", "YVR", "YUL", "EWR",
                "DTW", "MSP", "PHL", "CLT", "DEN"
            ],
            "commodity_scope": "ALL",
            "commodity_keywords": [],
            "carrier_scope": "ALL",
            "carrier_codes": [],
            "min_chargeable_weight": None,
        },
        "is_active": True,
        "is_statutory": True,
        "display_order": 6,
        "created_at": "2025-01-01T00:00:00Z",
        "updated_at": "2025-01-01T00:00:00Z",
        "updated_by": "system",
    },
    {
        "id": "chg_gst",
        "code": "GST",
        "name": "Statutory Indian Air Export GST",
        "description": "Ministry of Finance (CBIC) Notification No. 04/2022-Central Tax (Rate) 5% GST",
        "category": "STATUTORY_TAX",
        "calculation_type": "PERCENTAGE",
        "rate_per_kg": None,
        "min_amount": None,
        "flat_amount": None,
        "percentage_rate": 5.0,
        "rate_per_piece": None,
        "applicability": {
            "corridor_scope": "GLOBAL",
            "destination_codes": [],
            "commodity_scope": "ALL",
            "commodity_keywords": [],
            "carrier_scope": "ALL",
            "carrier_codes": [],
            "min_chargeable_weight": None,
        },
        "is_active": True,
        "is_statutory": True,
        "display_order": 7,
        "created_at": "2025-01-01T00:00:00Z",
        "updated_at": "2025-01-01T00:00:00Z",
        "updated_by": "system",
    },
]


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
        logger.error(f"Failed to atomically write configuration to {file_path}: {err}")
        temp_file.close()
        if temp_path.exists():
            try:
                temp_path.unlink()
            except OSError:
                pass
        raise


_invalidation_callbacks: List[Any] = []


def register_charges_invalidation_callback(cb: Any) -> None:
    """
    Registers a callback invoked whenever charges configuration is mutated or reloaded.
    """
    if cb not in _invalidation_callbacks:
        _invalidation_callbacks.append(cb)


def _invalidate_rate_engine_cache() -> None:
    """
    Clears the pure buy rate LRU cache in rate_engine to ensure
    pricing immediately reflects modified or reset charges.
    """
    try:
        from app.services.rate_engine import clear_pure_buy_rate_cache
        clear_pure_buy_rate_cache()
    except Exception as e:
        logger.debug(f"Rate cache invalidation hook skipped: {e}")


class ChargesService:
    """
    Thread-safe and atomic CRUD persistence service for Statutory & Gateway Charges.
    DSA Optimization:
    - O(1) Primary Key Index (_id_to_charge) for fast single-charge lookups.
    - Pre-sorted and pre-partitioned active charges cached in memory for sub-microsecond rate engine evaluation.
    """

    def __init__(
        self,
        config_path: Optional[Union[str, Path]] = None,
        seed_path: Optional[Union[str, Path]] = None,
    ):
        self.config_path = Path(config_path) if config_path else DEFAULT_CONFIG_PATH
        self.seed_path = Path(seed_path) if seed_path else DEFAULT_SEED_PATH
        self._lock = threading.RLock()
        self._cached_charges: Optional[List[ChargeRule]] = None
        self._id_to_charge: Dict[str, ChargeRule] = {}
        self._sorted_all_charges: Optional[List[ChargeRule]] = None
        self._sorted_active_charges: Optional[List[ChargeRule]] = None
        self._last_mtime: float = 0.0
        self._version: int = 1
        self._ensure_initialized()

    def get_charges_generation(self) -> str:
        """
        Returns cache generation key based on mutation version and file mtime.
        Used by rate_engine to guarantee LRU memoization keys invalidate across changes.
        """
        with self._lock:
            try:
                mtime = self.config_path.stat().st_mtime
            except OSError:
                mtime = 0.0
            return f"v{self._version}_m{mtime}"

    def _notify_mutation(self) -> None:
        """
        Bumps cache generation and triggers invalidation hooks.
        """
        self._version += 1
        _invalidate_rate_engine_cache()
        for cb in _invalidation_callbacks:
            try:
                cb()
            except Exception as e:
                logger.warning(f"Error in charges invalidation callback: {e}")

    def _ensure_initialized(self) -> None:
        """
        Initializes the configuration file if it does not exist by copying from seed data.
        """
        with self._lock:
            if not self.config_path.exists():
                seed_data = None
                if self.seed_path.exists():
                    try:
                        with open(self.seed_path, "r", encoding="utf-8") as f:
                            seed_data = json.load(f)
                    except Exception as e:
                        logger.warning(f"Failed to read seed charges file {self.seed_path}: {e}")

                if not seed_data:
                    seed_data = FALLBACK_BASELINE_CHARGES

                _atomic_write_json(self.config_path, seed_data)

    def _update_in_memory_indexes(self, charges: List[ChargeRule]) -> None:
        """
        DSA Helper: Rebuilds hash index and sorted partitions in O(N log N) once per reload.
        Enables O(1) ID lookups and O(1) active rule retrieval.
        """
        self._cached_charges = charges
        self._id_to_charge = {c.id: c for c in charges}
        self._sorted_all_charges = sorted(charges, key=lambda c: (c.display_order, c.code))
        self._sorted_active_charges = [c for c in self._sorted_all_charges if c.is_active]

    def _read_charges(self) -> List[ChargeRule]:
        """
        Reads and parses charges from the active configuration file.
        Uses mtime caching under lock for sub-microsecond retrieval.
        """
        with self._lock:
            self._ensure_initialized()
            try:
                current_mtime = self.config_path.stat().st_mtime
                if self._cached_charges is not None and current_mtime == self._last_mtime:
                    return [c.model_copy() for c in self._cached_charges]

                is_external_change = (self._cached_charges is not None and current_mtime != self._last_mtime)

                with open(self.config_path, "r", encoding="utf-8") as f:
                    raw_data = json.load(f)

                parsed_charges = [ChargeRule(**item) for item in raw_data]
                self._update_in_memory_indexes(parsed_charges)
                self._last_mtime = current_mtime
                if is_external_change:
                    self._notify_mutation()
                return [c.model_copy() for c in parsed_charges]
            except Exception as e:
                logger.error(f"Error reading charges from {self.config_path}: {e}. Falling back to baseline.")
                fallback = [ChargeRule(**item) for item in FALLBACK_BASELINE_CHARGES]
                self._write_charges(fallback)
                return [c.model_copy() for c in fallback]

    def _write_charges(self, charges: List[ChargeRule]) -> None:
        """
        Persists charge rules atomically to disk and refreshes memory indexes.
        """
        with self._lock:
            serialized = [c.model_dump() for c in charges]
            _atomic_write_json(self.config_path, serialized)
            self._update_in_memory_indexes([c.model_copy() for c in charges])
            try:
                self._last_mtime = self.config_path.stat().st_mtime
            except OSError:
                self._last_mtime = 0.0
            self._notify_mutation()

    def get_all_charges(self) -> List[ChargeRule]:
        """
        Returns all configured charges sorted by display_order ascending, then code.
        DSA: O(N) copy from pre-sorted in-memory partition.
        """
        with self._lock:
            self._read_charges()
            if self._sorted_all_charges is not None:
                return [c.model_copy() for c in self._sorted_all_charges]
            charges = self._cached_charges or []
            return sorted([c.model_copy() for c in charges], key=lambda c: (c.display_order, c.code))

    def get_active_charges(self) -> List[ChargeRule]:
        """
        Returns only active charges (is_active == True) sorted by display_order.
        DSA: O(A) copy from pre-filtered in-memory partition (sub-microsecond).
        """
        with self._lock:
            self._read_charges()
            if self._sorted_active_charges is not None:
                return [c.model_copy() for c in self._sorted_active_charges]
            return [c for c in self.get_all_charges() if c.is_active]

    def get_charge_by_id(self, charge_id: str) -> Optional[ChargeRule]:
        """
        Retrieves a single charge rule by its unique identifier.
        DSA: O(1) hash map lookup via _id_to_charge index.
        """
        with self._lock:
            self._read_charges()
            charge = self._id_to_charge.get(charge_id)
            return charge.model_copy() if charge else None

    def create_charge(self, charge_in: ChargeRuleCreate, user: str = "system") -> ChargeRule:
        """
        Creates and persists a new custom charge rule.
        Assigns a unique identifier (chg_custom_<uuid>), timestamps, and audit author.
        """
        with self._lock:
            charges = self._read_charges()
            charge_id = f"chg_custom_{uuid.uuid4().hex[:8]}"
            now_iso = datetime.now(timezone.utc).isoformat()

            charge_dict = charge_in.model_dump()
            charge_dict["id"] = charge_id
            charge_dict["created_at"] = now_iso
            charge_dict["updated_at"] = now_iso
            charge_dict["updated_by"] = user

            new_charge = ChargeRule(**charge_dict)
            charges.append(new_charge)
            self._write_charges(charges)
            return new_charge

    def update_charge(
        self,
        charge_id: str,
        charge_in: ChargeRuleUpdate,
        user: str = "system",
    ) -> Optional[ChargeRule]:
        """
        Updates an existing charge rule with partial attributes.
        Returns the updated ChargeRule, or None if charge_id is not found.
        """
        with self._lock:
            charges = self._read_charges()
            target_idx = None
            for idx, c in enumerate(charges):
                if c.id == charge_id:
                    target_idx = idx
                    break

            if target_idx is None:
                return None

            target = charges[target_idx]
            update_data = charge_in.model_dump(exclude_unset=True)
            if not update_data:
                return target

            current_dict = target.model_dump()
            for key, val in update_data.items():
                if key == "applicability" and val is not None:
                    current_dict["applicability"] = val
                else:
                    current_dict[key] = val

            current_dict["updated_at"] = datetime.now(timezone.utc).isoformat()
            current_dict["updated_by"] = user

            updated_charge = ChargeRule(**current_dict)
            charges[target_idx] = updated_charge
            self._write_charges(charges)
            return updated_charge

    def delete_charge(self, charge_id: str, user: str = "system") -> bool:
        """
        Deletes custom charges permanently, or deactivates baseline statutory charges.
        Returns True if found and modified/deleted, False if charge_id not found.
        """
        with self._lock:
            charges = self._read_charges()
            target_idx = None
            for idx, c in enumerate(charges):
                if c.id == charge_id:
                    target_idx = idx
                    break

            if target_idx is None:
                return False

            target = charges[target_idx]
            if target.id.startswith("chg_custom_"):
                # Custom charge: permanently remove from storage
                charges.pop(target_idx)
            else:
                # Baseline charge: deactivate
                now_iso = datetime.now(timezone.utc).isoformat()
                current_dict = target.model_dump()
                current_dict["is_active"] = False
                current_dict["updated_at"] = now_iso
                current_dict["updated_by"] = user
                charges[target_idx] = ChargeRule(**current_dict)

            self._write_charges(charges)
            return True

    def reset_to_defaults(self) -> List[ChargeRule]:
        """
        Resets charges configuration back to baseline defaults.
        Replaces charges_config.json with default_charges.json contents.
        """
        with self._lock:
            if self.seed_path.exists():
                with open(self.seed_path, "r", encoding="utf-8") as f:
                    seed_data = json.load(f)
                baseline_rules = [ChargeRule(**item) for item in seed_data]
            else:
                baseline_rules = [ChargeRule(**item) for item in FALLBACK_BASELINE_CHARGES]

            self._write_charges(baseline_rules)
            return self.get_all_charges()


# Singleton default instance
charges_service = ChargesService()


def get_all_charges() -> List[ChargeRule]:
    return charges_service.get_all_charges()


def get_active_charges() -> List[ChargeRule]:
    return charges_service.get_active_charges()


def get_charge_by_id(charge_id: str) -> Optional[ChargeRule]:
    return charges_service.get_charge_by_id(charge_id)


def create_charge(charge_in: ChargeRuleCreate, user: str = "system") -> ChargeRule:
    return charges_service.create_charge(charge_in, user)


def update_charge(
    charge_id: str, charge_in: ChargeRuleUpdate, user: str = "system"
) -> Optional[ChargeRule]:
    return charges_service.update_charge(charge_id, charge_in, user)


def delete_charge(charge_id: str, user: str = "system") -> bool:
    return charges_service.delete_charge(charge_id, user)


def reset_to_defaults() -> List[ChargeRule]:
    return charges_service.reset_to_defaults()


def get_charges_generation() -> str:
    return charges_service.get_charges_generation()
