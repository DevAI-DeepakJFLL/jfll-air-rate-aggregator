import json
import logging
import os
from pathlib import Path
from typing import Any, Dict, Optional, Union

from app.core.config import settings

logger = logging.getLogger(__name__)

# Conditional boto3 import so local environments without boto3 continue working without crashing
try:
    import boto3
    from botocore.exceptions import BotoCoreError, ClientError
    BOTO3_AVAILABLE = True
except ImportError:
    boto3 = None
    BotoCoreError = Exception
    ClientError = Exception
    BOTO3_AVAILABLE = False


class S3StorageService:
    """
    Durable cloud persistence layer for AWS S3.
    Ensures uploaded PDF circulars, custom tariff matrices, and charge configurations
    persist across AWS Lambda cold-starts, container recycles, and multi-instance scaling.
    Operates with graceful local-disk fallback when S3 is unavailable or unconfigured.
    """

    def __init__(self):
        self._client = None
        self._bucket_name: Optional[str] = None
        self._region: str = settings.AWS_REGION or "ap-south-1"
        self._init_client()

    def _init_client(self) -> None:
        if not BOTO3_AVAILABLE:
            logger.debug("boto3 is not installed. S3 persistence will operate in local fallback mode.")
            return

        # Determine target bucket from settings or environment
        bucket = (
            os.environ.get("AWS_S3_BUCKET_NAME")
            or getattr(settings, "AWS_S3_BUCKET_NAME", "")
            or os.environ.get("S3_BUCKET_NAME")
        )
        if not bucket or not bucket.strip():
            logger.debug("AWS_S3_BUCKET_NAME is not configured. Operating in local filesystem mode.")
            return

        self._bucket_name = bucket.strip()
        region = (
            os.environ.get("AWS_REGION")
            or os.environ.get("AWS_DEFAULT_REGION")
            or self._region
        )

        try:
            # Check for explicit credentials if provided, otherwise let boto3 use Lambda execution role
            key_id = os.environ.get("AWS_ACCESS_KEY_ID") or getattr(settings, "AWS_ACCESS_KEY_ID", "")
            sec_key = os.environ.get("AWS_SECRET_ACCESS_KEY") or getattr(settings, "AWS_SECRET_ACCESS_KEY", "")

            if key_id and sec_key:
                self._client = boto3.client(
                    "s3",
                    region_name=region,
                    aws_access_key_id=key_id,
                    aws_secret_access_key=sec_key,
                )
            else:
                self._client = boto3.client("s3", region_name=region)

            logger.info(f"S3StorageService initialized successfully for bucket '{self._bucket_name}' in region '{region}'.")
        except Exception as e:
            logger.warning(f"Failed to initialize S3 client: {e}. Falling back to local storage.")
            self._client = None

    @property
    def is_enabled(self) -> bool:
        return self._client is not None and bool(self._bucket_name)

    @property
    def bucket_name(self) -> Optional[str]:
        return self._bucket_name

    def upload_json(self, key: str, data: Any) -> bool:
        """Uploads a JSON-serializable dictionary to S3 key."""
        if not self.is_enabled:
            return False
        try:
            json_bytes = json.dumps(data, indent=2, ensure_ascii=False).encode("utf-8")
            self._client.put_object(
                Bucket=self._bucket_name,
                Key=key,
                Body=json_bytes,
                ContentType="application/json",
            )
            logger.info(f"Successfully uploaded JSON to s3://{self._bucket_name}/{key}")
            return True
        except (BotoCoreError, ClientError, Exception) as e:
            logger.warning(f"S3 upload failed for key '{key}': {e}")
            return False

    def download_json(self, key: str) -> Optional[Dict[str, Any]]:
        """Downloads and parses a JSON document from S3 key."""
        if not self.is_enabled:
            return None
        try:
            response = self._client.get_object(Bucket=self._bucket_name, Key=key)
            raw = response["Body"].read().decode("utf-8")
            return json.loads(raw)
        except (BotoCoreError, ClientError, Exception) as e:
            logger.debug(f"S3 key '{key}' not found or unreadable from s3://{self._bucket_name}: {e}")
            return None

    def upload_file(self, local_path: Union[str, Path], key: str, content_type: Optional[str] = None) -> bool:
        """Uploads a local file to S3 key."""
        if not self.is_enabled:
            return False
        p = Path(local_path)
        if not p.exists():
            return False
        try:
            extra_args = {}
            if content_type:
                extra_args["ContentType"] = content_type
            elif p.suffix.lower() == ".pdf":
                extra_args["ContentType"] = "application/pdf"
            elif p.suffix.lower() == ".json":
                extra_args["ContentType"] = "application/json"

            self._client.upload_file(str(p), self._bucket_name, key, ExtraArgs=extra_args or None)
            logger.info(f"Successfully uploaded file to s3://{self._bucket_name}/{key}")
            return True
        except (BotoCoreError, ClientError, Exception) as e:
            logger.warning(f"Failed to upload file '{local_path}' to S3 key '{key}': {e}")
            return False

    def download_file(self, key: str, local_path: Union[str, Path]) -> bool:
        """Downloads an S3 object to a local file path."""
        if not self.is_enabled:
            return False
        p = Path(local_path)
        p.parent.mkdir(parents=True, exist_ok=True)
        try:
            self._client.download_file(self._bucket_name, key, str(p))
            logger.info(f"Successfully downloaded s3://{self._bucket_name}/{key} to {p}")
            return True
        except (BotoCoreError, ClientError, Exception) as e:
            logger.debug(f"Failed to download S3 key '{key}' to '{p}': {e}")
            return False

    def delete_file(self, key: str) -> bool:
        """Deletes an object from S3."""
        if not self.is_enabled:
            return False
        try:
            self._client.delete_object(Bucket=self._bucket_name, Key=key)
            logger.info(f"Successfully deleted s3://{self._bucket_name}/{key}")
            return True
        except (BotoCoreError, ClientError, Exception) as e:
            logger.warning(f"Failed to delete S3 key '{key}': {e}")
            return False

    def get_presigned_download_url(self, key: str, expires_in: int = 3600) -> Optional[str]:
        """Generates a temporary HTTPS presigned URL for direct secure downloading from S3."""
        if not self.is_enabled:
            return None
        try:
            url = self._client.generate_presigned_url(
                "get_object",
                Params={"Bucket": self._bucket_name, "Key": key},
                ExpiresIn=expires_in,
            )
            return url
        except (BotoCoreError, ClientError, Exception) as e:
            logger.warning(f"Failed to generate presigned URL for key '{key}': {e}")
            return None


# Global singleton instance
s3_storage_service = S3StorageService()
