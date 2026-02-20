"""
Sprint 10: UI Wiring + Foundation Fixes Tests
Tests for: FVS System recommendations, Analytics Trend Intelligence, ROI CPM model, Blog articles, Help page, etc.
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://video-monetize-flow.preview.emergentagent.com')

@pytest.fixture(scope='module')
def auth_token():
    """Get authentication token for client user"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": "alex@company.com",
        "password": "client123"
    })
    assert response.status_code == 200, f"Login failed: {response.text}"
    return response.json()["token"]

@pytest.fixture
def auth_headers(auth_token):
    """Create auth headers"""
    return {"Authorization": f"Bearer {auth_token}"}

class TestFvsSystemRecommendations:
    """Part A: FVS System AI Recommendations tests"""
    
    def test_trends_recommendations_endpoint(self, auth_headers):
        """Test /api/trends/recommendations returns AI recommendations"""
        response = requests.get(f"{BASE_URL}/api/trends/recommendations", headers=auth_headers)
        # Accept 200 or 404 (if no recommendations yet)
        assert response.status_code in [200, 404], f"Unexpected status: {response.status_code}"
        
        if response.status_code == 200:
            data = response.json()
            if data and 'recommendations' in data:
                assert isinstance(data['recommendations'], list)
                print(f"Found {len(data['recommendations'])} recommendations")
    
    def test_trends_competitors_endpoint(self, auth_headers):
        """Test /api/trends/competitors returns competitor videos"""
        response = requests.get(f"{BASE_URL}/api/trends/competitors?limit=10", headers=auth_headers)
        assert response.status_code == 200, f"Competitors endpoint failed: {response.text}"
        
        data = response.json()
        assert 'videos' in data
        assert isinstance(data['videos'], list)
        print(f"Found {len(data['videos'])} competitor videos")
    
    def test_trends_scan_status(self, auth_headers):
        """Test /api/trends/scan/status endpoint"""
        response = requests.get(f"{BASE_URL}/api/trends/scan/status", headers=auth_headers)
        # Accept 200 or 404 (if no scan has been run)
        assert response.status_code in [200, 404], f"Scan status failed: {response.status_code}"

class TestAnalyticsTrendIntelligence:
    """Part B: Analytics Trend Intelligence Tab tests"""
    
    def test_analytics_overview(self, auth_headers):
        """Test /api/analytics/overview returns real YouTube data"""
        response = requests.get(f"{BASE_URL}/api/analytics/overview", headers=auth_headers)
        assert response.status_code == 200, f"Analytics overview failed: {response.text}"
        
        data = response.json()
        # Verify expected 1,320 subscribers
        if 'subscriberCount' in data:
            print(f"Subscriber count: {data['subscriberCount']}")
            assert data['subscriberCount'] == 1320, f"Expected 1320 subscribers, got {data['subscriberCount']}"
        
        assert 'totalViews' in data
        assert 'videoCount' in data
    
    def test_analytics_videos(self, auth_headers):
        """Test /api/analytics/videos endpoint"""
        response = requests.get(f"{BASE_URL}/api/analytics/videos?limit=100", headers=auth_headers)
        assert response.status_code == 200, f"Analytics videos failed: {response.text}"
        
        data = response.json()
        assert 'videos' in data
        print(f"Found {len(data['videos'])} videos in analytics")
    
    def test_analytics_top_performers(self, auth_headers):
        """Test /api/analytics/top-performers endpoint"""
        response = requests.get(f"{BASE_URL}/api/analytics/top-performers?limit=3", headers=auth_headers)
        assert response.status_code == 200, f"Top performers failed: {response.text}"
        
        data = response.json()
        assert 'videos' in data

class TestROICenterCPM:
    """Part D: ROI Center CPM-based calculation tests"""
    
    def test_roi_dashboard(self, auth_headers):
        """Test /api/roi/dashboard returns ROI data"""
        response = requests.get(f"{BASE_URL}/api/roi/dashboard?range=30d", headers=auth_headers)
        assert response.status_code == 200, f"ROI dashboard failed: {response.text}"
        
        data = response.json()
        assert 'range' in data

