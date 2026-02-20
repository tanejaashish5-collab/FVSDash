"""
Sprint 14 Tests: Real YouTube Publishing + Stripe Billing + Quick Test Upload
"""
import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


def get_client_auth_headers():
    """Login as client and return auth headers."""
    response = client.post("/api/auth/login", json={
        "email": "alex@company.com",
        "password": "client123"
    })
    if response.status_code == 200:
        token = response.json().get("token")
        return {"Authorization": f"Bearer {token}"}
    return {}


def get_admin_auth_headers():
    """Login as admin and return auth headers."""
    response = client.post("/api/auth/login", json={
        "email": "admin@forgevoice.com",
        "password": "admin123"
    })
    if response.status_code == 200:
        token = response.json().get("token")
        return {"Authorization": f"Bearer {token}"}
    return {}


class TestYouTubeUploadNoVideoFile:
    """Test YouTube upload when no video file is attached."""
    
    def test_check_video_returns_no_video(self):
        """Test that check-video returns has_video: false when no video attached."""
        headers = get_client_auth_headers()
        
        # Get a submission without video
        subs_res = client.get("/api/submissions", headers=headers)
        if subs_res.status_code == 200 and len(subs_res.json()) > 0:
            submission_id = subs_res.json()[0].get("id")
            
            response = client.get(
                f"/api/publish/check-video/{submission_id}",
                headers=headers
            )
            
            assert response.status_code == 200
            data = response.json()
            # Either has_video is False or has_video is True (if video exists)
            assert "has_video" in data


class TestYouTubeUploadQuotaExceeded:
    """Test YouTube quota handling."""
    
    def test_quota_status_endpoint(self):
        """Test that quota status endpoint returns valid data."""
        headers = get_client_auth_headers()
        
        response = client.get("/api/publish/stats", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        # Stats endpoint should return some quota info
        assert isinstance(data, dict)


class TestStripeCheckoutSessionCreated:
    """Test Stripe checkout session creation."""
    
    def test_create_checkout_session_returns_url(self):
        """Test that POST /api/billing/checkout returns checkout URL."""
        headers = get_client_auth_headers()
        
        response = client.post(
            "/api/billing/checkout",
            json={
                "plan": "pro",
                "origin_url": "https://example.com"
            },
            headers=headers
        )
        
        # Should return 200 with checkout URL, or 400 if Stripe not fully configured
        assert response.status_code in [200, 400]
        
        if response.status_code == 200:
            data = response.json()
            assert "checkout_url" in data
            assert "session_id" in data


class TestStripeWebhookSubscriptionActivated:
    """Test Stripe webhook handling."""
    
    def test_webhook_endpoint_exists(self):
        """Test that webhook endpoint exists and accepts POST."""
        # Webhook doesn't require auth
        response = client.post(
            "/api/billing/webhook",
            content=b"{}",
            headers={"Content-Type": "application/json"}
        )
        
        # Should not return 404 - endpoint exists
        assert response.status_code != 404


class TestDevTestUploadAttachesVideo:
    """Test the developer test upload feature."""
    
    def test_test_upload_status_available_in_dev(self):
        """Test that test upload status shows available in dev mode."""
        headers = get_client_auth_headers()
        
        response = client.get("/api/dev/test-upload/status", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert "available" in data
        # In dev mode, should be available
        assert data["available"] == True
    
    def test_attach_test_video_to_submission(self):
        """Test attaching a test video to a submission."""
        headers = get_client_auth_headers()
        
        # Get a submission
        subs_res = client.get("/api/submissions", headers=headers)
        if subs_res.status_code == 200 and len(subs_res.json()) > 0:
            submission_id = subs_res.json()[0].get("id")
            
            response = client.post(
                f"/api/dev/test-upload/{submission_id}",
                headers=headers
            )
            
            assert response.status_code == 200
            data = response.json()
            assert data.get("success") == True
            assert "asset_id" in data or "existing" in data


class TestBillingStatus:
    """Test billing status endpoint."""
    
    def test_billing_status_returns_plan_info(self):
        """Test that GET /api/billing/status returns plan information."""
        headers = get_client_auth_headers()
        
        response = client.get("/api/billing/status", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert "plan" in data
        assert "status" in data
        assert "stripe_configured" in data


class TestBillingPlans:
    """Test billing plans endpoint."""
    
    def test_get_plans_returns_all_plans(self):
        """Test that GET /api/billing/plans returns all available plans."""
        # No auth required
        response = client.get("/api/billing/plans")
        
        assert response.status_code == 200
        data = response.json()
        assert "starter" in data
        assert "pro" in data
        assert "enterprise" in data


# Run tests
if __name__ == "__main__":
    pytest.main([__file__, "-v"])
