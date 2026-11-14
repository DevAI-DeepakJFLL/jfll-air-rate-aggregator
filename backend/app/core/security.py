from fastapi import HTTPException, Security, status
from fastapi.security import APIKeyHeader
from app.core.config import settings

api_key_header = APIKeyHeader(name="X-Admin-Key", auto_error=False)


async def verify_admin_key(api_key: str = Security(api_key_header)) -> bool:
    """
    RBAC dependency: Protects admin ingestion endpoints.
    Requires a valid 'X-Admin-Key' HTTP header.
    """
    if not api_key or api_key != settings.ADMIN_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Unauthorized: Valid X-Admin-Key header required for tariff ingestion.",
            headers={"WWW-Authenticate": "ApiKey"},
        )
    return True
