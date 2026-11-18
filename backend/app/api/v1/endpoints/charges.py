from typing import Any, Dict, List
from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.core.security import UserSession, get_current_user, verify_pricing_head
from app.schemas.charge import (
    ChargeRule,
    ChargeRuleCreate,
    ChargeRuleUpdate,
)
from app.services.charges_service import ChargesService, charges_service

router = APIRouter(prefix="/charges", tags=["Charges Management"])


def get_charges_service() -> ChargesService:
    """Dependency provider returning singleton charges_service instance."""
    return charges_service


@router.get("", response_model=List[ChargeRule])
async def list_charges(
    active_only: bool = Query(default=False, description="Filter for only active charges"),
    current_user: UserSession = Depends(get_current_user),
    service: ChargesService = Depends(get_charges_service),
) -> List[ChargeRule]:
    """
    List all configured gateway and statutory charges ex-BOM.
    Accessible to all authenticated roles (PRICING_HEAD and COORDINATOR).
    """
    if active_only:
        return service.get_active_charges()
    return service.get_all_charges()


@router.post("", response_model=ChargeRule, status_code=status.HTTP_201_CREATED)
async def create_charge(
    charge_in: ChargeRuleCreate,
    current_user: UserSession = Depends(verify_pricing_head),
    service: ChargesService = Depends(get_charges_service),
) -> ChargeRule:
    """
    Create a new custom charge rule.
    Restricted to Pricing Team Head (PRICING_HEAD).
    Audit trail author is automatically recorded from X-Admin-User.
    """
    try:
        return service.create_charge(charge_in, user=current_user.username)
    except ValueError as val_err:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(val_err),
        )


@router.post("/reset-defaults", response_model=List[ChargeRule])
async def reset_charges_to_defaults(
    current_user: UserSession = Depends(verify_pricing_head),
    service: ChargesService = Depends(get_charges_service),
) -> List[ChargeRule]:
    """
    Reset charges configuration back to baseline default MIAL tariffs ex-BOM.
    Restricted to Pricing Team Head (PRICING_HEAD).
    """
    return service.reset_to_defaults()


@router.get("/{charge_id}", response_model=ChargeRule)
async def get_charge(
    charge_id: str,
    current_user: UserSession = Depends(get_current_user),
    service: ChargesService = Depends(get_charges_service),
) -> ChargeRule:
    """
    Retrieve a specific statutory or gateway charge by its unique identifier.
    Accessible to all authenticated roles.
    """
    charge = service.get_charge_by_id(charge_id)
    if not charge:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Charge rule with id '{charge_id}' not found.",
        )
    return charge


@router.put("/{charge_id}", response_model=ChargeRule)
async def update_charge(
    charge_id: str,
    charge_in: ChargeRuleUpdate,
    current_user: UserSession = Depends(verify_pricing_head),
    service: ChargesService = Depends(get_charges_service),
) -> ChargeRule:
    """
    Update an existing charge rule with partial modifications.
    Restricted to Pricing Team Head (PRICING_HEAD).
    Audit trail author is automatically updated from X-Admin-User.
    """
    updated = service.update_charge(
        charge_id=charge_id, charge_in=charge_in, user=current_user.username
    )
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Charge rule with id '{charge_id}' not found.",
        )
    return updated


@router.delete("/{charge_id}", response_model=Dict[str, Any])
async def delete_charge(
    charge_id: str,
    current_user: UserSession = Depends(verify_pricing_head),
    service: ChargesService = Depends(get_charges_service),
) -> Dict[str, Any]:
    """
    Delete or deactivate a charge rule.
    Restricted to Pricing Team Head (PRICING_HEAD).
    Baseline charges are safely deactivated; custom charges are purged from persistence.
    """
    deleted = service.delete_charge(charge_id=charge_id, user=current_user.username)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Charge rule with id '{charge_id}' not found.",
        )
    return {"status": "deleted", "charge_id": charge_id}
