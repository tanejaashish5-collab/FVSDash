"""
FVS Media Integration Tests
Tests for real media generation integrations:
- Thumbnail generation via OpenAI GPT-Image-1 (REAL)
- Audio generation via ElevenLabs (MOCKED - key not configured)
- Video generation (MOCKED - P2)
- Graceful fallbacks and warnings array
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
CLIENT_EMAIL = "alex@company.com"
CLIENT_PASSWORD = "client123"


class TestFvsMediaIntegration:
    """Test FVS produce-episode with real media integrations"""
    
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
    
    def _get_or_create_proposed_idea(self):
        """Helper to get or create a proposed idea for testing"""
        # First try to get existing proposed ideas
        ideas_response = requests.get(
            f"{BASE_URL}/api/fvs/ideas?status=proposed",
            headers=self.headers
        )
        assert ideas_response.status_code == 200
        ideas = ideas_response.json()
        
        if ideas:
            return ideas[0]["id"]
        
        # Generate new ideas if none exist
        propose_response = requests.post(
            f"{BASE_URL}/api/fvs/propose-ideas",
            json={"format": "short", "range": "30d"},
            headers=self.headers,
            timeout=120
        )
        assert propose_response.status_code == 200
        ideas = propose_response.json()["ideas"]
        assert len(ideas) > 0, "Failed to generate ideas"
        return ideas[0]["id"]
    
    def test_produce_episode_thumbnail_is_real_openai(self):
        """
        POST /api/fvs/produce-episode creates REAL thumbnail via OpenAI GPT-Image-1
        - thumbnailAsset.provider should be 'openai_gpt_image_1'
        - thumbnailAsset.isMocked should be False
        - thumbnailAsset.url should be a data URL (base64 encoded image)
        """
        idea_id = self._get_or_create_proposed_idea()
        
        response = requests.post(
            f"{BASE_URL}/api/fvs/produce-episode",
            json={"ideaId": idea_id, "mode": "full_auto_short"},
            headers=self.headers,
            timeout=180  # Thumbnail generation can take time
        )
        assert response.status_code == 200, f"Produce episode failed: {response.text}"
        data = response.json()
        
        # Verify thumbnail asset
        assert "thumbnailAsset" in data, "Response missing thumbnailAsset"
        thumbnail = data["thumbnailAsset"]
        
        # REAL thumbnail via OpenAI
        assert thumbnail.get("provider") == "openai_gpt_image_1", \
            f"Expected provider 'openai_gpt_image_1', got '{thumbnail.get('provider')}'"
        assert thumbnail.get("isMocked") == False, \
            f"Expected isMocked=False, got {thumbnail.get('isMocked')}"
        
        # URL should be a data URL with base64 image
        url = thumbnail.get("url", "")
        assert url.startswith("data:image/png;base64,"), \
            f"Expected data URL, got: {url[:50]}..."
        
        # Verify it's a substantial image (not placeholder)
        # Real thumbnails are ~2.4MB, so base64 should be > 100KB
        base64_data = url.replace("data:image/png;base64,", "")
        assert len(base64_data) > 100000, \
            f"Thumbnail seems too small ({len(base64_data)} chars), may be placeholder"
        
        print(f"✓ Thumbnail generated via OpenAI GPT-Image-1 ({len(base64_data)} chars)")
    
    def test_produce_episode_audio_falls_back_to_mock(self):
        """
        POST /api/fvs/produce-episode gracefully falls back to mocked audio
        when ELEVENLABS_API_KEY is not configured
        - audioAsset.provider should be 'mock_elevenlabs'
        - audioAsset.isMocked should be True
        - Response should include warnings array
        """
        idea_id = self._get_or_create_proposed_idea()
        
        response = requests.post(
            f"{BASE_URL}/api/fvs/produce-episode",
            json={"ideaId": idea_id, "mode": "full_auto_short"},
            headers=self.headers,
            timeout=180
        )
        assert response.status_code == 200, f"Produce episode failed: {response.text}"
        data = response.json()
        
        # Verify audio asset
        assert "audioAsset" in data, "Response missing audioAsset"
        audio = data["audioAsset"]
        
        # MOCKED audio (ElevenLabs key not configured)
        assert audio.get("provider") == "mock_elevenlabs", \
            f"Expected provider 'mock_elevenlabs', got '{audio.get('provider')}'"
        assert audio.get("isMocked") == True, \
            f"Expected isMocked=True, got {audio.get('isMocked')}"
        
        # URL should be the mock placeholder
        assert "storage.googleapis.com" in audio.get("url", "") or \
               audio.get("url", "").startswith("https://"), \
            f"Expected mock URL, got: {audio.get('url')}"
        
        print(f"✓ Audio correctly fell back to mock (provider: {audio.get('provider')})")
    
    def test_produce_episode_includes_warnings_for_mocked_audio(self):
        """
        Response includes warnings array when audio falls back to mock
        """
        idea_id = self._get_or_create_proposed_idea()
        
        response = requests.post(
            f"{BASE_URL}/api/fvs/produce-episode",
            json={"ideaId": idea_id, "mode": "full_auto_short"},
            headers=self.headers,
            timeout=180
        )
        assert response.status_code == 200, f"Produce episode failed: {response.text}"
        data = response.json()
        
        # Should have warnings array since audio is mocked
        assert "warnings" in data, "Response should include warnings array when audio is mocked"
        warnings = data["warnings"]
        assert isinstance(warnings, list), "warnings should be a list"
        assert len(warnings) > 0, "warnings should not be empty when audio is mocked"
        
        # Check warning mentions ElevenLabs
        warning_text = " ".join(warnings).lower()
        assert "elevenlabs" in warning_text or "audio" in warning_text, \
            f"Warning should mention ElevenLabs or audio: {warnings}"
        
        print(f"✓ Warnings array present: {warnings}")
    
    def test_produce_episode_video_is_mocked(self):
        """
        Video generation remains mocked (P2 feature)
        - videoAsset.isMocked should be True
        - videoTask.isMocked should be True
        """
        idea_id = self._get_or_create_proposed_idea()
        
        response = requests.post(
            f"{BASE_URL}/api/fvs/produce-episode",
            json={"ideaId": idea_id, "mode": "full_auto_short"},
            headers=self.headers,
            timeout=180
        )
        assert response.status_code == 200, f"Produce episode failed: {response.text}"
        data = response.json()
        
        # Verify video asset is mocked
        assert "videoAsset" in data, "Response missing videoAsset"
        video = data["videoAsset"]
        assert video.get("isMocked") == True, \
            f"Expected video isMocked=True, got {video.get('isMocked')}"
        
        # Verify video task is mocked
        assert "videoTask" in data, "Response missing videoTask"
        video_task = data["videoTask"]
        assert video_task.get("isMocked") == True, \
            f"Expected videoTask isMocked=True, got {video_task.get('isMocked')}"
        
        print(f"✓ Video correctly mocked (provider: {video.get('provider')})")
    
    def test_produce_episode_response_structure_backwards_compatible(self):
        """
        Response structure unchanged (backwards compatible)
        All expected fields should be present
        """
        idea_id = self._get_or_create_proposed_idea()
        
        response = requests.post(
            f"{BASE_URL}/api/fvs/produce-episode",
            json={"ideaId": idea_id, "mode": "full_auto_short"},
            headers=self.headers,
            timeout=180
        )
        assert response.status_code == 200, f"Produce episode failed: {response.text}"
        data = response.json()
        
        # Verify all expected top-level fields
        expected_fields = ["success", "submission", "script", "audioAsset", 
                          "videoTask", "videoAsset", "thumbnailAsset", "idea"]
        for field in expected_fields:
            assert field in data, f"Response missing expected field: {field}"
        
        # Verify success flag
        assert data["success"] == True, "success should be True"
        
        # Verify submission structure
        submission = data["submission"]
        assert "id" in submission
        assert "title" in submission
        assert "status" in submission
        assert submission["status"] == "SCHEDULED"
        
        # Verify script structure
        script = data["script"]
        assert "id" in script
        assert "text" in script
        assert len(script["text"]) > 0
        
        # Verify all assets have required fields
        for asset_key in ["audioAsset", "videoAsset", "thumbnailAsset"]:
            asset = data[asset_key]
            assert "id" in asset, f"{asset_key} missing id"
            assert "type" in asset, f"{asset_key} missing type"
            assert "url" in asset, f"{asset_key} missing url"
            assert "provider" in asset, f"{asset_key} missing provider"
            assert "isMocked" in asset, f"{asset_key} missing isMocked"
            assert "fvsGenerated" in asset, f"{asset_key} missing fvsGenerated"
            assert asset["fvsGenerated"] == True, f"{asset_key} should have fvsGenerated=True"
        
        print("✓ Response structure is backwards compatible")
    
    def test_produce_episode_submission_and_assets_created(self):
        """
        Submission and all assets are created successfully
        Verify they appear in the respective list endpoints
        """
        idea_id = self._get_or_create_proposed_idea()
        
        response = requests.post(
            f"{BASE_URL}/api/fvs/produce-episode",
            json={"ideaId": idea_id, "mode": "full_auto_short"},
            headers=self.headers,
            timeout=180
        )
        assert response.status_code == 200, f"Produce episode failed: {response.text}"
        data = response.json()
        
        submission_id = data["submission"]["id"]
        audio_id = data["audioAsset"]["id"]
        video_id = data["videoAsset"]["id"]
        thumbnail_id = data["thumbnailAsset"]["id"]
        
        # Verify submission appears in submissions list
        submissions_response = requests.get(
            f"{BASE_URL}/api/submissions",
            headers=self.headers
        )
        assert submissions_response.status_code == 200
        submissions = submissions_response.json()
        submission_ids = [s["id"] for s in submissions]
        assert submission_id in submission_ids, \
            f"Created submission {submission_id} not found in submissions list"
        
        # Verify assets appear in assets list
        assets_response = requests.get(
            f"{BASE_URL}/api/assets",
            headers=self.headers
        )
        assert assets_response.status_code == 200
        assets = assets_response.json()
        asset_ids = [a["id"] for a in assets]
        
        assert audio_id in asset_ids, f"Audio asset {audio_id} not found in assets list"
        assert video_id in asset_ids, f"Video asset {video_id} not found in assets list"
        assert thumbnail_id in asset_ids, f"Thumbnail asset {thumbnail_id} not found in assets list"
        
        print(f"✓ Submission and all 3 assets created and visible in lists")


class TestFvsAssetsEndpoint:
    """Test that FVS assets appear correctly on /api/assets"""
    
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
    
    def test_fvs_assets_have_correct_metadata(self):
        """
        FVS-generated assets have correct metadata fields:
        - fvsGenerated: true
        - provider: correct provider name
        - isMocked: correct boolean
        """
        response = requests.get(f"{BASE_URL}/api/assets", headers=self.headers)
        assert response.status_code == 200
        assets = response.json()
        
        # Filter FVS-generated assets
        fvs_assets = [a for a in assets if a.get("fvsGenerated") == True]
        
        if not fvs_assets:
            pytest.skip("No FVS-generated assets found - run produce-episode test first")
        
        for asset in fvs_assets:
            # All FVS assets should have these fields
            assert "provider" in asset, f"Asset {asset.get('id')} missing provider"
            assert "isMocked" in asset, f"Asset {asset.get('id')} missing isMocked"
            
            # Check provider-specific expectations
            if asset["type"] == "Thumbnail":
                # Thumbnail should be real OpenAI
                if asset.get("isMocked") == False:
                    assert asset["provider"] == "openai_gpt_image_1", \
                        f"Real thumbnail should have provider 'openai_gpt_image_1'"
            
            if asset["type"] == "Audio":
                # Audio should be mocked (ElevenLabs key not set)
                if asset.get("isMocked") == True:
                    assert asset["provider"] == "mock_elevenlabs", \
                        f"Mocked audio should have provider 'mock_elevenlabs'"
        
        print(f"✓ Found {len(fvs_assets)} FVS assets with correct metadata")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
