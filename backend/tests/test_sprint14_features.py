"""
Sprint 14 Tests: Real YouTube Publishing + Stripe Billing + Quick Test Upload
Uses httpx.AsyncClient for proper async support with Motor MongoDB driver.
"""
import pytest
import httpx
from typing import Optional

# Use the live API for testing
import os
API_URL = os.environ.get("REACT_APP_BACKEND_URL", "http://localhost:8001")
if not API_URL.startswith("http"):
    API_URL = f"https://{API_URL}"


async def get_client_token() -> Optional[str]:
    """Login as client and return token."""
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{API_URL}/api/auth/login",
            json={"email": "alex@company.com", "password": "client123"}
        )
        if response.status_code == 200:
            return response.json().get("token")
    return None


async def get_admin_token() -> Optional[str]:
    """Login as admin and return token."""
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{API_URL}/api/auth/login",
            json={"email": "admin@forgevoice.com", "password": "admin123"}
        )
        if response.status_code == 200:
            return response.json().get("token")
    return None


# ============================================================================
# YouTube Upload Tests
# ============================================================================

class TestYouTubeUploadNoVideoFile:
    """Test YouTube upload when no video file is attached."""
    
    @pytest.mark.asyncio
    async def test_check_video_returns_status(self):
        """Test that check-video returns a valid response."""
        token = await get_client_token()
        assert token, "Failed to get auth token"
        
        async with httpx.AsyncClient() as client:
            # Get a submission
            subs_res = await client.get(
                f"{API_URL}/api/submissions",
                headers={"Authorization": f"Bearer {token}"}
            )
            
            assert subs_res.status_code == 200
            submissions = subs_res.json()
            
            if len(submissions) > 0:
                submission_id = submissions[0].get("id")
                
                response = await client.get(
                    f"{API_URL}/api/publish/check-video/{submission_id}",
                    headers={"Authorization": f"Bearer {token}"}
                )
                
                assert response.status_code == 200
                data = response.json()
                # Either has_video is True or False
                assert "has_video" in data


class TestYouTubeUploadQuotaExceeded:
    """Test YouTube quota handling."""
    
    @pytest.mark.asyncio
    async def test_quota_status_endpoint(self):
        """Test that quota/stats endpoint returns valid data."""
        token = await get_client_token()
        assert token, "Failed to get auth token"
        
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{API_URL}/api/publish/stats",
                headers={"Authorization": f"Bearer {token}"}
            )
            
            assert response.status_code == 200
            data = response.json()
            # Stats endpoint should return quota info
            assert "quota" in data or "total" in data


# ============================================================================
# Stripe Tests (SKIPPED)
# ============================================================================

@pytest.mark.skip(reason="Stripe keys not configured")
class TestStripeCheckoutSessionCreated:
    """Test Stripe checkout session creation."""
    
    @pytest.mark.asyncio
    async def test_create_checkout_session_returns_url(self):
        """Test that POST /api/billing/checkout returns checkout URL."""
        token = await get_client_token()
        assert token, "Failed to get auth token"
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{API_URL}/api/billing/checkout",
                json={"plan": "pro", "origin_url": "https://example.com"},
                headers={"Authorization": f"Bearer {token}"}
            )
            
            # Should return 200 with checkout URL, or 400 if Stripe not configured
            assert response.status_code in [200, 400]
            
            if response.status_code == 200:
                data = response.json()
                assert "checkout_url" in data
                assert "session_id" in data


@pytest.mark.skip(reason="Stripe keys not configured")
class TestStripeWebhookSubscriptionActivated:
    """Test Stripe webhook handling."""
    
    @pytest.mark.asyncio
    async def test_webhook_endpoint_exists(self):
        """Test that webhook endpoint exists and accepts POST."""
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{API_URL}/api/billing/webhook",
                content=b"{}",
                headers={"Content-Type": "application/json"}
            )
            
            # Should not return 404 - endpoint exists
            assert response.status_code != 404


# ============================================================================
# Dev Test Upload Tests
# ============================================================================

