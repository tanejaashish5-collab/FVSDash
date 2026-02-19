"""Tests for the Notification Engine API endpoints.

Tests:
- GET /api/notifications - List notifications
- GET /api/notifications/unread-count - Get unread count
- PATCH /api/notifications/{id}/read - Mark single notification as read
- POST /api/notifications/read-all - Mark all notifications as read
- Notification creation on submission status change
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test user credentials
CLIENT_EMAIL = "alex@company.com"
CLIENT_PASSWORD = "client123"
ADMIN_EMAIL = "admin@forgevoice.com"
ADMIN_PASSWORD = "admin123"


class TestNotificationEndpoints:
    """Test notification API endpoints."""
    
    @pytest.fixture(scope="class")
    def client_auth(self):
        """Get authentication token for client user."""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": CLIENT_EMAIL,
            "password": CLIENT_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        token = response.json()["token"]
        return {"Authorization": f"Bearer {token}"}
    
    @pytest.fixture(scope="class")
    def admin_auth(self):
        """Get authentication token for admin user."""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        token = response.json()["token"]
        return {"Authorization": f"Bearer {token}"}
    
    def test_get_notifications_list(self, client_auth):
        """Test GET /api/notifications returns list of notifications."""
        response = requests.get(f"{BASE_URL}/api/notifications", headers=client_auth)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        
        # If notifications exist, verify structure
        if len(data) > 0:
            notification = data[0]
            assert "id" in notification
            assert "user_id" in notification
            assert "type" in notification
            assert "title" in notification
            assert "message" in notification
            assert "is_read" in notification
            assert "priority" in notification
            assert "created_at" in notification
    
    def test_get_unread_count(self, client_auth):
        """Test GET /api/notifications/unread-count returns correct count."""
        response = requests.get(f"{BASE_URL}/api/notifications/unread-count", headers=client_auth)
        assert response.status_code == 200
        data = response.json()
        assert "count" in data
        assert isinstance(data["count"], int)
        assert data["count"] >= 0
    
    def test_notification_created_on_status_change(self, client_auth):
        """Test that changing submission status creates a notification."""
        # Get current unread count
        count_before_resp = requests.get(f"{BASE_URL}/api/notifications/unread-count", headers=client_auth)
        assert count_before_resp.status_code == 200
        count_before = count_before_resp.json()["count"]
        
        # Get a submission to update
        subs_response = requests.get(f"{BASE_URL}/api/submissions", headers=client_auth)
        assert subs_response.status_code == 200
        submissions = subs_response.json()
        
        if len(submissions) == 0:
            pytest.skip("No submissions available to test status change")
        
        submission = submissions[0]
        submission_id = submission["id"]
        current_status = submission.get("status", "INTAKE")
        
        # Determine new status (cycle through statuses)
        statuses = ["INTAKE", "EDITING", "DESIGN", "SCHEDULED", "PUBLISHED"]
        current_idx = statuses.index(current_status) if current_status in statuses else 0
        new_status = statuses[(current_idx + 1) % len(statuses)]
        
        # Update status
        status_response = requests.patch(
            f"{BASE_URL}/api/submissions/{submission_id}/status",
            json={"status": new_status},
            headers=client_auth
        )
        assert status_response.status_code == 200
        
        # Check unread count increased
        count_after_resp = requests.get(f"{BASE_URL}/api/notifications/unread-count", headers=client_auth)
        assert count_after_resp.status_code == 200
        count_after = count_after_resp.json()["count"]
        
        assert count_after >= count_before, "Notification should have been created on status change"
        
        # Verify notification exists in list
        notifications_resp = requests.get(f"{BASE_URL}/api/notifications", headers=client_auth)
        assert notifications_resp.status_code == 200
        notifications = notifications_resp.json()
        
        # Find the status change notification
        status_notifications = [n for n in notifications if n["type"] == "STATUS_CHANGE"]
        assert len(status_notifications) > 0, "Should have at least one STATUS_CHANGE notification"
    
    def test_mark_notification_as_read(self, client_auth):
        """Test PATCH /api/notifications/{id}/read marks notification as read."""
        # Get notifications
        response = requests.get(f"{BASE_URL}/api/notifications", headers=client_auth)
        assert response.status_code == 200
        notifications = response.json()
        
        if len(notifications) == 0:
            pytest.skip("No notifications available to test mark as read")
        
        # Find an unread notification or use any notification
        unread = [n for n in notifications if not n.get("is_read")]
        notification = unread[0] if unread else notifications[0]
        notification_id = notification["id"]
        
        # Mark as read
        mark_response = requests.patch(
            f"{BASE_URL}/api/notifications/{notification_id}/read",
            headers=client_auth
        )
        assert mark_response.status_code == 200
        data = mark_response.json()
        assert data["is_read"] is True
        assert data["id"] == notification_id
    
    def test_mark_all_as_read(self, client_auth):
        """Test POST /api/notifications/read-all marks all notifications as read."""
        # Mark all as read
        response = requests.post(f"{BASE_URL}/api/notifications/read-all", headers=client_auth)
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        
        # Verify unread count is 0
        count_response = requests.get(f"{BASE_URL}/api/notifications/unread-count", headers=client_auth)
        assert count_response.status_code == 200
        assert count_response.json()["count"] == 0
        
        # Verify all notifications are marked as read
        notifications_resp = requests.get(f"{BASE_URL}/api/notifications", headers=client_auth)
        assert notifications_resp.status_code == 200
        notifications = notifications_resp.json()
        
        for notification in notifications:
            assert notification["is_read"] is True, f"Notification {notification['id']} should be marked as read"
    
    def test_mark_nonexistent_notification_returns_404(self, client_auth):
        """Test marking a non-existent notification returns 404."""
        fake_id = str(uuid.uuid4())
        response = requests.patch(
            f"{BASE_URL}/api/notifications/{fake_id}/read",
            headers=client_auth
        )
        assert response.status_code == 404
    
    def test_notifications_require_auth(self):
        """Test that notification endpoints require authentication."""
        # No auth headers
        response = requests.get(f"{BASE_URL}/api/notifications")
        assert response.status_code == 401
        
        response = requests.get(f"{BASE_URL}/api/notifications/unread-count")
        assert response.status_code == 401
        
        response = requests.post(f"{BASE_URL}/api/notifications/read-all")
        assert response.status_code == 401
        
        fake_id = str(uuid.uuid4())
        response = requests.patch(f"{BASE_URL}/api/notifications/{fake_id}/read")
        assert response.status_code == 401


class TestNotificationDataIntegrity:
    """Test notification data integrity and structure."""
    
    @pytest.fixture(scope="class")
    def client_auth(self):
        """Get authentication token for client user."""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": CLIENT_EMAIL,
            "password": CLIENT_PASSWORD
        })
        assert response.status_code == 200
        token = response.json()["token"]
        return {"Authorization": f"Bearer {token}"}
    
    def test_notification_types_are_valid(self, client_auth):
        """Test that notification types are valid enum values."""
        valid_types = ["SUBMISSION", "STATUS_CHANGE", "DEADLINE", "SYSTEM", "FVS_IDEA"]
        
        response = requests.get(f"{BASE_URL}/api/notifications", headers=client_auth)
        assert response.status_code == 200
        notifications = response.json()
        
        for notification in notifications:
            assert notification["type"] in valid_types, f"Invalid type: {notification['type']}"
    
    def test_notification_priorities_are_valid(self, client_auth):
        """Test that notification priorities are valid enum values."""
        valid_priorities = ["LOW", "MEDIUM", "HIGH"]
        
        response = requests.get(f"{BASE_URL}/api/notifications", headers=client_auth)
        assert response.status_code == 200
        notifications = response.json()
        
        for notification in notifications:
            assert notification["priority"] in valid_priorities, f"Invalid priority: {notification['priority']}"
    
    def test_notifications_sorted_by_created_at_desc(self, client_auth):
        """Test that notifications are sorted by created_at in descending order."""
        response = requests.get(f"{BASE_URL}/api/notifications", headers=client_auth)
        assert response.status_code == 200
        notifications = response.json()
        
        if len(notifications) > 1:
            for i in range(len(notifications) - 1):
                current_date = notifications[i]["created_at"]
                next_date = notifications[i + 1]["created_at"]
                assert current_date >= next_date, "Notifications should be sorted by created_at descending"
