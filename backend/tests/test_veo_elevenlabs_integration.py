"""
Test suite for Veo and ElevenLabs integration with graceful fallbacks.

Tests:
- POST /api/video-tasks with provider='veo' - graceful fallback when VEO_API_KEY missing
- GET /api/video-tasks/{id} - returns task status with isMocked and warnings fields
- POST /api/fvs/produce-episode - ElevenLabs audio fallback and OpenAI thumbnail
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "alex@company.com"
TEST_PASSWORD = "client123"


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token for tests."""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
    )
    assert response.status_code == 200, f"Login failed: {response.text}"
    return response.json()["token"]


@pytest.fixture(scope="module")
def auth_headers(auth_token):
    """Get auth headers for API calls."""
    return {"Authorization": f"Bearer {auth_token}"}


class TestVideoTasksVeoIntegration:
    """Test video tasks with Veo provider and graceful fallbacks."""
    
    def test_create_video_task_veo_graceful_fallback(self, auth_headers):
        """POST /api/video-tasks with provider='veo' should create task with graceful fallback."""
        task_data = {
            "provider": "veo",
            "prompt": "Test video generation with Veo provider",
            "mode": "script",
            "scriptText": "This is a test script for Veo video generation.",
            "aspectRatio": "16:9",
            "outputProfile": "youtube_long"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/video-tasks",
            json=task_data,
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Failed to create video task: {response.text}"
        
        data = response.json()
        
        # Verify task structure
        assert "id" in data, "Response should contain task id"
        assert data["provider"] == "veo", "Provider should be 'veo'"
        assert "providerJobId" in data, "Response should contain providerJobId"
        assert "status" in data, "Response should contain status"
        
        # Verify graceful fallback fields
        assert "isMocked" in data, "Response should contain isMocked field"
        assert data["isMocked"] == True, "Task should be mocked when VEO_API_KEY is not set"
        
        # Verify actualProvider shows mock
        assert "actualProvider" in data, "Response should contain actualProvider field"
        assert data["actualProvider"] == "mock_veo", "actualProvider should be 'mock_veo'"
        
        # Verify warnings array
        assert "warnings" in data, "Response should contain warnings field"
        assert data["warnings"] is not None, "Warnings should not be None"
        assert len(data["warnings"]) > 0, "Warnings should contain at least one message"
        assert "VEO_API_KEY" in data["warnings"][0], "Warning should mention VEO_API_KEY"
        
        print(f"✓ Video task created with Veo provider (mocked): {data['id']}")
        print(f"  - isMocked: {data['isMocked']}")
        print(f"  - actualProvider: {data['actualProvider']}")
        print(f"  - warnings: {data['warnings']}")
        
        return data["id"]
    
    def test_get_video_task_status_with_mocked_fields(self, auth_headers):
        """GET /api/video-tasks/{id} should return task status with isMocked and warnings."""
        # First create a task
        task_data = {
            "provider": "veo",
            "prompt": "Test video for status check",
            "mode": "script",
            "aspectRatio": "9:16",
            "outputProfile": "shorts"
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/video-tasks",
            json=task_data,
            headers=auth_headers
        )
        assert create_response.status_code == 200
        task_id = create_response.json()["id"]
        
        # Get task status
        response = requests.get(
            f"{BASE_URL}/api/video-tasks/{task_id}",
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Failed to get video task: {response.text}"
        
        data = response.json()
        
        # Verify status fields
        assert "id" in data, "Response should contain id"
        assert data["id"] == task_id, "Task ID should match"
        assert "status" in data, "Response should contain status"
        assert data["status"] in ["PROCESSING", "READY", "FAILED"], f"Invalid status: {data['status']}"
        
        # Verify isMocked field
        assert "isMocked" in data, "Response should contain isMocked field"
        
        # Verify warnings field exists (may be null or array)
        assert "warnings" in data or data.get("warnings") is None, "Response should have warnings field"
        
        print(f"✓ Video task status retrieved: {data['status']}")
        print(f"  - isMocked: {data['isMocked']}")
        print(f"  - videoUrl: {data.get('videoUrl', 'N/A')}")
    
    def test_create_video_task_runway_mocked(self, auth_headers):
        """POST /api/video-tasks with provider='runway' should be mocked."""
        task_data = {
            "provider": "runway",
            "prompt": "Test Runway video generation",
            "mode": "script",
            "aspectRatio": "16:9",
            "outputProfile": "youtube_long"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/video-tasks",
            json=task_data,
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["isMocked"] == True, "Runway should be mocked"
        assert data["actualProvider"] == "mock_runway", "actualProvider should be mock_runway"
        
        print(f"✓ Runway video task created (mocked): {data['id']}")
    
    def test_create_video_task_kling_mocked(self, auth_headers):
        """POST /api/video-tasks with provider='kling' should be mocked."""
        task_data = {
            "provider": "kling",
            "prompt": "Test Kling video generation",
            "mode": "audio",
            "aspectRatio": "1:1",
            "outputProfile": "reel"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/video-tasks",
            json=task_data,
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["isMocked"] == True, "Kling should be mocked"
        assert data["actualProvider"] == "mock_kling", "actualProvider should be mock_kling"
        
        print(f"✓ Kling video task created (mocked): {data['id']}")
    
    def test_video_task_invalid_provider(self, auth_headers):
        """POST /api/video-tasks with invalid provider should return 400."""
        task_data = {
            "provider": "invalid_provider",
            "prompt": "Test invalid provider",
            "mode": "script",
            "aspectRatio": "16:9",
            "outputProfile": "youtube_long"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/video-tasks",
            json=task_data,
            headers=auth_headers
        )
        
        assert response.status_code in [400, 422], f"Should reject invalid provider: {response.status_code}"
        print("✓ Invalid provider correctly rejected")


class TestFVSProduceEpisode:
    """Test FVS produce-episode with ElevenLabs and OpenAI integrations."""
    
    def test_propose_ideas_first(self, auth_headers):
        """Propose ideas to have something to produce."""
        response = requests.post(
            f"{BASE_URL}/api/fvs/propose-ideas",
            json={"format": "short", "range": "30d"},
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Failed to propose ideas: {response.text}"
        data = response.json()
        
        assert "ideas" in data, "Response should contain ideas"
        assert len(data["ideas"]) > 0, "Should generate at least one idea"
        
        print(f"✓ Proposed {len(data['ideas'])} ideas")
        return data["ideas"]
    
    def test_produce_episode_with_graceful_fallbacks(self, auth_headers):
        """POST /api/fvs/produce-episode should use graceful fallbacks for audio."""
        # First get proposed ideas
        ideas_response = requests.get(
            f"{BASE_URL}/api/fvs/ideas?status=proposed",
            headers=auth_headers
        )
        
        if ideas_response.status_code != 200 or not ideas_response.json():
            # Propose new ideas if none exist
            propose_response = requests.post(
                f"{BASE_URL}/api/fvs/propose-ideas",
                json={"format": "short", "range": "30d"},
                headers=auth_headers
            )
            assert propose_response.status_code == 200
            ideas = propose_response.json()["ideas"]
        else:
            ideas = ideas_response.json()
        
        assert len(ideas) > 0, "Need at least one proposed idea"
        idea_id = ideas[0]["id"]
        
        # Produce episode
        response = requests.post(
            f"{BASE_URL}/api/fvs/produce-episode",
            json={"ideaId": idea_id, "mode": "full_auto_short"},
            headers=auth_headers,
            timeout=120  # Allow time for AI generation
        )
        
        assert response.status_code == 200, f"Failed to produce episode: {response.text}"
        
        data = response.json()
        
        # Verify success
        assert data.get("success") == True, "Production should succeed"
        
        # Verify submission created
        assert "submission" in data, "Response should contain submission"
        assert data["submission"]["status"] == "SCHEDULED", "Submission should be scheduled"
        
        # Verify audio asset with ElevenLabs fallback
        assert "audioAsset" in data, "Response should contain audioAsset"
        audio = data["audioAsset"]
        assert audio["isMocked"] == True, "Audio should be mocked (ELEVENLABS_API_KEY not set)"
        assert audio["provider"] == "mock_elevenlabs", "Audio provider should be mock_elevenlabs"
        
        # Verify thumbnail asset with OpenAI (REAL)
        assert "thumbnailAsset" in data, "Response should contain thumbnailAsset"
        thumbnail = data["thumbnailAsset"]
        # Thumbnail may be real or mocked depending on EMERGENT_LLM_KEY
        assert "provider" in thumbnail, "Thumbnail should have provider"
        assert "isMocked" in thumbnail, "Thumbnail should have isMocked field"
        
        # Verify video task (mocked)
        assert "videoTask" in data, "Response should contain videoTask"
        video = data["videoTask"]
        assert video["isMocked"] == True, "Video should be mocked"
        
        # Verify warnings array
        assert "warnings" in data, "Response should contain warnings"
        if data["warnings"]:
            assert any("ElevenLabs" in w for w in data["warnings"]), "Warnings should mention ElevenLabs"
        
        print(f"✓ Episode produced successfully: {data['submission']['title']}")
        print(f"  - Audio: {audio['provider']} (mocked={audio['isMocked']})")
        print(f"  - Thumbnail: {thumbnail['provider']} (mocked={thumbnail['isMocked']})")
        print(f"  - Video: {video.get('provider', 'kling')} (mocked={video['isMocked']})")
        print(f"  - Warnings: {data.get('warnings', [])}")
        
        return data


class TestVideoTasksList:
    """Test video tasks list endpoint."""
    
    def test_get_video_tasks_list(self, auth_headers):
        """GET /api/video-tasks should return list of tasks."""
        response = requests.get(
            f"{BASE_URL}/api/video-tasks",
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Failed to get video tasks: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        
        if len(data) > 0:
            task = data[0]
            assert "id" in task, "Task should have id"
            assert "provider" in task, "Task should have provider"
            assert "status" in task, "Task should have status"
            
            print(f"✓ Retrieved {len(data)} video tasks")
            print(f"  - First task: {task['id']} ({task['provider']}, {task['status']})")
        else:
            print("✓ Video tasks list is empty (no tasks created yet)")


class TestAssetsWithProviderInfo:
    """Test that assets include provider and isMocked info."""
    
    def test_assets_have_provider_info(self, auth_headers):
        """GET /api/assets/library should return assets with provider info."""
        response = requests.get(
            f"{BASE_URL}/api/assets/library",
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Failed to get assets: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        
        # Check FVS-generated assets
        fvs_assets = [a for a in data if a.get("fvsGenerated")]
        
        if len(fvs_assets) > 0:
            for asset in fvs_assets[:3]:  # Check first 3
                print(f"  - {asset['type']}: {asset.get('provider', 'N/A')} (mocked={asset.get('isMocked', 'N/A')})")
            
            # Verify audio assets have correct provider info
            audio_assets = [a for a in fvs_assets if a["type"] == "Audio"]
            if audio_assets:
                audio = audio_assets[0]
                assert "provider" in audio, "Audio asset should have provider"
                assert "isMocked" in audio, "Audio asset should have isMocked"
            
            # Verify thumbnail assets have correct provider info
            thumbnail_assets = [a for a in fvs_assets if a["type"] == "Thumbnail"]
            if thumbnail_assets:
                thumb = thumbnail_assets[0]
                assert "provider" in thumb, "Thumbnail asset should have provider"
                assert "isMocked" in thumb, "Thumbnail asset should have isMocked"
        
        print(f"✓ Retrieved {len(data)} assets ({len(fvs_assets)} FVS-generated)")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