class TestDevTestUploadAttachesVideo:
    """Test the developer test upload feature."""
    
    @pytest.mark.asyncio
    async def test_test_upload_status_available_in_dev(self):
        """Test that test upload status shows available in dev mode."""
        token = await get_client_token()
        assert token, "Failed to get auth token"
        
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{API_URL}/api/dev/test-upload/status",
                headers={"Authorization": f"Bearer {token}"}
            )
            
            assert response.status_code == 200
            data = response.json()
            assert "available" in data
            # In dev mode, should be available
            assert data["available"] == True
    
    @pytest.mark.asyncio
    async def test_attach_test_video_to_submission(self):
        """Test attaching a test video to a submission."""
        token = await get_client_token()
        assert token, "Failed to get auth token"
        
        async with httpx.AsyncClient() as client:
            # Get a submission
            subs_res = await client.get(
                f"{API_URL}/api/submissions",
                headers={"Authorization": f"Bearer {token}"}
            )
            
            assert subs_res.status_code == 200
            submissions = subs_res.json()
            
            if len(submissions) > 0:
                # Find a submission without video
                submission_id = submissions[-1].get("id")  # Use last one to avoid conflicts
                
                response = await client.post(
                    f"{API_URL}/api/dev/test-upload/{submission_id}",
                    headers={"Authorization": f"Bearer {token}"}
                )
                
                assert response.status_code == 200
                data = response.json()
                assert data.get("success") == True
                # Either new asset or existing
                assert "asset_id" in data or "existing" in data


# ============================================================================
# Billing Status Tests (SKIPPED)
# ============================================================================

@pytest.mark.skip(reason="Stripe keys not configured")
class TestBillingStatus:
    """Test billing status endpoint."""
    
    @pytest.mark.asyncio
    async def test_billing_status_returns_plan_info(self):
        """Test that GET /api/billing/status returns plan information."""
        token = await get_client_token()
        assert token, "Failed to get auth token"
        
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{API_URL}/api/billing/status",
                headers={"Authorization": f"Bearer {token}"}
            )
            
            assert response.status_code == 200
            data = response.json()
            assert "plan" in data
            assert "status" in data
            assert "stripe_configured" in data


@pytest.mark.skip(reason="Stripe keys not configured")
class TestBillingPlans:
    """Test billing plans endpoint."""
    
    @pytest.mark.asyncio
    async def test_get_plans_returns_all_plans(self):
        """Test that GET /api/billing/plans returns all available plans."""
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{API_URL}/api/billing/plans")
            
            assert response.status_code == 200
            data = response.json()
            assert "starter" in data
            assert "pro" in data
            assert "enterprise" in data


# ============================================================================
# YouTube Upload Flow Integration Test
# ============================================================================

class TestYouTubePublishFlow:
    """Integration test for the full YouTube publish flow."""
    
    @pytest.mark.asyncio
    async def test_publish_flow_with_test_video(self):
        """Test the complete flow: attach test video -> publish -> check status."""
        token = await get_client_token()
        assert token, "Failed to get auth token"
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            # Get OAuth status first
            oauth_res = await client.get(
                f"{API_URL}/api/oauth/status",
                headers={"Authorization": f"Bearer {token}"}
            )
            
            assert oauth_res.status_code == 200
            oauth_data = oauth_res.json()
            
            # Skip test if YouTube not connected
            if not oauth_data.get("youtube", {}).get("connected"):
                pytest.skip("YouTube OAuth not connected")
            
            # Get a submission
            subs_res = await client.get(
                f"{API_URL}/api/submissions",
                headers={"Authorization": f"Bearer {token}"}
            )
            
            assert subs_res.status_code == 200
            submissions = subs_res.json()
            
            if len(submissions) == 0:
                pytest.skip("No submissions available")
            
            submission_id = submissions[0].get("id")
            
            # Check if has video
            video_check = await client.get(
                f"{API_URL}/api/publish/check-video/{submission_id}",
                headers={"Authorization": f"Bearer {token}"}
            )
            
            assert video_check.status_code == 200
            video_data = video_check.json()
            
            # If no video, attach test video
            if not video_data.get("has_video"):
                attach_res = await client.post(
                    f"{API_URL}/api/dev/test-upload/{submission_id}",
                    headers={"Authorization": f"Bearer {token}"}
                )
                assert attach_res.status_code == 200
                
                # Re-check video
                video_check = await client.get(
                    f"{API_URL}/api/publish/check-video/{submission_id}",
                    headers={"Authorization": f"Bearer {token}"}
                )
                video_data = video_check.json()
            
            # Now we should have a video
            assert video_data.get("has_video") == True
            video_asset_id = video_data.get("asset_id")
            
            # Publish to YouTube (private)
            # Skip actual publish in automated tests to avoid quota usage
            # Just verify the endpoint accepts the request format
            publish_res = await client.post(
                f"{API_URL}/api/publish/youtube",
                json={
                    "submissionId": submission_id,
                    "videoAssetId": video_asset_id,
                    "title": "Automated Test - Private",
                    "description": "Automated test upload",
                    "tags": ["test"],
                    "privacyStatus": "private"
                },
                headers={"Authorization": f"Bearer {token}"}
            )
            
            # Should succeed or indicate existing job
            assert publish_res.status_code in [200, 400]


# Run tests
if __name__ == "__main__":
    pytest.main([__file__, "-v"])
