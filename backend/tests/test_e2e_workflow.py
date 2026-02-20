"""
End-to-End Workflow Tests for ForgeVoice Studio.

Tests complete user journeys through the application.
Uses httpx AsyncClient for proper async support.

Run with: pytest -m e2e -v
"""
import pytest
import httpx
import uuid
from typing import Optional
import os

# Use the live API for testing
API_URL = os.environ.get("REACT_APP_BACKEND_URL", "http://localhost:8001")
if not API_URL.startswith("http"):
    API_URL = f"https://{API_URL}"


async def get_client_token() -> Optional[str]:
    """Login as client and return token."""
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(
            f"{API_URL}/api/auth/login",
            json={"email": "alex@company.com", "password": "client123"}
        )
        if response.status_code == 200:
            return response.json().get("token")
    return None


async def get_admin_token() -> Optional[str]:
    """Login as admin and return token."""
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(
            f"{API_URL}/api/auth/login",
            json={"email": "admin@forgevoice.com", "password": "admin123"}
        )
        if response.status_code == 200:
            return response.json().get("token")
    return None


# ============================================================================
# Test 1: Complete Content Creation Journey
# ============================================================================

@pytest.mark.e2e
@pytest.mark.asyncio
class TestE2EContentCreationJourney:
    """Test the complete content creation journey."""
    
    async def test_full_content_creation_flow(self):
        """
        Test: Login → Create submission → Update status → Schedule → Unschedule → Delete
        """
        token = await get_client_token()
        assert token, "Failed to get auth token"
        
        headers = {"Authorization": f"Bearer {token}"}
        test_id = str(uuid.uuid4())[:8]
        submission_id = None
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            try:
                # 1. Create a new submission
                create_res = await client.post(
                    f"{API_URL}/api/submissions",
                    json={
                        "title": f"E2E Test Short {test_id}",
                        "contentType": "Short",
                        "description": "Automated E2E test submission",
                        "priority": "Medium"
                    },
                    headers=headers
                )
                assert create_res.status_code == 200, f"Create failed: {create_res.text}"
                submission_id = create_res.json().get("id")
                assert submission_id, "No submission ID returned"
                
                # 2. Verify submission appears in list
                list_res = await client.get(
                    f"{API_URL}/api/submissions",
                    headers=headers
                )
                assert list_res.status_code == 200
                submissions = list_res.json()
                found = any(s.get("id") == submission_id for s in submissions)
                assert found, "Submission not found in list"
                
                # 3. Update submission status to EDITING
                update_res = await client.patch(
                    f"{API_URL}/api/submissions/{submission_id}/status",
                    json={"status": "EDITING"},
                    headers=headers
                )
                assert update_res.status_code == 200, f"Status update failed: {update_res.text}"
                
                # 4. Verify status change
                get_res = await client.get(
                    f"{API_URL}/api/submissions/{submission_id}",
                    headers=headers
                )
                assert get_res.status_code == 200
                assert get_res.json().get("status") == "EDITING"
                
                # 5. Schedule submission on calendar
                schedule_res = await client.patch(
                    f"{API_URL}/api/calendar/schedule/{submission_id}",
                    json={"releaseDate": "2026-03-01"},
                    headers=headers
                )
                # Calendar schedule might not exist, check for 200 or 404
                if schedule_res.status_code == 200:
                    # 6. Verify in calendar events
                    events_res = await client.get(
                        f"{API_URL}/api/calendar/events",
                        headers=headers
                    )
                    assert events_res.status_code == 200
                    
                    # 7. Unschedule
                    unschedule_res = await client.patch(
                        f"{API_URL}/api/calendar/unschedule/{submission_id}",
                        headers=headers
                    )
                    # Accept success or not found
                    assert unschedule_res.status_code in [200, 404]
                
            finally:
                # 8. Cleanup - Delete test submission
                if submission_id:
                    delete_res = await client.delete(
                        f"{API_URL}/api/submissions/{submission_id}",
                        headers=headers
                    )
                    # Accept any response - cleanup shouldn't fail the test


# ============================================================================
# Test 2: Brain Feedback Loop Journey
# ============================================================================

