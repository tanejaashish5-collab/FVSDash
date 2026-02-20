"""
Sprint 7: OAuth Publishing Layer Tests
Tests for OAuth 2.0 mock flow and YouTube Publishing endpoints
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://feedback-analytics-1.preview.emergentagent.com').rstrip('/')

# Test credentials
CLIENT_EMAIL = "alex@company.com"
CLIENT_PASSWORD = "client123"


class TestOAuthFlows:
    """OAuth 2.0 connection flow tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get token before each test"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": CLIENT_EMAIL,
            "password": CLIENT_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        self.token = data["token"]
        self.headers = {"Authorization": f"Bearer {self.token}", "Content-Type": "application/json"}
    
    def test_oauth_status_endpoint(self):
        """Test GET /api/oauth/status returns all platform statuses"""
        response = requests.get(f"{BASE_URL}/api/oauth/status", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        
        # Should return status for all 3 platforms
        assert "youtube" in data
        assert "tiktok" in data
        assert "instagram" in data
        
        # Each platform should have required fields
        for platform in ["youtube", "tiktok", "instagram"]:
            assert "connected" in data[platform]
            assert "tokenStatus" in data[platform]
            assert "accountName" in data[platform]
            assert "accountHandle" in data[platform]
            assert "connectedAt" in data[platform]
            assert "expiresAt" in data[platform]
        
        print(f"OAuth status: YouTube connected={data['youtube']['connected']}")
    
    def test_oauth_connect_flow(self):
        """Test POST /api/oauth/connect/{platform} initiates OAuth flow"""
        response = requests.post(f"{BASE_URL}/api/oauth/connect/youtube", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        
        # Should return auth URL for popup
        assert "authUrl" in data
        assert "state" in data
        assert "isMock" in data
        assert data["isMock"] == True  # Should be mock mode
        assert "popupWidth" in data
        assert "popupHeight" in data
        
        # State should be a secure token
        assert len(data["state"]) > 20
        
        print(f"Connect flow initiated, state={data['state'][:20]}...")
    
    def test_oauth_connect_unsupported_platform(self):
        """Test connect with unsupported platform returns 400"""
        response = requests.post(f"{BASE_URL}/api/oauth/connect/facebook", headers=self.headers)
        assert response.status_code == 400
        assert "Unsupported platform" in response.json().get("detail", "")
    
    def test_oauth_callback_with_valid_state(self):
        """Test OAuth callback completes connection"""
        # First initiate connect to get valid state
        connect_response = requests.post(f"{BASE_URL}/api/oauth/connect/youtube", headers=self.headers)
        assert connect_response.status_code == 200
        state = connect_response.json()["state"]
        
        # Call callback with the state
        callback_response = requests.get(
            f"{BASE_URL}/api/oauth/callback/youtube",
            params={"code": "mock_auth_code_test", "state": state}
        )
        assert callback_response.status_code == 200
        # Should return HTML page with success message
        assert "Connected Successfully" in callback_response.text
        assert "oauth_success" in callback_response.text
        
        # Verify connection persisted
        status_response = requests.get(f"{BASE_URL}/api/oauth/status", headers=self.headers)
        assert status_response.status_code == 200
        youtube_status = status_response.json()["youtube"]
        assert youtube_status["connected"] == True
        assert youtube_status["accountName"] == "ForgeVoice Demo Channel"
        
        print(f"OAuth callback completed, connected as {youtube_status['accountHandle']}")
    
    def test_oauth_callback_invalid_state(self):
        """Test OAuth callback with invalid state returns error"""
        callback_response = requests.get(
            f"{BASE_URL}/api/oauth/callback/youtube",
            params={"code": "mock_code", "state": "invalid_state_12345"}
        )
        assert callback_response.status_code == 200
        # Should return error HTML
        assert "Invalid state" in callback_response.text
    
    def test_oauth_refresh_token(self):
        """Test POST /api/oauth/refresh/{platform} refreshes token"""
        # First ensure YouTube is connected
        status_response = requests.get(f"{BASE_URL}/api/oauth/status", headers=self.headers)
        if not status_response.json()["youtube"]["connected"]:
            # Connect first
            connect_resp = requests.post(f"{BASE_URL}/api/oauth/connect/youtube", headers=self.headers)
            state = connect_resp.json()["state"]
            requests.get(f"{BASE_URL}/api/oauth/callback/youtube", params={"code": "mock", "state": state})
        
        # Refresh token
        response = requests.post(f"{BASE_URL}/api/oauth/refresh/youtube", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        
        assert data["success"] == True
        assert "expiresAt" in data
        assert "Token refreshed" in data["message"]
        
        # Verify token status updated
        status_response = requests.get(f"{BASE_URL}/api/oauth/status", headers=self.headers)
        assert status_response.status_code == 200
        # Token should be valid or expiring_soon (1 hour mock expiry)
        token_status = status_response.json()["youtube"]["tokenStatus"]
        assert token_status in ["valid", "expiring_soon"]
        
        print(f"Token refreshed, new status: {token_status}")
    
    def test_oauth_refresh_not_connected(self):
        """Test refresh fails when platform not connected"""
        # Disconnect first if connected
        requests.delete(f"{BASE_URL}/api/oauth/disconnect/youtube", headers=self.headers)
        
        # Try to refresh
        response = requests.post(f"{BASE_URL}/api/oauth/refresh/youtube", headers=self.headers)
        assert response.status_code == 404
        assert "not connected" in response.json().get("detail", "").lower()
    
    def test_oauth_disconnect(self):
        """Test DELETE /api/oauth/disconnect/{platform} disconnects"""
        # Ensure connected first
        status_response = requests.get(f"{BASE_URL}/api/oauth/status", headers=self.headers)
        if not status_response.json()["youtube"]["connected"]:
            connect_resp = requests.post(f"{BASE_URL}/api/oauth/connect/youtube", headers=self.headers)
            state = connect_resp.json()["state"]
            requests.get(f"{BASE_URL}/api/oauth/callback/youtube", params={"code": "mock", "state": state})
        
        # Disconnect
        response = requests.delete(f"{BASE_URL}/api/oauth/disconnect/youtube", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "disconnected" in data["message"]
        
        # Verify disconnected
        status_response = requests.get(f"{BASE_URL}/api/oauth/status", headers=self.headers)
        assert status_response.json()["youtube"]["connected"] == False
        
        print("YouTube disconnected successfully")
    
    def test_oauth_disconnect_not_connected(self):
        """Test disconnect fails when not connected"""
        # Ensure disconnected
        requests.delete(f"{BASE_URL}/api/oauth/disconnect/youtube", headers=self.headers)
        
        # Try disconnect again
        response = requests.delete(f"{BASE_URL}/api/oauth/disconnect/youtube", headers=self.headers)
        assert response.status_code == 404
        assert "not connected" in response.json().get("detail", "").lower()
    
    def test_oauth_quota_endpoint(self):
        """Test GET /api/oauth/quota returns quota info"""
        response = requests.get(f"{BASE_URL}/api/oauth/quota", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "used" in data
        assert "max" in data
        assert "remaining" in data
        assert "percentUsed" in data
        assert "level" in data
        
        # Default quota should be 10000
        assert data["max"] == 10000
        # Level should be normal, warning, or critical
        assert data["level"] in ["normal", "warning", "critical"]
        
        print(f"Quota: {data['used']}/{data['max']} ({data['percentUsed']}%)")


class TestPublishingEndpoints:
    """YouTube Publishing API tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and ensure YouTube connected"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": CLIENT_EMAIL,
            "password": CLIENT_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        self.token = data["token"]
        self.headers = {"Authorization": f"Bearer {self.token}", "Content-Type": "application/json"}
        
        # Ensure YouTube is connected
        status_response = requests.get(f"{BASE_URL}/api/oauth/status", headers=self.headers)
        if not status_response.json()["youtube"]["connected"]:
            connect_resp = requests.post(f"{BASE_URL}/api/oauth/connect/youtube", headers=self.headers)
            state = connect_resp.json()["state"]
            requests.get(f"{BASE_URL}/api/oauth/callback/youtube", params={"code": "mock", "state": state})
    
    def test_publish_queue_endpoint(self):
        """Test GET /api/publish/queue returns submissions ready to publish"""
        response = requests.get(f"{BASE_URL}/api/publish/queue", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data, list)
        # Queue items should have required fields
        if len(data) > 0:
            item = data[0]
            assert "id" in item
            assert "title" in item
            assert "status" in item
            assert "hasVideoAsset" in item
            assert "videoAssets" in item
            assert "thumbnailAssets" in item
            print(f"Queue contains {len(data)} items, first: {item['title'][:40]}...")
        else:
            print("Queue is empty")
    
    def test_publish_stats_endpoint(self):
        """Test GET /api/publish/stats returns publishing statistics"""
        response = requests.get(f"{BASE_URL}/api/publish/stats", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "total" in data
        assert "live" in data
        assert "pending" in data
        assert "uploading" in data
        assert "failed" in data
        assert "cancelled" in data
        assert "quota" in data
        
        # Quota should have required fields
        quota = data["quota"]
        assert "used" in quota
        assert "max" in quota
        
        print(f"Stats: {data['live']} live, {data['pending']} pending, {data['failed']} failed")
    
    def test_publish_history_endpoint(self):
        """Test GET /api/publish/history returns completed jobs"""
        response = requests.get(f"{BASE_URL}/api/publish/history", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data, list)
        # History items should be 'live' status jobs
        for job in data:
            assert job.get("status") == "live"
            assert "platformUrl" in job
            assert "publishedAt" in job
        
        print(f"History contains {len(data)} published items")
    
    def test_publish_jobs_list(self):
        """Test GET /api/publish/jobs lists all jobs"""
        response = requests.get(f"{BASE_URL}/api/publish/jobs", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data, list)
        print(f"Total jobs: {len(data)}")
    
    def test_publish_jobs_filter_by_status(self):
        """Test GET /api/publish/jobs?status=failed filters correctly"""
        response = requests.get(f"{BASE_URL}/api/publish/jobs?status=failed", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        
        # All returned jobs should be failed
        for job in data:
            assert job.get("status") == "failed"
        
        print(f"Failed jobs: {len(data)}")
    
    def test_publish_youtube_missing_video(self):
        """Test publish fails when video asset not found"""
        # Get a queue item
        queue_response = requests.get(f"{BASE_URL}/api/publish/queue", headers=self.headers)
        queue = queue_response.json()
        
        if len(queue) == 0:
            pytest.skip("No queue items to test with")
        
        item = queue[0]
        
        # Try to publish with non-existent video asset
        payload = {
            "submissionId": item["id"],
            "videoAssetId": "non-existent-video-id",
            "title": "Test Title",
            "description": "Test Description",
            "tags": ["test"],
            "privacyStatus": "private"
        }
        
        response = requests.post(f"{BASE_URL}/api/publish/youtube", json=payload, headers=self.headers)
        assert response.status_code == 404
        assert "Video asset not found" in response.json().get("detail", "")
    
    def test_publish_youtube_missing_submission(self):
        """Test publish fails when submission not found"""
        payload = {
            "submissionId": "non-existent-submission-id",
            "videoAssetId": "some-video-id",
            "title": "Test Title",
            "description": "Test Description",
            "tags": ["test"],
            "privacyStatus": "private"
        }
        
        response = requests.post(f"{BASE_URL}/api/publish/youtube", json=payload, headers=self.headers)
        assert response.status_code == 404
        assert "Submission not found" in response.json().get("detail", "")
    
    def test_publish_youtube_not_connected(self):
        """Test publish fails when YouTube not connected"""
        # Disconnect YouTube
        requests.delete(f"{BASE_URL}/api/oauth/disconnect/youtube", headers=self.headers)
        
        payload = {
            "submissionId": "test-id",
            "videoAssetId": "test-video",
            "title": "Test",
            "description": "",
            "tags": [],
            "privacyStatus": "private"
        }
        
        response = requests.post(f"{BASE_URL}/api/publish/youtube", json=payload, headers=self.headers)
        assert response.status_code == 400
        assert "not connected" in response.json().get("detail", "").lower()
        
        # Reconnect for other tests
        connect_resp = requests.post(f"{BASE_URL}/api/oauth/connect/youtube", headers=self.headers)
        state = connect_resp.json()["state"]
        requests.get(f"{BASE_URL}/api/oauth/callback/youtube", params={"code": "mock", "state": state})
    
    def test_publish_status_not_found(self):
        """Test GET /api/publish/status/{id} returns 404 for non-existent job"""
        response = requests.get(f"{BASE_URL}/api/publish/status/non-existent-job-id", headers=self.headers)
        assert response.status_code == 404
    
    def test_publish_retry_non_failed(self):
        """Test retry fails for non-failed jobs"""
        # Get jobs
        jobs_response = requests.get(f"{BASE_URL}/api/publish/jobs", headers=self.headers)
        jobs = jobs_response.json()
        
        # Find a non-failed job
        non_failed = [j for j in jobs if j.get("status") != "failed"]
        
        if len(non_failed) == 0:
            pytest.skip("No non-failed jobs to test with")
        
        job = non_failed[0]
        response = requests.post(f"{BASE_URL}/api/publish/jobs/{job['id']}/retry", headers=self.headers)
        assert response.status_code == 400
        assert "Only failed jobs" in response.json().get("detail", "")
    
    def test_publish_cancel_not_found(self):
        """Test cancel fails for non-existent job"""
        response = requests.delete(f"{BASE_URL}/api/publish/jobs/non-existent-id", headers=self.headers)
        assert response.status_code == 404


class TestAuthRequired:
    """Test that all endpoints require authentication"""
    
    def test_oauth_status_requires_auth(self):
        response = requests.get(f"{BASE_URL}/api/oauth/status")
        assert response.status_code == 401
    
    def test_oauth_connect_requires_auth(self):
        response = requests.post(f"{BASE_URL}/api/oauth/connect/youtube")
        assert response.status_code == 401
    
    def test_oauth_refresh_requires_auth(self):
        response = requests.post(f"{BASE_URL}/api/oauth/refresh/youtube")
        assert response.status_code == 401
    
    def test_oauth_disconnect_requires_auth(self):
        response = requests.delete(f"{BASE_URL}/api/oauth/disconnect/youtube")
        assert response.status_code == 401
    
    def test_publish_queue_requires_auth(self):
        response = requests.get(f"{BASE_URL}/api/publish/queue")
        assert response.status_code == 401
    
    def test_publish_stats_requires_auth(self):
        response = requests.get(f"{BASE_URL}/api/publish/stats")
        assert response.status_code == 401
    
    def test_publish_history_requires_auth(self):
        response = requests.get(f"{BASE_URL}/api/publish/history")
        assert response.status_code == 401


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
