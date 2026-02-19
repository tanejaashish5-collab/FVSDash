"""
Test Strategy Idea Detail Flow - GET /api/fvs/ideas/{idea_id} and POST /api/fvs/ideas/{idea_id}/generate-script
Tests the new endpoints for the Strategy Idea Detail page.
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestStrategyIdeaDetailFlow:
    """Tests for Strategy Idea Detail page endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures - login and get auth token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as client user
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "alex@company.com",
            "password": "client123"
        })
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        self.token = login_response.json().get("token")
        self.session.headers.update({"Authorization": f"Bearer {self.token}"})
        
        # Get existing ideas to use for testing
        ideas_response = self.session.get(f"{BASE_URL}/api/fvs/ideas")
        assert ideas_response.status_code == 200
        self.ideas = ideas_response.json()
        
        # Get first proposed idea for testing
        self.test_idea = next((i for i in self.ideas if i.get("status") == "proposed"), None)
        if not self.test_idea:
            pytest.skip("No proposed ideas available for testing")
    
    def test_get_idea_by_id_success(self):
        """Test GET /api/fvs/ideas/{idea_id} returns correct idea"""
        idea_id = self.test_idea["id"]
        response = self.session.get(f"{BASE_URL}/api/fvs/ideas/{idea_id}")
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert data["id"] == idea_id
        assert "topic" in data
        assert "hypothesis" in data
        assert "format" in data
        assert "convictionScore" in data
        assert "status" in data
        assert "clientId" in data
        assert "source" in data
        
        # Verify data types
        assert isinstance(data["topic"], str)
        assert isinstance(data["hypothesis"], str)
        assert isinstance(data["convictionScore"], (int, float))
        assert 0 <= data["convictionScore"] <= 1
        
        print(f"✓ GET /api/fvs/ideas/{idea_id} returned idea: {data['topic'][:50]}...")
    
    def test_get_idea_by_id_not_found(self):
        """Test GET /api/fvs/ideas/{idea_id} returns 404 for non-existent idea"""
        fake_id = "non-existent-idea-id-12345"
        response = self.session.get(f"{BASE_URL}/api/fvs/ideas/{fake_id}")
        
        assert response.status_code == 404
        data = response.json()
        assert "detail" in data
        print(f"✓ GET /api/fvs/ideas/{fake_id} correctly returned 404")
    
    def test_generate_script_for_idea_success(self):
        """Test POST /api/fvs/ideas/{idea_id}/generate-script generates script with Channel Profile"""
        idea_id = self.test_idea["id"]
        response = self.session.post(f"{BASE_URL}/api/fvs/ideas/{idea_id}/generate-script")
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "scriptText" in data
        assert "title" in data
        assert "hooks" in data
        assert "languageStyle" in data
        assert "provider" in data
        assert "ideaId" in data
        assert "topic" in data
        assert "format" in data
        
        # Verify data types and values
        assert isinstance(data["scriptText"], str)
        assert len(data["scriptText"]) > 50, "Script should have substantial content"
        assert isinstance(data["hooks"], list)
        assert data["ideaId"] == idea_id
        assert data["languageStyle"] in ["english", "hinglish", "hindi", "spanish", "french"]
        assert data["provider"] in ["anthropic", "mock", "gemini"]
        
        print(f"✓ POST /api/fvs/ideas/{idea_id}/generate-script generated script")
        print(f"  - Language style: {data['languageStyle']}")
        print(f"  - Provider: {data['provider']}")
        print(f"  - Script length: {len(data['scriptText'])} chars")
        print(f"  - Hooks count: {len(data['hooks'])}")
    
    def test_generate_script_for_idea_not_found(self):
        """Test POST /api/fvs/ideas/{idea_id}/generate-script returns 404 for non-existent idea"""
        fake_id = "non-existent-idea-id-12345"
        response = self.session.post(f"{BASE_URL}/api/fvs/ideas/{fake_id}/generate-script")
        
        assert response.status_code == 404
        data = response.json()
        assert "detail" in data
        print(f"✓ POST /api/fvs/ideas/{fake_id}/generate-script correctly returned 404")
    
    def test_generate_script_uses_hinglish_style(self):
        """Test that script generation uses Hinglish style from Channel Profile"""
        idea_id = self.test_idea["id"]
        response = self.session.post(f"{BASE_URL}/api/fvs/ideas/{idea_id}/generate-script")
        
        assert response.status_code == 200
        data = response.json()
        
        # Channel Profile for demo-client-1 is configured with languageStyle='hinglish'
        assert data["languageStyle"] == "hinglish", f"Expected hinglish, got {data['languageStyle']}"
        
        # Check if script contains Hinglish elements (mix of Hindi and English)
        script_text = data["scriptText"].lower()
        hinglish_indicators = ["hai", "ho", "bhai", "karo", "dekho", "yaar", "aur", "mein", "ke"]
        has_hinglish = any(indicator in script_text for indicator in hinglish_indicators)
        
        if data["provider"] == "anthropic":
            assert has_hinglish, "Script should contain Hinglish elements when using real LLM"
            print(f"✓ Script contains Hinglish elements as expected")
        else:
            print(f"⚠ Script generated with mock provider, Hinglish check skipped")
        
        print(f"✓ Script language style is '{data['languageStyle']}'")