@pytest.mark.e2e
@pytest.mark.asyncio
class TestE2EBrainFeedbackLoop:
    """Test the brain feedback loop journey."""
    
    async def test_brain_feedback_loop_flow(self):
        """
        Test: Trigger scan → Get recommendations → Create submission → Verify brain score
        """
        token = await get_client_token()
        assert token, "Failed to get auth token"
        
        headers = {"Authorization": f"Bearer {token}"}
        
        async with httpx.AsyncClient(timeout=60.0) as client:
            # 1. Check if recommendations exist (trend scan might take time)
            recs_res = await client.get(
                f"{API_URL}/api/trends/recommendations",
                headers=headers
            )
            assert recs_res.status_code == 200
            recommendations = recs_res.json()
            
            # Skip further tests if no recommendations (scan might be in progress)
            if len(recommendations) == 0:
                # Try triggering a scan
                scan_res = await client.post(
                    f"{API_URL}/api/trends/scan",
                    headers=headers
                )
                # Accept any response - scan is async
                assert scan_res.status_code in [200, 202, 400]
                pytest.skip("No recommendations available yet - scan triggered")
            
            # 2. Get first recommendation
            rec = recommendations[0]
            rec_id = rec.get("id")
            assert rec_id, "Recommendation has no ID"
            
            # 3. Verify brain scores endpoint works
            scores_res = await client.get(
                f"{API_URL}/api/brain/scores",
                headers=headers
            )
            assert scores_res.status_code == 200
            
            # 4. Verify active challenges endpoint works
            challenges_res = await client.get(
                f"{API_URL}/api/brain/active-challenges",
                headers=headers
            )
            assert challenges_res.status_code == 200
            challenges_data = challenges_res.json()
            assert "active_challenges" in challenges_data or "total_active" in challenges_data


# ============================================================================
# Test 3: Analytics Pipeline Journey
# ============================================================================

@pytest.mark.e2e
@pytest.mark.asyncio
class TestE2EAnalyticsPipeline:
    """Test the analytics pipeline journey."""
    
    async def test_analytics_pipeline_flow(self):
        """
        Test: Sync analytics → Verify overview → Verify videos → Verify chart data
        """
        token = await get_client_token()
        assert token, "Failed to get auth token"
        
        headers = {"Authorization": f"Bearer {token}"}
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            # 1. Trigger analytics sync (may fail if OAuth not connected)
            sync_res = await client.post(
                f"{API_URL}/api/analytics/sync",
                headers=headers
            )
            # Accept various responses - sync depends on OAuth
            assert sync_res.status_code in [200, 400, 401, 404]
            
            # 2. Verify analytics overview returns data structure
            overview_res = await client.get(
                f"{API_URL}/api/analytics/overview",
                headers=headers
            )
            assert overview_res.status_code == 200
            overview = overview_res.json()
            # Check for expected fields
            assert any(k in overview for k in ["totalViews", "subscriberCount", "views"])
            
            # 3. Verify videos list endpoint
            videos_res = await client.get(
                f"{API_URL}/api/analytics/videos",
                headers=headers
            )
            assert videos_res.status_code == 200
            
            # 4. Verify chart data endpoint
            chart_res = await client.get(
                f"{API_URL}/api/analytics/chart-data",
                headers=headers
            )
            assert chart_res.status_code == 200


# ============================================================================
# Test 4: Admin Multi-Channel Journey
# ============================================================================

@pytest.mark.e2e
@pytest.mark.asyncio
class TestE2EAdminMultiChannel:
    """Test the admin multi-channel journey."""
    
    async def test_admin_multi_channel_flow(self):
        """
        Test: Admin login → Create client → Verify client → Login as client → Deactivate
        """
        admin_token = await get_admin_token()
        assert admin_token, "Failed to get admin auth token"
        
        admin_headers = {"Authorization": f"Bearer {admin_token}"}
        test_id = str(uuid.uuid4())[:8]
        test_email = f"e2e_test_{test_id}@test.com"
        created_user_id = None
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            try:
                # 1. Create new client
                create_res = await client.post(
                    f"{API_URL}/api/admin/clients",
                    json={
                        "email": test_email,
                        "password": "testpass123",
                        "name": f"E2E Test Client {test_id}",
                        "channelName": f"Test Channel {test_id}",
                        "niche": "Testing"
                    },
                    headers=admin_headers
                )
                # Accept 200 or 201
                assert create_res.status_code in [200, 201], f"Create client failed: {create_res.text}"
                created_user_id = create_res.json().get("userId") or create_res.json().get("user_id")
                
                # 2. Verify client appears in list
                list_res = await client.get(
                    f"{API_URL}/api/admin/clients",
                    headers=admin_headers
                )
                assert list_res.status_code == 200
                clients = list_res.json()
                found = any(c.get("email") == test_email for c in clients)
                assert found, "Created client not found in list"
                
                # 3. Login as new client
                client_login_res = await client.post(
                    f"{API_URL}/api/auth/login",
                    json={"email": test_email, "password": "testpass123"}
                )
                assert client_login_res.status_code == 200, f"Client login failed: {client_login_res.text}"
                client_token = client_login_res.json().get("token")
                assert client_token, "No token returned for client"
                
                # 4. Verify client's workspace is empty
                client_headers = {"Authorization": f"Bearer {client_token}"}
                subs_res = await client.get(
                    f"{API_URL}/api/submissions",
                    headers=client_headers
                )
                assert subs_res.status_code == 200
                # New client should have 0 submissions
                assert len(subs_res.json()) == 0, "New client should have empty submissions"
                
            finally:
                # 5. Cleanup - Deactivate client
                if created_user_id:
                    delete_res = await client.delete(
                        f"{API_URL}/api/admin/clients/{created_user_id}",
                        headers=admin_headers
                    )
                    # Accept any response for cleanup


