"""
Sprint 13 Tests: Calendar AI + Brain Prediction Challenge + Admin Role Fix
Tests for new features added in Sprint 13.
"""
import pytest
import uuid
from datetime import datetime, timezone, timedelta
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


def get_client_auth_headers():
    """Login as client and return auth headers."""
    response = client.post("/api/auth/login", json={
        "email": "alex@company.com",
        "password": "client123"
    })
    if response.status_code == 200:
        token = response.json().get("token")
        return {"Authorization": f"Bearer {token}"}
    return {}


def get_admin_auth_headers():
    """Login as admin and return auth headers."""
    response = client.post("/api/auth/login", json={
        "email": "admin@forgevoice.com",
        "password": "admin123"
    })
    if response.status_code == 200:
        token = response.json().get("token")
        return {"Authorization": f"Bearer {token}"}
    return {}


class TestBestPostingTimes:
    """Test GET /api/calendar/best-times endpoint."""
    
    def test_get_best_posting_times_success(self):
        """Test that best posting times returns top slots based on historical data."""
        headers = get_client_auth_headers()
        response = client.get("/api/calendar/best-times", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        
        # Should have top_slots array and total_analyzed count
        assert "top_slots" in data
        assert "total_analyzed" in data
        assert isinstance(data["top_slots"], list)
        assert isinstance(data["total_analyzed"], int)
        
        # Each slot should have required fields
        for slot in data["top_slots"]:
            assert "day" in slot
            assert "time_slot" in slot
            assert "avg_views" in slot
            assert "confidence" in slot
    
    def test_get_best_posting_times_requires_auth(self):
        """Test that best posting times requires authentication."""
        response = client.get("/api/calendar/best-times")
        assert response.status_code == 401


class TestGenerateCalendarSuggestions:
    """Test POST /api/calendar/ai-schedule endpoint."""
    
    def test_generate_ai_schedule_success(self):
        """Test that AI schedule generation returns suggestions."""
        headers = get_client_auth_headers()
        response = client.post("/api/calendar/ai-schedule", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        
        # Should have status and suggestion_count
        assert "status" in data
        # Status could be "complete", "error", or "generating"
        assert data["status"] in ["complete", "error", "generating"]
    
    def test_get_ai_schedule_returns_latest(self):
        """Test that GET /api/calendar/ai-schedule returns latest schedule."""
        headers = get_client_auth_headers()
        response = client.get("/api/calendar/ai-schedule", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        
        # Should have status field
        assert "status" in data
        # Status is either "complete" or "empty"
        assert data["status"] in ["complete", "empty"]


class TestActiveChallenges:
    """Test GET /api/brain/active-challenges endpoint."""
    
    def test_get_active_challenges_success(self):
        """Test that active challenges returns pending predictions."""
        headers = get_client_auth_headers()
        response = client.get("/api/brain/active-challenges", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        
        # Should have active_challenges array and total_active count
        assert "active_challenges" in data
        assert "total_active" in data
        assert isinstance(data["active_challenges"], list)
        assert isinstance(data["total_active"], int)
        
        # Each challenge should have required fields
        for challenge in data["active_challenges"]:
            assert "id" in challenge
            assert "predicted_title" in challenge
            assert "predicted_tier" in challenge
            assert "days_remaining" in challenge
    
    def test_active_challenges_sorted_by_urgency(self):
        """Test that active challenges are sorted by days_remaining ascending."""
        headers = get_client_auth_headers()
        response = client.get("/api/brain/active-challenges", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        challenges = data["active_challenges"]
        
        if len(challenges) > 1:
            # Check that days_remaining is in ascending order
            for i in range(len(challenges) - 1):
                assert challenges[i]["days_remaining"] <= challenges[i + 1]["days_remaining"]


class TestAdminSidebarRoleFiltering:
    """Test admin-specific functionality (data cleanup, overview)."""
    
    def test_admin_overview_endpoint(self):
        """Test admin-specific overview returns cross-channel summary."""
        headers = get_admin_auth_headers()
        response = client.get("/api/dashboard/admin-overview", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        
        # Admin overview should have cross-channel stats
        assert "totalClients" in data
        assert "totalVideosManaged" in data
        assert "totalViewsManaged" in data
        assert "activeChannels" in data
        
        # All values should be non-negative integers
        assert data["totalClients"] >= 0
        assert data["totalVideosManaged"] >= 0
        assert data["totalViewsManaged"] >= 0
        assert data["activeChannels"] >= 0
    
    def test_admin_overview_forbidden_for_client(self):
        """Test that admin overview returns error for client users."""
        headers = get_client_auth_headers()
        response = client.get("/api/dashboard/admin-overview", headers=headers)
        
        # Should still return 200 but with error field for non-admin
        assert response.status_code == 200
        data = response.json()
        assert "error" in data


class TestBrainScoresWithChallenge:
    """Test brain scores endpoint includes challenge fields."""
    
    def test_brain_scores_include_challenge_fields(self):
        """Test that brain scores include days_remaining and is_expired."""
        headers = get_client_auth_headers()
        response = client.get("/api/brain/scores", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        
        # Should have standard brain score fields
        assert "total_predictions" in data
        assert "accuracy_percentage" in data
        assert "scores" in data
        
        # Each score should have challenge fields
        for score in data["scores"]:
            assert "days_remaining" in score
            assert "is_expired" in score


# Run specific tests
if __name__ == "__main__":
    pytest.main([__file__, "-v"])
