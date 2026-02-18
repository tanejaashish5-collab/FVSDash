"""
Admin Panel API Tests
Tests for admin endpoints: client management and impersonation
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestAdminEndpoints:
    """Admin endpoint tests - requires admin authentication"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get admin token for authenticated requests"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@forgevoice.com",
            "password": "admin123"
        })
        assert response.status_code == 200, "Admin login failed"
        self.admin_token = response.json()["token"]
        self.admin_headers = {"Authorization": f"Bearer {self.admin_token}"}
        
        # Also get client token for non-admin tests
        client_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "alex@company.com",
            "password": "client123"
        })
        assert client_response.status_code == 200, "Client login failed"
        self.client_token = client_response.json()["token"]
        self.client_headers = {"Authorization": f"Bearer {self.client_token}"}
    
    # GET /api/admin/clients tests
    def test_get_clients_requires_auth(self):
        """GET /api/admin/clients requires authentication"""
        response = requests.get(f"{BASE_URL}/api/admin/clients")
        assert response.status_code == 401
        print("PASS: GET /api/admin/clients requires auth")
    
    def test_get_clients_requires_admin(self):
        """GET /api/admin/clients requires admin role"""
        response = requests.get(f"{BASE_URL}/api/admin/clients", headers=self.client_headers)
        assert response.status_code == 403
        data = response.json()
        assert "Admin access required" in data.get("detail", "")
        print("PASS: GET /api/admin/clients requires admin role")
    
    def test_get_clients_success(self):
        """GET /api/admin/clients returns client list for admin"""
        response = requests.get(f"{BASE_URL}/api/admin/clients", headers=self.admin_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 1
        
        # Verify client data structure
        client = data[0]
        assert "id" in client
        assert "name" in client
        assert "plan" in client
        assert "submissionsCount" in client
        assert "lastActivityDate" in client or client.get("lastActivityDate") is None
        print(f"PASS: GET /api/admin/clients returns {len(data)} clients")
    
    # GET /api/admin/clients/{client_id}/summary tests
    def test_get_client_summary_requires_auth(self):
        """GET /api/admin/clients/{id}/summary requires authentication"""
        response = requests.get(f"{BASE_URL}/api/admin/clients/demo-client-1/summary")
        assert response.status_code == 401
        print("PASS: GET /api/admin/clients/{id}/summary requires auth")
    
    def test_get_client_summary_requires_admin(self):
        """GET /api/admin/clients/{id}/summary requires admin role"""
        response = requests.get(
            f"{BASE_URL}/api/admin/clients/demo-client-1/summary", 
            headers=self.client_headers
        )
        assert response.status_code == 403
        print("PASS: GET /api/admin/clients/{id}/summary requires admin role")
    
    def test_get_client_summary_success(self):
        """GET /api/admin/clients/{id}/summary returns client summary"""
        response = requests.get(
            f"{BASE_URL}/api/admin/clients/demo-client-1/summary", 
            headers=self.admin_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify summary structure
        assert data["clientId"] == "demo-client-1"
        assert "clientName" in data
        assert "recentSubmissions" in data
        assert isinstance(data["recentSubmissions"], list)
        assert "metricsLast30Days" in data
        assert "totalSubmissions" in data["metricsLast30Days"]
        assert "totalViews" in data["metricsLast30Days"]
        assert "totalDownloads" in data["metricsLast30Days"]
        assert "billingStatus" in data
        assert "billingPlan" in data
        print(f"PASS: GET /api/admin/clients/{data['clientId']}/summary returns summary")
    
    def test_get_client_summary_not_found(self):
        """GET /api/admin/clients/{id}/summary returns 404 for invalid client"""
        response = requests.get(
            f"{BASE_URL}/api/admin/clients/invalid-client-id/summary", 
            headers=self.admin_headers
        )
        assert response.status_code == 404
        print("PASS: GET /api/admin/clients/{id}/summary returns 404 for invalid client")
    
    # POST /api/admin/impersonate tests
    def test_impersonate_requires_auth(self):
        """POST /api/admin/impersonate requires authentication"""
        response = requests.post(
            f"{BASE_URL}/api/admin/impersonate",
            json={"clientId": "demo-client-1"}
        )
        assert response.status_code == 401
        print("PASS: POST /api/admin/impersonate requires auth")
    
    def test_impersonate_requires_admin(self):
        """POST /api/admin/impersonate requires admin role"""
        response = requests.post(
            f"{BASE_URL}/api/admin/impersonate",
            json={"clientId": "demo-client-1"},
            headers=self.client_headers
        )
        assert response.status_code == 403
        print("PASS: POST /api/admin/impersonate requires admin role")
    
    def test_impersonate_success(self):
        """POST /api/admin/impersonate returns client info for valid client"""
        response = requests.post(
            f"{BASE_URL}/api/admin/impersonate",
            json={"clientId": "demo-client-1"},
            headers=self.admin_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data["clientId"] == "demo-client-1"
        assert "clientName" in data
        assert data["clientName"] == "Alex Chen Media"
        print(f"PASS: POST /api/admin/impersonate returns client info: {data['clientName']}")
    
    def test_impersonate_invalid_client(self):
        """POST /api/admin/impersonate returns 404 for invalid client"""
        response = requests.post(
            f"{BASE_URL}/api/admin/impersonate",
            json={"clientId": "invalid-client-id"},
            headers=self.admin_headers
        )
        assert response.status_code == 404
        print("PASS: POST /api/admin/impersonate returns 404 for invalid client")


class TestImpersonationDataFetching:
    """Tests for data fetching with impersonation query param"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get admin token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@forgevoice.com",
            "password": "admin123"
        })
        assert response.status_code == 200
        self.admin_token = response.json()["token"]
        self.admin_headers = {"Authorization": f"Bearer {self.admin_token}"}
    
    def test_dashboard_overview_with_impersonation(self):
        """GET /api/dashboard/overview with impersonateClientId returns client data"""
        response = requests.get(
            f"{BASE_URL}/api/dashboard/overview?impersonateClientId=demo-client-1",
            headers=self.admin_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify it returns client data
        assert data["clientName"] == "Alex Chen Media"
        assert "kpis" in data
        assert "pipeline" in data
        print("PASS: Dashboard overview returns impersonated client data")
    
    def test_submissions_with_impersonation(self):
        """GET /api/submissions with impersonateClientId returns client submissions"""
        response = requests.get(
            f"{BASE_URL}/api/submissions?impersonateClientId=demo-client-1",
            headers=self.admin_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data, list)
        # All submissions should belong to the impersonated client
        for sub in data:
            assert sub.get("clientId") == "demo-client-1"
        print(f"PASS: Submissions returns {len(data)} items for impersonated client")
    
    def test_assets_with_impersonation(self):
        """GET /api/assets with impersonateClientId returns client assets"""
        response = requests.get(
            f"{BASE_URL}/api/assets?impersonateClientId=demo-client-1",
            headers=self.admin_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data, list)
        print(f"PASS: Assets returns {len(data)} items for impersonated client")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
