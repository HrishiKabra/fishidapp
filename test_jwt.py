#!/usr/bin/env python3
"""
Test JWT token generation and verification
"""

import os
import jwt
from datetime import datetime, timedelta

# Test JWT configuration
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "your-super-secret-jwt-key-change-in-production")
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 168  # 7 days

def test_jwt_token():
    """Test JWT token generation and verification"""
    print("🔐 Testing JWT configuration...")
    print(f"Secret key length: {len(JWT_SECRET_KEY)}")
    print(f"Secret key preview: {JWT_SECRET_KEY[:20]}...")
    print(f"Algorithm: {JWT_ALGORITHM}")
    print(f"Expiration hours: {JWT_EXPIRATION_HOURS}")
    
    # Test data
    user_id = "test_user_123"
    email = "test@example.com"
    
    # Generate token
    payload = {
        "user_id": user_id,
        "email": email,
        "exp": datetime.utcnow() + timedelta(hours=JWT_EXPIRATION_HOURS),
        "iat": datetime.utcnow()
    }
    
    try:
        token = jwt.encode(payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)
        print(f"✅ Token generated successfully")
        print(f"Token length: {len(token)}")
        print(f"Token preview: {token[:50]}...")
        
        # Verify token
        decoded = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        print(f"✅ Token verified successfully")
        print(f"Decoded payload: {decoded}")
        
        return True
        
    except Exception as e:
        print(f"❌ JWT test failed: {e}")
        return False

if __name__ == "__main__":
    success = test_jwt_token()
    if success:
        print("🎉 JWT configuration is working correctly!")
    else:
        print("💥 JWT configuration has issues!") 