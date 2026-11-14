from typing import List, Union
from pydantic import AnyHttpUrl, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    ENVIRONMENT: str = "development"
    APP_NAME: str = "Jet Freight Rate Aggregator API"
    SECRET_KEY: str = "default-insecure-secret-key-change-in-production"
    
    # Server & CORS
    BACKEND_HOST: str = "0.0.0.0"
    BACKEND_PORT: int = 8000
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]

    # Database
    DATABASE_URL: str = "sqlite+aiosqlite:///./data/rate_aggregator.db"

    # Air Cargo Smalls Ceiling
    MAX_CHARGEABLE_WEIGHT_KG: float = 500.0

    # AWS Free Tier S3 Storage
    AWS_REGION: str = "ap-south-1"
    AWS_S3_BUCKET_NAME: str = "jfll-rate-sheets"
    AWS_ACCESS_KEY_ID: str = ""
    AWS_SECRET_ACCESS_KEY: str = ""

    # AI Multimodal Parsing
    GEMINI_API_KEY: str = ""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )


settings = Settings()
