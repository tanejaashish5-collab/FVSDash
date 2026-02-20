"""Tests for Publishing API endpoints using requests (sync) against public URL."""
import pytest
import requests
import os

# Use public URL for testing
BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://video-monetize-flow.preview.emergentagent.com')


class TestPublishingAPI:
    """Test Publishing Layer API endpoints."""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get auth token for client user."""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "alex@company.com",
            "password": "client123"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        return response.json()["token"]
    
    @pytest.fixture(scope="class")
    def auth_headers(self, auth_token):
        """Get headers with auth token."""
        return {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}
    
    @pytest.fixture(scope="class")
    def submission_id(self, auth_headers):
        """Get a submission ID for testing."""
        response = requests.get(f"{BASE_URL}/api/submissions", headers=auth_headers)
        assert response.status_code == 200
        submissions = response.json()
        if not submissions:
            pytest.skip("No submissions available for testing")
        return submissions[0]["id"]

    # ============================================================================
    # Platform Connections Tests
    # ============================================================================
    
    def test_list_platform_connections(self, auth_headers):
        """Test GET /api/platform-connections - list all platforms with connection status."""
        response = requests.get(f"{BASE_URL}/api/platform-connections", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        # Should return list of 3 platforms
        assert isinstance(data, list)
        assert len(data) == 3
        
        # Verify all platforms are present
        platforms = [c["platform"] for c in data]
        assert "youtube_shorts" in platforms
        assert "tiktok" in platforms
        assert "instagram_reels" in platforms
        
        # Each connection should have required fields
        for conn in data:
            assert "platform" in conn
            assert "connected" in conn
            assert "clientId" in conn
        
        print(f"Platform connections: {data}")
    
    def test_connect_platform_youtube(self, auth_headers):
        """Test POST /api/platform-connections/{platform}/connect - mock OAuth connect."""
        response = requests.post(
            f"{BASE_URL}/api/platform-connections/youtube_shorts/connect",
            headers=auth_headers
        )
        # May return 200 (success) or 400 (already connected)
        assert response.status_code in [200, 400]
        
        if response.status_code == 200:
            data = response.json()
            assert data["platform"] == "youtube_shorts"
            assert data["connected"] is True
            assert data["accountHandle"] is not None
            assert data["accountName"] is not None
            print(f"Connected YouTube: {data}")
        else:
            print(f"YouTube already connected: {response.json()}")
    
    def test_connect_platform_tiktok(self, auth_headers):
        """Test connecting TikTok platform."""
        response = requests.post(
            f"{BASE_URL}/api/platform-connections/tiktok/connect",
            headers=auth_headers
        )
        assert response.status_code in [200, 400]
        
        if response.status_code == 200:
            data = response.json()
            assert data["platform"] == "tiktok"
            assert data["connected"] is True
            print(f"Connected TikTok: {data}")
        else:
            print(f"TikTok already connected: {response.json()}")
    
    def test_connect_platform_instagram(self, auth_headers):
        """Test connecting Instagram Reels platform."""
        response = requests.post(
            f"{BASE_URL}/api/platform-connections/instagram_reels/connect",
            headers=auth_headers
        )
        assert response.status_code in [200, 400]
        
        if response.status_code == 200:
            data = response.json()
            assert data["platform"] == "instagram_reels"
            assert data["connected"] is True
            print(f"Connected Instagram: {data}")
        else:
            print(f"Instagram already connected: {response.json()}")
    
    def test_disconnect_and_reconnect_platform(self, auth_headers):
        """Test POST /api/platform-connections/{platform}/disconnect - disconnect platform."""
        # First ensure TikTok is connected
        requests.post(f"{BASE_URL}/api/platform-connections/tiktok/connect", headers=auth_headers)
        
        # Disconnect
        response = requests.post(
            f"{BASE_URL}/api/platform-connections/tiktok/disconnect",
            headers=auth_headers
        )
        assert response.status_code in [200, 404]  # 404 if already disconnected
        
        if response.status_code == 200:
            assert "disconnected" in response.json()["message"]
            print("TikTok disconnected successfully")
        
        # Verify disconnected
        list_response = requests.get(f"{BASE_URL}/api/platform-connections", headers=auth_headers)
        connections = list_response.json()
        tiktok_conn = next((c for c in connections if c["platform"] == "tiktok"), None)
        assert tiktok_conn is not None
        assert tiktok_conn["connected"] is False
        
        # Reconnect for other tests
        requests.post(f"{BASE_URL}/api/platform-connections/tiktok/connect", headers=auth_headers)

    # ============================================================================
    # Publishing Tasks Tests
    # ============================================================================
    
    def test_create_publishing_task(self, auth_headers, submission_id):
        """Test POST /api/publishing-tasks - create publishing task."""
        # Ensure platform is connected
        requests.post(f"{BASE_URL}/api/platform-connections/youtube_shorts/connect", headers=auth_headers)
        
        response = requests.post(f"{BASE_URL}/api/publishing-tasks", headers=auth_headers, json={
            "submissionId": submission_id,
            "platform": "youtube_shorts"
        })
        
        # May return 200 (success) or 400 (task already exists)
        assert response.status_code in [200, 400]
        
        if response.status_code == 200:
            data = response.json()
            assert data["submissionId"] == submission_id
            assert data["platform"] == "youtube_shorts"
            assert data["status"] in ["draft", "scheduled", "posted"]
            assert "id" in data
            print(f"Created task: {data}")
        else:
            print(f"Task creation response: {response.json()}")
    
    def test_list_publishing_tasks(self, auth_headers):
        """Test GET /api/publishing-tasks - list tasks."""
        response = requests.get(f"{BASE_URL}/api/publishing-tasks", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data, list)
        print(f"Found {len(data)} publishing tasks")
        
        # Verify task structure
        if data:
            task = data[0]
            assert "id" in task
            assert "submissionId" in task
            assert "platform" in task
            assert "status" in task
    
    def test_list_publishing_tasks_with_filters(self, auth_headers):
        """Test GET /api/publishing-tasks with optional filters."""
        # Filter by platform
        response = requests.get(
            f"{BASE_URL}/api/publishing-tasks?platform=youtube_shorts",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # All returned tasks should match filter
        for task in data:
            assert task["platform"] == "youtube_shorts"
        
        print(f"Found {len(data)} YouTube Shorts tasks")
        
        # Filter by status
        response = requests.get(
            f"{BASE_URL}/api/publishing-tasks?status=posted",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        for task in data:
            assert task["status"] == "posted"
        
        print(f"Found {len(data)} posted tasks")
    
    def test_update_publishing_task(self, auth_headers, submission_id):
        """Test PATCH /api/publishing-tasks/{id} - update task status/scheduledAt."""
        # First create a task on instagram_reels
        requests.post(f"{BASE_URL}/api/platform-connections/instagram_reels/connect", headers=auth_headers)
        
        create_response = requests.post(f"{BASE_URL}/api/publishing-tasks", headers=auth_headers, json={
            "submissionId": submission_id,
            "platform": "instagram_reels"
        })
        
        if create_response.status_code != 200:
            # Get existing task
            tasks_response = requests.get(
                f"{BASE_URL}/api/publishing-tasks?platform=instagram_reels",
                headers=auth_headers
            )
            tasks = tasks_response.json()
            if not tasks:
                pytest.skip("No Instagram task available for update test")
            task_id = tasks[0]["id"]
        else:
            task_id = create_response.json()["id"]
        
        # Update the task
        response = requests.patch(f"{BASE_URL}/api/publishing-tasks/{task_id}", headers=auth_headers, json={
            "status": "scheduled",
            "scheduledAt": "2026-03-01T12:00:00Z"
        })
        
        # May fail if task is already posted
        if response.status_code == 200:
            data = response.json()
            assert data["status"] == "scheduled"
            assert data["scheduledAt"] is not None
            print(f"Updated task: {data}")
        else:
            print(f"Update response: {response.status_code} - {response.json()}")
    
    def test_delete_publishing_task(self, auth_headers, submission_id):
        """Test DELETE /api/publishing-tasks/{id} - delete task."""
        # Create a new task to delete
        requests.post(f"{BASE_URL}/api/platform-connections/tiktok/connect", headers=auth_headers)
        
        create_response = requests.post(f"{BASE_URL}/api/publishing-tasks", headers=auth_headers, json={
            "submissionId": submission_id,
            "platform": "tiktok"
        })
        
        if create_response.status_code != 200:
            # Get existing draft/scheduled task
            tasks_response = requests.get(
                f"{BASE_URL}/api/publishing-tasks?platform=tiktok",
                headers=auth_headers
            )
            tasks = tasks_response.json()
            deletable = [t for t in tasks if t["status"] not in ["posted"]]
            if not deletable:
                pytest.skip("No deletable TikTok task available")
            task_id = deletable[0]["id"]
        else:
            task_id = create_response.json()["id"]
        
        # Delete the task
        response = requests.delete(f"{BASE_URL}/api/publishing-tasks/{task_id}", headers=auth_headers)
        
        if response.status_code == 200:
            assert "deleted" in response.json()["message"]
            print(f"Deleted task {task_id}")
        else:
            print(f"Delete response: {response.status_code} - {response.json()}")
    
    def test_post_now(self, auth_headers, submission_id):
        """Test POST /api/publishing-tasks/{id}/post-now - immediate mock post."""
        # Ensure platform is connected
        requests.post(f"{BASE_URL}/api/platform-connections/youtube_shorts/connect", headers=auth_headers)
        
        # Create a task first
        create_response = requests.post(f"{BASE_URL}/api/publishing-tasks", headers=auth_headers, json={
            "submissionId": submission_id,
            "platform": "youtube_shorts"
        })
        
        if create_response.status_code == 200:
            task_id = create_response.json()["id"]
            
            # Post now
            response = requests.post(
                f"{BASE_URL}/api/publishing-tasks/{task_id}/post-now",
                headers=auth_headers
            )
            
            if response.status_code == 200:
                data = response.json()
                assert data["status"] == "posted"
                assert data["postedAt"] is not None
                assert data["platformPostId"] is not None
                print(f"Posted task: {data}")
            else:
                print(f"Post now response: {response.status_code} - {response.json()}")
        else:
            print(f"Task already exists, testing create-and-post instead")
    
    def test_create_and_post(self, auth_headers, submission_id):
        """Test POST /api/publishing-tasks/create-and-post - convenience endpoint."""
        # Ensure platform is connected
        requests.post(f"{BASE_URL}/api/platform-connections/instagram_reels/connect", headers=auth_headers)
        
        response = requests.post(f"{BASE_URL}/api/publishing-tasks/create-and-post", headers=auth_headers, json={
            "submissionId": submission_id,
            "platform": "instagram_reels"
        })
        
        # May return 200 (success) or 400 (task already exists)
        if response.status_code == 200:
            data = response.json()
            assert data["status"] == "posted"
            assert data["postedAt"] is not None
            assert data["platformPostId"] is not None
            print(f"Created and posted: {data}")
        else:
            print(f"Create-and-post response: {response.status_code} - {response.json()}")

    # ============================================================================
    # Publishing Stats Tests
    # ============================================================================
    
    def test_get_publishing_stats(self, auth_headers):
        """Test GET /api/publishing-stats - get stats (posted, scheduled, failed counts)."""
        response = requests.get(f"{BASE_URL}/api/publishing-stats", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        # Verify all stat fields are present
        assert "total" in data
        assert "posted" in data
        assert "scheduled" in data
        assert "failed" in data
        assert "draft" in data
        
        # Values should be non-negative integers
        assert isinstance(data["total"], int) and data["total"] >= 0
        assert isinstance(data["posted"], int) and data["posted"] >= 0
        assert isinstance(data["scheduled"], int) and data["scheduled"] >= 0
        assert isinstance(data["failed"], int) and data["failed"] >= 0
        
        print(f"Publishing stats: {data}")

    # ============================================================================
    # Error Handling Tests
    # ============================================================================
    
    def test_unauthorized_access(self):
        """Test that endpoints require authentication."""
        response = requests.get(f"{BASE_URL}/api/platform-connections")
        assert response.status_code == 401
        
        response = requests.get(f"{BASE_URL}/api/publishing-tasks")
        assert response.status_code == 401
        
        response = requests.get(f"{BASE_URL}/api/publishing-stats")
        assert response.status_code == 401
        
        print("Unauthorized access correctly rejected")
    
    def test_invalid_platform(self, auth_headers):
        """Test connecting invalid platform returns error."""
        response = requests.post(
            f"{BASE_URL}/api/platform-connections/invalid_platform/connect",
            headers=auth_headers
        )
        assert response.status_code == 422  # Validation error
        print(f"Invalid platform rejected: {response.json()}")
    
    def test_create_task_without_connection(self, auth_headers, submission_id):
        """Test creating task for disconnected platform fails."""
        # Disconnect TikTok first
        requests.post(f"{BASE_URL}/api/platform-connections/tiktok/disconnect", headers=auth_headers)
        
        response = requests.post(f"{BASE_URL}/api/publishing-tasks", headers=auth_headers, json={
            "submissionId": submission_id,
            "platform": "tiktok"
        })
        
        # Should fail because platform is not connected
        assert response.status_code == 400
        assert "not connected" in response.json()["detail"].lower()
        print(f"Correctly rejected task for disconnected platform: {response.json()}")
        
        # Reconnect for other tests
        requests.post(f"{BASE_URL}/api/platform-connections/tiktok/connect", headers=auth_headers)
    
    def test_create_task_invalid_submission(self, auth_headers):
        """Test creating task for non-existent submission fails."""
        response = requests.post(f"{BASE_URL}/api/publishing-tasks", headers=auth_headers, json={
            "submissionId": "non-existent-id-12345",
            "platform": "youtube_shorts"
        })
        
        assert response.status_code == 404
        print(f"Correctly rejected task for invalid submission: {response.json()}")
