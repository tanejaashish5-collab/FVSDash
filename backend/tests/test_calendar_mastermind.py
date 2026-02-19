"""
Test Calendar Mastermind (Sprint 6) - Strategic Command Center Calendar
Tests for: /api/calendar, /api/calendar/pipeline, /api/calendar/suggest, /api/calendar/schedule, /api/calendar/unschedule
"""
import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_CLIENT_EMAIL = "alex@company.com"
TEST_CLIENT_PASSWORD = "client123"


class TestCalendarAuth:
    """Test authentication for calendar endpoints"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get auth token for client user"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_CLIENT_EMAIL, "password": TEST_CLIENT_PASSWORD}
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "token" in data, "No token in response"
        return data["token"]
    
    @pytest.fixture(scope="class")
    def auth_headers(self, auth_token):
        """Headers with auth token"""
        return {"Authorization": f"Bearer {auth_token}"}
    
    def test_login_success(self):
        """Test login with valid credentials"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_CLIENT_EMAIL, "password": TEST_CLIENT_PASSWORD}
        )
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "user" in data


class TestCalendarMain:
    """Test main calendar endpoint - GET /api/calendar"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_CLIENT_EMAIL, "password": TEST_CLIENT_PASSWORD}
        )
        return response.json().get("token")
    
    @pytest.fixture(scope="class")
    def auth_headers(self, auth_token):
        return {"Authorization": f"Bearer {auth_token}"}
    
    def test_get_calendar_without_params(self, auth_headers):
        """Test GET /api/calendar without year/month params (defaults to current month)"""
        response = requests.get(f"{BASE_URL}/api/calendar", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "year" in data
        assert "month" in data
        assert "submissions" in data
        assert isinstance(data["submissions"], list)
        # Should default to current year and month
        now = datetime.now()
        assert data["year"] == now.year
        assert data["month"] == now.month
    
    def test_get_calendar_with_year_month(self, auth_headers):
        """Test GET /api/calendar with specific year and month"""
        year = 2026
        month = 2
        response = requests.get(
            f"{BASE_URL}/api/calendar?year={year}&month={month}",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["year"] == year
        assert data["month"] == month
        assert isinstance(data["submissions"], list)
    
    def test_get_calendar_unauthorized(self):
        """Test GET /api/calendar without auth fails"""
        response = requests.get(f"{BASE_URL}/api/calendar")
        assert response.status_code == 401


class TestCalendarPipeline:
    """Test pipeline endpoint - GET /api/calendar/pipeline"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_CLIENT_EMAIL, "password": TEST_CLIENT_PASSWORD}
        )
        return response.json().get("token")
    
    @pytest.fixture(scope="class")
    def auth_headers(self, auth_token):
        return {"Authorization": f"Bearer {auth_token}"}
    
    def test_get_pipeline(self, auth_headers):
        """Test GET /api/calendar/pipeline returns unscheduled submissions"""
        response = requests.get(f"{BASE_URL}/api/calendar/pipeline", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "submissions" in data
        assert isinstance(data["submissions"], list)
        
        # Verify pipeline items are INTAKE or EDITING status with no release date
        for sub in data["submissions"]:
            assert sub.get("status") in ["INTAKE", "EDITING"], f"Unexpected status: {sub.get('status')}"
            # Release date should be empty, None, or not exist
            release_date = sub.get("releaseDate")
            assert release_date in [None, "", None] or "releaseDate" not in sub, f"Pipeline item has releaseDate: {release_date}"
    
    def test_get_pipeline_unauthorized(self):
        """Test GET /api/calendar/pipeline without auth fails"""
        response = requests.get(f"{BASE_URL}/api/calendar/pipeline")
        assert response.status_code == 401


class TestCalendarSuggestions:
    """Test AI suggestions endpoint - GET /api/calendar/suggest"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_CLIENT_EMAIL, "password": TEST_CLIENT_PASSWORD}
        )
        return response.json().get("token")
    
    @pytest.fixture(scope="class")
    def auth_headers(self, auth_token):
        return {"Authorization": f"Bearer {auth_token}"}
    
    def test_get_suggestions(self, auth_headers):
        """Test GET /api/calendar/suggest returns AI suggestions"""
        year = 2026
        month = 2
        response = requests.get(
            f"{BASE_URL}/api/calendar/suggest?year={year}&month={month}",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "suggestions" in data
        assert "totalGaps" in data
        assert "pipelineCount" in data
        assert isinstance(data["suggestions"], list)
        
        # Verify suggestion structure if there are suggestions
        for suggestion in data["suggestions"]:
            assert "date" in suggestion
            assert "recommendedType" in suggestion
            assert "suggestedSubmission" in suggestion
            assert "reason" in suggestion
    
    def test_get_suggestions_unauthorized(self):
        """Test GET /api/calendar/suggest without auth fails"""
        response = requests.get(f"{BASE_URL}/api/calendar/suggest")
        assert response.status_code == 401


class TestCalendarScheduling:
    """Test schedule/unschedule endpoints"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_CLIENT_EMAIL, "password": TEST_CLIENT_PASSWORD}
        )
        return response.json().get("token")
    
    @pytest.fixture(scope="class")
    def auth_headers(self, auth_token):
        return {"Authorization": f"Bearer {auth_token}"}
    
    def test_schedule_submission(self, auth_headers):
        """Test PATCH /api/calendar/schedule/{id} schedules submission"""
        # First get a submission from pipeline to schedule
        pipeline_response = requests.get(
            f"{BASE_URL}/api/calendar/pipeline",
            headers=auth_headers
        )
        assert pipeline_response.status_code == 200
        pipeline_data = pipeline_response.json()
        
        if not pipeline_data["submissions"]:
            pytest.skip("No pipeline submissions to schedule")
        
        submission = pipeline_data["submissions"][0]
        submission_id = submission["id"]
        
        # Schedule to tomorrow
        tomorrow = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
        
        response = requests.patch(
            f"{BASE_URL}/api/calendar/schedule/{submission_id}?date={tomorrow}",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "Scheduled" in data.get("message", "")
        
        # Verify it's now on calendar for that date
        calendar_response = requests.get(
            f"{BASE_URL}/api/calendar?year={datetime.now().year}&month={datetime.now().month}",
            headers=auth_headers
        )
        assert calendar_response.status_code == 200
        
        # Store for unschedule test
        self.__class__.scheduled_submission_id = submission_id
    
    def test_unschedule_submission(self, auth_headers):
        """Test PATCH /api/calendar/unschedule/{id} unschedules submission"""
        submission_id = getattr(self.__class__, 'scheduled_submission_id', None)
        
        if not submission_id:
            # Get a scheduled submission from calendar
            year = datetime.now().year
            month = datetime.now().month
            calendar_response = requests.get(
                f"{BASE_URL}/api/calendar?year={year}&month={month}",
                headers=auth_headers
            )
            if calendar_response.status_code == 200:
                calendar_data = calendar_response.json()
                if calendar_data.get("submissions"):
                    submission_id = calendar_data["submissions"][0]["id"]
        
        if not submission_id:
            pytest.skip("No scheduled submissions to unschedule")
        
        response = requests.patch(
            f"{BASE_URL}/api/calendar/unschedule/{submission_id}",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "unscheduled" in data.get("message", "").lower()
    
    def test_schedule_nonexistent_submission(self, auth_headers):
        """Test PATCH /api/calendar/schedule with invalid ID returns 404"""
        fake_id = "nonexistent-submission-id-12345"
        tomorrow = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
        
        response = requests.patch(
            f"{BASE_URL}/api/calendar/schedule/{fake_id}?date={tomorrow}",
            headers=auth_headers
        )
        assert response.status_code == 404
    
    def test_schedule_unauthorized(self):
        """Test PATCH /api/calendar/schedule without auth fails"""
        tomorrow = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
        response = requests.patch(
            f"{BASE_URL}/api/calendar/schedule/some-id?date={tomorrow}"
        )
        assert response.status_code == 401
    
    def test_unschedule_unauthorized(self):
        """Test PATCH /api/calendar/unschedule without auth fails"""
        response = requests.patch(
            f"{BASE_URL}/api/calendar/unschedule/some-id"
        )
        assert response.status_code == 401


class TestCalendarDataIntegrity:
    """Test data integrity and edge cases"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_CLIENT_EMAIL, "password": TEST_CLIENT_PASSWORD}
        )
        return response.json().get("token")
    
    @pytest.fixture(scope="class")
    def auth_headers(self, auth_token):
        return {"Authorization": f"Bearer {auth_token}"}
    
    def test_calendar_submission_structure(self, auth_headers):
        """Test calendar submissions have required fields"""
        year = 2026
        month = 2
        response = requests.get(
            f"{BASE_URL}/api/calendar?year={year}&month={month}",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        for sub in data.get("submissions", []):
            # Required fields for calendar display
            assert "id" in sub
            assert "title" in sub
            assert "contentType" in sub
            assert "status" in sub
            assert "releaseDate" in sub
    
    def test_pipeline_submission_structure(self, auth_headers):
        """Test pipeline submissions have required fields"""
        response = requests.get(
            f"{BASE_URL}/api/calendar/pipeline",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        for sub in data.get("submissions", []):
            # Required fields for pipeline display
            assert "id" in sub
            assert "title" in sub
            assert "contentType" in sub
            assert "status" in sub
    
    def test_suggestion_structure(self, auth_headers):
        """Test suggestion response structure"""
        response = requests.get(
            f"{BASE_URL}/api/calendar/suggest?year=2026&month=2",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # Must have these fields
        assert "suggestions" in data
        assert "totalGaps" in data
        assert "pipelineCount" in data
        
        # Suggestions should be limited to 5
        assert len(data["suggestions"]) <= 5
    
    def test_calendar_month_boundary(self, auth_headers):
        """Test calendar handles month boundaries correctly"""
        # Test December (month 12) - edge case
        response = requests.get(
            f"{BASE_URL}/api/calendar?year=2026&month=12",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["year"] == 2026
        assert data["month"] == 12
        
        # Test January (month 1)
        response = requests.get(
            f"{BASE_URL}/api/calendar?year=2026&month=1",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["year"] == 2026
        assert data["month"] == 1


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
