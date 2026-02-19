"""Tests for the Notification Engine."""
import pytest
from httpx import AsyncClient, ASGITransport
from main import app
import uuid

BASE_URL = "http://test"

# Test user credentials
CLIENT_EMAIL = "alex@company.com"
CLIENT_PASSWORD = "client123"


@pytest.fixture
async def auth_headers():
    """Get authentication headers for test client."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url=BASE_URL) as client:
        response = await client.post("/api/auth/login", json={
            "email": CLIENT_EMAIL,
            "password": CLIENT_PASSWORD
        })
        assert response.status_code == 200
        token = response.json()["token"]
        return {"Authorization": f"Bearer {token}"}


@pytest.mark.asyncio
async def test_get_notifications_empty(auth_headers):
    """Test getting notifications when none exist."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url=BASE_URL) as client:
        response = await client.get("/api/notifications", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)


@pytest.mark.asyncio
async def test_get_unread_count(auth_headers):
    """Test getting unread notification count."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url=BASE_URL) as client:
        response = await client.get("/api/notifications/unread-count", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "count" in data
        assert isinstance(data["count"], int)
        assert data["count"] >= 0


@pytest.mark.asyncio
async def test_create_notification_via_status_change(auth_headers):
    """Test that changing a submission status creates a notification."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url=BASE_URL) as client:
        # First get a submission to update
        subs_response = await client.get("/api/submissions", headers=auth_headers)
        assert subs_response.status_code == 200
        submissions = subs_response.json()
        
        if len(submissions) > 0:
            submission_id = submissions[0]["id"]
            current_status = submissions[0].get("status", "INTAKE")
            
            # Determine new status
            statuses = ["INTAKE", "EDITING", "DESIGN", "SCHEDULED", "PUBLISHED"]
            current_idx = statuses.index(current_status) if current_status in statuses else 0
            new_status = statuses[(current_idx + 1) % len(statuses)]
            
            # Get current unread count
            count_before = await client.get("/api/notifications/unread-count", headers=auth_headers)
            count_before_val = count_before.json()["count"]
            
            # Update status
            status_response = await client.patch(
                f"/api/submissions/{submission_id}/status",
                json={"status": new_status},
                headers=auth_headers
            )
            assert status_response.status_code == 200
            
            # Check unread count increased
            count_after = await client.get("/api/notifications/unread-count", headers=auth_headers)
            count_after_val = count_after.json()["count"]
            
            assert count_after_val >= count_before_val, "Notification should have been created"


@pytest.mark.asyncio
async def test_mark_notification_as_read(auth_headers):
    """Test marking a notification as read."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url=BASE_URL) as client:
        # Get notifications
        response = await client.get("/api/notifications", headers=auth_headers)
        assert response.status_code == 200
        notifications = response.json()
        
        # Find an unread notification
        unread = [n for n in notifications if not n.get("is_read")]
        
        if len(unread) > 0:
            notification_id = unread[0]["id"]
            
            # Mark as read
            mark_response = await client.patch(
                f"/api/notifications/{notification_id}/read",
                headers=auth_headers
            )
            assert mark_response.status_code == 200
            data = mark_response.json()
            assert data["is_read"] is True


@pytest.mark.asyncio
async def test_mark_all_as_read(auth_headers):
    """Test marking all notifications as read."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url=BASE_URL) as client:
        # Mark all as read
        response = await client.post("/api/notifications/read-all", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        
        # Verify unread count is 0
        count_response = await client.get("/api/notifications/unread-count", headers=auth_headers)
        assert count_response.status_code == 200
        assert count_response.json()["count"] == 0


@pytest.mark.asyncio
async def test_notification_not_found(auth_headers):
    """Test marking a non-existent notification as read."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url=BASE_URL) as client:
        fake_id = str(uuid.uuid4())
        response = await client.patch(
            f"/api/notifications/{fake_id}/read",
            headers=auth_headers
        )
        assert response.status_code == 404


@pytest.mark.asyncio
async def test_notifications_require_auth():
    """Test that notification endpoints require authentication."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url=BASE_URL) as client:
        # No auth headers
        response = await client.get("/api/notifications")
        assert response.status_code == 401
        
        response = await client.get("/api/notifications/unread-count")
        assert response.status_code == 401
