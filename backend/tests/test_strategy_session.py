"""Tests for Strategy Session API endpoints."""
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
async def client_token(async_client):
    """Get client user auth token."""
    response = await async_client.post("/api/auth/login", json={
        "email": "alex@company.com",
        "password": "client123"
    })
    assert response.status_code == 200
    return response.json()["token"]


@pytest.fixture
def client_headers(client_token):
    """Get headers with client token."""
    return {"Authorization": f"Bearer {client_token}"}


class TestStrategySessionCRUD:
    """Test strategy session CRUD operations."""
    
    @pytest.mark.asyncio
    async def test_create_strategy_session(self, async_client, client_headers):
        """Test creating a new strategy session."""
        response = await async_client.post(
            "/api/strategy/sessions",
            headers=client_headers,
            json={
                "topic": "How AI is Transforming Content Creation",
                "target_audience": "Content creators and marketers",
                "tone": "Professional yet engaging",
                "goal": "educate",
                "ai_model": "gemini"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["id"] is not None
        assert data["topic"] == "How AI is Transforming Content Creation"
        assert data["target_audience"] == "Content creators and marketers"
        assert data["ai_model"] == "gemini"
        assert data["title"] == "How AI is Transforming Content Creation"
        assert data["research_output"] is None
        assert data["outline_output"] is None
        assert data["script_output"] is None
        assert data["metadata_output"] is None
        assert data["created_at"] is not None
        assert data["updated_at"] is not None
        
        # Store session ID for cleanup
        return data["id"]
    
    @pytest.mark.asyncio
    async def test_get_strategy_sessions_list(self, async_client, client_headers):
        """Test listing user's strategy sessions."""
        # First create a session to ensure list is not empty
        await async_client.post(
            "/api/strategy/sessions",
            headers=client_headers,
            json={
                "topic": "Test Session for List",
                "target_audience": "Testers",
                "tone": "Casual",
                "goal": "entertain",
                "ai_model": "openai"
            }
        )
        
        response = await async_client.get(
            "/api/strategy/sessions",
            headers=client_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 1
        
        # Verify list item structure
        session = data[0]
        assert "id" in session
        assert "title" in session
        assert "topic" in session
        assert "ai_model" in session
        assert "created_at" in session
        assert "updated_at" in session
        
        # Verify ordering (most recent first)
        if len(data) >= 2:
            assert data[0]["updated_at"] >= data[1]["updated_at"]
    
    @pytest.mark.asyncio
    async def test_patch_strategy_session_output(self, async_client, client_headers):
        """Test updating session outputs via PATCH."""
        # Create a session first
        create_response = await async_client.post(
            "/api/strategy/sessions",
            headers=client_headers,
            json={
                "topic": "Session for Output Update",
                "target_audience": "Developers",
                "tone": "Technical",
                "goal": "educate",
                "ai_model": "anthropic"
            }
        )
        assert create_response.status_code == 200
        session_id = create_response.json()["id"]
        
        # Update research output
        research_text = "This is the research summary about the topic..."
        patch_response = await async_client.patch(
            f"/api/strategy/sessions/{session_id}",
            headers=client_headers,
            json={"research_output": research_text}
        )
        assert patch_response.status_code == 200
        assert patch_response.json()["research_output"] == research_text
        
        # Update outline output
        outline_text = '["Point 1", "Point 2", "Point 3"]'
        patch_response2 = await async_client.patch(
            f"/api/strategy/sessions/{session_id}",
            headers=client_headers,
            json={"outline_output": outline_text}
        )
        assert patch_response2.status_code == 200
        assert patch_response2.json()["outline_output"] == outline_text
        # Research should still be there
        assert patch_response2.json()["research_output"] == research_text
        
        # Update script output
        script_text = "Welcome to this episode. Today we will discuss..."
        patch_response3 = await async_client.patch(
            f"/api/strategy/sessions/{session_id}",
            headers=client_headers,
            json={"script_output": script_text}
        )
        assert patch_response3.status_code == 200
        assert patch_response3.json()["script_output"] == script_text
        # Previous outputs should still be there
        assert patch_response3.json()["research_output"] == research_text
        assert patch_response3.json()["outline_output"] == outline_text
    
    @pytest.mark.asyncio
    async def test_get_single_session(self, async_client, client_headers):
        """Test getting a single session by ID."""
        # Create a session
        create_response = await async_client.post(
            "/api/strategy/sessions",
            headers=client_headers,
            json={
                "topic": "Session to Retrieve",
                "target_audience": "Readers",
                "tone": "Friendly",
                "goal": "entertain",
                "ai_model": "gemini"
            }
        )
        session_id = create_response.json()["id"]
        
        # Get the session
        response = await async_client.get(
            f"/api/strategy/sessions/{session_id}",
            headers=client_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == session_id
        assert data["topic"] == "Session to Retrieve"
    
    @pytest.mark.asyncio
    async def test_delete_session(self, async_client, client_headers):
        """Test deleting a session."""
        # Create a session
        create_response = await async_client.post(
            "/api/strategy/sessions",
            headers=client_headers,
            json={
                "topic": "Session to Delete",
                "target_audience": "Nobody",
                "tone": "Sad",
                "goal": "educate",
                "ai_model": "openai"
            }
        )
        session_id = create_response.json()["id"]
        
        # Delete the session
        delete_response = await async_client.delete(
            f"/api/strategy/sessions/{session_id}",
            headers=client_headers
        )
        assert delete_response.status_code == 200
        
        # Verify it's gone
        get_response = await async_client.get(
            f"/api/strategy/sessions/{session_id}",
            headers=client_headers
        )
        assert get_response.status_code == 404
    
    @pytest.mark.asyncio
    async def test_session_requires_auth(self, async_client):
        """Test that session endpoints require authentication."""
        # List without auth
        response = await async_client.get("/api/strategy/sessions")
        assert response.status_code == 401
        
        # Create without auth
        response = await async_client.post(
            "/api/strategy/sessions",
            json={"topic": "Unauthorized"}
        )
        assert response.status_code == 401
    
    @pytest.mark.asyncio
    async def test_session_with_submission_id(self, async_client, client_headers):
        """Test creating a session linked to a submission."""
        # Note: We're using a placeholder submission_id since we don't want to
        # create a real submission just for this test
        response = await async_client.post(
            "/api/strategy/sessions",
            headers=client_headers,
            json={
                "topic": "Linked Session",
                "target_audience": "Subscribers",
                "tone": "Exciting",
                "goal": "sell",
                "ai_model": "gemini",
                "submission_id": "test-submission-123"
            }
        )
        assert response.status_code == 200
        assert response.json()["submission_id"] == "test-submission-123"
