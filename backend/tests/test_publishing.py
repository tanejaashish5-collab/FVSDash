"""Tests for Publishing API endpoints."""
import pytest
from httpx import AsyncClient, ASGITransport
from main import app

BASE_URL = "http://test"


@pytest.fixture
def auth_headers():
    """Get auth headers for test user."""
    return {"Authorization": "Bearer test_token"}


@pytest.fixture
async def async_client():
    """Create async test client."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url=BASE_URL) as client:
        yield client


@pytest.fixture
async def auth_token(async_client):
    """Get real auth token from login."""
    response = await async_client.post("/api/auth/login", json={
        "email": "alex@company.com",
        "password": "client123"
    })
    assert response.status_code == 200
    return response.json()["token"]


@pytest.fixture
def client_headers(auth_token):
    """Get headers with real token."""
    return {"Authorization": f"Bearer {auth_token}"}


class TestPlatformConnections:
    """Test platform connection (mock OAuth) endpoints."""
    
    @pytest.mark.asyncio
    async def test_list_platform_connections(self, async_client, client_headers):
        """Test listing all platform connections."""
        response = await async_client.get("/api/platform-connections", headers=client_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) == 3  # youtube_shorts, tiktok, instagram_reels
        platforms = [c["platform"] for c in data]
        assert "youtube_shorts" in platforms
        assert "tiktok" in platforms
        assert "instagram_reels" in platforms
    
    @pytest.mark.asyncio
    async def test_connect_platform(self, async_client, client_headers):
        """Test connecting a platform (mock OAuth)."""
        response = await async_client.post(
            "/api/platform-connections/youtube_shorts/connect",
            headers=client_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["platform"] == "youtube_shorts"
        assert data["connected"] is True
        assert data["accountHandle"] is not None
    
    @pytest.mark.asyncio
    async def test_disconnect_platform(self, async_client, client_headers):
        """Test disconnecting a platform."""
        # First connect
        await async_client.post(
            "/api/platform-connections/tiktok/connect",
            headers=client_headers
        )
        
        # Then disconnect
        response = await async_client.post(
            "/api/platform-connections/tiktok/disconnect",
            headers=client_headers
        )
        assert response.status_code == 200
        assert "disconnected" in response.json()["message"]


class TestPublishingTasks:
    """Test publishing task CRUD endpoints."""
    
    @pytest.mark.asyncio
    async def test_create_publishing_task(self, async_client, client_headers):
        """Test creating a publishing task."""
        # First ensure platform is connected
        await async_client.post(
            "/api/platform-connections/youtube_shorts/connect",
            headers=client_headers
        )
        
        # Get a submission ID
        subs_response = await async_client.get("/api/submissions", headers=client_headers)
        submissions = subs_response.json()
        if not submissions:
            pytest.skip("No submissions available for testing")
        
        submission_id = submissions[0]["id"]
        
        response = await async_client.post("/api/publishing-tasks", headers=client_headers, json={
            "submissionId": submission_id,
            "platform": "youtube_shorts"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["submissionId"] == submission_id
        assert data["platform"] == "youtube_shorts"
        assert data["status"] in ["draft", "scheduled"]
    
    @pytest.mark.asyncio
    async def test_list_publishing_tasks(self, async_client, client_headers):
        """Test listing publishing tasks."""
        response = await async_client.get("/api/publishing-tasks", headers=client_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    @pytest.mark.asyncio
    async def test_list_publishing_tasks_with_filters(self, async_client, client_headers):
        """Test listing publishing tasks with filters."""
        response = await async_client.get(
            "/api/publishing-tasks?platform=youtube_shorts&status=draft",
            headers=client_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        # All returned tasks should match filters
        for task in data:
            assert task["platform"] == "youtube_shorts"
            assert task["status"] == "draft"
    
    @pytest.mark.asyncio
    async def test_update_publishing_task(self, async_client, client_headers):
        """Test updating a publishing task status."""
        # First create a task
        await async_client.post(
            "/api/platform-connections/instagram_reels/connect",
            headers=client_headers
        )
        
        subs_response = await async_client.get("/api/submissions", headers=client_headers)
        submissions = subs_response.json()
        if not submissions:
            pytest.skip("No submissions available")
        
        create_response = await async_client.post("/api/publishing-tasks", headers=client_headers, json={
            "submissionId": submissions[0]["id"],
            "platform": "instagram_reels"
        })
        task_id = create_response.json()["id"]
        
        # Update it
        response = await async_client.patch(f"/api/publishing-tasks/{task_id}", headers=client_headers, json={
            "status": "scheduled",
            "scheduledAt": "2026-03-01T12:00:00Z"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "scheduled"
        assert data["scheduledAt"] is not None
    
    @pytest.mark.asyncio
    async def test_delete_publishing_task(self, async_client, client_headers):
        """Test deleting a publishing task."""
        # First create a task
        await async_client.post(
            "/api/platform-connections/tiktok/connect",
            headers=client_headers
        )
        
        subs_response = await async_client.get("/api/submissions", headers=client_headers)
        submissions = subs_response.json()
        if not submissions:
            pytest.skip("No submissions available")
        
        create_response = await async_client.post("/api/publishing-tasks", headers=client_headers, json={
            "submissionId": submissions[0]["id"],
            "platform": "tiktok"
        })
        task_id = create_response.json()["id"]
        
        # Delete it
        response = await async_client.delete(f"/api/publishing-tasks/{task_id}", headers=client_headers)
        assert response.status_code == 200
        assert "deleted" in response.json()["message"]
    
    @pytest.mark.asyncio
    async def test_post_now(self, async_client, client_headers):
        """Test posting a task immediately."""
        # Ensure platform is connected
        await async_client.post(
            "/api/platform-connections/youtube_shorts/connect",
            headers=client_headers
        )
        
        subs_response = await async_client.get("/api/submissions", headers=client_headers)
        submissions = subs_response.json()
        if not submissions:
            pytest.skip("No submissions available")
        
        # Create and post
        response = await async_client.post("/api/publishing-tasks/create-and-post", headers=client_headers, json={
            "submissionId": submissions[0]["id"],
            "platform": "youtube_shorts"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "posted"
        assert data["postedAt"] is not None
        assert data["platformPostId"] is not None


class TestPublishingStats:
    """Test publishing statistics endpoint."""
    
    @pytest.mark.asyncio
    async def test_get_publishing_stats(self, async_client, client_headers):
        """Test getting publishing statistics."""
        response = await async_client.get("/api/publishing-stats", headers=client_headers)
        assert response.status_code == 200
        data = response.json()
        assert "total" in data
        assert "posted" in data
        assert "scheduled" in data
        assert "failed" in data


class TestAdminPublishingFeatures:
    """Test admin-specific publishing features."""
    
    @pytest.fixture
    async def admin_token(self, async_client):
        """Get admin auth token."""
        response = await async_client.post("/api/auth/login", json={
            "email": "admin@forgevoice.com",
            "password": "admin123"
        })
        assert response.status_code == 200
        return response.json()["token"]
    
    @pytest.fixture
    def admin_headers(self, admin_token):
        """Get headers with admin token."""
        return {"Authorization": f"Bearer {admin_token}"}
    
    @pytest.mark.asyncio
    async def test_admin_can_see_all_publishing_tasks(self, async_client, admin_headers):
        """Test that admin users can see all publishing tasks across all clients."""
        response = await async_client.get("/api/publishing-tasks", headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        # Admin should see tasks with clientName field populated
        if len(data) > 0:
            # Verify clientName field is present for admin
            assert "clientName" in data[0]
    
    @pytest.mark.asyncio
    async def test_admin_can_filter_by_client_id(self, async_client, admin_headers):
        """Test that admin can filter publishing tasks by client ID."""
        # First get the list of clients
        clients_response = await async_client.get("/api/admin/clients", headers=admin_headers)
        assert clients_response.status_code == 200
        clients = clients_response.json()
        
        if len(clients) > 0:
            # Filter by first client
            client_id = clients[0]["id"]
            response = await async_client.get(
                f"/api/publishing-tasks?clientId={client_id}",
                headers=admin_headers
            )
            assert response.status_code == 200
            data = response.json()
            # All tasks should belong to the specified client
            for task in data:
                assert task["clientId"] == client_id
    
    @pytest.mark.asyncio
    async def test_client_cannot_filter_by_client_id(self, async_client, client_headers):
        """Test that client users cannot see other clients' tasks via clientId param."""
        # Try to pass a different clientId (should be ignored for client users)
        response = await async_client.get(
            "/api/publishing-tasks?clientId=some-other-client-id",
            headers=client_headers
        )
        assert response.status_code == 200
        data = response.json()
        # Client user should only see their own tasks, clientId param should be ignored
        # Verify all returned tasks belong to the logged-in client
        for task in data:
            # The clientId should be the demo-client-1 (alex@company.com's client)
            assert task["clientId"] == "demo-client-1"
    
    @pytest.mark.asyncio
    async def test_admin_clients_endpoint(self, async_client, admin_headers):
        """Test admin endpoint to list all clients."""
        response = await async_client.get("/api/admin/clients", headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        # Should have at least one client (alex@company.com)
        assert len(data) >= 1
        # Verify structure
        if len(data) > 0:
            assert "id" in data[0]
            assert "fullName" in data[0]
            assert "email" in data[0]
    
    @pytest.mark.asyncio
    async def test_client_cannot_access_admin_clients_endpoint(self, async_client, client_headers):
        """Test that client users cannot access the admin clients endpoint."""
        response = await async_client.get("/api/admin/clients", headers=client_headers)
        assert response.status_code == 403
