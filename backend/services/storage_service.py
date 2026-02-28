"""
Storage Service for ForgeVoice Studio.

This is the PRIMARY MEDIA STORE for all generated and uploaded media files.
Supports S3 or S3-compatible storage (AWS S3, Cloudflare R2, MinIO, etc.)
with graceful fallback to local filesystem storage.

Configuration (via environment variables):
    AWS_ACCESS_KEY_ID       - S3 access key
    AWS_SECRET_ACCESS_KEY   - S3 secret key  
    AWS_S3_BUCKET           - Bucket name (e.g., "forgevoice-media")
    AWS_REGION              - AWS region (e.g., "ap-south-1")
    AWS_S3_ENDPOINT_URL     - Optional: Custom endpoint for R2/MinIO

Behavior:
    - If S3 is configured: uploads to S3, returns public URLs
    - If S3 not configured: saves to /app/uploads/, returns local paths
    - Local storage warns on startup that files won't persist across restarts
"""
import os
import uuid
import shutil
import logging
import aiofiles
from pathlib import Path
from datetime import datetime, timezone
from typing import Optional, Tuple

logger = logging.getLogger(__name__)

# Local storage directory
LOCAL_STORAGE_DIR = Path("/app/uploads")


class StorageNotConfiguredError(Exception):
    """Raised when S3 storage is not configured (missing required env vars)."""
    pass


class StorageUploadError(Exception):
    """Raised when an upload fails."""
    pass


