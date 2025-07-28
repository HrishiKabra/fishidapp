#!/usr/bin/env python3
"""
Test auth endpoints directly
"""

import requests
import json

def test_auth_endpoints():
    print("🧪 Testing Auth Endpoints")
    print("=" * 50)
    
    # Test data
    test_user = {
        "email": "test@example.com",
        "username": "testuser",
        "password": "SecurePass123!"
    }
    
    login_data = {
        "email": "test@example.com",
        "password": "SecurePass123!"
    }
    
    # Test registration
    print("\n1. Testing registration...")
    try:
        response = requests.post("http://localhost:5001/api/auth/register", 
                               json=test_user, 
                               headers={"Content-Type": "application/json"})
        print(f"   Status: {response.status_code}")
        print(f"   Response: {response.text[:200]}")
        
        if response.status_code == 201:
            print("   ✅ Registration successful")
            token = response.json().get('token')
        else:
            print("   ❌ Registration failed")
            return
    except Exception as e:
        print(f"   ❌ Registration error: {e}")
        return
    
    # Test login
    print("\n2. Testing login...")
    try:
        response = requests.post("http://localhost:5001/api/auth/login", 
                               json=login_data, 
                               headers={"Content-Type": "application/json"})
        print(f"   Status: {response.status_code}")
        print(f"   Response: {response.text[:200]}")
        
        if response.status_code == 200:
            print("   ✅ Login successful")
        else:
            print("   ❌ Login failed")
    except Exception as e:
        print(f"   ❌ Login error: {e}")
    
    # Test token verification
    if token:
        print("\n3. Testing token verification...")
        try:
            response = requests.post("http://localhost:5001/api/auth/verify", 
                                   json={"token": token}, 
                                   headers={"Content-Type": "application/json"})
            print(f"   Status: {response.status_code}")
            print(f"   Response: {response.text[:200]}")
            
            if response.status_code == 200:
                print("   ✅ Token verification successful")
            else:
                print("   ❌ Token verification failed")
        except Exception as e:
            print(f"   ❌ Token verification error: {e}")
    
    print("\n✅ Auth endpoint tests completed!")

if __name__ == "__main__":
    test_auth_endpoints() 