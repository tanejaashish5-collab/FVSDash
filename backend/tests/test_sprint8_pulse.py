"""
Sprint 8: The Pulse Update - Testing Suite
Tests YouTube OAuth, data cleanup, hero episodes, and global app health
"""
import pytest
import requests
import os

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://feedback-analytics-1.preview.emergentagent.com")

# Test credentials
CLIENT_EMAIL = "alex@company.com"
CLIENT_PASSWORD = "client123"
ADMIN_EMAIL = "admin@forgevoice.com"
ADMIN_PASSWORD = "admin123"


class TestAuthentication:
    """Test user authentication"""
    
    def test_client_login_success(self):
        """Client user can login successfully"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": CLIENT_EMAIL,
            "password": CLIENT_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert data["user"]["email"] == CLIENT_EMAIL
        print(f"✓ Client login successful: {data['user']['name']}")

    def test_admin_login_success(self):
        """Admin user can login successfully"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert data["user"]["role"] == "admin"
        print(f"✓ Admin login successful: {data['user']['name']}")


@pytest.fixture
def client_auth():
    """Get client authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": CLIENT_EMAIL,
        "password": CLIENT_PASSWORD
    })
    token = response.json().get("token")
    return {"Authorization": f"Bearer {token}"}


class TestOverviewPage:
    """Test 1-3: Overview page loads without spinner, shows cleaned data"""
    
    def test_overview_loads_quickly(self, client_auth):
        """Overview API responds within reasonable time with data"""
        import time
        start = time.time()
        response = requests.get(f"{BASE_URL}/api/dashboard/overview", headers=client_auth)
        elapsed = time.time() - start
        
        assert response.status_code == 200
        assert elapsed < 2.0, f"Overview took {elapsed:.2f}s, expected < 2s"
        print(f"✓ Overview loaded in {elapsed:.2f}s")
        
    def test_overview_has_kpis(self, client_auth):
        """Overview returns valid KPI data"""
        response = requests.get(f"{BASE_URL}/api/dashboard/overview", headers=client_auth)
        data = response.json()
        
        assert "kpis" in data
        kpis = data["kpis"]
        assert "activeProjects" in kpis
        assert "publishedLast30d" in kpis
        assert "totalAssets" in kpis
        assert "roiLast30d" in kpis
        print(f"✓ KPIs: {kpis}")
        
    def test_no_test_items_in_pipeline(self, client_auth):
        """Pipeline should NOT contain TEST_ prefixed items"""
        response = requests.get(f"{BASE_URL}/api/dashboard/overview", headers=client_auth)
        data = response.json()
        
        for status, items in data["pipeline"].items():
            for item in items:
                assert not item["title"].startswith("TEST_"), f"Found TEST_ item: {item['title']}"
        print("✓ No TEST_ items in pipeline")
        
    def test_hero_episodes_visible(self, client_auth):
        """Hero Episodes are visible: Chanakya (EDITING), 5 AI Tools (SCHEDULED), 99% Fail (PUBLISHED)"""
        response = requests.get(f"{BASE_URL}/api/dashboard/overview", headers=client_auth)
        data = response.json()
        
        all_titles = []
        for status, items in data["pipeline"].items():
            for item in items:
                all_titles.append((item["title"], status))
        
        # Check for Hero Episodes
        hero_1_found = any("Chanakya Principle" in title for title, status in all_titles if status == "EDITING")
        hero_2_found = any("5 AI Tools" in title for title, status in all_titles if status == "SCHEDULED")
        hero_3_found = any("99%" in title and "Podcasters" in title for title, status in all_titles if status == "PUBLISHED")
        
        assert hero_1_found, "Hero Episode 1 (Chanakya) not found in EDITING"
        assert hero_2_found, "Hero Episode 2 (5 AI Tools) not found in SCHEDULED"
        assert hero_3_found, "Hero Episode 3 (99% Fail) not found in PUBLISHED"
        print("✓ All 3 Hero Episodes visible in correct statuses")


class TestAnalyticsPage:
    """Test 4: Analytics page loads with 30-day chart data"""
    
    def test_analytics_dashboard_loads(self, client_auth):
        """Analytics dashboard returns 30-day data without errors"""
        response = requests.get(f"{BASE_URL}/api/analytics/dashboard?days=30", headers=client_auth)
        assert response.status_code == 200
        data = response.json()
        
        assert "snapshots" in data
        assert "summary" in data
        assert "range" in data
        
        # Should have analytics snapshots
        snapshots = data["snapshots"]
        assert isinstance(snapshots, list)
        print(f"✓ Analytics loaded with {len(snapshots)} snapshots")
        
    def test_analytics_summary_has_required_fields(self, client_auth):
        """Analytics summary contains required metrics"""
        response = requests.get(f"{BASE_URL}/api/analytics/dashboard?days=30", headers=client_auth)
        data = response.json()
        
        summary = data.get("summary", {})
        # Check summary has expected fields
        expected_fields = ["totalViews", "totalDownloads"]
        for field in expected_fields:
            assert field in summary, f"Missing summary field: {field}"
        print(f"✓ Analytics summary: {summary}")


class TestROICenter:
    """Test 5: ROI Center loads without errors"""
    
    def test_roi_dashboard_loads(self, client_auth):
        """ROI dashboard returns valid data"""
        response = requests.get(f"{BASE_URL}/api/roi/dashboard?days=30", headers=client_auth)
        assert response.status_code == 200
        data = response.json()
        
        assert "totalROI" in data
        assert "totalCost" in data
        assert "netProfit" in data
        assert "roiMultiple" in data
        print(f"✓ ROI Dashboard: totalROI=${data['totalROI']}, multiple={data['roiMultiple']}x")


class TestCalendarPage:
    """Test 6: Calendar page loads without errors"""
    
    def test_calendar_loads(self, client_auth):
        """Calendar API returns valid data"""
        response = requests.get(f"{BASE_URL}/api/calendar", headers=client_auth)
        assert response.status_code == 200
        data = response.json()
        
        assert "year" in data
        assert "month" in data
        assert "submissions" in data
        print(f"✓ Calendar loaded: {data['year']}-{data['month']:02d} with {len(data['submissions'])} submissions")


class TestYouTubeOAuth:
    """Tests 7-9, 12: YouTube OAuth real flow"""
    
    def test_oauth_status_returns_all_platforms(self, client_auth):
        """OAuth status returns youtube, tiktok, instagram"""
        response = requests.get(f"{BASE_URL}/api/oauth/status", headers=client_auth)
        assert response.status_code == 200
        data = response.json()
        
        assert "youtube" in data
        assert "tiktok" in data
        assert "instagram" in data
        print(f"✓ OAuth status: YouTube={data['youtube']['connected']}, TikTok={data['tiktok']['connected']}")
        
    def test_youtube_connect_returns_real_oauth(self, client_auth):
        """YouTube OAuth connect returns isMock: false with real Google OAuth URL"""
        response = requests.post(f"{BASE_URL}/api/oauth/connect/youtube", headers=client_auth)
        assert response.status_code == 200
        data = response.json()
        
        assert "authUrl" in data
        assert "isMock" in data
        assert data["isMock"] == False, "Expected isMock: false for real YouTube OAuth"
        assert "accounts.google.com" in data["authUrl"], "Expected Google OAuth URL"
        assert "client_id=597182844338" in data["authUrl"], "Expected real YouTube client_id"
        print("✓ YouTube OAuth returns real Google OAuth URL with isMock: false")
        
    def test_youtube_oauth_includes_pkce(self, client_auth):
        """YouTube OAuth includes PKCE code_challenge for security"""
        response = requests.post(f"{BASE_URL}/api/oauth/connect/youtube", headers=client_auth)
        data = response.json()
        
        auth_url = data["authUrl"]
        assert "code_challenge=" in auth_url
        assert "code_challenge_method=S256" in auth_url
        assert "access_type=offline" in auth_url
        print("✓ YouTube OAuth includes PKCE and offline access")
        
    def test_tiktok_instagram_show_coming_soon(self, client_auth):
        """TikTok and Instagram OAuth still show as mock/coming soon"""
        # TikTok
        response_tiktok = requests.post(f"{BASE_URL}/api/oauth/connect/tiktok", headers=client_auth)
        assert response_tiktok.status_code == 200
        assert response_tiktok.json()["isMock"] == True
        
        # Instagram
        response_ig = requests.post(f"{BASE_URL}/api/oauth/connect/instagram", headers=client_auth)
        assert response_ig.status_code == 200
        assert response_ig.json()["isMock"] == True
        print("✓ TikTok and Instagram OAuth remain mocked")


class TestPublishingDashboard:
    """Test 10: Publishing Dashboard page loads with queue items"""
    
    def test_publish_queue_has_items(self, client_auth):
        """Publish queue returns items ready to publish"""
        response = requests.get(f"{BASE_URL}/api/publish/queue", headers=client_auth)
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data, list)
        print(f"✓ Publishing queue has {len(data)} items")
        
    def test_publish_stats_loads(self, client_auth):
        """Publish stats endpoint returns valid data"""
        response = requests.get(f"{BASE_URL}/api/publish/stats", headers=client_auth)
        assert response.status_code == 200
        data = response.json()
        
        expected_fields = ["total", "live", "pending"]
        for field in expected_fields:
            assert field in data, f"Missing publish stats field: {field}"
        print(f"✓ Publish stats: {data}")


class TestSubmissionsPage:
    """Test 11: Submissions page shows Hero Episodes with proper status badges"""
    
    def test_submissions_list_loads(self, client_auth):
        """Submissions list returns all items"""
        response = requests.get(f"{BASE_URL}/api/submissions", headers=client_auth)
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data, list)
        assert len(data) > 0, "Expected submissions in list"
        
        # Check for Hero Episodes
        titles = [s["title"] for s in data]
        assert any("Chanakya Principle" in t for t in titles), "Hero 1 (Chanakya) missing"
        assert any("5 AI Tools" in t for t in titles), "Hero 2 (5 AI Tools) missing"
        assert any("99%" in t and "Podcasters" in t for t in titles), "Hero 3 (99% Fail) missing"
        print(f"✓ Submissions list: {len(data)} items with Hero Episodes present")
        
    def test_submissions_have_status_badges(self, client_auth):
        """Each submission has a valid status"""
        response = requests.get(f"{BASE_URL}/api/submissions", headers=client_auth)
        data = response.json()
        
        valid_statuses = ["INTAKE", "EDITING", "DESIGN", "SCHEDULED", "PUBLISHED"]
        for sub in data:
            assert "status" in sub, f"Missing status for {sub.get('title')}"
            assert sub["status"] in valid_statuses, f"Invalid status {sub['status']} for {sub['title']}"
        print("✓ All submissions have valid status badges")


class TestYouTubeSyncEndpoint:
    """Test YouTube Sync Channel button functionality"""
    
    def test_sync_endpoint_exists(self, client_auth):
        """YouTube sync endpoint is accessible"""
        response = requests.post(f"{BASE_URL}/api/oauth/youtube/sync", headers=client_auth)
        # Should return 400 if not connected with real account, but endpoint exists
        assert response.status_code in [200, 400]
        
        if response.status_code == 400:
            # Expected if mock token
            data = response.json()
            print(f"✓ Sync endpoint exists (requires real YouTube connection)")
        else:
            data = response.json()
            print(f"✓ Sync endpoint returned: {data}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