class StorageService:
    """
    Unified storage service with S3 primary and local fallback.
    """
    
    def __init__(self):
        self.use_s3 = self._check_s3_config()
        self._s3_client = None
        self._bucket = None
        self._region = None
        self._endpoint_url = None
        
        if self.use_s3:
            self._init_s3()
            logger.info(f"StorageService: Using S3 storage (bucket: {self._bucket})")
        else:
            self._ensure_local_storage()
            logger.warning(
                "StorageService: S3 not configured — using local storage. "
                "WARNING: Files will NOT persist across container restarts!"
            )
    
    def _check_s3_config(self) -> bool:
        """Check if S3 is properly configured."""
        return all([
            os.environ.get("AWS_ACCESS_KEY_ID"),
            os.environ.get("AWS_SECRET_ACCESS_KEY"),
            os.environ.get("AWS_S3_BUCKET"),
        ])
    
    def _init_s3(self):
        """Initialize S3 client."""
        import boto3
        
        self._bucket = os.environ.get("AWS_S3_BUCKET")
        self._region = os.environ.get("AWS_REGION", "ap-south-1")
        self._endpoint_url = os.environ.get("AWS_S3_ENDPOINT_URL")
        
        client_kwargs = {
            "aws_access_key_id": os.environ.get("AWS_ACCESS_KEY_ID"),
            "aws_secret_access_key": os.environ.get("AWS_SECRET_ACCESS_KEY"),
            "region_name": self._region,
        }
        
        if self._endpoint_url:
            client_kwargs["endpoint_url"] = self._endpoint_url
        
        self._s3_client = boto3.client("s3", **client_kwargs)
    
    def _ensure_local_storage(self):
        """Ensure local storage directory exists."""
        LOCAL_STORAGE_DIR.mkdir(parents=True, exist_ok=True)
    
    def _get_extension(self, content_type: str) -> str:
        """Get file extension from content type."""
        ext_map = {
            "audio/mpeg": "mp3",
            "audio/mp3": "mp3",
            "audio/wav": "wav",
            "audio/ogg": "ogg",
            "image/png": "png",
            "image/jpeg": "jpg",
            "image/jpg": "jpg",
            "image/webp": "webp",
            "video/mp4": "mp4",
            "video/webm": "webm",
            "application/octet-stream": "bin",
        }
        return ext_map.get(content_type, "bin")
    
    def _build_object_key(self, folder: str, filename: str, content_type: str) -> str:
        """Build unique object key."""
        timestamp = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")
        unique_id = str(uuid.uuid4())[:8]
        ext = self._get_extension(content_type)
        
        # Clean up folder and filename
        clean_folder = folder.strip("/").replace(" ", "-").lower()
        clean_filename = filename.replace(" ", "-").lower() if filename else "file"
        
        return f"{clean_folder}/{clean_filename}-{timestamp}-{unique_id}.{ext}"
    
    async def upload_file(
        self,
        file_data: bytes,
        filename: str,
        content_type: str,
        folder: str = "assets"
    ) -> str:
        """
        Upload a file to storage.
        
        Args:
            file_data: The file content as bytes
            filename: Original filename (for naming)
            content_type: MIME type
            folder: Storage folder/path prefix
            
        Returns:
            URL or path to the uploaded file
            
        Raises:
            StorageUploadError: If upload fails
        """
        object_key = self._build_object_key(folder, filename, content_type)
        
        if self.use_s3:
            return await self._upload_to_s3(file_data, object_key, content_type)
        else:
            return await self._upload_to_local(file_data, object_key)
    
    async def _upload_to_s3(
        self,
        file_data: bytes,
        object_key: str,
        content_type: str
    ) -> str:
        """Upload to S3."""
        from botocore.exceptions import ClientError, NoCredentialsError
        
        try:
            logger.info(f"Uploading to S3: {self._bucket}/{object_key} ({len(file_data)} bytes)")
            
            put_kwargs = {
                "Bucket": self._bucket,
                "Key": object_key,
                "Body": file_data,
                "ContentType": content_type,
            }
            
            # Note: Don't use ACL - bucket may have Object Ownership enforced
            
            self._s3_client.put_object(**put_kwargs)
            
            # Build public URL
            if self._endpoint_url:
                url = f"{self._endpoint_url.rstrip('/')}/{self._bucket}/{object_key}"
            else:
                url = f"https://{self._bucket}.s3.{self._region}.amazonaws.com/{object_key}"
            
            logger.info(f"S3 upload successful: {url}")
            return url
            
        except ClientError as e:
            error_code = e.response.get("Error", {}).get("Code", "Unknown")
            logger.error(f"S3 upload failed: {error_code}")
            raise StorageUploadError(f"S3 upload failed: {error_code}")
        except NoCredentialsError:
            logger.error("S3 credentials not found")
            raise StorageUploadError("S3 credentials not found")
        except Exception as e:
            logger.error(f"S3 upload error: {e}")
            raise StorageUploadError(f"S3 upload failed: {type(e).__name__}")
    
    async def _upload_to_local(self, file_data: bytes, object_key: str) -> str:
        """Upload to local filesystem and return an HTTP-accessible path.

        Files are stored under LOCAL_STORAGE_DIR and served by the FastAPI
        /api/files/{path} endpoint, so the browser can load them directly.
        The key is also stored as local://{path} in internal operations
        (read_file / delete_file) for consistency, but the returned URL is
        the public HTTP path /api/files/{object_key}.
        """
        try:
            file_path = LOCAL_STORAGE_DIR / object_key
            file_path.parent.mkdir(parents=True, exist_ok=True)

            async with aiofiles.open(file_path, "wb") as f:
                await f.write(file_data)

            # Return a browser-accessible URL served by the /api/files endpoint.
            # This avoids the local:// scheme which browsers cannot load.
            http_path = f"/api/files/{object_key}"
            logger.info(f"Local upload successful: {http_path}")
            return http_path

        except Exception as e:
            logger.error(f"Local upload error: {e}")
            raise StorageUploadError(f"Local upload failed: {e}")
    
    async def get_file_url(self, file_path: str, expiry_seconds: int = 3600) -> str:
        """
        Get a usable URL for a file.

        For S3: returns presigned URL with expiry
        For local: returns HTTP-accessible /api/files/ path

        Args:
            file_path: The stored file path (S3 URL, /api/files/ path, or legacy local:// path)
            expiry_seconds: Presigned URL expiry time (S3 only)

        Returns:
            Usable URL or path
        """
        if file_path.startswith("/api/files/"):
            # Already an HTTP-accessible path
            return file_path

        if file_path.startswith("local://"):
            # Legacy format — convert to HTTP path
            actual = Path(file_path[8:])
            relative = str(actual).replace(str(LOCAL_STORAGE_DIR), "").lstrip("/")
            return f"/api/files/{relative}"
        
        if file_path.startswith("s3://"):
            # Parse s3:// URL and generate presigned
            # Format: s3://bucket/key
            parts = file_path[5:].split("/", 1)
            if len(parts) == 2:
                bucket, key = parts
                return self._generate_presigned_url(bucket, key, expiry_seconds)
        
        if self.use_s3 and ("s3.amazonaws.com" in file_path or self._endpoint_url):
            # Already a public S3 URL
            return file_path
        
        # Return as-is for any other URL
        return file_path
    
    def _generate_presigned_url(
        self,
        bucket: str,
        key: str,
        expiry_seconds: int
    ) -> str:
        """Generate a presigned URL for S3 object."""
        try:
            url = self._s3_client.generate_presigned_url(
                "get_object",
                Params={"Bucket": bucket, "Key": key},
                ExpiresIn=expiry_seconds
            )
            return url
        except Exception as e:
            logger.error(f"Failed to generate presigned URL: {e}")
            # Return direct URL as fallback
            return f"https://{bucket}.s3.{self._region}.amazonaws.com/{key}"
    
    async def delete_file(self, file_path: str) -> bool:
        """
        Delete a file from storage.

        Args:
            file_path: The stored file path (S3 URL, /api/files/ path, or legacy local://)

        Returns:
            True if deleted, False otherwise
        """
        try:
            if file_path.startswith("/api/files/"):
                # New format — resolve to actual filesystem path
                relative = file_path[len("/api/files/"):]
                local_path = LOCAL_STORAGE_DIR / relative
                if local_path.exists():
                    local_path.unlink()
                    logger.info(f"Deleted local file: {local_path}")
                return True

            if file_path.startswith("local://"):
                local_path = Path(file_path[8:])
                if local_path.exists():
                    local_path.unlink()
                    logger.info(f"Deleted local file: {local_path}")
                return True
            
            if self.use_s3:
                # Extract key from S3 URL
                if "s3.amazonaws.com" in file_path:
                    key = file_path.split(".amazonaws.com/")[-1]
                elif file_path.startswith("s3://"):
                    key = file_path.split("/", 3)[-1]
                else:
                    key = file_path
                
                self._s3_client.delete_object(Bucket=self._bucket, Key=key)
                logger.info(f"Deleted S3 object: {key}")
                return True
            
            return False
            
        except Exception as e:
            logger.error(f"Delete failed: {e}")
            return False
    
    async def read_file(self, file_path: str) -> Optional[bytes]:
        """
        Read a file from storage.

        Args:
            file_path: The stored file path (S3 URL, /api/files/ path, or legacy local://)

        Returns:
            File bytes or None if not found
        """
        try:
            if file_path.startswith("/api/files/"):
                relative = file_path[len("/api/files/"):]
                local_path = LOCAL_STORAGE_DIR / relative
                if local_path.exists():
                    async with aiofiles.open(local_path, "rb") as f:
                        return await f.read()
                return None

            if file_path.startswith("local://"):
                local_path = Path(file_path[8:])
                if local_path.exists():
                    async with aiofiles.open(local_path, "rb") as f:
                        return await f.read()
                return None
            
            if self.use_s3:
                # Extract key from S3 URL
                if "s3.amazonaws.com" in file_path:
                    key = file_path.split(".amazonaws.com/")[-1]
                elif file_path.startswith("s3://"):
                    key = file_path.split("/", 3)[-1]
                else:
                    # Try direct key
                    key = file_path
                
                response = self._s3_client.get_object(Bucket=self._bucket, Key=key)
                return response["Body"].read()
            
            # For direct URLs, we'd need to fetch via HTTP
            return None
            
        except Exception as e:
            logger.error(f"Read failed: {e}")
            return None
    
    def get_status(self) -> dict:
        """Get storage service status."""
        return {
            "provider": "s3" if self.use_s3 else "local",
            "configured": self.use_s3,
            "bucket": self._bucket if self.use_s3 else None,
            "region": self._region if self.use_s3 else None,
            "local_storage_path": str(LOCAL_STORAGE_DIR) if not self.use_s3 else None,
            "warning": None if self.use_s3 else "Local storage will not persist across restarts"
        }


