"""
Comprehensive API tests for refactored ForgeVoice Studio backend.
Tests all endpoints to verify the modular refactoring maintains API compatibility.
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
CLIENT_EMAIL = "alex@company.com"
CLIENT_PASSWORD = "client123"
ADMIN_EMAIL = "admin@forgevoice.com"
ADMIN_PASSWORD = "admin123"


class TestAuthEndpoints:
    """Authentication endpoint tests"""
    
    def test_login_client_success(self):
        """Test client login returns token and user info"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": CLIENT_EMAIL,
            "password": CLIENT_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["email"] == CLIENT_EMAIL
        assert data["user"]["role"] == "client"
        assert "clientId" in data["user"]
    
    def test_login_admin_success(self):
        """Test admin login returns token and user info"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert data["user"]["role"] == "admin"
    
    def test_login_invalid_credentials(self):
        """Test login with wrong password returns 401"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": CLIENT_EMAIL,
            "password": "wrongpassword"
        })
        assert response.status_code == 401
    
    def test_me_endpoint_requires_auth(self):
        """Test /auth/me requires authentication"""
        response = requests.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code == 401
    
    def test_me_endpoint_with_auth(self):
        """Test /auth/me returns user info with valid token"""
        login = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": CLIENT_EMAIL,
            "password": CLIENT_PASSWORD
        })
        token = login.json()["token"]
        
        response = requests.get(f"{BASE_URL}/api/auth/me", headers={
            "Authorization": f"Bearer {token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == CLIENT_EMAIL


@pytest.fixture
def client_token():
    """Get client authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": CLIENT_EMAIL,
        "password": CLIENT_PASSWORD
    })
    if response.status_code == 200:
        return response.json()["token"]
    pytest.skip("Client authentication failed")


@pytest.fixture
def admin_token():
    """Get admin authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if response.status_code == 200:
        return response.json()["token"]
    pytest.skip("Admin authentication failed")


class TestDashboardEndpoints:
    """Dashboard overview and stats tests"""
    
    def test_dashboard_overview_requires_auth(self):
        """Test /dashboard/overview requires authentication"""
        response = requests.get(f"{BASE_URL}/api/dashboard/overview")
        assert response.status_code == 401
    
    def test_dashboard_overview_returns_data(self, client_token):
        """Test /dashboard/overview returns KPIs, pipeline, and schedule"""
        response = requests.get(f"{BASE_URL}/api/dashboard/overview", headers={
            "Authorization": f"Bearer {client_token}"
        })
        assert response.status_code == 200
        data = response.json()
        
        # Verify KPIs structure
        assert "kpis" in data
        assert "activeProjects" in data["kpis"]
        assert "publishedLast30d" in data["kpis"]
        assert "totalAssets" in data["kpis"]
        assert "roiLast30d" in data["kpis"]
        
        # Verify pipeline structure
        assert "pipeline" in data
        
        # Verify upcoming schedule
        assert "upcoming" in data
        
        # Verify activities
        assert "activities" in data
    
    def test_dashboard_stats_returns_data(self, client_token):
        """Test /dashboard/stats returns analytics data"""
        response = requests.get(f"{BASE_URL}/api/dashboard/stats", headers={
            "Authorization": f"Bearer {client_token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert "totalSubmissions" in data
        assert "totalAssets" in data


class TestSubmissionsEndpoints:
    """Submissions CRUD tests"""
    
    def test_submissions_list_requires_auth(self):
        """Test /submissions requires authentication"""
        response = requests.get(f"{BASE_URL}/api/submissions")
        assert response.status_code == 401
    
    def test_submissions_list_returns_array(self, client_token):
        """Test /submissions returns list of submissions"""
        response = requests.get(f"{BASE_URL}/api/submissions", headers={
            "Authorization": f"Bearer {client_token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_submissions_list_endpoint(self, client_token):
        """Test /submissions/list returns minimal submission data"""
        response = requests.get(f"{BASE_URL}/api/submissions/list", headers={
            "Authorization": f"Bearer {client_token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)


class TestAssetsEndpoints:
    """Assets library tests"""
    
    def test_assets_requires_auth(self):
        """Test /assets requires authentication"""
        response = requests.get(f"{BASE_URL}/api/assets")
        assert response.status_code == 401
    
    def test_assets_returns_array(self, client_token):
        """Test /assets returns list of assets"""
        response = requests.get(f"{BASE_URL}/api/assets", headers={
            "Authorization": f"Bearer {client_token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_assets_library_returns_enriched_data(self, client_token):
        """Test /assets/library returns assets with episode titles"""
        response = requests.get(f"{BASE_URL}/api/assets/library", headers={
            "Authorization": f"Bearer {client_token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)


class TestCalendarEndpoints:
    """Calendar tests"""
    
    def test_calendar_requires_auth(self):
        """Test /calendar requires authentication"""
        response = requests.get(f"{BASE_URL}/api/calendar")
        assert response.status_code == 401
    
    def test_calendar_returns_data(self, client_token):
        """Test /calendar returns year, month, and submissions"""
        response = requests.get(f"{BASE_URL}/api/calendar", headers={
            "Authorization": f"Bearer {client_token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert "year" in data
        assert "month" in data
        assert "submissions" in data


class TestDeliverablesEndpoints:
    """Deliverables tests"""
    
    def test_deliverables_requires_auth(self):
        """Test /deliverables requires authentication"""
        response = requests.get(f"{BASE_URL}/api/deliverables")
        assert response.status_code == 401
    
    def test_deliverables_returns_array(self, client_token):
        """Test /deliverables returns list of deliverables"""
        response = requests.get(f"{BASE_URL}/api/deliverables", headers={
            "Authorization": f"Bearer {client_token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)


class TestAnalyticsEndpoints:
    """Analytics dashboard tests"""
    
    def test_analytics_requires_auth(self):
        """Test /analytics/dashboard requires authentication"""
        response = requests.get(f"{BASE_URL}/api/analytics/dashboard")
        assert response.status_code == 401
    
    def test_analytics_returns_data(self, client_token):
        """Test /analytics/dashboard returns snapshots and summary"""
        response = requests.get(f"{BASE_URL}/api/analytics/dashboard", headers={
            "Authorization": f"Bearer {client_token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert "snapshots" in data
        assert "summary" in data
        assert "range" in data
    
    def test_analytics_with_range_param(self, client_token):
        """Test /analytics/dashboard accepts range parameter"""
        response = requests.get(f"{BASE_URL}/api/analytics/dashboard?range=90d", headers={
            "Authorization": f"Bearer {client_token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["range"]["preset"] == "90d"


class TestROIEndpoints:
    """ROI Center tests"""
    
    def test_roi_requires_auth(self):
        """Test /roi/dashboard requires authentication"""
        response = requests.get(f"{BASE_URL}/api/roi/dashboard")
        assert response.status_code == 401
    
    def test_roi_returns_calculations(self, client_token):
        """Test /roi/dashboard returns ROI calculations"""
        response = requests.get(f"{BASE_URL}/api/roi/dashboard", headers={
            "Authorization": f"Bearer {client_token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert "totalCost" in data
        assert "totalROI" in data
        assert "roiMultiple" in data
        assert "netProfit" in data


class TestBillingEndpoints:
    """Billing tests"""
    
    def test_billing_dashboard_requires_auth(self):
        """Test /billing/dashboard requires authentication"""
        response = requests.get(f"{BASE_URL}/api/billing/dashboard")
        assert response.status_code == 401
    
    def test_billing_dashboard_returns_plan_info(self, client_token):
        """Test /billing/dashboard returns plan information"""
        response = requests.get(f"{BASE_URL}/api/billing/dashboard", headers={
            "Authorization": f"Bearer {client_token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert "currentPlan" in data
        assert "planDetails" in data
        assert "allPlans" in data


class TestSettingsEndpoints:
    """Settings tests"""
    
    def test_settings_requires_auth(self):
        """Test /settings requires authentication"""
        response = requests.get(f"{BASE_URL}/api/settings")
        assert response.status_code == 401
    
    def test_settings_returns_data(self, client_token):
        """Test /settings returns client settings"""
        response = requests.get(f"{BASE_URL}/api/settings", headers={
            "Authorization": f"Bearer {client_token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert "hourlyRate" in data
        assert "hoursPerEpisode" in data


class TestHelpEndpoints:
    """Help and Support tests"""
    
    def test_help_articles_public(self):
        """Test /help/articles is publicly accessible"""
        response = requests.get(f"{BASE_URL}/api/help/articles")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_support_requests_requires_auth(self):
        """Test /help/support requires authentication"""
        response = requests.get(f"{BASE_URL}/api/help/support")
        assert response.status_code == 401
    
    def test_support_requests_returns_array(self, client_token):
        """Test /help/support returns list of support requests"""
        response = requests.get(f"{BASE_URL}/api/help/support", headers={
            "Authorization": f"Bearer {client_token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)


class TestBlogEndpoints:
    """Blog tests"""
    
    def test_blog_posts_public(self):
        """Test /blog/posts is publicly accessible"""
        response = requests.get(f"{BASE_URL}/api/blog/posts")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_blog_tags_public(self):
        """Test /blog/tags is publicly accessible"""
        response = requests.get(f"{BASE_URL}/api/blog/tags")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)


class TestAIEndpoints:
    """AI generation tests"""
    
    def test_ai_capabilities_public(self):
        """Test /ai/capabilities is publicly accessible"""
        response = requests.get(f"{BASE_URL}/api/ai/capabilities")
        assert response.status_code == 200
        data = response.json()
        assert "llmProviders" in data
        assert "videoProviders" in data
    
    def test_ai_generate_requires_auth(self):
        """Test /ai/generate requires authentication"""
        response = requests.post(f"{BASE_URL}/api/ai/generate", json={
            "provider": "gemini",
            "task": "title",
            "input": "test"
        })
        assert response.status_code == 401
    
    def test_ai_generate_with_auth(self, client_token):
        """Test /ai/generate works with authentication"""
        response = requests.post(f"{BASE_URL}/api/ai/generate", json={
            "provider": "gemini",
            "task": "title",
            "input": {"topic": "A podcast about AI and technology"}
        }, headers={
            "Authorization": f"Bearer {client_token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert "result" in data or "error" not in data


class TestVideoTasksEndpoints:
    """Video tasks tests"""
    
    def test_video_tasks_requires_auth(self):
        """Test /video-tasks requires authentication"""
        response = requests.get(f"{BASE_URL}/api/video-tasks")
        assert response.status_code == 401
    
    def test_video_tasks_returns_array(self, client_token):
        """Test /video-tasks returns list of video tasks"""
        response = requests.get(f"{BASE_URL}/api/video-tasks", headers={
            "Authorization": f"Bearer {client_token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)


class TestFVSEndpoints:
    """FVS System tests"""
    
    def test_fvs_config_requires_auth(self):
        """Test /fvs/config requires authentication"""
        response = requests.get(f"{BASE_URL}/api/fvs/config")
        assert response.status_code == 401
    
    def test_fvs_config_returns_data(self, client_token):
        """Test /fvs/config returns automation config"""
        response = requests.get(f"{BASE_URL}/api/fvs/config", headers={
            "Authorization": f"Bearer {client_token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert "automationLevel" in data
    
    def test_fvs_ideas_returns_array(self, client_token):
        """Test /fvs/ideas returns list of ideas"""
        response = requests.get(f"{BASE_URL}/api/fvs/ideas", headers={
            "Authorization": f"Bearer {client_token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_fvs_activity_returns_array(self, client_token):
        """Test /fvs/activity returns activity log"""
        response = requests.get(f"{BASE_URL}/api/fvs/activity", headers={
            "Authorization": f"Bearer {client_token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_fvs_brain_snapshot_returns_data(self, client_token):
        """Test /fvs/brain-snapshot returns snapshot or null"""
        response = requests.get(f"{BASE_URL}/api/fvs/brain-snapshot", headers={
            "Authorization": f"Bearer {client_token}"
        })
        assert response.status_code == 200


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
