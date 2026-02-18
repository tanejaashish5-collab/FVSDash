"""
Storage Service for ForgeVoice Studio.

This is the PRIMARY MEDIA STORE for all generated and uploaded media files.
Uploads files to S3 or S3-compatible storage (AWS S3, Cloudflare R2, MinIO, etc.)
and returns public URLs.

Configuration (via environment variables):
    AWS_ACCESS_KEY_ID       - S3 access key
    AWS_SECRET_ACCESS_KEY   - S3 secret key  
    AWS_S3_BUCKET           - Bucket name (e.g., "forgevoice-media")
    AWS_REGION              - AWS region (e.g., "us-east-1")
    AWS_S3_ENDPOINT_URL     - Optional: Custom endpoint for R2/MinIO

Behavior:
    - If S3 is configured, ForgeVoice will prefer S3 URLs for all media.
    - If not configured, callers should fall back to provider URLs with a warning.
    - Upload failures raise StorageUploadError; callers decide on fallback behavior.
"""
import os
import uuid
import logging
from datetime import datetime, timezone
from typing import Optional

import boto3
from botocore.exceptions import ClientError, NoCredentialsError

logger = logging.getLogger(__name__)


class StorageNotConfiguredError(Exception):
    """Raised when S3 storage is not configured (missing required env vars)."""
    pass


class StorageUploadError(Exception):
    """Raised when an S3 upload fails."""
    pass


def get_storage_config() -> dict:
    """
    Get S3 storage configuration from environment variables.
    
    Returns:
        dict with storage config and status
    """
    access_key = os.environ.get("AWS_ACCESS_KEY_ID")
    secret_key = os.environ.get("AWS_SECRET_ACCESS_KEY")
    bucket = os.environ.get("AWS_S3_BUCKET")
    region = os.environ.get("AWS_REGION", "us-east-1")
    endpoint_url = os.environ.get("AWS_S3_ENDPOINT_URL")  # Optional for R2/MinIO
    
    is_configured = all([access_key, secret_key, bucket])
    
    return {
        "provider": "s3" if is_configured else "none",
        "configured": is_configured,
        "bucket": bucket,
        "region": region,
        "has_custom_endpoint": bool(endpoint_url),
        "note": "S3 storage configured" if is_configured else "S3 not configured. Media will use provider URLs."
    }


def _get_s3_client():
    """
    Initialize and return an S3 client.
    
    Raises:
        StorageNotConfiguredError: If required env vars are missing
    """
    access_key = os.environ.get("AWS_ACCESS_KEY_ID")
    secret_key = os.environ.get("AWS_SECRET_ACCESS_KEY")
    bucket = os.environ.get("AWS_S3_BUCKET")
    region = os.environ.get("AWS_REGION", "us-east-1")
    endpoint_url = os.environ.get("AWS_S3_ENDPOINT_URL")
    
    if not all([access_key, secret_key, bucket]):
        missing = []
        if not access_key:
            missing.append("AWS_ACCESS_KEY_ID")
        if not secret_key:
            missing.append("AWS_SECRET_ACCESS_KEY")
        if not bucket:
            missing.append("AWS_S3_BUCKET")
        raise StorageNotConfiguredError(f"S3 storage not configured. Missing: {', '.join(missing)}")
    
    client_kwargs = {
        "aws_access_key_id": access_key,
        "aws_secret_access_key": secret_key,
        "region_name": region,
    }
    
    # Add custom endpoint for S3-compatible services (R2, MinIO, etc.)
    if endpoint_url:
        client_kwargs["endpoint_url"] = endpoint_url
    
    return boto3.client("s3", **client_kwargs), bucket, region, endpoint_url


def _build_object_key(path_hint: str, content_type: str) -> str:
    """
    Build a unique S3 object key from the path hint.
    
    Args:
        path_hint: Suggested path structure (e.g., "client-1/audio/episode-title")
        content_type: MIME type to determine extension
        
    Returns:
        Full object key with timestamp and UUID for uniqueness
    """
    # Determine file extension from content type
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
    ext = ext_map.get(content_type, "bin")
    
    # Generate unique identifier
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")
    unique_id = str(uuid.uuid4())[:8]
    
    # Clean up path hint
    clean_hint = path_hint.strip("/").replace(" ", "-").lower()
    if not clean_hint:
        clean_hint = "media"
    
    return f"{clean_hint}/{timestamp}-{unique_id}.{ext}"


