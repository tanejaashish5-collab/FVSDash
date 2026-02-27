"""Tests for Onboarding API endpoints - using requests (sync)."""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestOnboardingAPI:
    """Test onboarding-related API endpoints."""
    
    @pytest.fixture
    def client_token(self):
        """Get client user auth token."""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "alex@company.com",
            "password": "client123"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        return response.json()["token"]
    
    @pytest.fixture
    def admin_token(self):
        """Get admin user auth token."""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@forgevoice.com",
            "password": "admin123"
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        return response.json()["token"]
    
    def test_login_includes_onboarding_field(self):
        """Test that login response includes onboardingComplete field."""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "alex@company.com",
            "password": "client123"
        })
        assert response.status_code == 200
        data = response.json()
        assert "user" in data
        assert "onboardingComplete" in data["user"], "onboardingComplete field missing from login response"
        assert isinstance(data["user"]["onboardingComplete"], bool)
    
    def test_get_me_includes_onboarding_field(self, client_token):
        """Test that GET /me includes onboardingComplete field."""
        response = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {client_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "onboardingComplete" in data, "onboardingComplete field missing from /me response"
        assert isinstance(data["onboardingComplete"], bool)
    
    def test_patch_onboarding_complete_true(self, client_token):
        """Test that users can set onboardingComplete to true."""
        response = requests.patch(
            f"{BASE_URL}/api/auth/me/onboarding",
            headers={"Authorization": f"Bearer {client_token}"},
            json={"onboarding_complete": True}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["onboardingComplete"] is True
        
        # Verify persistence via GET /me
        me_response = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {client_token}"}
        )
        assert me_response.status_code == 200
        assert me_response.json()["onboardingComplete"] is True
    
    def test_patch_onboarding_complete_false(self, client_token):
        """Test that users can set onboardingComplete to false."""
        response = requests.patch(
            f"{BASE_URL}/api/auth/me/onboarding",
            headers={"Authorization": f"Bearer {client_token}"},
            json={"onboarding_complete": False}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["onboardingComplete"] is False
        
        # Verify persistence via GET /me
        me_response = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {client_token}"}
        )
        assert me_response.status_code == 200
        assert me_response.json()["onboardingComplete"] is False
    
    def test_patch_onboarding_requires_auth(self):
        """Test that onboarding endpoint requires authentication."""
        response = requests.patch(
            f"{BASE_URL}/api/auth/me/onboarding",
            json={"onboarding_complete": True}
        )
        assert response.status_code == 401
    
    def test_admin_can_patch_onboarding(self, admin_token):
        """Test that admin users can also update their onboarding status."""
        response = requests.patch(
            f"{BASE_URL}/api/auth/me/onboarding",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"onboarding_complete": True}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["onboardingComplete"] is True
    
    def test_admin_login_includes_onboarding_field(self):
        """Test that admin login response includes onboardingComplete field."""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@forgevoice.com",
            "password": "admin123"
        })
        assert response.status_code == 200
        data = response.json()
        assert "onboardingComplete" in data["user"]
        assert isinstance(data["user"]["onboardingComplete"], bool)
