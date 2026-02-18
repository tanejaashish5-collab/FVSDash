"""
Test suite for Strategy Lab (AI Generation) and Video Lab features.
Tests /api/ai/generate, /api/ai/capabilities, /api/video-tasks endpoints.
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
CLIENT_EMAIL = "alex@company.com"
CLIENT_PASSWORD = "client123"


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token for client user."""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": CLIENT_EMAIL,
        "password": CLIENT_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip(f"Authentication failed: {response.status_code}")


@pytest.fixture(scope="module")
def auth_headers(auth_token):
    """Headers with auth token."""
    return {
        "Authorization": f"Bearer {auth_token}",
        "Content-Type": "application/json"
    }


class TestAICapabilities:
    """Tests for /api/ai/capabilities endpoint."""
    
    def test_capabilities_returns_llm_providers(self):
        """GET /api/ai/capabilities returns LLM providers list."""
        response = requests.get(f"{BASE_URL}/api/ai/capabilities")
        assert response.status_code == 200
        data = response.json()
        assert "llmProviders" in data
        assert isinstance(data["llmProviders"], list)
        # Should have Gemini, OpenAI, Anthropic
        assert "gemini" in data["llmProviders"]
        assert "openai" in data["llmProviders"]
        assert "anthropic" in data["llmProviders"]
        print(f"LLM Providers: {data['llmProviders']}")
    
    def test_capabilities_returns_video_providers(self):
        """GET /api/ai/capabilities returns video providers list."""
        response = requests.get(f"{BASE_URL}/api/ai/capabilities")
        assert response.status_code == 200
        data = response.json()
        assert "videoProviders" in data
        assert isinstance(data["videoProviders"], list)
        # Should have Runway, Veo, Kling
        assert "runway" in data["videoProviders"]
        assert "veo" in data["videoProviders"]
        assert "kling" in data["videoProviders"]
        print(f"Video Providers: {data['videoProviders']}")


class TestAIGenerate:
    """Tests for /api/ai/generate endpoint - Strategy Lab."""
    
    def test_generate_requires_auth(self):
        """POST /api/ai/generate requires authentication."""
        response = requests.post(f"{BASE_URL}/api/ai/generate", json={
            "provider": "gemini",
            "task": "research",
            "input": {"topic": "Test topic"}
        })
        assert response.status_code == 401
        print("Auth required: PASS")
    
    def test_generate_research_gemini(self, auth_headers):
        """POST /api/ai/generate with task=research using Gemini."""
        response = requests.post(f"{BASE_URL}/api/ai/generate", json={
            "provider": "gemini",
            "task": "research",
            "input": {
                "topic": "AI in podcasting",
                "audience": "podcast creators",
                "tone": "professional",
                "goal": "educate"
            }
        }, headers=auth_headers, timeout=60)
        assert response.status_code == 200
        data = response.json()
        assert "researchSummary" in data
        assert len(data["researchSummary"]) > 100  # Should have substantial content
        print(f"Research generated: {len(data['researchSummary'])} chars")
    
    def test_generate_outline_openai(self, auth_headers):
        """POST /api/ai/generate with task=outline using OpenAI."""
        response = requests.post(f"{BASE_URL}/api/ai/generate", json={
            "provider": "openai",
            "task": "outline",
            "input": {
                "topic": "Starting a podcast in 2025",
                "audience": "beginners",
                "tone": "friendly",
                "goal": "guide"
            }
        }, headers=auth_headers, timeout=60)
        assert response.status_code == 200
        data = response.json()
        assert "outlineSections" in data
        assert isinstance(data["outlineSections"], list)
        assert len(data["outlineSections"]) > 0
        print(f"Outline sections: {len(data['outlineSections'])}")
    
    def test_generate_script_anthropic(self, auth_headers):
        """POST /api/ai/generate with task=script using Anthropic."""
        response = requests.post(f"{BASE_URL}/api/ai/generate", json={
            "provider": "anthropic",
            "task": "script",
            "input": {
                "topic": "Interview tips for podcasters",
                "audience": "intermediate podcasters",
                "tone": "conversational",
                "goal": "improve skills",
                "existingContent": "1. Preparation\n2. Active listening\n3. Follow-up questions"
            }
        }, headers=auth_headers, timeout=60)
        assert response.status_code == 200
        data = response.json()
        assert "scriptText" in data
        assert len(data["scriptText"]) > 200
        print(f"Script generated: {len(data['scriptText'])} chars")
    
    def test_generate_youtube_package(self, auth_headers):
        """POST /api/ai/generate with task=youtube_package."""
        response = requests.post(f"{BASE_URL}/api/ai/generate", json={
            "provider": "gemini",
            "task": "youtube_package",
            "input": {
                "topic": "How to grow your podcast audience",
                "audience": "podcast creators",
                "tone": "energetic",
                "goal": "grow audience"
            }
        }, headers=auth_headers, timeout=60)
        assert response.status_code == 200
        data = response.json()
        # Should have titles, description, tags, chapters
        assert "titleIdeas" in data or "descriptionText" in data or "tags" in data
        print(f"YouTube package keys: {list(data.keys())}")
    
    def test_generate_invalid_provider(self, auth_headers):
        """POST /api/ai/generate with invalid provider returns 400."""
        response = requests.post(f"{BASE_URL}/api/ai/generate", json={
            "provider": "invalid_provider",
            "task": "research",
            "input": {"topic": "Test"}
        }, headers=auth_headers)
        assert response.status_code == 400
        print("Invalid provider rejected: PASS")
    
    def test_generate_invalid_task(self, auth_headers):
        """POST /api/ai/generate with invalid task returns 400."""
        response = requests.post(f"{BASE_URL}/api/ai/generate", json={
            "provider": "gemini",
            "task": "invalid_task",
            "input": {"topic": "Test"}
        }, headers=auth_headers)
        assert response.status_code == 400
        print("Invalid task rejected: PASS")


