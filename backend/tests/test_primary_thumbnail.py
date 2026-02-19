"""
Test cases for Primary Thumbnail Selection feature.
Tests PATCH /api/submissions/{id}/primary-thumbnail endpoint.
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
CLIENT_EMAIL = "alex@company.com"
CLIENT_PASSWORD = "client123"

# Test submission and asset IDs from context
TEST_SUBMISSION_ID = "c00fbd4a-5f78-4f10-8cf6-c24ea68446b3"
CURRENT_PRIMARY_THUMBNAIL_ID = "d41c068c-6b78-493a-bac6-d29db99b4aed"


@pytest.fixture(scope="module")
def client_token():
    """Get authentication token for client user."""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": CLIENT_EMAIL, "password": CLIENT_PASSWORD}
    )
    assert response.status_code == 200, f"Login failed: {response.text}"
    return response.json().get("token")


@pytest.fixture(scope="module")
def auth_headers(client_token):
    """Return headers with auth token."""
    return {"Authorization": f"Bearer {client_token}"}


class TestPrimaryThumbnailEndpoint:
    """Tests for PATCH /api/submissions/{id}/primary-thumbnail endpoint."""
    
    def test_get_submission_with_thumbnails(self, auth_headers):
        """Verify the test submission exists and has thumbnails."""
        # Get submission
        response = requests.get(
            f"{BASE_URL}/api/submissions/{TEST_SUBMISSION_ID}",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Failed to get submission: {response.text}"
        submission = response.json()
        assert submission["id"] == TEST_SUBMISSION_ID
        print(f"Submission found: {submission['title']}")
        print(f"Current primaryThumbnailAssetId: {submission.get('primaryThumbnailAssetId')}")
        
        # Get assets for this submission
        assets_response = requests.get(
            f"{BASE_URL}/api/assets/library",
            headers=auth_headers
        )
        assert assets_response.status_code == 200
        all_assets = assets_response.json()
        thumbnails = [a for a in all_assets if a.get("submissionId") == TEST_SUBMISSION_ID and a.get("type") == "Thumbnail"]
        print(f"Found {len(thumbnails)} thumbnails for this submission")
        assert len(thumbnails) >= 1, "Expected at least 1 thumbnail for testing"
        
        # Store thumbnail IDs for other tests
        self.__class__.thumbnail_ids = [t["id"] for t in thumbnails]
        print(f"Thumbnail IDs: {self.__class__.thumbnail_ids}")
    
    def test_set_primary_thumbnail_success(self, auth_headers):
        """Test successfully setting a primary thumbnail."""
        # Get a thumbnail that is NOT the current primary
        thumbnails = getattr(self.__class__, 'thumbnail_ids', [])
        if not thumbnails:
            # Fetch thumbnails if not already stored
            assets_response = requests.get(
                f"{BASE_URL}/api/assets/library",
                headers=auth_headers
            )
            all_assets = assets_response.json()
            thumbnails = [a["id"] for a in all_assets if a.get("submissionId") == TEST_SUBMISSION_ID and a.get("type") == "Thumbnail"]
        
        assert len(thumbnails) >= 1, "Need at least 1 thumbnail to test"
        
        # Pick a thumbnail (preferably not the current primary)
        target_thumbnail_id = thumbnails[0]
        if len(thumbnails) > 1 and target_thumbnail_id == CURRENT_PRIMARY_THUMBNAIL_ID:
            target_thumbnail_id = thumbnails[1]
        
        print(f"Setting primary thumbnail to: {target_thumbnail_id}")
        
        # Call the endpoint
        response = requests.patch(
            f"{BASE_URL}/api/submissions/{TEST_SUBMISSION_ID}/primary-thumbnail",
            json={"assetId": target_thumbnail_id},
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Failed to set primary thumbnail: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "message" in data
        assert "submission" in data
        assert "primaryThumbnail" in data
        
        # Verify submission was updated
        assert data["submission"]["primaryThumbnailAssetId"] == target_thumbnail_id
        
        # Verify the thumbnail is marked as primary
        assert data["primaryThumbnail"]["isPrimaryThumbnail"] == True
        
        print(f"SUCCESS: Primary thumbnail set to {target_thumbnail_id}")
        
        # Store for verification test
        self.__class__.last_set_thumbnail_id = target_thumbnail_id
    
    def test_verify_primary_thumbnail_persisted(self, auth_headers):
        """Verify the primary thumbnail change was persisted in database."""
        last_set_id = getattr(self.__class__, 'last_set_thumbnail_id', None)
        if not last_set_id:
            pytest.skip("No thumbnail was set in previous test")
        
        # Get submission again
        response = requests.get(
            f"{BASE_URL}/api/submissions/{TEST_SUBMISSION_ID}",
            headers=auth_headers
        )
        assert response.status_code == 200
        submission = response.json()
        
        # Verify primaryThumbnailAssetId is persisted
        assert submission["primaryThumbnailAssetId"] == last_set_id, \
            f"Expected {last_set_id}, got {submission.get('primaryThumbnailAssetId')}"
        
        print(f"SUCCESS: Primary thumbnail {last_set_id} persisted in submission")
    
    def test_verify_thumbnail_flags_updated(self, auth_headers):
        """Verify isPrimaryThumbnail flags are correctly set on all thumbnails."""
        last_set_id = getattr(self.__class__, 'last_set_thumbnail_id', None)
        if not last_set_id:
            pytest.skip("No thumbnail was set in previous test")
        
        # Get all assets
        response = requests.get(
            f"{BASE_URL}/api/assets/library",
            headers=auth_headers
        )
        assert response.status_code == 200
        all_assets = response.json()
        
        # Filter thumbnails for this submission
        thumbnails = [a for a in all_assets if a.get("submissionId") == TEST_SUBMISSION_ID and a.get("type") == "Thumbnail"]
        
        # Verify only one thumbnail is marked as primary
        primary_count = sum(1 for t in thumbnails if t.get("isPrimaryThumbnail") == True)
        assert primary_count == 1, f"Expected exactly 1 primary thumbnail, found {primary_count}"
        
        # Verify the correct one is primary
        primary_thumbnail = next((t for t in thumbnails if t.get("isPrimaryThumbnail") == True), None)
        assert primary_thumbnail is not None
        assert primary_thumbnail["id"] == last_set_id
        
        print(f"SUCCESS: Only thumbnail {last_set_id} has isPrimaryThumbnail=True")
    
    def test_set_primary_thumbnail_invalid_asset(self, auth_headers):
        """Test setting primary thumbnail with non-existent asset ID."""
        response = requests.patch(
            f"{BASE_URL}/api/submissions/{TEST_SUBMISSION_ID}/primary-thumbnail",
            json={"assetId": "non-existent-asset-id-12345"},
            headers=auth_headers
        )
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        data = response.json()
        assert "detail" in data
        assert "not found" in data["detail"].lower()
        print(f"SUCCESS: Got expected 404 for non-existent asset")
    
    def test_set_primary_thumbnail_wrong_submission(self, auth_headers):
        """Test setting primary thumbnail with asset from different submission."""
        # Get all assets
        response = requests.get(
            f"{BASE_URL}/api/assets/library",
            headers=auth_headers
        )
        assert response.status_code == 200
        all_assets = response.json()
        
        # Find a thumbnail from a DIFFERENT submission
        other_thumbnail = next(
            (a for a in all_assets 
             if a.get("type") == "Thumbnail" 
             and a.get("submissionId") != TEST_SUBMISSION_ID
             and a.get("submissionId") is not None),
            None
        )
        
        if not other_thumbnail:
            pytest.skip("No thumbnail from different submission found for testing")
        
        print(f"Testing with thumbnail {other_thumbnail['id']} from submission {other_thumbnail['submissionId']}")
        
        response = requests.patch(
            f"{BASE_URL}/api/submissions/{TEST_SUBMISSION_ID}/primary-thumbnail",
            json={"assetId": other_thumbnail["id"]},
            headers=auth_headers
        )
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        data = response.json()
        assert "not found" in data["detail"].lower()
        print(f"SUCCESS: Got expected 404 for asset from different submission")
    
    def test_set_primary_thumbnail_non_thumbnail_asset(self, auth_headers):
        """Test setting primary thumbnail with non-thumbnail asset type."""
        # Get all assets
        response = requests.get(
            f"{BASE_URL}/api/assets/library",
            headers=auth_headers
        )
        assert response.status_code == 200
        all_assets = response.json()
        
        # Find a non-thumbnail asset for this submission
        non_thumbnail = next(
            (a for a in all_assets 
             if a.get("submissionId") == TEST_SUBMISSION_ID 
             and a.get("type") != "Thumbnail"),
            None
        )
        
        if not non_thumbnail:
            pytest.skip("No non-thumbnail asset found for this submission")
        
        print(f"Testing with {non_thumbnail['type']} asset {non_thumbnail['id']}")
        
        response = requests.patch(
            f"{BASE_URL}/api/submissions/{TEST_SUBMISSION_ID}/primary-thumbnail",
            json={"assetId": non_thumbnail["id"]},
            headers=auth_headers
        )
        
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        data = response.json()
        assert "Thumbnail" in data["detail"]
        print(f"SUCCESS: Got expected 400 for non-thumbnail asset type")
    
    def test_set_primary_thumbnail_invalid_submission(self, auth_headers):
        """Test setting primary thumbnail for non-existent submission."""
        response = requests.patch(
            f"{BASE_URL}/api/submissions/non-existent-submission-id/primary-thumbnail",
            json={"assetId": "any-asset-id"},
            headers=auth_headers
        )
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        data = response.json()
        assert "not found" in data["detail"].lower()
        print(f"SUCCESS: Got expected 404 for non-existent submission")
    
    def test_set_primary_thumbnail_missing_asset_id(self, auth_headers):
        """Test setting primary thumbnail without assetId in request body."""
        response = requests.patch(
            f"{BASE_URL}/api/submissions/{TEST_SUBMISSION_ID}/primary-thumbnail",
            json={},
            headers=auth_headers
        )
        
        # Should return 422 (validation error) for missing required field
        assert response.status_code == 422, f"Expected 422, got {response.status_code}"
        print(f"SUCCESS: Got expected 422 for missing assetId")
    
    def test_set_primary_thumbnail_unauthorized(self):
        """Test setting primary thumbnail without authentication."""
        response = requests.patch(
            f"{BASE_URL}/api/submissions/{TEST_SUBMISSION_ID}/primary-thumbnail",
            json={"assetId": "any-asset-id"}
        )
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print(f"SUCCESS: Got expected 401 for unauthorized request")


class TestPrimaryThumbnailSwitching:
    """Tests for switching between multiple thumbnails."""
    
    def test_switch_primary_thumbnail(self, auth_headers):
        """Test switching primary thumbnail between multiple thumbnails."""
        # Get all thumbnails for the submission
        response = requests.get(
            f"{BASE_URL}/api/assets/library",
            headers=auth_headers
        )
        assert response.status_code == 200
        all_assets = response.json()
        thumbnails = [a for a in all_assets if a.get("submissionId") == TEST_SUBMISSION_ID and a.get("type") == "Thumbnail"]
        
        if len(thumbnails) < 2:
            pytest.skip("Need at least 2 thumbnails to test switching")
        
        # Get current primary
        submission_response = requests.get(
            f"{BASE_URL}/api/submissions/{TEST_SUBMISSION_ID}",
            headers=auth_headers
        )
        current_primary = submission_response.json().get("primaryThumbnailAssetId")
        
        # Find a different thumbnail
        new_primary = next((t["id"] for t in thumbnails if t["id"] != current_primary), thumbnails[0]["id"])
        
        print(f"Switching from {current_primary} to {new_primary}")
        
        # Set new primary
        response = requests.patch(
            f"{BASE_URL}/api/submissions/{TEST_SUBMISSION_ID}/primary-thumbnail",
            json={"assetId": new_primary},
            headers=auth_headers
        )
        assert response.status_code == 200
        
        # Verify old primary is no longer primary
        assets_response = requests.get(
            f"{BASE_URL}/api/assets/library",
            headers=auth_headers
        )
        updated_assets = assets_response.json()
        updated_thumbnails = [a for a in updated_assets if a.get("submissionId") == TEST_SUBMISSION_ID and a.get("type") == "Thumbnail"]
        
        old_primary_asset = next((t for t in updated_thumbnails if t["id"] == current_primary), None)
        new_primary_asset = next((t for t in updated_thumbnails if t["id"] == new_primary), None)
        
        if old_primary_asset and current_primary != new_primary:
            assert old_primary_asset.get("isPrimaryThumbnail") == False, \
                f"Old primary {current_primary} should have isPrimaryThumbnail=False"
        
        assert new_primary_asset.get("isPrimaryThumbnail") == True, \
            f"New primary {new_primary} should have isPrimaryThumbnail=True"
        
        print(f"SUCCESS: Switched primary from {current_primary} to {new_primary}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
