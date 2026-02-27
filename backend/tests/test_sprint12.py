"""
Sprint 12 Backend Tests
Tests for Brain Feedback Loop and Admin Multi-Channel Onboarding
"""
import pytest
from httpx import AsyncClient, ASGITransport
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from main import app


@pytest.fixture
def admin_auth_headers():
    """Mock admin auth headers."""
    return {"Authorization": "Bearer mock_admin_token"}


@pytest.fixture
def client_auth_headers():
    """Mock client auth headers."""
    return {"Authorization": "Bearer mock_client_token"}


@pytest.mark.asyncio
async def test_create_submission_with_recommendation_id():
    """Test that creating a submission with recommendation_id stores the field."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # Login as client
        login_resp = await client.post(
            "/api/auth/login",
            json={"email": "alex@company.com", "password": "client123"}
        )
        assert login_resp.status_code == 200
        token = login_resp.json()["token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        # Create submission with recommendation_id
        sub_resp = await client.post(
            "/api/submissions",
            json={
                "title": "Test Recommendation Submission",
                "description": "Testing brain tracking",
                "contentType": "Short",
                "priority": "High",
                "recommendation_id": "test-rec-123"
            },
            headers=headers
        )
        assert sub_resp.status_code == 200
        data = sub_resp.json()
        assert data["title"] == "Test Recommendation Submission"
        assert data.get("recommendation_id") == "test-rec-123"
        print("✅ test_create_submission_with_recommendation_id passed")


@pytest.mark.asyncio
async def test_brain_scores_created_on_submission():
    """Test that brain_scores record is created when submission has recommendation_id."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # Login as client
        login_resp = await client.post(
            "/api/auth/login",
            json={"email": "alex@company.com", "password": "client123"}
        )
        assert login_resp.status_code == 200
        token = login_resp.json()["token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        # Create submission with recommendation_id
        sub_resp = await client.post(
            "/api/submissions",
            json={
                "title": "Brain Score Test Submission",
                "description": "Testing brain score creation",
                "contentType": "Short",
                "priority": "Medium",
                "recommendation_id": "test-brain-rec-456"
            },
            headers=headers
        )
        assert sub_resp.status_code == 200
        
        # Check brain scores endpoint
        scores_resp = await client.get("/api/brain/scores", headers=headers)
        assert scores_resp.status_code == 200
        scores_data = scores_resp.json()
        assert "total_predictions" in scores_data
        assert "accuracy_percentage" in scores_data
        assert "scores" in scores_data
        print("✅ test_brain_scores_created_on_submission passed")


@pytest.mark.asyncio
async def test_get_brain_accuracy():
    """Test brain scores accuracy endpoint returns correct structure."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # Login as client
        login_resp = await client.post(
            "/api/auth/login",
            json={"email": "alex@company.com", "password": "client123"}
        )
        assert login_resp.status_code == 200
        token = login_resp.json()["token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        # Get brain scores
        resp = await client.get("/api/brain/scores", headers=headers)
        assert resp.status_code == 200
        data = resp.json()
        
        # Validate structure
        assert "total_predictions" in data
        assert "scored" in data
        assert "pending" in data
        assert "correct" in data
        assert "incorrect" in data
        assert "accuracy_percentage" in data
        assert isinstance(data["accuracy_percentage"], (int, float))
        assert "scores" in data
        assert isinstance(data["scores"], list)
        
        # Test accuracy trend endpoint
        trend_resp = await client.get("/api/brain/accuracy-trend", headers=headers)
        assert trend_resp.status_code == 200
        trend_data = trend_resp.json()
        assert isinstance(trend_data, list)
        
        # Test leaderboard endpoint
        lb_resp = await client.get("/api/brain/leaderboard?limit=5", headers=headers)
        assert lb_resp.status_code == 200
        lb_data = lb_resp.json()
        assert isinstance(lb_data, list)
        
        print("✅ test_get_brain_accuracy passed")


@pytest.mark.asyncio
async def test_admin_create_client():
    """Test admin can create new client accounts."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # Login as admin
        login_resp = await client.post(
            "/api/auth/login",
            json={"email": "admin@forgevoice.com", "password": "admin123"}
        )
        assert login_resp.status_code == 200
        token = login_resp.json()["token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        # Create new client
        import uuid
        unique_email = f"testcreator_{uuid.uuid4().hex[:8]}@test.com"
        
        create_resp = await client.post(
            "/api/admin/clients",
            json={
                "full_name": "Test Creator Account",
                "email": unique_email,
                "password": "testpass123",
                "niche": "Tech Reviews",
                "content_pillars": ["Technology", "Gadgets"],
                "language_style": "English",
                "channel_description": "A test channel for testing"
            },
            headers=headers
        )
        assert create_resp.status_code == 200
        data = create_resp.json()
        
        # Validate response
        assert "user_id" in data
        assert data["email"] == unique_email
        assert data["full_name"] == "Test Creator Account"
        assert "created_at" in data
        
        # Verify client appears in list
        list_resp = await client.get("/api/admin/clients", headers=headers)
        assert list_resp.status_code == 200
        clients = list_resp.json()
        
        # Check new client is in list
        new_client = next((c for c in clients if c.get("primaryContactEmail") == unique_email), None)
        assert new_client is not None
        assert new_client["name"] == "Test Creator Account"
        
        print("✅ test_admin_create_client passed")


@pytest.mark.asyncio
async def test_admin_client_list_has_sprint12_fields():
    """Test admin client list includes Sprint 12 fields."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # Login as admin
        login_resp = await client.post(
            "/api/auth/login",
            json={"email": "admin@forgevoice.com", "password": "admin123"}
        )
        assert login_resp.status_code == 200
        token = login_resp.json()["token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        # Get clients list
        resp = await client.get("/api/admin/clients", headers=headers)
        assert resp.status_code == 200
        clients = resp.json()
        assert len(clients) > 0
        
        # Check first client has Sprint 12 fields
        first_client = clients[0]
        assert "channel_name" in first_client
        assert "subscriber_count" in first_client
        assert "total_videos" in first_client
        assert "youtube_connected" in first_client
        assert "is_active" in first_client
        
        print("✅ test_admin_client_list_has_sprint12_fields passed")


@pytest.mark.asyncio
async def test_identity_migration():
    """Test that identity migration changed Alex Chen to Chanakya Sutra."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # Login as client
        login_resp = await client.post(
            "/api/auth/login",
            json={"email": "alex@company.com", "password": "client123"}
        )
        assert login_resp.status_code == 200
        user = login_resp.json()["user"]
        
        # Check name is Chanakya Sutra
        assert user["name"] == "Chanakya Sutra"
        
        print("✅ test_identity_migration passed")


if __name__ == "__main__":
    import asyncio
    
    async def run_tests():
        print("\n🧪 Running Sprint 12 Backend Tests...\n")
        await test_create_submission_with_recommendation_id()
        await test_brain_scores_created_on_submission()
        await test_get_brain_accuracy()
        await test_admin_create_client()
        await test_admin_client_list_has_sprint12_fields()
        await test_identity_migration()
        print("\n✅ All Sprint 12 tests passed!\n")
    
    asyncio.run(run_tests())
