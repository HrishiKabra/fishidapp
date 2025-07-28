#!/usr/bin/env python3
"""
Test script to check API endpoints and debug 400 errors
"""

import requests
import json

# Base URL - adjust this to your actual backend URL
BASE_URL = "http://localhost:5001"  # Change this to your actual backend URL

def test_endpoint(method, endpoint, data=None, headers=None):
    """Test an API endpoint"""
    url = f"{BASE_URL}{endpoint}"
    
    try:
        if method == "GET":
            response = requests.get(url, headers=headers)
        elif method == "POST":
            if headers is None:
                headers = {"Content-Type": "application/json"}
            response = requests.post(url, json=data, headers=headers)
        
        print(f"\n{method} {endpoint}")
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text[:200]}...")
        
        return response.status_code, response.json() if response.text else None
        
    except Exception as e:
        print(f"Error testing {method} {endpoint}: {e}")
        return None, None

def main():
    print("🧪 Testing API Endpoints")
    print("=" * 50)
    
    # Test 1: Health check
    test_endpoint("GET", "/health")
    
    # Test 2: Register with valid data
    register_data = {
        "email": "test@example.com",
        "username": "testuser",
        "password": "SecurePass123!"
    }
    test_endpoint("POST", "/api/auth/register", register_data)
    
    # Test 3: Register with missing data
    test_endpoint("POST", "/api/auth/register", {})
    
    # Test 4: Register with partial data
    test_endpoint("POST", "/api/auth/register", {"email": "test@example.com"})
    
    # Test 5: Login with valid data
    login_data = {
        "email": "test@example.com",
        "password": "SecurePass123!"
    }
    test_endpoint("POST", "/api/auth/login", login_data)
    
    # Test 6: Login with missing data
    test_endpoint("POST", "/api/auth/login", {})
    
    # Test 7: Verify token with missing data
    test_endpoint("POST", "/api/auth/verify", {})
    
    print("\n✅ API endpoint tests completed!")

if __name__ == "__main__":
    main() 