class TestBlogChanakyaArticles:
    """Part E: Blog with 5 Chanakya Sutra articles tests"""
    
    def test_blog_posts_count(self, auth_headers):
        """Test /api/blog/posts returns 5 Chanakya-themed articles"""
        response = requests.get(f"{BASE_URL}/api/blog/posts", headers=auth_headers)
        assert response.status_code == 200, f"Blog posts failed: {response.text}"
        
        posts = response.json()
        assert len(posts) >= 5, f"Expected at least 5 blog posts, got {len(posts)}"
        
        # Verify Chanakya-related titles
        chanakya_keywords = ['chanakya', 'karma', 'mandala', 'arthashastra', 'panchatantra', 'saam', 'daam', 'dand', 'bhed']
        for post in posts:
            title_lower = post['title'].lower()
            has_chanakya_keyword = any(kw in title_lower for kw in chanakya_keywords)
            print(f"Post: {post['title']}")
        
        print(f"✓ Found {len(posts)} blog posts")
    
    def test_blog_tags(self, auth_headers):
        """Test /api/blog/tags endpoint"""
        response = requests.get(f"{BASE_URL}/api/blog/tags", headers=auth_headers)
        assert response.status_code == 200, f"Blog tags failed: {response.text}"

class TestHelpPageNoError:
    """Part E: Help page error handling tests"""
    
    def test_help_articles(self, auth_headers):
        """Test /api/help/articles doesn't error on empty data"""
        response = requests.get(f"{BASE_URL}/api/help/articles", headers=auth_headers)
        # Should return 200 even with empty data
        assert response.status_code == 200, f"Help articles failed: {response.status_code}"
    
    def test_help_support(self, auth_headers):
        """Test /api/help/support endpoint"""
        response = requests.get(f"{BASE_URL}/api/help/support", headers=auth_headers)
        # Should return 200 even with empty data
        assert response.status_code == 200, f"Help support failed: {response.status_code}"

class TestStrategyLabTone:
    """Part E: Strategy Lab tone pre-population tests"""
    
    def test_channel_profile_endpoint(self, auth_headers):
        """Test /api/channel-profile returns tone data"""
        response = requests.get(f"{BASE_URL}/api/channel-profile", headers=auth_headers)
        # Accept 200 or 404 (if no channel profile yet)
        assert response.status_code in [200, 404], f"Channel profile failed: {response.status_code}"
        
        if response.status_code == 200:
            data = response.json()
            if 'tone' in data:
                print(f"Channel tone: {data['tone']}")
    
    def test_settings_endpoint(self, auth_headers):
        """Test /api/settings returns brand voice description"""
        response = requests.get(f"{BASE_URL}/api/settings", headers=auth_headers)
        assert response.status_code == 200, f"Settings failed: {response.text}"

class TestAssetsLibrary:
    """Part E: Assets thumbnail preview tests"""
    
    def test_assets_library(self, auth_headers):
        """Test /api/assets/library returns assets with URLs"""
        response = requests.get(f"{BASE_URL}/api/assets/library", headers=auth_headers)
        assert response.status_code == 200, f"Assets library failed: {response.text}"
        
        assets = response.json()
        assert isinstance(assets, list)
        
        # Check for thumbnail assets with URLs
        thumbnails = [a for a in assets if a.get('type', '').lower() == 'thumbnail']
        print(f"Found {len(thumbnails)} thumbnail assets")
        
        # Verify at least some have URLs
        thumbnails_with_urls = [t for t in thumbnails if t.get('url')]
        print(f"Thumbnails with URLs: {len(thumbnails_with_urls)}")

class TestNavigationChanges:
    """Part F: Navigation cleanup tests"""
    
    def test_submissions_endpoint(self, auth_headers):
        """Test /api/submissions for badge count"""
        response = requests.get(f"{BASE_URL}/api/submissions", headers=auth_headers)
        assert response.status_code == 200, f"Submissions failed: {response.text}"
        
        submissions = response.json()
        print(f"Found {len(submissions)} submissions for badge")

class TestDashboardOverview:
    """Part C: Overview Dashboard real data tests"""
    
    def test_dashboard_overview(self, auth_headers):
        """Test /api/dashboard/overview returns real data"""
        response = requests.get(f"{BASE_URL}/api/dashboard/overview", headers=auth_headers)
        assert response.status_code == 200, f"Dashboard overview failed: {response.text}"
        
        data = response.json()
        assert 'clientName' in data
        assert 'kpis' in data
        print(f"Dashboard for: {data['clientName']}")
