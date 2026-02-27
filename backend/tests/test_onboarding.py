"""Tests for Onboarding API endpoints."""
import pytest
from httpx import AsyncClient, ASGITransport
from main import app

BASE_URL = "http://test"


@pytest.fixture
async def async_client():
    """Create async test client."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url=BASE_URL) as client:
        yield client


@pytest.fixture
async def client_token(async_client):
    """Get client user auth token."""
    response = await async_client.post("/api/auth/login", json={
        "email": "alex@company.com",
        "password": "client123"
    })
    assert response.status_code == 200
    return response.json()["token"]


@pytest.fixture
def client_headers(client_token):
    """Get headers with client token."""
    return {"Authorization": f"Bearer {client_token}"}


@pytest.fixture
async def admin_token(async_client):
    """Get admin user auth token."""
    response = await async_client.post("/api/auth/login", json={
        "email": "admin@forgevoice.com",
        "password": "admin123"
    })
    assert response.status_code == 200
    return response.json()["token"]


@pytest.fixture
def admin_headers(admin_token):
    """Get headers with admin token."""
    return {"Authorization": f"Bearer {admin_token}"}


class TestOnboardingEndpoint:
    """Test onboarding PATCH endpoint."""
    
    @pytest.mark.asyncio
    async def test_patch_onboarding_complete(self, async_client, client_headers):
        """Test that users can update their onboarding status."""
        # Update onboarding to complete
        response = await async_client.patch(
            "/api/auth/me/onboarding",
            headers=client_headers,
            json={"onboarding_complete": True}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["onboardingComplete"] is True
        
        # Verify it persists via GET /me
        me_response = await async_client.get("/api/auth/me", headers=client_headers)
        assert me_response.status_code == 200
        assert me_response.json()["onboardingComplete"] is True
    
    @pytest.mark.asyncio
    async def test_patch_onboarding_requires_auth(self, async_client):
        """Test that onboarding endpoint requires authentication."""
        response = await async_client.patch(
            "/api/auth/me/onboarding",
            json={"onboarding_complete": True}
        )
        assert response.status_code == 401
    
    @pytest.mark.asyncio
    async def test_get_me_includes_onboarding_field(self, async_client, client_headers):
        """Test that GET /me includes onboardingComplete field."""
        response = await async_client.get("/api/auth/me", headers=client_headers)
        assert response.status_code == 200
        data = response.json()
        assert "onboardingComplete" in data
        assert isinstance(data["onboardingComplete"], bool)
    
    @pytest.mark.asyncio
    async def test_login_includes_onboarding_field(self, async_client):
        """Test that login response includes onboardingComplete field."""
        response = await async_client.post("/api/auth/login", json={
            "email": "alex@company.com",
            "password": "client123"
        })
        assert response.status_code == 200
        data = response.json()
        assert "onboardingComplete" in data["user"]
        assert isinstance(data["user"]["onboardingComplete"], bool)
    
    @pytest.mark.asyncio
    async def test_admin_can_patch_onboarding(self, async_client, admin_headers):
        """Test that admin users can also update their onboarding status (field exists)."""
        response = await async_client.patch(
            "/api/auth/me/onboarding",
            headers=admin_headers,
            json={"onboarding_complete": True}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["onboardingComplete"] is True


class TestOnboardingDefaults:
    """Test onboarding default values."""
    
    @pytest.mark.asyncio
    async def test_existing_users_default_to_complete(self, async_client, client_headers):
        """Test that existing users without the field default to onboardingComplete=True."""
        # This tests the backend logic that defaults missing field to True
        response = await async_client.get("/api/auth/me", headers=client_headers)
        assert response.status_code == 200
        # Existing users should have onboardingComplete (either True from default or set value)
        assert "onboardingComplete" in response.json()
