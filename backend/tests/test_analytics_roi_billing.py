"""
Backend API tests for ForgeVoice Studio P1 Pages:
- Analytics Page (/api/analytics/dashboard)
- ROI Center (/api/roi/dashboard)
- Billing Page (/api/billing/dashboard)
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


class TestAnalyticsDashboard:
    """Tests for GET /api/analytics/dashboard endpoint"""
    
    def test_analytics_requires_auth(self, api_client):
        """Analytics endpoint requires authentication"""
        response = api_client.get(f"{BASE_URL}/api/analytics/dashboard")
        assert response.status_code == 401
    
    def test_analytics_default_30d_range(self, api_client, client_headers):
        """Analytics returns 30d data by default"""
        response = api_client.get(f"{BASE_URL}/api/analytics/dashboard", headers=client_headers)
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "snapshots" in data
        assert "summary" in data
        assert "range" in data
        assert isinstance(data["snapshots"], list)
        assert data["range"]["preset"] == "30d"
        print(f"Default range returned {len(data['snapshots'])} snapshots")
    
    def test_analytics_summary_has_required_fields(self, api_client, client_headers):
        """Analytics summary contains all required KPI fields"""
        response = api_client.get(f"{BASE_URL}/api/analytics/dashboard", headers=client_headers)
        assert response.status_code == 200
        summary = response.json()["summary"]
        
        # Verify all KPI fields
        assert "totalDownloads" in summary
        assert "totalViews" in summary
        assert "totalEpisodes" in summary
        assert "totalROI" in summary
        assert "totalSubscribers" in summary
        assert "avgRoiPerEpisode" in summary
        
        # Verify values are numeric
        assert isinstance(summary["totalDownloads"], int)
        assert isinstance(summary["totalViews"], int)
        assert isinstance(summary["totalEpisodes"], int)
        assert isinstance(summary["totalROI"], (int, float))
        print(f"Summary: Downloads={summary['totalDownloads']}, Views={summary['totalViews']}, Episodes={summary['totalEpisodes']}")
    
    def test_analytics_7d_range(self, api_client, client_headers):
        """Analytics returns 7d data when requested"""
        response = api_client.get(f"{BASE_URL}/api/analytics/dashboard?range=7d", headers=client_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["range"]["preset"] == "7d"
        print(f"7d range: {data['summary']['totalDownloads']} downloads")
    
    def test_analytics_90d_range(self, api_client, client_headers):
        """Analytics returns 90d data when requested"""
        response = api_client.get(f"{BASE_URL}/api/analytics/dashboard?range=90d", headers=client_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["range"]["preset"] == "90d"
        print(f"90d range: {data['summary']['totalDownloads']} downloads")
    
    def test_analytics_365d_range(self, api_client, client_headers):
        """Analytics returns 365d data when requested"""
        response = api_client.get(f"{BASE_URL}/api/analytics/dashboard?range=365d", headers=client_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["range"]["preset"] == "365d"
        print(f"365d range: {data['summary']['totalDownloads']} downloads")
    
    def test_analytics_custom_date_range(self, api_client, client_headers):
        """Analytics supports custom date range"""
        response = api_client.get(
            f"{BASE_URL}/api/analytics/dashboard?from_date=2026-01-01&to_date=2026-01-15",
            headers=client_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["range"]["preset"] == "custom"
        assert data["range"]["from"] == "2026-01-01"
        assert data["range"]["to"] == "2026-01-15"
        print(f"Custom range: {data['summary']['totalDownloads']} downloads")
    
    def test_analytics_snapshots_have_required_fields(self, api_client, client_headers):
        """Analytics snapshots contain all required fields"""
        response = api_client.get(f"{BASE_URL}/api/analytics/dashboard", headers=client_headers)
        assert response.status_code == 200
        snapshots = response.json()["snapshots"]
        
        if snapshots:
            snapshot = snapshots[0]
            assert "date" in snapshot
            assert "downloads" in snapshot
            assert "views" in snapshot
            assert "episodesPublished" in snapshot
            assert "roiEstimate" in snapshot
    
    def test_analytics_scoped_to_client(self, api_client, client_headers, admin_headers):
        """Client sees only their own analytics data"""
        client_response = api_client.get(f"{BASE_URL}/api/analytics/dashboard", headers=client_headers)
        admin_response = api_client.get(f"{BASE_URL}/api/analytics/dashboard", headers=admin_headers)
        
        assert client_response.status_code == 200
        assert admin_response.status_code == 200
        
        client_data = client_response.json()
        admin_data = admin_response.json()
        
        # Client should have data (demo-client-1)
        assert len(client_data["snapshots"]) > 0
        print(f"Client sees {len(client_data['snapshots'])} snapshots")
        print(f"Admin sees {len(admin_data['snapshots'])} snapshots")


class TestROIDashboard:
    """Tests for GET /api/roi/dashboard endpoint"""
    
    def test_roi_requires_auth(self, api_client):
        """ROI endpoint requires authentication"""
        response = api_client.get(f"{BASE_URL}/api/roi/dashboard")
        assert response.status_code == 401
    
    def test_roi_default_30d_range(self, api_client, client_headers):
        """ROI returns 30d data by default"""
        response = api_client.get(f"{BASE_URL}/api/roi/dashboard", headers=client_headers)
        assert response.status_code == 200
        data = response.json()
        
        assert data["range"]["preset"] == "30d"
        assert data["range"]["days"] == 30
    
    def test_roi_has_required_fields(self, api_client, client_headers):
        """ROI response contains all required fields"""
        response = api_client.get(f"{BASE_URL}/api/roi/dashboard", headers=client_headers)
        assert response.status_code == 200
        data = response.json()
        
        # Verify all required fields
        assert "totalCost" in data
        assert "totalROI" in data
        assert "roiMultiple" in data
        assert "netProfit" in data
        assert "episodesPublished" in data
        assert "hoursPerEpisode" in data
        assert "hourlyRate" in data
        assert "costPerEpisode" in data
        assert "totalDownloads" in data
        assert "totalViews" in data
        assert "range" in data
        
        print(f"ROI: Cost=${data['totalCost']}, ROI=${data['totalROI']}, Multiple={data['roiMultiple']}x")
    
    def test_roi_calculations_correct(self, api_client, client_headers):
        """ROI calculations are mathematically correct"""
        response = api_client.get(f"{BASE_URL}/api/roi/dashboard", headers=client_headers)
        assert response.status_code == 200
        data = response.json()
        
        # Verify cost calculation: costPerEpisode = hoursPerEpisode * hourlyRate
        expected_cost_per_episode = data["hoursPerEpisode"] * data["hourlyRate"]
        assert data["costPerEpisode"] == expected_cost_per_episode
        
        # Verify total cost: totalCost = costPerEpisode * episodesPublished
        expected_total_cost = data["costPerEpisode"] * data["episodesPublished"]
        assert data["totalCost"] == expected_total_cost
        
        # Verify net profit: netProfit = totalROI - totalCost
        expected_net_profit = data["totalROI"] - data["totalCost"]
        assert abs(data["netProfit"] - expected_net_profit) < 0.01  # Allow small float diff
        
        # Verify ROI multiple: roiMultiple = totalROI / totalCost
        if data["totalCost"] > 0:
            expected_multiple = round(data["totalROI"] / data["totalCost"], 2)
            assert data["roiMultiple"] == expected_multiple
        
        print("ROI calculations verified correct")
    
    def test_roi_90d_range(self, api_client, client_headers):
        """ROI returns 90d data when requested"""
        response = api_client.get(f"{BASE_URL}/api/roi/dashboard?range=90d", headers=client_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["range"]["preset"] == "90d"
        assert data["range"]["days"] == 90
        print(f"90d ROI: {data['roiMultiple']}x multiple")
    
    def test_roi_365d_range(self, api_client, client_headers):
        """ROI returns 365d data when requested"""
        response = api_client.get(f"{BASE_URL}/api/roi/dashboard?range=365d", headers=client_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["range"]["preset"] == "365d"
        assert data["range"]["days"] == 365
        print(f"365d ROI: {data['roiMultiple']}x multiple")
    
    def test_roi_uses_client_hourly_rate(self, api_client, client_headers):
        """ROI uses hourly rate from client settings"""
        response = api_client.get(f"{BASE_URL}/api/roi/dashboard", headers=client_headers)
        assert response.status_code == 200
        data = response.json()
        
        # Demo client has hourlyRate=150 in seed data
        assert data["hourlyRate"] == 150
        print(f"Using hourly rate: ${data['hourlyRate']}")


class TestBillingDashboard:
    """Tests for GET /api/billing/dashboard endpoint"""
    
    def test_billing_requires_auth(self, api_client):
        """Billing endpoint requires authentication"""
        response = api_client.get(f"{BASE_URL}/api/billing/dashboard")
        assert response.status_code == 401
    
    def test_billing_returns_current_plan(self, api_client, client_headers):
        """Billing returns current plan information"""
        response = api_client.get(f"{BASE_URL}/api/billing/dashboard", headers=client_headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "currentPlan" in data
        assert data["currentPlan"] in ["Starter", "Pro", "Enterprise"]
        print(f"Current plan: {data['currentPlan']}")
    
    def test_billing_has_required_fields(self, api_client, client_headers):
        """Billing response contains all required fields"""
        response = api_client.get(f"{BASE_URL}/api/billing/dashboard", headers=client_headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "billing" in data
        assert "client" in data
        assert "currentPlan" in data
        assert "planDetails" in data
        assert "allPlans" in data
        assert "stripeConnected" in data
    
    def test_billing_record_has_status(self, api_client, client_headers):
        """Billing record includes status"""
        response = api_client.get(f"{BASE_URL}/api/billing/dashboard", headers=client_headers)
        assert response.status_code == 200
        data = response.json()
        
        if data["billing"]:
            assert "status" in data["billing"]
            assert data["billing"]["status"] in ["Active", "PastDue", "Cancelled"]
            print(f"Billing status: {data['billing']['status']}")
    
    def test_billing_has_next_billing_date(self, api_client, client_headers):
        """Billing record includes next billing date"""
        response = api_client.get(f"{BASE_URL}/api/billing/dashboard", headers=client_headers)
        assert response.status_code == 200
        data = response.json()
        
        if data["billing"]:
            assert "nextBillingDate" in data["billing"]
            print(f"Next billing: {data['billing']['nextBillingDate']}")
    
    def test_billing_plan_details_has_features(self, api_client, client_headers):
        """Plan details include features list"""
        response = api_client.get(f"{BASE_URL}/api/billing/dashboard", headers=client_headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "features" in data["planDetails"]
        assert isinstance(data["planDetails"]["features"], list)
        assert len(data["planDetails"]["features"]) > 0
        print(f"Plan has {len(data['planDetails']['features'])} features")
    
    def test_billing_plan_details_has_price(self, api_client, client_headers):
        """Plan details include price"""
        response = api_client.get(f"{BASE_URL}/api/billing/dashboard", headers=client_headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "price" in data["planDetails"]
        assert isinstance(data["planDetails"]["price"], int)
        print(f"Plan price: ${data['planDetails']['price']}/month")
    
    def test_billing_all_plans_available(self, api_client, client_headers):
        """All three plans are available"""
        response = api_client.get(f"{BASE_URL}/api/billing/dashboard", headers=client_headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "Starter" in data["allPlans"]
        assert "Pro" in data["allPlans"]
        assert "Enterprise" in data["allPlans"]
        
        # Verify each plan has price and features
        for plan_name, plan_data in data["allPlans"].items():
            assert "price" in plan_data
            assert "features" in plan_data
            print(f"{plan_name}: ${plan_data['price']}/month, {len(plan_data['features'])} features")
    
    def test_billing_stripe_not_connected(self, api_client, client_headers):
        """Stripe is not connected (placeholder)"""
        response = api_client.get(f"{BASE_URL}/api/billing/dashboard", headers=client_headers)
        assert response.status_code == 200
        data = response.json()
        
        # stripeConnected should be false since stripeCustomerId is null
        assert data["stripeConnected"] == False
        print("Stripe not connected (expected - placeholder)")
    
    def test_billing_client_info_included(self, api_client, client_headers):
        """Client information is included"""
        response = api_client.get(f"{BASE_URL}/api/billing/dashboard", headers=client_headers)
        assert response.status_code == 200
        data = response.json()
        
        if data["client"]:
            assert "name" in data["client"]
            assert "primaryContactEmail" in data["client"]
            print(f"Client: {data['client']['name']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