# Singleton instance
_storage_service: Optional[StorageService] = None


def get_storage_service() -> StorageService:
    """Get the singleton StorageService instance."""
    global _storage_service
    if _storage_service is None:
        _storage_service = StorageService()
    return _storage_service


# Legacy function aliases for backwards compatibility
async def upload_file(
    file_bytes: bytes,
    content_type: str,
    path_hint: str,
    acl: str = "public-read"
) -> str:
    """
    Legacy upload function - delegates to StorageService.
    """
    service = get_storage_service()
    return await service.upload_file(
        file_data=file_bytes,
        filename=path_hint.split("/")[-1] if "/" in path_hint else path_hint,
        content_type=content_type,
        folder="/".join(path_hint.split("/")[:-1]) if "/" in path_hint else "assets"
    )


def is_storage_configured() -> bool:
    """Quick check if S3 storage is configured."""
    return all([
        os.environ.get("AWS_ACCESS_KEY_ID"),
        os.environ.get("AWS_SECRET_ACCESS_KEY"),
        os.environ.get("AWS_S3_BUCKET"),
    ])


def get_storage_config() -> dict:
    """Get storage configuration status."""
    service = get_storage_service()
    return service.get_status()


async def check_local_assets_need_migration() -> dict:
    """
    Check if any assets have local paths that need S3 migration.
    Returns count of assets that need migration.
    """
    from db.mongo import assets_collection
    
    assets_db = assets_collection()
    
    # Count assets with local:// paths
    local_count = await assets_db.count_documents({
        "url": {"$regex": "^local://"}
    })
    
    return {
        "local_assets_count": local_count,
        "needs_migration": local_count > 0 and is_storage_configured()
    }