def _build_public_url(bucket: str, region: str, key: str, endpoint_url: Optional[str] = None) -> str:
    """
    Build a public URL for the uploaded object.
    
    Args:
        bucket: S3 bucket name
        region: AWS region
        key: Object key
        endpoint_url: Optional custom endpoint for S3-compatible services
        
    Returns:
        Public URL string
    """
    if endpoint_url:
        # For R2/MinIO with custom domain or public access
        # Format depends on the service configuration
        base = endpoint_url.rstrip("/")
        return f"{base}/{bucket}/{key}"
    else:
        # Standard AWS S3 URL format
        return f"https://{bucket}.s3.{region}.amazonaws.com/{key}"


async def upload_file(
    file_bytes: bytes,
    content_type: str,
    path_hint: str,
    acl: str = "public-read"
) -> str:
    """
    Upload a file to S3 (or S3-compatible storage) and return a public URL.
    
    This is the primary upload function for all ForgeVoice media.
    
    Args:
        file_bytes: The file content as bytes
        content_type: MIME type (e.g., "audio/mpeg", "image/png")
        path_hint: Suggested path structure (e.g., "client-1/submissions/abc123/audio")
        acl: Access control (default: "public-read" for public URLs)
        
    Returns:
        Public URL of the uploaded file
        
    Raises:
        StorageNotConfiguredError: If S3 is not configured
        StorageUploadError: If the upload fails
        
    Example:
        url = await upload_file(
            audio_data,
            "audio/mpeg",
            f"{client_id}/submissions/{submission_id}/audio"
        )
    """
    try:
        s3_client, bucket, region, endpoint_url = _get_s3_client()
    except StorageNotConfiguredError:
        raise
    
    # Build unique object key
    object_key = _build_object_key(path_hint, content_type)
    
    try:
        # Upload to S3
        logger.info(f"Uploading to S3: bucket={bucket}, key={object_key}, size={len(file_bytes)} bytes")
        
        put_kwargs = {
            "Bucket": bucket,
            "Key": object_key,
            "Body": file_bytes,
            "ContentType": content_type,
        }
        
        # Only add ACL if not using a custom endpoint (some S3-compatible services don't support it)
        if not endpoint_url:
            put_kwargs["ACL"] = acl
        
        s3_client.put_object(**put_kwargs)
        
        # Build and return public URL
        public_url = _build_public_url(bucket, region, object_key, endpoint_url)
        
        logger.info(f"S3 upload successful: {public_url}")
        return public_url
        
    except ClientError as e:
        error_code = e.response.get("Error", {}).get("Code", "Unknown")
        error_msg = e.response.get("Error", {}).get("Message", str(e))
        logger.error(f"S3 upload failed: {error_code} - {error_msg}")
        raise StorageUploadError(f"S3 upload failed: {error_code}")
    except NoCredentialsError:
        logger.error("S3 credentials not found")
        raise StorageUploadError("S3 credentials not found")
    except Exception as e:
        logger.error(f"Unexpected S3 upload error: {e}")
        raise StorageUploadError(f"S3 upload failed: {type(e).__name__}")


async def delete_file(object_key: str) -> bool:
    """
    Delete a file from S3.
    
    Args:
        object_key: The S3 object key to delete
        
    Returns:
        True if deleted successfully, False otherwise
    """
    try:
        s3_client, bucket, _, _ = _get_s3_client()
        s3_client.delete_object(Bucket=bucket, Key=object_key)
        logger.info(f"S3 delete successful: {object_key}")
        return True
    except Exception as e:
        logger.error(f"S3 delete failed: {e}")
        return False


def is_storage_configured() -> bool:
    """
    Quick check if S3 storage is configured.
    
    Returns:
        True if all required S3 env vars are set
    """
    return all([
        os.environ.get("AWS_ACCESS_KEY_ID"),
        os.environ.get("AWS_SECRET_ACCESS_KEY"),
        os.environ.get("AWS_S3_BUCKET"),
    ])
