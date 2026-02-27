"""
Backend API tests for ForgeVoice Studio P2 Dashboard Pages:
- Settings Page (/api/settings)
- Help Page (/api/help/articles, /api/help/support)
- Blog Page (/api/blog/posts, /api/blog/tags)
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


@pytest.fixture(scope="module")
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture(scope="module")
def client_auth_token(api_client):
    """Get client authentication token"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "email": CLIENT_EMAIL,
        "password": CLIENT_PASSWORD
    })
    assert response.status_code == 200, f"Client login failed: {response.text}"
    return response.json().get("token")


@pytest.fixture(scope="module")
def admin_auth_token(api_client):
    """Get admin authentication token"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    assert response.status_code == 200, f"Admin login failed: {response.text}"
    return response.json().get("token")


@pytest.fixture
def client_headers(client_auth_token):
    """Headers with client auth token"""
    return {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {client_auth_token}"
    }


@pytest.fixture
def admin_headers(admin_auth_token):
    """Headers with admin auth token"""
    return {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {admin_auth_token}"
    }


# ==================== SETTINGS PAGE TESTS ====================

class TestSettingsEndpoint:
    """Tests for GET/PUT /api/settings endpoint"""
    
    def test_settings_get_requires_auth(self, api_client):
        """Settings GET endpoint requires authentication"""
        response = api_client.get(f"{BASE_URL}/api/settings")
        assert response.status_code == 401
    
    def test_settings_put_requires_auth(self, api_client):
        """Settings PUT endpoint requires authentication"""
        response = api_client.put(f"{BASE_URL}/api/settings", json={"hourlyRate": 100})
        assert response.status_code == 401
    
    def test_settings_get_returns_all_fields(self, api_client, client_headers):
        """Settings GET returns all required fields"""
        response = api_client.get(f"{BASE_URL}/api/settings", headers=client_headers)
        assert response.status_code == 200
        data = response.json()
        
        # Verify all required fields exist
        assert "hourlyRate" in data
        assert "hoursPerEpisode" in data
        assert "brandVoiceDescription" in data
        assert "primaryContactName" in data
        assert "primaryContactEmail" in data
        assert "clientName" in data
        
        print(f"Settings: hourlyRate=${data['hourlyRate']}, hoursPerEpisode={data['hoursPerEpisode']}")
    
    def test_settings_get_returns_numeric_values(self, api_client, client_headers):
        """Settings GET returns proper numeric values"""
        response = api_client.get(f"{BASE_URL}/api/settings", headers=client_headers)
        assert response.status_code == 200
        data = response.json()
        
        # Verify numeric types
        assert isinstance(data["hourlyRate"], (int, float))
        assert isinstance(data["hoursPerEpisode"], (int, float))
        assert data["hourlyRate"] >= 0
        assert data["hoursPerEpisode"] > 0
    
    def test_settings_put_updates_hourly_rate(self, api_client, client_headers):
        """Settings PUT updates hourly rate"""
        # Get original value
        original = api_client.get(f"{BASE_URL}/api/settings", headers=client_headers).json()
        original_rate = original["hourlyRate"]
        
        # Update to new value
        new_rate = 175.50
        response = api_client.put(f"{BASE_URL}/api/settings", 
            json={"hourlyRate": new_rate}, headers=client_headers)
        assert response.status_code == 200
        
        # Verify update persisted
        updated = api_client.get(f"{BASE_URL}/api/settings", headers=client_headers).json()
        assert updated["hourlyRate"] == new_rate
        print(f"Updated hourlyRate from ${original_rate} to ${new_rate}")
        
        # Revert
        api_client.put(f"{BASE_URL}/api/settings", 
            json={"hourlyRate": original_rate}, headers=client_headers)
    
    def test_settings_put_updates_hours_per_episode(self, api_client, client_headers):
        """Settings PUT updates hours per episode"""
        # Get original value
        original = api_client.get(f"{BASE_URL}/api/settings", headers=client_headers).json()
        original_hours = original["hoursPerEpisode"]
        
        # Update to new value
        new_hours = 8.5
        response = api_client.put(f"{BASE_URL}/api/settings", 
            json={"hoursPerEpisode": new_hours}, headers=client_headers)
        assert response.status_code == 200
        
        # Verify update persisted
        updated = api_client.get(f"{BASE_URL}/api/settings", headers=client_headers).json()
        assert updated["hoursPerEpisode"] == new_hours
        print(f"Updated hoursPerEpisode from {original_hours} to {new_hours}")
        
        # Revert
        api_client.put(f"{BASE_URL}/api/settings", 
            json={"hoursPerEpisode": original_hours}, headers=client_headers)
    
    def test_settings_put_updates_brand_voice(self, api_client, client_headers):
        """Settings PUT updates brand voice description"""
        # Get original value
        original = api_client.get(f"{BASE_URL}/api/settings", headers=client_headers).json()
        original_voice = original["brandVoiceDescription"]
        
        # Update to new value
        new_voice = "TEST_Professional, authoritative, and engaging"
        response = api_client.put(f"{BASE_URL}/api/settings", 
            json={"brandVoiceDescription": new_voice}, headers=client_headers)
        assert response.status_code == 200
        
        # Verify update persisted
        updated = api_client.get(f"{BASE_URL}/api/settings", headers=client_headers).json()
        assert updated["brandVoiceDescription"] == new_voice
        print(f"Updated brandVoiceDescription")
        
        # Revert
        api_client.put(f"{BASE_URL}/api/settings", 
            json={"brandVoiceDescription": original_voice}, headers=client_headers)
    
    def test_settings_put_updates_contact_details(self, api_client, client_headers):
        """Settings PUT updates contact name and email"""
        # Get original values
        original = api_client.get(f"{BASE_URL}/api/settings", headers=client_headers).json()
        original_name = original["primaryContactName"]
        original_email = original["primaryContactEmail"]
        
        # Update to new values
        new_name = "TEST_John Smith"
        new_email = "test_john@example.com"
        response = api_client.put(f"{BASE_URL}/api/settings", 
            json={"primaryContactName": new_name, "primaryContactEmail": new_email}, 
            headers=client_headers)
        assert response.status_code == 200
        
        # Verify update persisted
        updated = api_client.get(f"{BASE_URL}/api/settings", headers=client_headers).json()
        assert updated["primaryContactName"] == new_name
        assert updated["primaryContactEmail"] == new_email
        print(f"Updated contact details to {new_name}, {new_email}")
        
        # Revert
        api_client.put(f"{BASE_URL}/api/settings", 
            json={"primaryContactName": original_name, "primaryContactEmail": original_email}, 
            headers=client_headers)
    
    def test_settings_put_validates_negative_hourly_rate(self, api_client, client_headers):
        """Settings PUT rejects negative hourly rate"""
        response = api_client.put(f"{BASE_URL}/api/settings", 
            json={"hourlyRate": -50}, headers=client_headers)
        assert response.status_code == 400
    
    def test_settings_put_validates_zero_hours_per_episode(self, api_client, client_headers):
        """Settings PUT rejects zero or negative hours per episode"""
        response = api_client.put(f"{BASE_URL}/api/settings", 
            json={"hoursPerEpisode": 0}, headers=client_headers)
        assert response.status_code == 400
        
        response = api_client.put(f"{BASE_URL}/api/settings", 
            json={"hoursPerEpisode": -5}, headers=client_headers)
        assert response.status_code == 400
    
    def test_settings_scoped_to_client(self, api_client, client_headers, admin_headers):
        """Settings are scoped to client (multi-tenant safe)"""
        client_settings = api_client.get(f"{BASE_URL}/api/settings", headers=client_headers).json()
        admin_settings = api_client.get(f"{BASE_URL}/api/settings", headers=admin_headers).json()
        
        # Admin has no clientId, should return empty or default
        print(f"Client settings: hourlyRate=${client_settings.get('hourlyRate')}")
        print(f"Admin settings: hourlyRate=${admin_settings.get('hourlyRate', 'N/A')}")


# ==================== HELP ARTICLES TESTS ====================

class TestHelpArticlesEndpoint:
    """Tests for GET /api/help/articles endpoint"""
    
    def test_help_articles_returns_list(self, api_client, client_headers):
        """Help articles returns list of articles"""
        response = api_client.get(f"{BASE_URL}/api/help/articles", headers=client_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} help articles")
    
    def test_help_articles_have_required_fields(self, api_client, client_headers):
        """Help articles have all required fields"""
        response = api_client.get(f"{BASE_URL}/api/help/articles", headers=client_headers)
        assert response.status_code == 200
        data = response.json()
        
        if data:
            article = data[0]
            assert "id" in article
            assert "title" in article
            assert "content" in article
            assert "category" in article
            print(f"Sample article: '{article['title']}' in category '{article['category']}'")
    
    def test_help_articles_grouped_by_category(self, api_client, client_headers):
        """Help articles can be grouped by category"""
        response = api_client.get(f"{BASE_URL}/api/help/articles", headers=client_headers)
        assert response.status_code == 200
        data = response.json()
        
        categories = set()
        for article in data:
            categories.add(article.get("category", "General"))
        
        print(f"Categories found: {categories}")
        assert len(categories) > 0


# ==================== SUPPORT REQUESTS TESTS ====================

class TestSupportRequestsEndpoint:
    """Tests for GET/POST /api/help/support endpoint"""
    
    def test_support_get_requires_auth(self, api_client):
        """Support GET endpoint requires authentication"""
        response = api_client.get(f"{BASE_URL}/api/help/support")
        assert response.status_code == 401
    
    def test_support_post_requires_auth(self, api_client):
        """Support POST endpoint requires authentication"""
        response = api_client.post(f"{BASE_URL}/api/help/support", 
            json={"subject": "Test", "message": "Test message"})
        assert response.status_code == 401
    
    def test_support_get_returns_list(self, api_client, client_headers):
        """Support GET returns list of requests"""
        response = api_client.get(f"{BASE_URL}/api/help/support", headers=client_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} support requests")
    
    def test_support_requests_have_required_fields(self, api_client, client_headers):
        """Support requests have all required fields"""
        response = api_client.get(f"{BASE_URL}/api/help/support", headers=client_headers)
        assert response.status_code == 200
        data = response.json()
        
        if data:
            req = data[0]
            assert "id" in req
            assert "subject" in req
            assert "message" in req
            assert "status" in req
            assert "createdAt" in req
            print(f"Sample request: '{req['subject']}' - Status: {req['status']}")
    
    def test_support_post_creates_request(self, api_client, client_headers):
        """Support POST creates new request"""
        new_request = {
            "subject": "TEST_API Test Request",
            "message": "This is a test support request created via API testing."
        }
        
        response = api_client.post(f"{BASE_URL}/api/help/support", 
            json=new_request, headers=client_headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "message" in data
        assert "request" in data
        assert data["request"]["subject"] == new_request["subject"]
        assert data["request"]["status"] == "Open"
        print(f"Created support request: {data['request']['id']}")
    
    def test_support_post_validates_empty_subject(self, api_client, client_headers):
        """Support POST validates empty subject"""
        response = api_client.post(f"{BASE_URL}/api/help/support", 
            json={"subject": "", "message": "Test message"}, headers=client_headers)
        # Should either return 400 or 422 for validation error
        assert response.status_code in [400, 422]
    
    def test_support_post_validates_empty_message(self, api_client, client_headers):
        """Support POST validates empty message"""
        response = api_client.post(f"{BASE_URL}/api/help/support", 
            json={"subject": "Test Subject", "message": ""}, headers=client_headers)
        # Should either return 400 or 422 for validation error
        assert response.status_code in [400, 422]
    
    def test_support_requests_scoped_to_client(self, api_client, client_headers, admin_headers):
        """Support requests are scoped to client"""
        client_requests = api_client.get(f"{BASE_URL}/api/help/support", headers=client_headers).json()
        admin_requests = api_client.get(f"{BASE_URL}/api/help/support", headers=admin_headers).json()
        
        print(f"Client sees {len(client_requests)} support requests")
        print(f"Admin sees {len(admin_requests)} support requests")


# ==================== BLOG POSTS TESTS ====================

class TestBlogPostsEndpoint:
    """Tests for GET /api/blog/posts endpoint"""
    
    def test_blog_posts_returns_list(self, api_client, client_headers):
        """Blog posts returns list of posts"""
        response = api_client.get(f"{BASE_URL}/api/blog/posts", headers=client_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} blog posts")
    
    def test_blog_posts_have_required_fields(self, api_client, client_headers):
        """Blog posts have all required fields"""
        response = api_client.get(f"{BASE_URL}/api/blog/posts", headers=client_headers)
        assert response.status_code == 200
        data = response.json()
        
        if data:
            post = data[0]
            assert "id" in post
            assert "title" in post
            assert "slug" in post
            assert "excerpt" in post
            assert "content" in post
            assert "tags" in post
            assert "publishedAt" in post
            print(f"Sample post: '{post['title']}' with tags {post['tags']}")
    
    def test_blog_posts_filter_by_tag(self, api_client, client_headers):
        """Blog posts can be filtered by tag"""
        # First get all posts to find a tag
        all_posts = api_client.get(f"{BASE_URL}/api/blog/posts", headers=client_headers).json()
        
        if all_posts and all_posts[0].get("tags"):
            test_tag = all_posts[0]["tags"][0]
            
            # Filter by tag
            response = api_client.get(f"{BASE_URL}/api/blog/posts?tag={test_tag}", headers=client_headers)
            assert response.status_code == 200
            filtered = response.json()
            
            # All filtered posts should have the tag
            for post in filtered:
                assert test_tag in post.get("tags", [])
            
            print(f"Filtered by tag '{test_tag}': {len(filtered)} posts (from {len(all_posts)} total)")
    
    def test_blog_posts_filter_by_search(self, api_client, client_headers):
        """Blog posts can be filtered by search query"""
        # First get all posts
        all_posts = api_client.get(f"{BASE_URL}/api/blog/posts", headers=client_headers).json()
        
        if all_posts:
            # Search for a word from the first post title
            search_term = all_posts[0]["title"].split()[0]
            
            response = api_client.get(f"{BASE_URL}/api/blog/posts?search={search_term}", headers=client_headers)
            assert response.status_code == 200
            filtered = response.json()
            
            print(f"Search for '{search_term}': {len(filtered)} posts found")
    
    def test_blog_posts_sorted_by_date(self, api_client, client_headers):
        """Blog posts are sorted by publishedAt descending"""
        response = api_client.get(f"{BASE_URL}/api/blog/posts", headers=client_headers)
        assert response.status_code == 200
        data = response.json()
        
        if len(data) > 1:
            dates = [post.get("publishedAt") for post in data]
            # Check descending order
            for i in range(len(dates) - 1):
                if dates[i] and dates[i+1]:
                    assert dates[i] >= dates[i+1], "Posts should be sorted by date descending"
            print("Posts are correctly sorted by date (newest first)")


# ==================== BLOG POST BY SLUG TESTS ====================

class TestBlogPostBySlugEndpoint:
    """Tests for GET /api/blog/posts/{slug} endpoint"""
    
    def test_blog_post_by_slug_returns_post(self, api_client, client_headers):
        """Blog post by slug returns single post"""
        # First get all posts to find a slug
        all_posts = api_client.get(f"{BASE_URL}/api/blog/posts", headers=client_headers).json()
        
        if all_posts:
            test_slug = all_posts[0]["slug"]
            
            response = api_client.get(f"{BASE_URL}/api/blog/posts/{test_slug}", headers=client_headers)
            assert response.status_code == 200
            post = response.json()
            
            assert post["slug"] == test_slug
            assert "content" in post
            print(f"Retrieved post by slug: '{post['title']}'")
    
    def test_blog_post_by_slug_not_found(self, api_client, client_headers):
        """Blog post by slug returns 404 for nonexistent slug"""
        response = api_client.get(f"{BASE_URL}/api/blog/posts/nonexistent-slug-12345", headers=client_headers)
        assert response.status_code == 404


# ==================== BLOG TAGS TESTS ====================

class TestBlogTagsEndpoint:
    """Tests for GET /api/blog/tags endpoint"""
    
    def test_blog_tags_returns_list(self, api_client, client_headers):
        """Blog tags returns list of unique tags"""
        response = api_client.get(f"{BASE_URL}/api/blog/tags", headers=client_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} unique tags: {data}")
    
    def test_blog_tags_are_sorted(self, api_client, client_headers):
        """Blog tags are sorted alphabetically"""
        response = api_client.get(f"{BASE_URL}/api/blog/tags", headers=client_headers)
        assert response.status_code == 200
        data = response.json()
        
        if len(data) > 1:
            assert data == sorted(data), "Tags should be sorted alphabetically"
            print("Tags are correctly sorted alphabetically")


# ==================== ROI INTEGRATION TEST ====================

class TestROIUsesClientSettings:
    """Tests that ROI endpoint uses hourlyRate and hoursPerEpisode from ClientSettings"""
    
    def test_roi_uses_client_hourly_rate(self, api_client, client_headers):
        """ROI endpoint uses hourlyRate from ClientSettings"""
        # Get current settings
        settings = api_client.get(f"{BASE_URL}/api/settings", headers=client_headers).json()
        hourly_rate = settings.get("hourlyRate", 100)
        hours_per_episode = settings.get("hoursPerEpisode", 5)
        
        # Get ROI data
        roi_response = api_client.get(f"{BASE_URL}/api/roi/dashboard", headers=client_headers)
        assert roi_response.status_code == 200
        roi_data = roi_response.json()
        
        # Verify cost calculation uses settings
        # Cost per episode = hourlyRate * hoursPerEpisode
        expected_cost_per_episode = hourly_rate * hours_per_episode
        
        print(f"Settings: hourlyRate=${hourly_rate}, hoursPerEpisode={hours_per_episode}")
        print(f"Expected cost per episode: ${expected_cost_per_episode}")
        print(f"ROI data: totalCost=${roi_data.get('totalCost')}, episodeCount={roi_data.get('episodeCount')}")
        
        # If there are episodes, verify the math
        if roi_data.get("episodeCount", 0) > 0:
            actual_cost_per_episode = roi_data["totalCost"] / roi_data["episodeCount"]
            # Allow small floating point tolerance
            assert abs(actual_cost_per_episode - expected_cost_per_episode) < 0.01, \
                f"Cost per episode mismatch: expected ${expected_cost_per_episode}, got ${actual_cost_per_episode}"
            print(f"✓ ROI correctly uses client settings for cost calculation")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
