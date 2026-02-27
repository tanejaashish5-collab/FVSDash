"""
Sprint 13 API Integration Tests: Calendar AI + Brain Prediction Challenge + Admin Role Fix
Tests backend APIs via HTTP requests against the public URL.
"""
import pytest
import requests
import os

# Get backend URL from environment or use default
BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://video-studio-fix.preview.emergentagent.com').rstrip('/')


def get_client_token():
    """Login as client and return token."""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": "alex@company.com",
        "password": "client123"
    })
    if response.status_code == 200:
        return response.json().get("token")
    return None


def get_admin_token():
    """Login as admin and return token."""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": "admin@forgevoice.com",
        "password": "admin123"
    })
    if response.status_code == 200:
        return response.json().get("token")
    return None


class TestCalendarBestTimes:
    """Test GET /api/calendar/best-times endpoint."""
    
    def test_best_times_returns_top_slots(self):
        """Test that best posting times returns structured data."""
        token = get_client_token()
        assert token, "Failed to login as client"
        
        response = requests.get(
            f"{BASE_URL}/api/calendar/best-times",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify structure
        assert "top_slots" in data
        assert "total_analyzed" in data
        assert isinstance(data["top_slots"], list)
        
        # Each slot should have required fields
        for slot in data["top_slots"]:
            assert "day" in slot
            assert "time_slot" in slot or "time_label" in slot
            assert "avg_views" in slot
            assert "confidence" in slot
    
    def test_best_times_confidence_levels(self):
        """Test that best times returns valid confidence levels."""
        token = get_client_token()
        assert token, "Failed to login as client"
        
        response = requests.get(
            f"{BASE_URL}/api/calendar/best-times",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        valid_confidence = ["High", "Medium", "Low"]
        for slot in data["top_slots"]:
            assert slot["confidence"] in valid_confidence


class TestCalendarAISchedule:
    """Test AI Schedule generation and retrieval endpoints."""
    
    def test_get_ai_schedule_structure(self):
        """Test GET /api/calendar/ai-schedule returns valid structure."""
        token = get_client_token()
        assert token, "Failed to login as client"
        
        response = requests.get(
            f"{BASE_URL}/api/calendar/ai-schedule",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Status should be "complete" or "empty"
        assert "status" in data
        assert data["status"] in ["complete", "empty"]


class TestBrainActiveChallenges:
    """Test GET /api/brain/active-challenges endpoint."""
    
    def test_active_challenges_returns_structure(self):
        """Test that active challenges returns expected structure."""
        token = get_client_token()
        assert token, "Failed to login as client"
        
        response = requests.get(
            f"{BASE_URL}/api/brain/active-challenges",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify structure
        assert "active_challenges" in data
        assert "total_active" in data
        assert isinstance(data["active_challenges"], list)
        assert isinstance(data["total_active"], int)
    
    def test_active_challenges_have_days_remaining(self):
        """Test that each challenge includes days_remaining field."""
        token = get_client_token()
        assert token, "Failed to login as client"
        
        response = requests.get(
            f"{BASE_URL}/api/brain/active-challenges",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        for challenge in data["active_challenges"]:
            assert "id" in challenge
            assert "predicted_title" in challenge
            assert "predicted_tier" in challenge
            assert "days_remaining" in challenge
            assert isinstance(challenge["days_remaining"], int)
            assert challenge["days_remaining"] >= 0
    
    def test_active_challenges_sorted_by_urgency(self):
        """Test that challenges are sorted by days_remaining ascending."""
        token = get_client_token()
        assert token, "Failed to login as client"
        
        response = requests.get(
            f"{BASE_URL}/api/brain/active-challenges",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        challenges = response.json()["active_challenges"]
        
        if len(challenges) > 1:
            for i in range(len(challenges) - 1):
                assert challenges[i]["days_remaining"] <= challenges[i + 1]["days_remaining"]


class TestBrainScoresWithChallengeFields:
    """Test that brain scores include Sprint 13 challenge fields."""
    
    def test_brain_scores_include_challenge_fields(self):
        """Test that each score has days_remaining and is_expired."""
        token = get_client_token()
        assert token, "Failed to login as client"
        
        response = requests.get(
            f"{BASE_URL}/api/brain/scores",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify summary fields
        assert "total_predictions" in data
        assert "accuracy_percentage" in data
        assert "scores" in data
        
        # Each score should have challenge fields
        for score in data["scores"]:
            assert "days_remaining" in score
            assert "is_expired" in score
            assert isinstance(score["days_remaining"], int)
            assert isinstance(score["is_expired"], bool)


class TestAdminOverviewEndpoint:
    """Test GET /api/dashboard/admin-overview endpoint."""
    
    def test_admin_overview_returns_cross_channel_stats(self):
        """Test that admin overview returns platform-wide stats."""
        token = get_admin_token()
        assert token, "Failed to login as admin"
        
        response = requests.get(
            f"{BASE_URL}/api/dashboard/admin-overview",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify admin KPIs
        assert "totalClients" in data
        assert "totalVideosManaged" in data
        assert "totalViewsManaged" in data
        assert "activeChannels" in data
        
        # All should be non-negative integers
        assert data["totalClients"] >= 0
        assert data["totalVideosManaged"] >= 0
        assert data["totalViewsManaged"] >= 0
        assert data["activeChannels"] >= 0
    
    def test_admin_overview_forbidden_for_client(self):
        """Test that client users get error from admin endpoint."""
        token = get_client_token()
        assert token, "Failed to login as client"
        
        response = requests.get(
            f"{BASE_URL}/api/dashboard/admin-overview",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Client should get error response
        assert "error" in data
        assert data["error"] == "Not authorized"


class TestClientDashboardOverview:
    """Test client dashboard shows correct greeting."""
    
    def test_client_overview_returns_client_name(self):
        """Test that dashboard overview returns clientName."""
        token = get_client_token()
        assert token, "Failed to login as client"
        
        response = requests.get(
            f"{BASE_URL}/api/dashboard/overview",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Should have client name and KPIs
        assert "clientName" in data
        assert "kpis" in data
        assert data["clientName"]  # Should not be empty


# Run tests
if __name__ == "__main__":
    pytest.main([__file__, "-v"])