class TestCreateSubmissionFromIdea:
    """Tests for creating submission from Strategy Idea Detail page"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "alex@company.com",
            "password": "client123"
        })
        assert login_response.status_code == 200
        self.token = login_response.json().get("token")
        self.session.headers.update({"Authorization": f"Bearer {self.token}"})
    
    def test_create_submission_from_idea(self):
        """Test creating a submission from idea detail page"""
        # Create submission with idea-related data
        submission_data = {
            "title": "TEST_Strategy_Idea_Submission",
            "description": "Test submission created from Strategy Idea Detail page",
            "contentType": "Short",
            "releaseDate": None,
            "guest": "",
            "priority": "High"
        }
        
        response = self.session.post(f"{BASE_URL}/api/submissions", json=submission_data)
        
        assert response.status_code in [200, 201]
        data = response.json()
        
        assert data["title"] == submission_data["title"]
        assert data["contentType"] == "Short"
        assert "id" in data
        
        print(f"✓ Created submission: {data['id']}")
        
        # Cleanup - delete test submission
        delete_response = self.session.delete(f"{BASE_URL}/api/submissions/{data['id']}")
        assert delete_response.status_code in [200, 204]
        print(f"✓ Cleaned up test submission")


class TestCreateVideoTaskFromIdea:
    """Tests for creating AI video task from Strategy Idea Detail page"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "alex@company.com",
            "password": "client123"
        })
        assert login_response.status_code == 200
        self.token = login_response.json().get("token")
        self.session.headers.update({"Authorization": f"Bearer {self.token}"})
    
    def test_create_video_task_from_idea(self):
        """Test creating an AI video task from idea detail page"""
        video_task_data = {
            "provider": "veo",
            "prompt": "TEST_Create a 60-90 second vertical video for: Test Topic",
            "mode": "script",
            "scriptText": "Test script content for video generation",
            "audioAssetId": None,
            "sourceAssetId": None,
            "aspectRatio": "9:16",
            "outputProfile": "shorts",
            "submissionId": None
        }
        
        response = self.session.post(f"{BASE_URL}/api/video-tasks", json=video_task_data)
        
        assert response.status_code in [200, 201]
        data = response.json()
        
        assert "id" in data
        assert data["prompt"] == video_task_data["prompt"]
        assert data["aspectRatio"] == "9:16"
        
        print(f"✓ Created video task: {data['id']}")
        print(f"  - Provider: {data.get('actualProvider', data.get('provider'))}")
        print(f"  - Status: {data.get('status')}")


class TestFvsIdeasListEndpoint:
    """Tests for GET /api/fvs/ideas endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "alex@company.com",
            "password": "client123"
        })
        assert login_response.status_code == 200
        self.token = login_response.json().get("token")
        self.session.headers.update({"Authorization": f"Bearer {self.token}"})
    
    def test_get_all_ideas(self):
        """Test GET /api/fvs/ideas returns list of ideas"""
        response = self.session.get(f"{BASE_URL}/api/fvs/ideas")
        
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data, list)
        if len(data) > 0:
            idea = data[0]
            assert "id" in idea
            assert "topic" in idea
            assert "status" in idea
            assert "format" in idea
        
        print(f"✓ GET /api/fvs/ideas returned {len(data)} ideas")
    
    def test_get_ideas_filtered_by_status(self):
        """Test GET /api/fvs/ideas?status=proposed returns filtered ideas"""
        response = self.session.get(f"{BASE_URL}/api/fvs/ideas?status=proposed")
        
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data, list)
        for idea in data:
            assert idea["status"] == "proposed"
        
        print(f"✓ GET /api/fvs/ideas?status=proposed returned {len(data)} proposed ideas")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
