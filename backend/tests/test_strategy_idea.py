"""Tests for Strategy Idea endpoints and related submission creation."""
import pytest
from httpx import AsyncClient, ASGITransport
from main import app

BASE_URL = "http://test"


@pytest.fixture
async def async_client():
    """Create async test client."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url=BASE_URL) as client:
        yield client


@pytest.fixture
async def auth_token(async_client):
    """Get real auth token from login."""
    response = await async_client.post("/api/auth/login", json={
        "email": "alex@company.com",
        "password": "client123"
    })
    assert response.status_code == 200
    return response.json()["token"]


@pytest.fixture
def client_headers(auth_token):
    """Get headers with real token."""
    return {"Authorization": f"Bearer {auth_token}"}


class TestStrategyIdea:
    """Test strategy idea endpoints."""
    
    @pytest.mark.asyncio
    async def test_get_single_idea(self, async_client, client_headers):
        """Test GET /api/fvs/ideas/{id} returns full idea details."""
        # First get list of ideas
        list_response = await async_client.get("/api/fvs/ideas", headers=client_headers)
        assert list_response.status_code == 200
        ideas = list_response.json()
        
        if not ideas:
            # Propose some ideas first
            await async_client.post("/api/fvs/propose-ideas", json={"format": "short"}, headers=client_headers)
            list_response = await async_client.get("/api/fvs/ideas", headers=client_headers)
            ideas = list_response.json()
        
        if not ideas:
            pytest.skip("No ideas available for testing")
        
        idea_id = ideas[0]["id"]
        
        # Get single idea
        response = await async_client.get(f"/api/fvs/ideas/{idea_id}", headers=client_headers)
        assert response.status_code == 200
        data = response.json()
        
        # Verify all expected fields
        assert data["id"] == idea_id
        assert "topic" in data
        assert "hypothesis" in data
        assert "format" in data
        assert "convictionScore" in data
        assert "status" in data
        assert "hooks" in data
        assert "caption" in data
        assert "hashtags" in data
    
    @pytest.mark.asyncio
    async def test_generate_script_for_idea(self, async_client, client_headers):
        """Test POST /api/fvs/ideas/{id}/generate-script generates and saves script."""
        # Get an idea
        list_response = await async_client.get("/api/fvs/ideas", headers=client_headers)
        ideas = list_response.json()
        
        if not ideas:
            pytest.skip("No ideas available")
        
        idea_id = ideas[0]["id"]
        
        # Generate script
        response = await async_client.post(f"/api/fvs/ideas/{idea_id}/generate-script", headers=client_headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "scriptText" in data
        assert data["scriptText"] is not None
        assert len(data["scriptText"]) > 0
        assert "hooks" in data
        assert "languageStyle" in data
        assert "caption" in data
        assert "hashtags" in data
    
    @pytest.mark.asyncio
    async def test_idea_has_hooks_caption_hashtags(self, async_client, client_headers):
        """Test that proposed ideas include hooks, caption, and hashtags."""
        # Propose new ideas
        response = await async_client.post("/api/fvs/propose-ideas", json={"format": "short"}, headers=client_headers)
        assert response.status_code == 200
        data = response.json()
        
        if not data.get("ideas"):
            pytest.skip("No ideas generated")
        
        # Check that each idea has the expected fields
        for idea in data["ideas"]:
            assert "hooks" in idea
            assert isinstance(idea["hooks"], list)
            assert len(idea["hooks"]) > 0
            assert "caption" in idea
            assert idea["caption"] is not None
            assert "hashtags" in idea
            assert isinstance(idea["hashtags"], list)


class TestSubmissionFromIdea:
    """Test creating submissions from strategy ideas."""
    
    @pytest.mark.asyncio
    async def test_create_submission_with_strategy_idea_id(self, async_client, client_headers):
        """Test creating a submission linked to a strategy idea."""
        # Get an idea
        list_response = await async_client.get("/api/fvs/ideas", headers=client_headers)
        ideas = list_response.json()
        
        if not ideas:
            pytest.skip("No ideas available")
        
        idea = ideas[0]
        
        # Create submission with strategyIdeaId
        response = await async_client.post("/api/submissions", json={
            "title": idea["topic"],
            "description": idea.get("hypothesis", "Test description"),
            "contentType": "Short",
            "priority": "High",
            "strategyIdeaId": idea["id"]
        }, headers=client_headers)
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["title"] == idea["topic"]
        assert data["strategyIdeaId"] == idea["id"]
        assert data["contentType"] == "Short"
    
    @pytest.mark.asyncio
    async def test_create_video_task_from_idea_script(self, async_client, client_headers):
        """Test creating a video task using script from an idea."""
        # Get an idea and generate script
        list_response = await async_client.get("/api/fvs/ideas", headers=client_headers)
        ideas = list_response.json()
        
        if not ideas:
            pytest.skip("No ideas available")
        
        idea = ideas[0]
        
        # Generate script
        script_response = await async_client.post(f"/api/fvs/ideas/{idea['id']}/generate-script", headers=client_headers)
        script_data = script_response.json()
        
        # Create video task with script
        response = await async_client.post("/api/video-tasks", json={
            "provider": "veo",
            "prompt": f"Create a video for: {idea['topic']}",
            "mode": "script",
            "scriptText": script_data["scriptText"],
            "aspectRatio": "9:16",
            "outputProfile": "shorts"
        }, headers=client_headers)
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["mode"] == "script"
        assert data["scriptText"] == script_data["scriptText"]
