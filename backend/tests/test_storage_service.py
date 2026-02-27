"""
Tests for S3 Storage Service.

Tests cover:
- Upload functionality with mocked S3 client
- Storage not configured exception
- Upload failure handling
- URL building logic
"""
import pytest
from unittest.mock import patch, MagicMock
from botocore.exceptions import ClientError

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


class TestStorageService:
    """Test storage_service functions."""
    
    def test_is_storage_configured_false_when_missing_vars(self):
        """Test is_storage_configured returns False when env vars missing."""
        with patch.dict(os.environ, {}, clear=True):
            from services.storage_service import is_storage_configured
            assert is_storage_configured() == False
    
    def test_is_storage_configured_true_when_vars_set(self):
        """Test is_storage_configured returns True when all required vars are set."""
        env_vars = {
            "AWS_ACCESS_KEY_ID": "test_key",
            "AWS_SECRET_ACCESS_KEY": "test_secret",
            "AWS_S3_BUCKET": "test-bucket",
        }
        with patch.dict(os.environ, env_vars, clear=True):
            from services.storage_service import is_storage_configured
            assert is_storage_configured() == True
    
    def test_get_storage_config_not_configured(self):
        """Test get_storage_config returns correct status when not configured."""
        with patch.dict(os.environ, {}, clear=True):
            from services.storage_service import get_storage_config
            config = get_storage_config()
            assert config["provider"] == "none"
            assert config["configured"] == False
            assert "not configured" in config["note"].lower()
    
    def test_get_storage_config_configured(self):
        """Test get_storage_config returns correct status when configured."""
        env_vars = {
            "AWS_ACCESS_KEY_ID": "test_key",
            "AWS_SECRET_ACCESS_KEY": "test_secret",
            "AWS_S3_BUCKET": "forgevoice-media",
            "AWS_REGION": "ap-southeast-2",
        }
        with patch.dict(os.environ, env_vars, clear=True):
            from services.storage_service import get_storage_config
            config = get_storage_config()
            assert config["provider"] == "s3"
            assert config["configured"] == True
            assert config["bucket"] == "forgevoice-media"
            assert config["region"] == "ap-southeast-2"
    
    def test_build_object_key_format(self):
        """Test _build_object_key generates correct format."""
        from services.storage_service import _build_object_key
        
        key = _build_object_key("client-1/audio", "audio/mpeg")
        
        # Should contain path hint
        assert "client-1/audio" in key
        # Should have mp3 extension
        assert key.endswith(".mp3")
        # Should have timestamp and UUID
        parts = key.split("/")[-1]
        assert "-" in parts  # timestamp-uuid format
    
    def test_build_object_key_different_content_types(self):
        """Test _build_object_key handles different content types."""
        from services.storage_service import _build_object_key
        
        assert _build_object_key("test", "audio/mpeg").endswith(".mp3")
        assert _build_object_key("test", "image/png").endswith(".png")
        assert _build_object_key("test", "image/jpeg").endswith(".jpg")
        assert _build_object_key("test", "video/mp4").endswith(".mp4")
        assert _build_object_key("test", "unknown/type").endswith(".bin")
    
    def test_build_public_url_standard_s3(self):
        """Test _build_public_url for standard AWS S3."""
        from services.storage_service import _build_public_url
        
        url = _build_public_url("my-bucket", "us-east-1", "path/to/file.mp3")
        assert url == "https://my-bucket.s3.us-east-1.amazonaws.com/path/to/file.mp3"
    
    def test_build_public_url_custom_endpoint(self):
        """Test _build_public_url with custom endpoint (R2/MinIO)."""
        from services.storage_service import _build_public_url
        
        url = _build_public_url(
            "my-bucket", 
            "auto", 
            "path/to/file.mp3",
            endpoint_url="https://my-r2.cloudflare.dev"
        )
        assert url == "https://my-r2.cloudflare.dev/my-bucket/path/to/file.mp3"
    
    @pytest.mark.asyncio
    async def test_upload_file_raises_when_not_configured(self):
        """Test upload_file raises StorageNotConfiguredError when env vars missing."""
        with patch.dict(os.environ, {}, clear=True):
            from services.storage_service import upload_file, StorageNotConfiguredError
            
            with pytest.raises(StorageNotConfiguredError) as exc_info:
                await upload_file(b"test data", "text/plain", "test/path")
            
            assert "not configured" in str(exc_info.value).lower()
    
    @pytest.mark.asyncio
    async def test_upload_file_success(self):
        """Test upload_file successfully uploads and returns URL."""
        env_vars = {
            "AWS_ACCESS_KEY_ID": "test_key",
            "AWS_SECRET_ACCESS_KEY": "test_secret",
            "AWS_S3_BUCKET": "test-bucket",
            "AWS_REGION": "us-east-1",
        }
        
        mock_client = MagicMock()
        
        with patch.dict(os.environ, env_vars, clear=True):
            with patch("boto3.client", return_value=mock_client):
                from services.storage_service import upload_file
                
                url = await upload_file(
                    b"test audio data",
                    "audio/mpeg",
                    "client-1/audio/episode"
                )
                
                # Verify S3 put_object was called
                mock_client.put_object.assert_called_once()
                call_kwargs = mock_client.put_object.call_args[1]
                assert call_kwargs["Bucket"] == "test-bucket"
                assert call_kwargs["ContentType"] == "audio/mpeg"
                assert call_kwargs["Body"] == b"test audio data"
                
                # Verify URL format
                assert "test-bucket.s3.us-east-1.amazonaws.com" in url
                assert url.endswith(".mp3")
    
    @pytest.mark.asyncio
    async def test_upload_file_handles_s3_error(self):
        """Test upload_file raises StorageUploadError on S3 failure."""
        env_vars = {
            "AWS_ACCESS_KEY_ID": "test_key",
            "AWS_SECRET_ACCESS_KEY": "test_secret",
            "AWS_S3_BUCKET": "test-bucket",
        }
        
        mock_client = MagicMock()
        mock_client.put_object.side_effect = ClientError(
            {"Error": {"Code": "AccessDenied", "Message": "Access Denied"}},
            "PutObject"
        )
        
        with patch.dict(os.environ, env_vars, clear=True):
            with patch("boto3.client", return_value=mock_client):
                from services.storage_service import upload_file, StorageUploadError
                
                with pytest.raises(StorageUploadError) as exc_info:
                    await upload_file(b"test", "text/plain", "test")
                
                assert "AccessDenied" in str(exc_info.value)


