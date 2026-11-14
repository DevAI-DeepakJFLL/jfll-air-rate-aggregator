import json
import os
from typing import List, Union
from pydantic import AnyHttpUrl, field_validator, model_validator

try:
    from pydantic_settings import BaseSettings, SettingsConfigDict
except ImportError:
    from pydantic import BaseModel as BaseSettings
    SettingsConfigDict = None


class Settings(BaseSettings):
    ENVIRONMENT: str = "development"
    APP_NAME: str = "Jet Freight Rate Aggregator API"
    SECRET_KEY: str = "default-insecure-secret-key-change-in-production"
    ADMIN_API_KEY: str = "dev-admin-api-key-change-in-production"
    
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

    # Ingestion Security Limits
    MAX_UPLOAD_SIZE_BYTES: int = 20 * 1024 * 1024  # 20 MB max file upload
    MAX_PDF_PAGES: int = 50                         # Mitigate decompression bombs

    # AWS Free Tier S3 Storage
    AWS_REGION: str = "ap-south-1"
    AWS_S3_BUCKET_NAME: str = "jfll-rate-sheets"
    AWS_ACCESS_KEY_ID: str = ""
    AWS_SECRET_ACCESS_KEY: str = ""

    # AI Multimodal Parsing
    GEMINI_API_KEY: str = ""

    if SettingsConfigDict is not None:
        model_config = SettingsConfigDict(
            env_file=".env",
            env_file_encoding="utf-8",
            extra="ignore"
        )
    else:
        model_config = {"extra": "ignore"}

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str):
            if v.startswith("[") and v.endswith("]"):
                try:
                    return json.loads(v)
                except Exception:
                    pass
            return [i.strip() for i in v.split(",") if i.strip()]
        return v

    @model_validator(mode="after")
    def validate_production_secrets(self) -> "Settings":
        if self.ENVIRONMENT.lower() == "production":
            if self.SECRET_KEY == "default-insecure-secret-key-change-in-production" or len(self.SECRET_KEY) < 32:
                raise ValueError("CRITICAL SECURITY RISK: Production requires a secure SECRET_KEY of at least 32 characters.")
            if self.ADMIN_API_KEY == "dev-admin-api-key-change-in-production":
                raise ValueError("CRITICAL SECURITY RISK: Production requires a dedicated, non-default ADMIN_API_KEY.")
        return self


settings = Settings()
