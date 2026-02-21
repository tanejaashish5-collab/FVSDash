"""
Sprint 15 Feature Tests for ForgeVoice Studio.

Tests:
- Global Search endpoint (GET /api/search?q={query})
- Pipeline health endpoint (GET /api/pipeline/health)
- Pipeline script-to-submission endpoint (POST /api/pipeline/script-to-submission)
- Storage service graceful fallback to local storage
- Pipeline status endpoint (GET /api/pipeline/status/{id})
- Notification bell endpoints

Run with: pytest backend/tests/test_sprint15_features.py -v
"""
import pytest
import httpx
import uuid
import os

API_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://video-studio-fix.preview.emergentagent.com")
if not API_URL.startswith("http"):
    API_URL = f"https://{API_URL}"


async def get_client_token() -> str:
    """Login as client and return token."""
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(
            f"{API_URL}/api/auth/login",
            json={"email": "alex@company.com", "password": "client123"}
        )
        if response.status_code == 200:
            return response.json().get("token")
    return None


# =============================================================================
# Global Search Tests
# =============================================================================

@pytest.mark.asyncio
class TestGlobalSearch:
    """Tests for global search endpoint."""
    
    async def test_search_returns_grouped_results(self):
        """Test that search returns submissions, assets, and recommendations."""
        token = await get_client_token()
        assert token, "Failed to get auth token"
        
        headers = {"Authorization": f"Bearer {token}"}
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(
                f"{API_URL}/api/search?q=chanakya",
                headers=headers
            )
            
            assert response.status_code == 200
            data = response.json()
            
            # Verify structure
            assert "query" in data
            assert "submissions" in data
            assert "assets" in data
            assert "recommendations" in data
            assert "total" in data
            assert "counts" in data
            
            # Verify counts match arrays
            assert data["counts"]["submissions"] == len(data["submissions"])
            assert data["counts"]["assets"] == len(data["assets"])
            assert data["counts"]["recommendations"] == len(data["recommendations"])
    
    async def test_search_submission_has_type_badge(self):
        """Test that search results have type and url fields."""
        token = await get_client_token()
        assert token, "Failed to get auth token"
        
        headers = {"Authorization": f"Bearer {token}"}
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(
                f"{API_URL}/api/search?q=chanakya",
                headers=headers
            )
            
            assert response.status_code == 200
            data = response.json()
            
            if len(data["submissions"]) > 0:
                sub = data["submissions"][0]
                assert "type" in sub and sub["type"] == "submission"
                assert "url" in sub
                assert "subtitle" in sub
    
    async def test_search_with_empty_query_rejected(self):
        """Test that empty query is rejected."""
        token = await get_client_token()
        assert token, "Failed to get auth token"
        
        headers = {"Authorization": f"Bearer {token}"}
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(
                f"{API_URL}/api/search?q=",
                headers=headers
            )
            
            # Should return 422 for validation error
            assert response.status_code == 422


# =============================================================================
# Pipeline Health Tests
# =============================================================================

@pytest.mark.asyncio
class TestPipelineHealth:
    """Tests for pipeline health endpoint."""
    
    async def test_pipeline_health_returns_counts(self):
        """Test pipeline health returns expected fields."""
        token = await get_client_token()
        assert token, "Failed to get auth token"
        
        headers = {"Authorization": f"Bearer {token}"}
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(
                f"{API_URL}/api/pipeline/health",
                headers=headers
            )
            
            assert response.status_code == 200
            data = response.json()
            
            assert "scripts_awaiting_video" in data
            assert "videos_awaiting_thumbnail" in data
            assert "ready_to_publish" in data
            assert "total_in_pipeline" in data
            
            # Values should be non-negative integers
            assert isinstance(data["scripts_awaiting_video"], int)
            assert data["scripts_awaiting_video"] >= 0


# =============================================================================
# Pipeline Script-to-Submission Tests
# =============================================================================

