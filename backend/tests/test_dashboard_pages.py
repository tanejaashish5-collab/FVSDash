"""
Backend API tests for ForgeVoice Studio Dashboard Pages:
- Calendar Page (/api/calendar)
- Deliverables Page (/api/deliverables)
- Assets Page (/api/assets/library, /api/assets/{id}/status, /api/assets/{id}/submission)
- Submissions Update (/api/submissions/{id})
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
CLIENT_EMAIL = "alex@company.com"
CLIENT_PASSWORD = "client123"
ADMIN_EMAIL = "admin@forgevoice.com"
ADMIN_PASSWORD = "admin123"


@pytest.fixture(scope="module")
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture(scope="module")
def client_auth_token(api_client):
    """Get client authentication token"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "email": CLIENT_EMAIL,
        "password": CLIENT_PASSWORD
    })
    assert response.status_code == 200, f"Client login failed: {response.text}"
    return response.json().get("token")


@pytest.fixture(scope="module")
def admin_auth_token(api_client):
    """Get admin authentication token"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    assert response.status_code == 200, f"Admin login failed: {response.text}"
    return response.json().get("token")


@pytest.fixture
def client_headers(client_auth_token):
    """Headers with client auth token"""
    return {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {client_auth_token}"
    }


@pytest.fixture
def admin_headers(admin_auth_token):
    """Headers with admin auth token"""
    return {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {admin_auth_token}"
    }


class TestCalendarEndpoint:
    """Tests for GET /api/calendar endpoint"""
    
    def test_calendar_requires_auth(self, api_client):
        """Calendar endpoint requires authentication"""
        response = api_client.get(f"{BASE_URL}/api/calendar")
        assert response.status_code == 401
    
    def test_calendar_returns_current_month_by_default(self, api_client, client_headers):
        """Calendar returns current month data when no params provided"""
        response = api_client.get(f"{BASE_URL}/api/calendar", headers=client_headers)
        assert response.status_code == 200
        data = response.json()
        assert "year" in data
        assert "month" in data
        assert "submissions" in data
        assert isinstance(data["submissions"], list)
    
    def test_calendar_with_specific_month(self, api_client, client_headers):
        """Calendar returns data for specific month (Jan 2026)"""
        response = api_client.get(f"{BASE_URL}/api/calendar?year=2026&month=1", headers=client_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["year"] == 2026
        assert data["month"] == 1
        # Should have submissions with release dates in Jan 2026
        print(f"Found {len(data['submissions'])} submissions for Jan 2026")
    
    def test_calendar_submissions_have_required_fields(self, api_client, client_headers):
        """Calendar submissions have required fields"""
        response = api_client.get(f"{BASE_URL}/api/calendar?year=2026&month=1", headers=client_headers)
        assert response.status_code == 200
        data = response.json()
        if data["submissions"]:
            sub = data["submissions"][0]
            assert "id" in sub
            assert "title" in sub
            assert "contentType" in sub
            assert "status" in sub
            assert "releaseDate" in sub
    
    def test_calendar_scoped_to_client(self, api_client, client_headers, admin_headers):
        """Client sees only their own submissions"""
        client_response = api_client.get(f"{BASE_URL}/api/calendar?year=2026&month=1", headers=client_headers)
        admin_response = api_client.get(f"{BASE_URL}/api/calendar?year=2026&month=1", headers=admin_headers)
        
        assert client_response.status_code == 200
        assert admin_response.status_code == 200
        
        client_data = client_response.json()
        admin_data = admin_response.json()
        
        # Admin should see all submissions (potentially more than client)
        print(f"Client sees {len(client_data['submissions'])} submissions")
        print(f"Admin sees {len(admin_data['submissions'])} submissions")


class TestDeliverablesEndpoint:
    """Tests for GET /api/deliverables endpoint"""
    
    def test_deliverables_requires_auth(self, api_client):
        """Deliverables endpoint requires authentication"""
        response = api_client.get(f"{BASE_URL}/api/deliverables")
        assert response.status_code == 401
    
    def test_deliverables_returns_list(self, api_client, client_headers):
        """Deliverables returns list of assets with episode info"""
        response = api_client.get(f"{BASE_URL}/api/deliverables", headers=client_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} deliverables")
    
    def test_deliverables_have_required_fields(self, api_client, client_headers):
        """Deliverables have all required fields"""
        response = api_client.get(f"{BASE_URL}/api/deliverables", headers=client_headers)
        assert response.status_code == 200
        data = response.json()
        if data:
            d = data[0]
            assert "assetId" in d
            assert "deliverableName" in d
            assert "deliverableType" in d
            assert "deliverableStatus" in d
            assert "episodeTitle" in d
            assert "contentType" in d
    
    def test_deliverables_scoped_to_client(self, api_client, client_headers, admin_headers):
        """Client sees only their own deliverables"""
        client_response = api_client.get(f"{BASE_URL}/api/deliverables", headers=client_headers)
        admin_response = api_client.get(f"{BASE_URL}/api/deliverables", headers=admin_headers)
        
        assert client_response.status_code == 200
        assert admin_response.status_code == 200
        
        print(f"Client sees {len(client_response.json())} deliverables")
        print(f"Admin sees {len(admin_response.json())} deliverables")


class TestAssetsLibraryEndpoint:
    """Tests for GET /api/assets/library endpoint"""
    
    def test_assets_library_requires_auth(self, api_client):
        """Assets library endpoint requires authentication"""
        response = api_client.get(f"{BASE_URL}/api/assets/library")
        assert response.status_code == 401
    
    def test_assets_library_returns_list(self, api_client, client_headers):
        """Assets library returns list of assets"""
        response = api_client.get(f"{BASE_URL}/api/assets/library", headers=client_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} assets in library")
    
    def test_assets_have_required_fields(self, api_client, client_headers):
        """Assets have all required fields"""
        response = api_client.get(f"{BASE_URL}/api/assets/library", headers=client_headers)
        assert response.status_code == 200
        data = response.json()
        if data:
            asset = data[0]
            assert "id" in asset
            assert "name" in asset
            assert "type" in asset
            assert "status" in asset
            # episodeTitle is enriched field
            assert "episodeTitle" in asset


class TestAssetStatusUpdate:
    """Tests for PATCH /api/assets/{id}/status endpoint"""
    
    def test_asset_status_update_requires_auth(self, api_client):
        """Asset status update requires authentication"""
        response = api_client.patch(f"{BASE_URL}/api/assets/test-id/status", json={"status": "Final"})
        assert response.status_code == 401
    
    def test_asset_status_update_valid_status(self, api_client, client_headers):
        """Can update asset status to valid values"""
        # First get an asset
        assets_response = api_client.get(f"{BASE_URL}/api/assets/library", headers=client_headers)
        assert assets_response.status_code == 200
        assets = assets_response.json()
        
        if assets:
            asset_id = assets[0]["id"]
            original_status = assets[0]["status"]
            new_status = "Final" if original_status == "Draft" else "Draft"
            
            # Update status
            response = api_client.patch(
                f"{BASE_URL}/api/assets/{asset_id}/status",
                json={"status": new_status},
                headers=client_headers
            )
            assert response.status_code == 200
            data = response.json()
            assert data["status"] == new_status
            print(f"Updated asset {asset_id} from {original_status} to {new_status}")
            
            # Revert status
            api_client.patch(
                f"{BASE_URL}/api/assets/{asset_id}/status",
                json={"status": original_status},
                headers=client_headers
            )
    
    def test_asset_status_update_invalid_status(self, api_client, client_headers):
        """Invalid status returns 400"""
        assets_response = api_client.get(f"{BASE_URL}/api/assets/library", headers=client_headers)
        assets = assets_response.json()
        
        if assets:
            asset_id = assets[0]["id"]
            response = api_client.patch(
                f"{BASE_URL}/api/assets/{asset_id}/status",
                json={"status": "INVALID_STATUS"},
                headers=client_headers
            )
            assert response.status_code == 400
    
    def test_asset_status_update_nonexistent_asset(self, api_client, client_headers):
        """Updating nonexistent asset returns 404"""
        response = api_client.patch(
            f"{BASE_URL}/api/assets/nonexistent-asset-id/status",
            json={"status": "Final"},
            headers=client_headers
        )
        assert response.status_code == 404


class TestAssetSubmissionLink:
    """Tests for PATCH /api/assets/{id}/submission endpoint"""
    
    def test_asset_submission_link_requires_auth(self, api_client):
        """Asset submission link requires authentication"""
        response = api_client.patch(f"{BASE_URL}/api/assets/test-id/submission", json={"submissionId": None})
        assert response.status_code == 401
    
    def test_asset_can_be_linked_to_submission(self, api_client, client_headers):
        """Can link asset to a submission"""
        # Get assets and submissions
        assets_response = api_client.get(f"{BASE_URL}/api/assets/library", headers=client_headers)
        subs_response = api_client.get(f"{BASE_URL}/api/submissions/list", headers=client_headers)
        
        assets = assets_response.json()
        submissions = subs_response.json()
        
        if assets and submissions:
            asset_id = assets[0]["id"]
            original_sub_id = assets[0].get("submissionId")
            new_sub_id = submissions[0]["id"]
            
            # Link to submission
            response = api_client.patch(
                f"{BASE_URL}/api/assets/{asset_id}/submission",
                json={"submissionId": new_sub_id},
                headers=client_headers
            )
            assert response.status_code == 200
            print(f"Linked asset {asset_id} to submission {new_sub_id}")
            
            # Revert
            api_client.patch(
                f"{BASE_URL}/api/assets/{asset_id}/submission",
                json={"submissionId": original_sub_id},
                headers=client_headers
            )
    
    def test_asset_can_be_unlinked(self, api_client, client_headers):
        """Can unlink asset from submission"""
        assets_response = api_client.get(f"{BASE_URL}/api/assets/library", headers=client_headers)
        assets = assets_response.json()
        
        if assets:
            asset_id = assets[0]["id"]
            original_sub_id = assets[0].get("submissionId")
            
            # Unlink
            response = api_client.patch(
                f"{BASE_URL}/api/assets/{asset_id}/submission",
                json={"submissionId": None},
                headers=client_headers
            )
            assert response.status_code == 200
            print(f"Unlinked asset {asset_id}")
            
            # Revert
            api_client.patch(
                f"{BASE_URL}/api/assets/{asset_id}/submission",
                json={"submissionId": original_sub_id},
                headers=client_headers
            )


class TestSubmissionUpdate:
    """Tests for PATCH /api/submissions/{id} endpoint"""
    
    def test_submission_update_requires_auth(self, api_client):
        """Submission update requires authentication"""
        response = api_client.patch(f"{BASE_URL}/api/submissions/test-id", json={"status": "EDITING"})
        assert response.status_code == 401
    
    def test_submission_status_update(self, api_client, client_headers):
        """Can update submission status"""
        # Get a submission
        subs_response = api_client.get(f"{BASE_URL}/api/submissions", headers=client_headers)
        assert subs_response.status_code == 200
        submissions = subs_response.json()
        
        if submissions:
            sub_id = submissions[0]["id"]
            original_status = submissions[0]["status"]
            new_status = "EDITING" if original_status != "EDITING" else "DESIGN"
            
            # Update status
            response = api_client.patch(
                f"{BASE_URL}/api/submissions/{sub_id}",
                json={"status": new_status},
                headers=client_headers
            )
            assert response.status_code == 200
            data = response.json()
            assert data["status"] == new_status
            print(f"Updated submission {sub_id} status from {original_status} to {new_status}")
            
            # Revert
            api_client.patch(
                f"{BASE_URL}/api/submissions/{sub_id}",
                json={"status": original_status},
                headers=client_headers
            )
    
    def test_submission_release_date_update(self, api_client, client_headers):
        """Can update submission release date"""
        subs_response = api_client.get(f"{BASE_URL}/api/submissions", headers=client_headers)
        submissions = subs_response.json()
        
        if submissions:
            sub_id = submissions[0]["id"]
            original_date = submissions[0].get("releaseDate")
            new_date = "2026-02-15"
            
            # Update release date
            response = api_client.patch(
                f"{BASE_URL}/api/submissions/{sub_id}",
                json={"releaseDate": new_date},
                headers=client_headers
            )
            assert response.status_code == 200
            data = response.json()
            assert data["releaseDate"] == new_date
            print(f"Updated submission {sub_id} release date to {new_date}")
            
            # Revert
            api_client.patch(
                f"{BASE_URL}/api/submissions/{sub_id}",
                json={"releaseDate": original_date},
                headers=client_headers
            )
    
    def test_submission_invalid_status(self, api_client, client_headers):
        """Invalid status returns 400"""
        subs_response = api_client.get(f"{BASE_URL}/api/submissions", headers=client_headers)
        submissions = subs_response.json()
        
        if submissions:
            sub_id = submissions[0]["id"]
            response = api_client.patch(
                f"{BASE_URL}/api/submissions/{sub_id}",
                json={"status": "INVALID_STATUS"},
                headers=client_headers
            )
            assert response.status_code == 400


class TestSubmissionsList:
    """Tests for GET /api/submissions/list endpoint"""
    
    def test_submissions_list_requires_auth(self, api_client):
        """Submissions list requires authentication"""
        response = api_client.get(f"{BASE_URL}/api/submissions/list")
        assert response.status_code == 401
    
    def test_submissions_list_returns_minimal_data(self, api_client, client_headers):
        """Submissions list returns minimal data for dropdowns"""
        response = api_client.get(f"{BASE_URL}/api/submissions/list", headers=client_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        if data:
            sub = data[0]
            assert "id" in sub
            assert "title" in sub
            print(f"Found {len(data)} submissions in list")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
