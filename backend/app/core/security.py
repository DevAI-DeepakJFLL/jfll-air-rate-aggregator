import secrets
from enum import Enum
from typing import Optional
from fastapi import Depends, HTTPException, Security, status
from fastapi.security import APIKeyHeader
from app.core.config import settings

api_key_header = APIKeyHeader(name="X-Admin-Key", auto_error=False)
admin_role_header = APIKeyHeader(name="X-Admin-Role", auto_error=False)
admin_user_header = APIKeyHeader(name="X-Admin-User", auto_error=False)


class Role(str, Enum):
    PRICING_HEAD = "PRICING_HEAD"
    COORDINATOR = "COORDINATOR"


class UserSession(dict):
    """
    Session object for authenticated operators.
    Inherits from dict for JSON/dict compatibility while providing property access.
    """

    @property
    def role(self) -> str:
        return self["role"]

    @property
    def username(self) -> str:
        return self["username"]


async def verify_admin_key(api_key: str = Security(api_key_header)) -> bool:
    """
    RBAC dependency: Protects admin ingestion endpoints.
    Requires a valid 'X-Admin-Key' HTTP header.
    Accepts ADMIN_API_KEY (Pricing Head) or COORDINATOR_API_KEY.
    """
    is_head = bool(api_key and secrets.compare_digest(api_key, settings.ADMIN_API_KEY))
    coord_key = getattr(settings, "COORDINATOR_API_KEY", None)
    is_coord = bool(api_key and coord_key and secrets.compare_digest(api_key, coord_key))
    if not (is_head or is_coord):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Unauthorized: Valid X-Admin-Key header required for tariff ingestion.",
            headers={"WWW-Authenticate": "ApiKey"},
        )
    return True


async def get_current_user(
    api_key: Optional[str] = Security(api_key_header),
    role: Optional[str] = Security(admin_role_header),
    user: Optional[str] = Security(admin_user_header),
) -> UserSession:
    """
    Authenticates operator via X-Admin-Key and extracts role & user identity.
    Enforces server-side privilege:
    - If authenticated via COORDINATOR_API_KEY, strictly locked to COORDINATOR (cannot self-escalate via header).
    - If X-Admin-Role is omitted, defaults to COORDINATOR (Principle of Least Privilege; write endpoints require explicit PRICING_HEAD).
    - If authenticated via ADMIN_API_KEY with X-Admin-Role: PRICING_HEAD, grants PRICING_HEAD.
    """
    is_head = bool(api_key and secrets.compare_digest(api_key, settings.ADMIN_API_KEY))
    coord_key = getattr(settings, "COORDINATOR_API_KEY", None)
    is_coord = bool(api_key and coord_key and secrets.compare_digest(api_key, coord_key))

    if not (is_head or is_coord):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Unauthorized: Valid X-Admin-Key header required.",
            headers={"WWW-Authenticate": "ApiKey"},
        )

    valid_roles = {r.value for r in Role}
    if role and role.strip():
        raw_role = role.strip().upper()
        assigned_role = raw_role if raw_role in valid_roles else Role.COORDINATOR.value
    else:
        assigned_role = Role.COORDINATOR.value  # Least privilege: default to COORDINATOR

    if is_coord and not is_head:
        # Strictly enforce least-privilege: coordinator keys cannot escalate to PRICING_HEAD
        assigned_role = Role.COORDINATOR.value

    assigned_user = user.strip() if user and user.strip() else "deepak.naidu@jfll.com"

    return UserSession({
        "role": assigned_role,
        "username": assigned_user,
    })


async def verify_pricing_head(
    current_user: UserSession = Depends(get_current_user),
) -> UserSession:
    """
    RBAC authorization guard: Restricts write operations to Pricing Team Head.
    Raises 403 Forbidden for COORDINATOR or other non-PRICING_HEAD roles.
    """
    if current_user.get("role") != Role.PRICING_HEAD.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Operation restricted to Pricing Team Head.",
        )
    return current_user
