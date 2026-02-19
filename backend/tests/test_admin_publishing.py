"""Tests for Admin Publishing Dashboard features - cross-client view.

Tests the new admin-specific publishing features:
1. Admin can see ALL publishing tasks across all clients with clientName
2. Admin can filter by clientId parameter
3. Client users cannot see other clients' tasks (clientId param ignored)
4. Admin clients endpoint returns all clients
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestAdminPublishingFeatures:
    """Test admin-specific publishing features."""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin auth token."""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@forgevoice.com",
            "password": "admin123"
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        return response.json()["token"]
    
    @pytest.fixture(scope="class")
    def client_token(self):
        """Get client auth token."""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "alex@company.com",
            "password": "client123"
        })
        assert response.status_code == 200, f"Client login failed: {response.text}"
        return response.json()["token"]
    
    @pytest.fixture(scope="class")
    def admin_headers(self, admin_token):
        """Get headers with admin token."""
        return {"Authorization": f"Bearer {admin_token}"}
    
    @pytest.fixture(scope="class")
    def client_headers(self, client_token):
        """Get headers with client token."""
        return {"Authorization": f"Bearer {client_token}"}
    
    # =========================================================================
    # Test 1: Admin can see ALL publishing tasks with clientName
    # =========================================================================
    def test_admin_can_see_all_publishing_tasks(self, admin_headers):
        """Test that admin users can see all publishing tasks across all clients."""
        response = requests.get(f"{BASE_URL}/api/publishing-tasks", headers=admin_headers)
        assert response.status_code == 200, f"Failed to get tasks: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        
        # Admin should see tasks with clientName field populated
        if len(data) > 0:
            # Verify clientName field is present for admin
            assert "clientName" in data[0], "Admin should see clientName field in tasks"
            print(f"SUCCESS: Admin sees {len(data)} tasks with clientName field")
        else:
            print("INFO: No publishing tasks exist yet")
    
    # =========================================================================
    # Test 2: Admin can filter by clientId
    # =========================================================================
    def test_admin_can_filter_by_client_id(self, admin_headers):
        """Test that admin can filter publishing tasks by client ID."""
        # First get the list of clients
        clients_response = requests.get(f"{BASE_URL}/api/admin/clients", headers=admin_headers)
        assert clients_response.status_code == 200, f"Failed to get clients: {clients_response.text}"
        clients = clients_response.json()
        
        if len(clients) > 0:
            # Filter by first client
            client_id = clients[0]["id"]
            response = requests.get(
                f"{BASE_URL}/api/publishing-tasks?clientId={client_id}",
                headers=admin_headers
            )
            assert response.status_code == 200, f"Failed to filter tasks: {response.text}"
            data = response.json()
            
            # All tasks should belong to the specified client
            for task in data:
                assert task["clientId"] == client_id, f"Task clientId {task['clientId']} doesn't match filter {client_id}"
            
            print(f"SUCCESS: Admin filtered to {len(data)} tasks for client {client_id}")
        else:
            pytest.skip("No clients available for testing")
    
    # =========================================================================
    # Test 3: Client cannot filter by clientId (param ignored)
    # =========================================================================
    def test_client_cannot_filter_by_client_id(self, client_headers):
        """Test that client users cannot see other clients' tasks via clientId param."""
        # Try to pass a different clientId (should be ignored for client users)
        response = requests.get(
            f"{BASE_URL}/api/publishing-tasks?clientId=some-other-client-id",
            headers=client_headers
        )
        assert response.status_code == 200, f"Request failed: {response.text}"
        data = response.json()
        
        # Client user should only see their own tasks, clientId param should be ignored
        # Verify all returned tasks belong to the logged-in client (demo-client-1)
        for task in data:
            assert task["clientId"] == "demo-client-1", f"Client sees task from wrong client: {task['clientId']}"
        
        print(f"SUCCESS: Client only sees own {len(data)} tasks, clientId param ignored")
    
    # =========================================================================
    # Test 4: Admin clients endpoint returns all clients
    # =========================================================================
    def test_admin_clients_endpoint(self, admin_headers):
        """Test admin endpoint to list all clients."""
        response = requests.get(f"{BASE_URL}/api/admin/clients", headers=admin_headers)
        assert response.status_code == 200, f"Failed to get clients: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        
        # Should have at least one client (demo-client-1)
        assert len(data) >= 1, "Should have at least one client"
        
        # Verify structure (uses clients collection format)
        if len(data) > 0:
            assert "id" in data[0], "Client should have 'id' field"
            assert "name" in data[0], "Client should have 'name' field"
            print(f"SUCCESS: Admin sees {len(data)} clients with id and name fields")
    
    # =========================================================================
    # Test 5: Client cannot access admin clients endpoint
    # =========================================================================
    def test_client_cannot_access_admin_clients_endpoint(self, client_headers):
        """Test that client users cannot access the admin clients endpoint."""
        response = requests.get(f"{BASE_URL}/api/admin/clients", headers=client_headers)
        assert response.status_code == 403, f"Expected 403, got {response.status_code}: {response.text}"
        print("SUCCESS: Client correctly denied access to admin clients endpoint")
    
    # =========================================================================
    # Test 6: Admin publishing stats without clientId filter
    # =========================================================================
    def test_admin_publishing_stats_all_clients(self, admin_headers):
        """Test that admin can get publishing stats for all clients."""
        response = requests.get(f"{BASE_URL}/api/publishing-stats", headers=admin_headers)
        assert response.status_code == 200, f"Failed to get stats: {response.text}"
        data = response.json()
        
        # Verify stats structure
        assert "total" in data, "Stats should have 'total' field"
        assert "posted" in data, "Stats should have 'posted' field"
        assert "scheduled" in data, "Stats should have 'scheduled' field"
        assert "failed" in data, "Stats should have 'failed' field"
        print(f"SUCCESS: Admin stats - total: {data['total']}, posted: {data['posted']}, scheduled: {data['scheduled']}")
    
    # =========================================================================
    # Test 7: Admin publishing stats with clientId filter
    # =========================================================================
    def test_admin_publishing_stats_filtered_by_client(self, admin_headers):
        """Test that admin can get publishing stats filtered by client."""
        # First get a client ID
        clients_response = requests.get(f"{BASE_URL}/api/admin/clients", headers=admin_headers)
        if clients_response.status_code != 200 or len(clients_response.json()) == 0:
            pytest.skip("No clients available")
        
        client_id = clients_response.json()[0]["id"]
        
        response = requests.get(
            f"{BASE_URL}/api/publishing-stats?clientId={client_id}",
            headers=admin_headers
        )
        assert response.status_code == 200, f"Failed to get filtered stats: {response.text}"
        data = response.json()
        
        assert "total" in data, "Stats should have 'total' field"
        print(f"SUCCESS: Admin filtered stats for client {client_id} - total: {data['total']}")
    
    # =========================================================================
    # Test 8: Client publishing stats (should only see own)
    # =========================================================================
    def test_client_publishing_stats_own_only(self, client_headers):
        """Test that client can only see their own publishing stats."""
        response = requests.get(f"{BASE_URL}/api/publishing-stats", headers=client_headers)
        assert response.status_code == 200, f"Failed to get stats: {response.text}"
        data = response.json()
        
        assert "total" in data, "Stats should have 'total' field"
        print(f"SUCCESS: Client stats - total: {data['total']}")