class TestMediaServiceStorageIntegration:
    """Test media_service.py integration with storage_service."""
    
    @pytest.mark.asyncio
    async def test_try_upload_to_s3_returns_none_when_not_configured(self):
        """Test _try_upload_to_s3 returns (None, None) when S3 not configured."""
        with patch.dict(os.environ, {}, clear=True):
            from services.media_service import _try_upload_to_s3
            
            url, provider = await _try_upload_to_s3(
                b"test data",
                "audio/mpeg",
                "test/path"
            )
            
            assert url is None
            assert provider is None
    
    @pytest.mark.asyncio
    async def test_try_upload_to_s3_success(self):
        """Test _try_upload_to_s3 returns URL when S3 configured."""
        env_vars = {
            "AWS_ACCESS_KEY_ID": "test_key",
            "AWS_SECRET_ACCESS_KEY": "test_secret",
            "AWS_S3_BUCKET": "test-bucket",
            "AWS_REGION": "us-east-1",
        }
        
        mock_client = MagicMock()
        
        with patch.dict(os.environ, env_vars, clear=True):
            with patch("boto3.client", return_value=mock_client):
                from services.media_service import _try_upload_to_s3
                
                url, provider = await _try_upload_to_s3(
                    b"test data",
                    "audio/mpeg",
                    "test/path"
                )
                
                assert url is not None
                assert "test-bucket" in url
                assert provider == "s3"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