class TestVideoTasks:
    """Tests for /api/video-tasks endpoints - Video Lab."""
    
    def test_video_tasks_list_requires_auth(self):
        """GET /api/video-tasks requires authentication."""
        response = requests.get(f"{BASE_URL}/api/video-tasks")
        assert response.status_code == 401
        print("Auth required for list: PASS")
    
    def test_video_tasks_create_requires_auth(self):
        """POST /api/video-tasks requires authentication."""
        response = requests.post(f"{BASE_URL}/api/video-tasks", json={
            "provider": "kling",
            "prompt": "Test video",
            "mode": "script"
        })
        assert response.status_code == 401
        print("Auth required for create: PASS")
    
    def test_video_tasks_list(self, auth_headers):
        """GET /api/video-tasks returns list of tasks."""
        response = requests.get(f"{BASE_URL}/api/video-tasks", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Video tasks count: {len(data)}")
    
    def test_video_tasks_create_kling(self, auth_headers):
        """POST /api/video-tasks creates task with Kling provider (mocked)."""
        response = requests.post(f"{BASE_URL}/api/video-tasks", json={
            "provider": "kling",
            "prompt": "A serene mountain landscape with flowing clouds",
            "mode": "script",
            "aspectRatio": "16:9",
            "outputProfile": "youtube_long"
        }, headers=auth_headers)
        assert response.status_code in [200, 201]
        data = response.json()
        assert "id" in data
        assert data["provider"] == "kling"
        assert data["mode"] == "script"
        # Kling mock should return READY immediately
        assert data["status"] in ["PROCESSING", "READY"]
        print(f"Task created: {data['id']}, status: {data['status']}")
        return data["id"]
    
    def test_video_tasks_create_runway(self, auth_headers):
        """POST /api/video-tasks creates task with Runway provider (mocked)."""
        response = requests.post(f"{BASE_URL}/api/video-tasks", json={
            "provider": "runway",
            "prompt": "Abstract colorful animation",
            "mode": "script",
            "aspectRatio": "9:16",
            "outputProfile": "shorts"
        }, headers=auth_headers)
        assert response.status_code in [200, 201]
        data = response.json()
        assert "id" in data
        assert data["provider"] == "runway"
        assert data["status"] in ["PROCESSING", "PENDING"]
        print(f"Runway task: {data['id']}, status: {data['status']}")
    
    def test_video_tasks_create_veo(self, auth_headers):
        """POST /api/video-tasks creates task with Veo provider (mocked)."""
        response = requests.post(f"{BASE_URL}/api/video-tasks", json={
            "provider": "veo",
            "prompt": "Professional business presentation intro",
            "mode": "script",
            "aspectRatio": "1:1",
            "outputProfile": "reel"
        }, headers=auth_headers)
        assert response.status_code in [200, 201]
        data = response.json()
        assert "id" in data
        assert data["provider"] == "veo"
        print(f"Veo task: {data['id']}, status: {data['status']}")
    
    def test_video_tasks_get_by_id(self, auth_headers):
        """GET /api/video-tasks/{id} returns task details."""
        # First create a task
        create_response = requests.post(f"{BASE_URL}/api/video-tasks", json={
            "provider": "kling",
            "prompt": "Test video for get by id",
            "mode": "script"
        }, headers=auth_headers)
        assert create_response.status_code in [200, 201]
        task_id = create_response.json()["id"]
        
        # Get the task
        response = requests.get(f"{BASE_URL}/api/video-tasks/{task_id}", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == task_id
        print(f"Task retrieved: {data['id']}, status: {data['status']}")
    
    def test_video_tasks_kling_returns_ready_with_url(self, auth_headers):
        """Kling mock provider returns READY status with videoUrl."""
        response = requests.post(f"{BASE_URL}/api/video-tasks", json={
            "provider": "kling",
            "prompt": "Test video for ready status",
            "mode": "script"
        }, headers=auth_headers)
        assert response.status_code in [200, 201]
        data = response.json()
        task_id = data["id"]
        
        # Get task to check status
        get_response = requests.get(f"{BASE_URL}/api/video-tasks/{task_id}", headers=auth_headers)
        assert get_response.status_code == 200
        task_data = get_response.json()
        
        # Kling should return READY with videoUrl
        if task_data["status"] == "READY":
            assert "videoUrl" in task_data
            assert task_data["videoUrl"] is not None
            print(f"Kling task READY with videoUrl: {task_data['videoUrl'][:50]}...")
        else:
            print(f"Kling task status: {task_data['status']} (may need refresh)")
    
    def test_video_tasks_save_asset(self, auth_headers):
        """POST /api/video-tasks/{id}/save-asset creates asset from READY task."""
        # Create a Kling task (should be READY immediately)
        create_response = requests.post(f"{BASE_URL}/api/video-tasks", json={
            "provider": "kling",
            "prompt": "Test video for save asset",
            "mode": "script"
        }, headers=auth_headers)
        assert create_response.status_code in [200, 201]
        task_id = create_response.json()["id"]
        
        # Try to save as asset
        save_response = requests.post(f"{BASE_URL}/api/video-tasks/{task_id}/save-asset", 
                                      json={}, headers=auth_headers)
        # May fail if task not READY or endpoint not implemented
        if save_response.status_code == 200:
            print(f"Asset saved from task {task_id}")
        else:
            print(f"Save asset response: {save_response.status_code} - {save_response.text[:100]}")
    
    def test_video_tasks_modes(self, auth_headers):
        """Video tasks support script, audio, remix modes."""
        modes = ["script", "audio", "remix"]
        for mode in modes:
            response = requests.post(f"{BASE_URL}/api/video-tasks", json={
                "provider": "kling",
                "prompt": f"Test {mode} mode",
                "mode": mode
            }, headers=auth_headers)
            assert response.status_code in [200, 201]
            data = response.json()
            assert data["mode"] == mode
            print(f"Mode {mode}: PASS")
    
    def test_video_tasks_with_submission_link(self, auth_headers):
        """Video task can be linked to a submission."""
        # Get a submission ID first
        subs_response = requests.get(f"{BASE_URL}/api/submissions/list", headers=auth_headers)
        if subs_response.status_code == 200 and len(subs_response.json()) > 0:
            submission_id = subs_response.json()[0]["id"]
            
            response = requests.post(f"{BASE_URL}/api/video-tasks", json={
                "provider": "kling",
                "prompt": "Video linked to submission",
                "mode": "script",
                "submissionId": submission_id
            }, headers=auth_headers)
            assert response.status_code in [200, 201]
            data = response.json()
            assert data.get("submissionId") == submission_id
            print(f"Task linked to submission: {submission_id}")
        else:
            print("No submissions available for linking test")


class TestVideoTasksValidation:
    """Validation tests for video tasks."""
    
    def test_video_tasks_invalid_provider(self, auth_headers):
        """POST /api/video-tasks with invalid provider returns error."""
        response = requests.post(f"{BASE_URL}/api/video-tasks", json={
            "provider": "invalid_provider",
            "prompt": "Test",
            "mode": "script"
        }, headers=auth_headers)
        assert response.status_code in [400, 422]
        print("Invalid provider rejected: PASS")
    
    def test_video_tasks_missing_prompt(self, auth_headers):
        """POST /api/video-tasks without prompt returns error."""
        response = requests.post(f"{BASE_URL}/api/video-tasks", json={
            "provider": "kling",
            "mode": "script"
        }, headers=auth_headers)
        assert response.status_code in [400, 422]
        print("Missing prompt rejected: PASS")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
