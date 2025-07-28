#!/usr/bin/env python3
"""
Simple test to check JWT configuration in deployed environment
"""

import os
import requests
import json

def test_deployed_auth():
    """Test the deployed authentication endpoints"""
    
    base_url = "https://fishidapp.onrender.com"
    
    print("🔐 Testing deployed authentication...")
    
    # Test 1: Health check
    try:
        response = requests.get(f"{base_url}/health", timeout=10)
        print(f"✅ Health check: {response.status_code}")
        if response.status_code == 200:
            print(f"📊 Response: {response.json()}")
    except Exception as e:
        print(f"❌ Health check failed: {e}")
    
    # Test 2: Register a test user
    test_email = f"test_{int(time.time())}@example.com"
    test_password = "SecurePass123!"
    test_username = f"testuser_{int(time.time())}"
    
    try:
        response = requests.post(f"{base_url}/api/auth/register", 
                               json={
                                   "email": test_email,
                                   "password": test_password,
                                   "username": test_username
                               }, timeout=10)
        print(f"✅ Registration: {response.status_code}")
        if response.status_code == 201:
            data = response.json()
            print(f"📊 User created: {data.get('user', {}).get('email')}")
            token = data.get('token')
            if token:
                print(f"🔑 Token received: {token[:20]}...")
                
                # Test 3: Verify token
                try:
                    verify_response = requests.post(f"{base_url}/api/auth/verify",
                                                 json={"token": token}, timeout=10)
                    print(f"✅ Token verification: {verify_response.status_code}")
                    if verify_response.status_code == 200:
                        print("🎉 JWT authentication is working!")
                    else:
                        print(f"❌ Token verification failed: {verify_response.json()}")
                except Exception as e:
                    print(f"❌ Token verification error: {e}")
        else:
            print(f"❌ Registration failed: {response.json()}")
    except Exception as e:
        print(f"❌ Registration error: {e}")

if __name__ == "__main__":
    import time
    test_deployed_auth() 