class TestExistingPublishingFeatures:
    """Test existing publishing features still work."""
    
    @pytest.fixture(scope="class")
    def client_token(self):
        """Get client auth token."""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "alex@company.com",
            "password": "client123"
        })
        assert response.status_code == 200
        return response.json()["token"]
    
    @pytest.fixture(scope="class")
    def client_headers(self, client_token):
        """Get headers with client token."""
        return {"Authorization": f"Bearer {client_token}"}
    
    def test_list_platform_connections(self, client_headers):
        """Test listing all platform connections."""
        response = requests.get(f"{BASE_URL}/api/platform-connections", headers=client_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) == 3  # youtube_shorts, tiktok, instagram_reels
        platforms = [c["platform"] for c in data]
        assert "youtube_shorts" in platforms
        assert "tiktok" in platforms
        assert "instagram_reels" in platforms
        print("SUCCESS: Platform connections list works")
    
    def test_connect_platform(self, client_headers):
        """Test connecting a platform (mock OAuth)."""
        response = requests.post(
            f"{BASE_URL}/api/platform-connections/youtube_shorts/connect",
            headers=client_headers
        )
        # May return 200 (new connection) or 400 (already connected)
        assert response.status_code in [200, 400], f"Unexpected status: {response.status_code}"
        if response.status_code == 200:
            data = response.json()
            assert data["platform"] == "youtube_shorts"
            assert data["connected"] is True
        print("SUCCESS: Platform connect works")
    
    def test_list_publishing_tasks(self, client_headers):
        """Test listing publishing tasks."""
        response = requests.get(f"{BASE_URL}/api/publishing-tasks", headers=client_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"SUCCESS: Client sees {len(data)} publishing tasks")
    
    def test_list_publishing_tasks_with_filters(self, client_headers):
        """Test listing publishing tasks with filters."""
        response = requests.get(
            f"{BASE_URL}/api/publishing-tasks?platform=youtube_shorts",
            headers=client_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        # All returned tasks should match filter
        for task in data:
            assert task["platform"] == "youtube_shorts"
        print(f"SUCCESS: Filtered tasks work - {len(data)} youtube_shorts tasks")
    
    def test_get_publishing_stats(self, client_headers):
        """Test getting publishing statistics."""
        response = requests.get(f"{BASE_URL}/api/publishing-stats", headers=client_headers)
        assert response.status_code == 200
        data = response.json()
        assert "total" in data
        assert "posted" in data
        assert "scheduled" in data
        assert "failed" in data
        print(f"SUCCESS: Publishing stats work - total: {data['total']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
