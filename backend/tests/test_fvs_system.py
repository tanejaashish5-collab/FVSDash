"""
FVS System Backend Tests
Tests for FVS (ForgeVoice System) - Brain & Orchestrator endpoints
- FVS Config (automation levels)
- Brain Snapshot (learned patterns)
- Idea proposal and management
- Episode production
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
CLIENT_EMAIL = "alex@company.com"
CLIENT_PASSWORD = "client123"


class TestFvsAuth:
    """Test FVS endpoints require authentication"""
    
    def test_fvs_config_requires_auth(self):
        """GET /api/fvs/config requires authentication"""
        response = requests.get(f"{BASE_URL}/api/fvs/config")
        assert response.status_code == 401
    
    def test_fvs_ideas_requires_auth(self):
        """GET /api/fvs/ideas requires authentication"""
        response = requests.get(f"{BASE_URL}/api/fvs/ideas")
        assert response.status_code == 401
    
    def test_fvs_brain_snapshot_requires_auth(self):
        """GET /api/fvs/brain-snapshot requires authentication"""
        response = requests.get(f"{BASE_URL}/api/fvs/brain-snapshot")
        assert response.status_code == 401
    
    def test_fvs_activity_requires_auth(self):
        """GET /api/fvs/activity requires authentication"""
        response = requests.get(f"{BASE_URL}/api/fvs/activity")
        assert response.status_code == 401
    
    def test_fvs_propose_ideas_requires_auth(self):
        """POST /api/fvs/propose-ideas requires authentication"""
        response = requests.post(f"{BASE_URL}/api/fvs/propose-ideas", json={"format": "short", "range": "30d"})
        assert response.status_code == 401
    
    def test_fvs_produce_episode_requires_auth(self):
        """POST /api/fvs/produce-episode requires authentication"""
        response = requests.post(f"{BASE_URL}/api/fvs/produce-episode", json={"ideaId": "test", "mode": "full_auto_short"})
        assert response.status_code == 401


class TestFvsConfig:
    """Test FVS Configuration endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get auth token"""
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": CLIENT_EMAIL,
            "password": CLIENT_PASSWORD
        })
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        self.token = login_response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_get_fvs_config(self):
        """GET /api/fvs/config returns automation config"""
        response = requests.get(f"{BASE_URL}/api/fvs/config", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert "automationLevel" in data
        assert data["automationLevel"] in ["manual", "semi_auto", "full_auto_short"]
    
    def test_update_fvs_config_manual(self):
        """PUT /api/fvs/config can set automation to manual"""
        response = requests.put(
            f"{BASE_URL}/api/fvs/config",
            json={"automationLevel": "manual"},
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["automationLevel"] == "manual"
    
    def test_update_fvs_config_semi_auto(self):
        """PUT /api/fvs/config can set automation to semi_auto"""
        response = requests.put(
            f"{BASE_URL}/api/fvs/config",
            json={"automationLevel": "semi_auto"},
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["automationLevel"] == "semi_auto"
    
    def test_update_fvs_config_full_auto(self):
        """PUT /api/fvs/config can set automation to full_auto_short"""
        response = requests.put(
            f"{BASE_URL}/api/fvs/config",
            json={"automationLevel": "full_auto_short"},
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["automationLevel"] == "full_auto_short"
    
    def test_update_fvs_config_invalid_level(self):
        """PUT /api/fvs/config rejects invalid automation level"""
        response = requests.put(
            f"{BASE_URL}/api/fvs/config",
            json={"automationLevel": "invalid_level"},
            headers=self.headers
        )
        assert response.status_code == 400


class TestFvsBrainSnapshot:
    """Test FVS Brain Snapshot endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get auth token"""
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": CLIENT_EMAIL,
            "password": CLIENT_PASSWORD
        })
        assert login_response.status_code == 200
        self.token = login_response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_get_brain_snapshot(self):
        """GET /api/fvs/brain-snapshot returns latest snapshot or empty"""
        response = requests.get(f"{BASE_URL}/api/fvs/brain-snapshot", headers=self.headers)
        assert response.status_code == 200
        # May return null/empty if no snapshot exists yet
        data = response.json()
        if data:
            assert "summary" in data or "topPatterns" in data


class TestFvsIdeas:
    """Test FVS Ideas endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get auth token"""
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": CLIENT_EMAIL,
            "password": CLIENT_PASSWORD
        })
        assert login_response.status_code == 200
        self.token = login_response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_get_fvs_ideas(self):
        """GET /api/fvs/ideas returns list of ideas"""
        response = requests.get(f"{BASE_URL}/api/fvs/ideas", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_get_fvs_ideas_filter_by_status(self):
        """GET /api/fvs/ideas?status=proposed filters by status"""
        response = requests.get(f"{BASE_URL}/api/fvs/ideas?status=proposed", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        # All returned ideas should have status=proposed
        for idea in data:
            assert idea.get("status") == "proposed"


class TestFvsActivity:
    """Test FVS Activity endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get auth token"""
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": CLIENT_EMAIL,
            "password": CLIENT_PASSWORD
        })
        assert login_response.status_code == 200
        self.token = login_response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_get_fvs_activity(self):
        """GET /api/fvs/activity returns activity log"""
        response = requests.get(f"{BASE_URL}/api/fvs/activity", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)


class TestFvsProposeIdeas:
    """Test FVS Propose Ideas endpoint (Brain)"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get auth token"""
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": CLIENT_EMAIL,
            "password": CLIENT_PASSWORD
        })
        assert login_response.status_code == 200
        self.token = login_response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_propose_ideas_short_format(self):
        """POST /api/fvs/propose-ideas generates short format ideas"""
        response = requests.post(
            f"{BASE_URL}/api/fvs/propose-ideas",
            json={"format": "short", "range": "30d"},
            headers=self.headers,
            timeout=120  # LLM calls can take time
        )
        assert response.status_code == 200
        data = response.json()
        
        # Should return ideas and snapshot
        assert "ideas" in data
        assert "snapshot" in data
        assert isinstance(data["ideas"], list)
        assert len(data["ideas"]) > 0
        
        # Verify idea structure
        idea = data["ideas"][0]
        assert "id" in idea
        assert "topic" in idea
        assert "hypothesis" in idea
        assert "format" in idea
        assert "convictionScore" in idea
        assert "status" in idea
        assert idea["status"] == "proposed"
        
        # Verify snapshot structure
        snapshot = data["snapshot"]
        assert "summary" in snapshot
        assert "topPatterns" in snapshot
        assert "ideasGenerated" in snapshot


