#!/usr/bin/env python3

import requests
import sys
import json
from datetime import datetime

class ForgeVoiceAPITester:
    def __init__(self, base_url="https://forgevoice-studio.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.admin_token = None
        self.client_token = None
        self.sample_submission_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []

    def run_test(self, name, method, endpoint, expected_status, data=None, token=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        if token:
            headers['Authorization'] = f'Bearer {token}'

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=30)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=30)
            elif method == 'PATCH':
                response = requests.patch(url, json=data, headers=headers, timeout=30)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=30)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=30)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    return True, response.json()
                except:
                    return True, {}
            else:
                self.failed_tests.append({
                    'name': name,
                    'expected': expected_status,
                    'actual': response.status_code,
                    'response': response.text[:200]
                })
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                print(f"   Response: {response.text[:200]}")
                return False, {}

        except Exception as e:
            self.failed_tests.append({
                'name': name,
                'error': str(e)
            })
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_auth_endpoints(self):
        """Test authentication endpoints"""
        print("\n" + "="*50)
        print("TESTING AUTHENTICATION ENDPOINTS")
        print("="*50)
        
        # Test admin login
        success, response = self.run_test(
            "Admin Login",
            "POST",
            "auth/login",
            200,
            data={"email": "admin@forgevoice.com", "password": "admin123"}
        )
        if success and 'token' in response:
            self.admin_token = response['token']
            print(f"   Admin user: {response.get('user', {}).get('name', 'Unknown')}")
            print(f"   Role: {response.get('user', {}).get('role', 'Unknown')}")
        
        # Test client login
        success, response = self.run_test(
            "Client Login",
            "POST",
            "auth/login",
            200,
            data={"email": "alex@company.com", "password": "client123"}
        )
        if success and 'token' in response:
            self.client_token = response['token']
            print(f"   Client user: {response.get('user', {}).get('name', 'Unknown')}")
            print(f"   Role: {response.get('user', {}).get('role', 'Unknown')}")
        
        # Test invalid login
        self.run_test(
            "Invalid Login",
            "POST",
            "auth/login",
            401,
            data={"email": "invalid@example.com", "password": "wrongpass"}
        )
        
        # Test signup
        timestamp = datetime.now().strftime("%H%M%S")
        self.run_test(
            "User Signup",
            "POST",
            "auth/signup",
            200,
            data={
                "email": f"test{timestamp}@example.com",
                "password": "TestPass123!",
                "name": "Test User",
                "role": "client"
            }
        )
        
        # Test /auth/me with admin token
        if self.admin_token:
            self.run_test(
                "Get Current User (Admin)",
                "GET",
                "auth/me",
                200,
                token=self.admin_token
            )
        
        # Test /auth/me with client token
        if self.client_token:
            self.run_test(
                "Get Current User (Client)",
                "GET",
                "auth/me",
                200,
                token=self.client_token
            )
        
        # Test /auth/me without token
        self.run_test(
            "Get Current User (No Token)",
            "GET",
            "auth/me",
            401
        )

    def test_dashboard_endpoints(self):
        """Test dashboard and data endpoints"""
        print("\n" + "="*50)
        print("TESTING DASHBOARD ENDPOINTS")
        print("="*50)
        
        # Test dashboard stats with admin token
        if self.admin_token:
            success, stats = self.run_test(
                "Dashboard Stats (Admin)",
                "GET",
                "dashboard/stats",
                200,
                token=self.admin_token
            )
            if success:
                print(f"   Total Submissions: {stats.get('totalSubmissions', 0)}")
                print(f"   Total Assets: {stats.get('totalAssets', 0)}")
        
        # Test dashboard stats with client token
        if self.client_token:
            self.run_test(
                "Dashboard Stats (Client)",
                "GET",
                "dashboard/stats",
                200,
                token=self.client_token
            )
        
        # Test dashboard overview with client token
        if self.client_token:
            success, overview = self.run_test(
                "Dashboard Overview (Client)",
                "GET",
                "dashboard/overview",
                200,
                token=self.client_token
            )
            if success:
                print(f"   Client Name: {overview.get('clientName', 'N/A')}")
                kpis = overview.get('kpis', {})
                print(f"   Active Projects: {kpis.get('activeProjects', 0)}")
                print(f"   Published 30d: {kpis.get('publishedLast30d', 0)}")
                print(f"   Total Assets: {kpis.get('totalAssets', 0)}")
                print(f"   ROI 30d: ${kpis.get('roiLast30d', 0)}")
                pipeline = overview.get('pipeline', {})
                print(f"   Pipeline columns: {list(pipeline.keys())}")
                for status, items in pipeline.items():
                    print(f"     {status}: {len(items)} items")
        
        # Test dashboard overview with admin token
        if self.admin_token:
            success, overview = self.run_test(
                "Dashboard Overview (Admin)",
                "GET",
                "dashboard/overview",
                200,
                token=self.admin_token
            )
            if success:
                print(f"   Admin overview successful")
        
        # Test submissions with client token
        if self.client_token:
            success, submissions = self.run_test(
                "Get Submissions (Client)",
                "GET",
                "submissions",
                200,
                token=self.client_token
            )
            if success and submissions:
                self.sample_submission_id = submissions[0].get('id') if submissions else None
                print(f"   Found {len(submissions)} submissions")
        
        # Test assets with client token
        if self.client_token:
            self.run_test(
                "Get Assets (Client)",
                "GET",
                "assets",
                200,
                token=self.client_token
            )
        
        # Test analytics with client token
        if self.client_token:
            self.run_test(
                "Get Analytics (Client)",
                "GET",
                "analytics",
                200,
                token=self.client_token
            )

    def test_status_update_endpoints(self):
        """Test submission status update functionality"""
        print("\n" + "="*50)
        print("TESTING STATUS UPDATE ENDPOINTS")
        print("="*50)
        
        if not self.client_token or not self.sample_submission_id:
            print("⚠️  Skipping status update tests - no token or sample submission")
            return
        
        # Test valid status update
        valid_statuses = ["INTAKE", "EDITING", "DESIGN", "SCHEDULED", "PUBLISHED"]
        for status in valid_statuses[:2]:  # Test first 2 to avoid changing too much data
            self.run_test(
                f"Update Status to {status}",
                "PATCH",
                f"submissions/{self.sample_submission_id}/status",
                200,
                data={"status": status},
                token=self.client_token
            )
        
        # Test invalid status update
        self.run_test(
            "Update Status (Invalid)",
            "PATCH",
            f"submissions/{self.sample_submission_id}/status",
            400,
            data={"status": "INVALID_STATUS"},
            token=self.client_token
        )
        
        # Test status update without token
        self.run_test(
            "Update Status (No Token)",
            "PATCH",
            f"submissions/{self.sample_submission_id}/status",
            401,
            data={"status": "EDITING"}
        )
        
        # Test status update with invalid submission ID
        self.run_test(
            "Update Status (Invalid ID)",
            "PATCH",
            "submissions/invalid-id/status",
            404,
            data={"status": "EDITING"},
            token=self.client_token
        )
    def test_admin_endpoints(self):
        """Test admin-only endpoints"""
        print("\n" + "="*50)
        print("TESTING ADMIN ENDPOINTS")
        print("="*50)
        
        # Test clients endpoint with admin token (should work)
        if self.admin_token:
            success, clients = self.run_test(
                "Get Clients (Admin)",
                "GET",
                "clients",
                200,
                token=self.admin_token
            )
            if success:
                print(f"   Found {len(clients)} clients")
        
        # Test clients endpoint with client token (should fail)
        if self.client_token:
            self.run_test(
                "Get Clients (Client - Should Fail)",
                "GET",
                "clients",
                403,
                token=self.client_token
            )
        
        # Test clients endpoint without token (should fail)
        self.run_test(
            "Get Clients (No Token - Should Fail)",
            "GET",
            "clients",
            401
        )

    def test_status_update_endpoints(self):
        """Test submission status update functionality"""
        print("\n" + "="*50)
        print("TESTING STATUS UPDATE ENDPOINTS")
        print("="*50)
        
        if not self.client_token or not self.sample_submission_id:
            print("⚠️  Skipping status update tests - no token or sample submission")
            return
        
        # Test valid status update
        valid_statuses = ["INTAKE", "EDITING", "DESIGN", "SCHEDULED", "PUBLISHED"]
        for status in valid_statuses[:2]:  # Test first 2 to avoid changing too much data
            self.run_test(
                f"Update Status to {status}",
                "PATCH",
                f"submissions/{self.sample_submission_id}/status",
                200,
                data={"status": status},
                token=self.client_token
            )
        
        # Test invalid status update
        self.run_test(
            "Update Status (Invalid)",
            "PATCH",
            f"submissions/{self.sample_submission_id}/status",
            400,
            data={"status": "INVALID_STATUS"},
            token=self.client_token
        )
        
        # Test status update without token
        self.run_test(
            "Update Status (No Token)",
            "PATCH",
            f"submissions/{self.sample_submission_id}/status",
            401,
            data={"status": "EDITING"}
        )
        
        # Test status update with invalid submission ID
        self.run_test(
            "Update Status (Invalid ID)",
            "PATCH",
            "submissions/invalid-id/status",
            404,
            data={"status": "EDITING"},
            token=self.client_token
        )
        """Test other available endpoints"""
        print("\n" + "="*50)
        print("TESTING OTHER ENDPOINTS")
        print("="*50)
        
        endpoints_to_test = [
            ("billing", "Get Billing"),
            ("client-settings", "Get Client Settings"),
            ("video-tasks", "Get Video Tasks"),
            ("help-articles", "Get Help Articles"),
            ("support-requests", "Get Support Requests")
        ]
        
        for endpoint, name in endpoints_to_test:
            if self.client_token:
                self.run_test(
                    f"{name} (Client)",
                    "GET",
                    endpoint,
                    200,
                    token=self.client_token
                )

    def print_summary(self):
        """Print test summary"""
        print("\n" + "="*60)
        print("TEST SUMMARY")
        print("="*60)
        print(f"Total tests run: {self.tests_run}")
        print(f"Tests passed: {self.tests_passed}")
        print(f"Tests failed: {len(self.failed_tests)}")
        print(f"Success rate: {(self.tests_passed/self.tests_run*100):.1f}%")
        
        if self.failed_tests:
            print(f"\n❌ FAILED TESTS ({len(self.failed_tests)}):")
            for i, test in enumerate(self.failed_tests, 1):
                print(f"{i}. {test['name']}")
                if 'error' in test:
                    print(f"   Error: {test['error']}")
                elif 'expected' in test:
                    print(f"   Expected: {test['expected']}, Got: {test['actual']}")
                    if test['response']:
                        print(f"   Response: {test['response']}")
        
        return self.tests_passed == self.tests_run

def main():
    """Main test function"""
    print("🚀 Starting ForgeVoice Studio API Tests")
    print("🌐 Testing against: https://forgevoice-studio.preview.emergentagent.com")
    
    tester = ForgeVoiceAPITester()
    
    # Run all test suites
    tester.test_auth_endpoints()
    tester.test_dashboard_endpoints()
    tester.test_admin_endpoints()
    tester.test_other_endpoints()
    
    # Print summary and return exit code
    success = tester.print_summary()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())