@pytest.mark.asyncio
class TestPipelineScriptToSubmission:
    """Tests for pipeline script-to-submission endpoint."""
    
    async def test_script_to_submission_flow(self):
        """Test creating a submission from a strategy session."""
        token = await get_client_token()
        assert token, "Failed to get auth token"
        
        headers = {"Authorization": f"Bearer {token}"}
        test_id = str(uuid.uuid4())[:8]
        session_id = None
        submission_id = None
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            try:
                # 1. Create strategy session
                session_res = await client.post(
                    f"{API_URL}/api/strategy/sessions",
                    json={
                        "topic": f"E2E Pipeline Test {test_id}",
                        "target_audience": "Developers",
                        "tone": "Professional",
                        "goal": "educate",
                        "ai_model": "gemini"
                    },
                    headers=headers
                )
                assert session_res.status_code in [200, 201], f"Session create failed: {session_res.text}"
                session_id = session_res.json().get("id")
                assert session_id
                
                # 2. Add script to session
                patch_res = await client.patch(
                    f"{API_URL}/api/strategy/sessions/{session_id}",
                    json={"script_output": f"Test script content for {test_id}"},
                    headers=headers
                )
                assert patch_res.status_code == 200
                
                # 3. Call pipeline script-to-submission
                pipeline_res = await client.post(
                    f"{API_URL}/api/pipeline/script-to-submission",
                    json={"strategy_session_id": session_id},
                    headers=headers
                )
                assert pipeline_res.status_code == 200, f"Pipeline failed: {pipeline_res.text}"
                
                pipeline_data = pipeline_res.json()
                assert pipeline_data.get("success") == True
                assert "submission_id" in pipeline_data
                submission_id = pipeline_data["submission_id"]
                
                # 4. Verify submission was created
                sub_res = await client.get(
                    f"{API_URL}/api/submissions/{submission_id}",
                    headers=headers
                )
                assert sub_res.status_code == 200
                sub_data = sub_res.json()
                assert sub_data.get("source") == "strategy_lab"
                assert sub_data.get("strategySessionId") == session_id
                
                # 5. Test pipeline status
                status_res = await client.get(
                    f"{API_URL}/api/pipeline/status/{submission_id}",
                    headers=headers
                )
                assert status_res.status_code == 200
                status_data = status_res.json()
                assert status_data.get("success") == True
                assert status_data.get("has_script") == True
                assert status_data.get("has_video") == False
                
            finally:
                # Cleanup
                if submission_id:
                    await client.delete(
                        f"{API_URL}/api/submissions/{submission_id}",
                        headers=headers
                    )
                if session_id:
                    await client.delete(
                        f"{API_URL}/api/strategy/sessions/{session_id}",
                        headers=headers
                    )


# =============================================================================
# Notification Tests
# =============================================================================

@pytest.mark.asyncio
class TestNotifications:
    """Tests for notification bell endpoints."""
    
    async def test_get_unread_count(self):
        """Test getting unread notification count."""
        token = await get_client_token()
        assert token, "Failed to get auth token"
        
        headers = {"Authorization": f"Bearer {token}"}
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(
                f"{API_URL}/api/notifications/unread-count",
                headers=headers
            )
            
            assert response.status_code == 200
            data = response.json()
            assert "count" in data
            assert isinstance(data["count"], int)
    
    async def test_mark_all_read(self):
        """Test marking all notifications as read."""
        token = await get_client_token()
        assert token, "Failed to get auth token"
        
        headers = {"Authorization": f"Bearer {token}"}
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{API_URL}/api/notifications/read-all",
                headers=headers
            )
            
            assert response.status_code == 200
            data = response.json()
            assert "message" in data


# =============================================================================
# Storage Service Tests
# =============================================================================

@pytest.mark.asyncio
class TestStorageService:
    """Tests for storage service (S3/local fallback)."""
    
    async def test_storage_fallback_to_local(self):
        """Test that storage gracefully falls back to local when S3 not configured."""
        # This test verifies the storage service initializes without errors
        # When S3 is not configured, it should fall back to local storage
        token = await get_client_token()
        assert token, "Failed to get auth token"
        
        headers = {"Authorization": f"Bearer {token}"}
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            # Test an endpoint that uses storage (e.g., assets)
            response = await client.get(
                f"{API_URL}/api/assets/library",
                headers=headers
            )
            
            # Should work regardless of S3 configuration
            assert response.status_code == 200


# =============================================================================
# Video Lab Pre-load Tests
# =============================================================================

@pytest.mark.asyncio
class TestVideoLabPreload:
    """Tests for Video Lab pre-load from submission."""
    
    async def test_submission_for_video_lab(self):
        """Test fetching submission data for Video Lab pre-population."""
        token = await get_client_token()
        assert token, "Failed to get auth token"
        
        headers = {"Authorization": f"Bearer {token}"}
        test_id = str(uuid.uuid4())[:8]
        submission_id = None
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            try:
                # Create test submission
                create_res = await client.post(
                    f"{API_URL}/api/submissions",
                    json={
                        "title": f"Video Lab Test {test_id}",
                        "contentType": "Short",
                        "description": "Test for video lab preload",
                        "hook": "This is the hook"
                    },
                    headers=headers
                )
                assert create_res.status_code == 200
                submission_id = create_res.json().get("id")
                
                # Fetch for video lab
                response = await client.get(
                    f"{API_URL}/api/pipeline/submission-for-video/{submission_id}",
                    headers=headers
                )
                
                assert response.status_code == 200
                data = response.json()
                assert data.get("id") == submission_id
                assert "title" in data
                assert "hook" in data
                
            finally:
                if submission_id:
                    await client.delete(
                        f"{API_URL}/api/submissions/{submission_id}",
                        headers=headers
                    )


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