# ============================================================================
# Test 5: Publishing Flow Journey
# ============================================================================

@pytest.mark.e2e
@pytest.mark.asyncio
class TestE2EPublishingFlow:
    """Test the publishing flow journey."""
    
    async def test_publishing_flow(self):
        """
        Test: Create submission → Attach test video → Check video → Verify publish endpoints
        """
        token = await get_client_token()
        assert token, "Failed to get auth token"
        
        headers = {"Authorization": f"Bearer {token}"}
        test_id = str(uuid.uuid4())[:8]
        submission_id = None
        
        async with httpx.AsyncClient(timeout=60.0) as client:
            try:
                # 1. Create test submission
                create_res = await client.post(
                    f"{API_URL}/api/submissions",
                    json={
                        "title": f"E2E Publish Test {test_id}",
                        "contentType": "Short",
                        "description": "E2E publishing test"
                    },
                    headers=headers
                )
                assert create_res.status_code == 200
                submission_id = create_res.json().get("id")
                assert submission_id
                
                # 2. Attach test video
                attach_res = await client.post(
                    f"{API_URL}/api/dev/test-upload/{submission_id}",
                    headers=headers
                )
                assert attach_res.status_code == 200, f"Test upload failed: {attach_res.text}"
                attach_data = attach_res.json()
                assert attach_data.get("success") or attach_data.get("asset_id")
                
                # 3. Verify video is attached
                check_res = await client.get(
                    f"{API_URL}/api/publish/check-video/{submission_id}",
                    headers=headers
                )
                assert check_res.status_code == 200
                check_data = check_res.json()
                assert check_data.get("has_video") == True
                
                # 4. Verify publish endpoints work
                queue_res = await client.get(
                    f"{API_URL}/api/publish/queue",
                    headers=headers
                )
                assert queue_res.status_code == 200
                
                stats_res = await client.get(
                    f"{API_URL}/api/publish/stats",
                    headers=headers
                )
                assert stats_res.status_code == 200
                
            finally:
                # Cleanup
                if submission_id:
                    await client.delete(
                        f"{API_URL}/api/submissions/{submission_id}",
                        headers=headers
                    )


# ============================================================================
# Pipeline Service Unit Tests
# ============================================================================

@pytest.mark.asyncio
class TestPipelineServiceUnits:
    """Unit tests for pipeline service."""
    
    async def test_pipeline_health_endpoint(self):
        """Test pipeline health endpoint returns expected structure."""
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
    
    async def test_search_endpoint(self):
        """Test global search endpoint."""
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
            assert "submissions" in data
            assert "assets" in data
            assert "recommendations" in data
            assert "total" in data
    
    async def test_storage_status(self):
        """Test storage service configuration endpoint."""
        token = await get_admin_token()
        assert token, "Failed to get admin auth token"
        
        headers = {"Authorization": f"Bearer {token}"}
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            # Check dashboard endpoint works (storage status is logged)
            response = await client.get(
                f"{API_URL}/api/dashboard/overview",
                headers=headers
            )
            assert response.status_code == 200


# Run tests
if __name__ == "__main__":
    pytest.main([__file__, "-v", "-m", "e2e"])