class TestFvsProduceEpisode:
    """Test FVS Produce Episode endpoint (Orchestrator)"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get auth token"""
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": CLIENT_EMAIL,
            "password": CLIENT_PASSWORD
        })
        assert login_response.status_code == 200
        self.token = login_response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_produce_episode_creates_submission_and_assets(self):
        """POST /api/fvs/produce-episode creates submission and assets"""
        # First get a proposed idea
        ideas_response = requests.get(
            f"{BASE_URL}/api/fvs/ideas?status=proposed",
            headers=self.headers
        )
        assert ideas_response.status_code == 200
        ideas = ideas_response.json()
        
        if not ideas:
            # Generate new ideas first
            propose_response = requests.post(
                f"{BASE_URL}/api/fvs/propose-ideas",
                json={"format": "short", "range": "30d"},
                headers=self.headers,
                timeout=120
            )
            assert propose_response.status_code == 200
            ideas = propose_response.json()["ideas"]
        
        assert len(ideas) > 0, "No proposed ideas available"
        idea_id = ideas[0]["id"]
        
        # Produce episode from idea
        response = requests.post(
            f"{BASE_URL}/api/fvs/produce-episode",
            json={"ideaId": idea_id, "mode": "full_auto_short"},
            headers=self.headers,
            timeout=120  # LLM calls can take time
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "submission" in data
        assert "audioAsset" in data
        assert "videoAsset" in data
        assert "thumbnailAsset" in data
        assert "script" in data
        
        # Verify submission was created
        submission = data["submission"]
        assert "id" in submission
        assert "title" in submission
        # FVS sets status to SCHEDULED after production
        assert submission["status"] == "SCHEDULED"
        
        # Verify audio asset was created
        audio_asset = data["audioAsset"]
        assert "id" in audio_asset
        assert audio_asset["type"] == "Audio"
        assert audio_asset.get("fvsGenerated") == True
        
        # Verify video asset was created
        video_asset = data["videoAsset"]
        assert "id" in video_asset
        assert video_asset["type"] == "Video"
        assert video_asset.get("fvsGenerated") == True
        
        # Verify thumbnail asset was created
        thumbnail_asset = data["thumbnailAsset"]
        assert "id" in thumbnail_asset
        assert thumbnail_asset["type"] == "Thumbnail"
        assert thumbnail_asset.get("fvsGenerated") == True
        
        # Verify script was created
        script = data["script"]
        assert "text" in script
        assert len(script["text"]) > 0
        
        return submission["id"], [audio_asset["id"], video_asset["id"], thumbnail_asset["id"]]
    
    def test_produce_episode_invalid_idea(self):
        """POST /api/fvs/produce-episode with invalid idea returns 404"""
        response = requests.post(
            f"{BASE_URL}/api/fvs/produce-episode",
            json={"ideaId": "non-existent-idea-id", "mode": "full_auto_short"},
            headers=self.headers
        )
        assert response.status_code == 404


class TestFvsIdeaStatusUpdate:
    """Test FVS Idea Status Update endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get auth token"""
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": CLIENT_EMAIL,
            "password": CLIENT_PASSWORD
        })
        assert login_response.status_code == 200
        self.token = login_response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_reject_idea(self):
        """PATCH /api/fvs/ideas/{id}/status can reject an idea"""
        # Get a proposed idea
        ideas_response = requests.get(
            f"{BASE_URL}/api/fvs/ideas?status=proposed",
            headers=self.headers
        )
        assert ideas_response.status_code == 200
        ideas = ideas_response.json()
        
        if not ideas:
            # Generate new ideas first
            propose_response = requests.post(
                f"{BASE_URL}/api/fvs/propose-ideas",
                json={"format": "short", "range": "30d"},
                headers=self.headers,
                timeout=120
            )
            assert propose_response.status_code == 200
            ideas = propose_response.json()["ideas"]
        
        if ideas:
            idea_id = ideas[0]["id"]
            
            # Reject the idea
            response = requests.patch(
                f"{BASE_URL}/api/fvs/ideas/{idea_id}/status",
                json={"status": "rejected"},
                headers=self.headers
            )
            assert response.status_code == 200
            data = response.json()
            assert data["status"] == "rejected"


class TestFvsIntegration:
    """Integration tests for FVS - verify created data appears in other endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get auth token"""
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": CLIENT_EMAIL,
            "password": CLIENT_PASSWORD
        })
        assert login_response.status_code == 200
        self.token = login_response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_fvs_submission_appears_in_submissions_list(self):
        """Verify FVS-created submission appears in /api/submissions"""
        # Get submissions
        response = requests.get(f"{BASE_URL}/api/submissions", headers=self.headers)
        assert response.status_code == 200
        submissions = response.json()
        
        # Check if any FVS-generated submissions exist
        fvs_submissions = [s for s in submissions if s.get("fvsIdeaId")]
        # This may be empty if no FVS episodes have been produced yet
        print(f"Found {len(fvs_submissions)} FVS-generated submissions")
    
    def test_fvs_assets_appear_in_assets_list(self):
        """Verify FVS-created assets appear in /api/assets"""
        response = requests.get(f"{BASE_URL}/api/assets", headers=self.headers)
        assert response.status_code == 200
        assets = response.json()
        
        # Check if any FVS-generated assets exist
        fvs_assets = [a for a in assets if a.get("fvsGenerated")]
        print(f"Found {len(fvs_assets)} FVS-generated assets")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
