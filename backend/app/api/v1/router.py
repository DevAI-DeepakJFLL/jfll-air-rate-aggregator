from fastapi import APIRouter
from app.api.v1.endpoints import health, rates, tariffs

api_router = APIRouter()
api_router.include_router(health.router)
api_router.include_router(rates.router)
api_router.include_router(tariffs.router)
