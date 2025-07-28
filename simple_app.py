#!/usr/bin/env python3
"""
Simplified Flask app for testing authentication endpoints only
"""

import os
import json
from datetime import datetime
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

# Import our auth system
from auth_system import auth_system

# ---------------------------------------------------------------
load_dotenv()
app = Flask(__name__)
app.secret_key = os.getenv("SECRET_KEY", "fishid-dev")

# Enable CORS for all routes
CORS(app, 
     origins=["http://localhost:3000", "https://fishid-landing.vercel.app", "https://fishid.vercel.app"],
     methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
     allow_headers=["Content-Type", "Authorization", "X-Requested-With"],
     supports_credentials=True)

# Add CORS headers to all responses
@app.after_request
def after_request(response):
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
    response.headers.add('Access-Control-Allow-Credentials', 'true')
    return response

# Health check endpoint
@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({
        'status': 'healthy',
        'message': 'FishID Flask backend is running',
        'timestamp': datetime.utcnow().isoformat()
    })

# Root endpoint
@app.route('/', methods=['GET'])
def root():
    return jsonify({
        'message': 'FishID API Backend - JSON Only',
        'version': '1.0.0',
        'type': 'API',
        'frontend': 'https://fishid-landing.vercel.app',
        'endpoints': {
            'health': '/health',
            'auth': {
                'register': '/api/auth/register',
                'login': '/api/auth/login',
                'verify': '/api/auth/verify',
                'logout': '/api/auth/logout'
            }
        }
    })

# Authentication routes
@app.route('/api/auth/register', methods=['POST'])
def register():
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({
                'success': False,
                'error': 'No data provided'
            }), 400
        
        email = data.get('email', '').strip().lower()
        username = data.get('username', data.get('name', '')).strip()  # Support both 'username' and 'name'
        password = data.get('password', '')
        
        # Validate required fields
        if not email or not username or not password:
            return jsonify({
                'success': False,
                'error': 'Email, username, and password are required'
            }), 400
        
        # Register user with secure authentication system
        success, message, result = auth_system.register_user(email, username, password)
        
        if success:
            return jsonify({
                'success': True,
                'message': message,
                'token': result['token'],
                'user': {
                    'id': result['user']['id'],
                    'email': result['user']['email'],
                    'username': result['user']['username'],
                    'name': result['user']['username']  # Include 'name' for frontend compatibility
                }
            }), 201
        else:
            return jsonify({
                'success': False,
                'error': message
            }), 400
            
    except Exception as e:
        return jsonify({
            'success': False,
            'error': 'Registration failed',
            'details': str(e)
        }), 500

@app.route('/api/auth/login', methods=['POST'])
def login():
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({
                'success': False,
                'error': 'No data provided'
            }), 400
        
        email = data.get('email', '').strip().lower()
        password = data.get('password', '')
        
        # Validate required fields
        if not email or not password:
            return jsonify({
                'success': False,
                'error': 'Email and password are required'
            }), 400
        
        # Get client IP for security monitoring
        ip_address = request.remote_addr
        
        # Login user with secure authentication system
        success, message, result = auth_system.login_user(email, password, ip_address)
        
        if success:
            return jsonify({
                'success': True,
                'message': message,
                'token': result['token'],
                'user': {
                    'id': result['user']['id'],
                    'email': result['user']['email'],
                    'username': result['user']['username'],
                    'name': result['user']['username']  # Include 'name' for frontend compatibility
                }
            }), 200
        else:
            return jsonify({
                'success': False,
                'error': message
            }), 401
            
    except Exception as e:
        return jsonify({
            'success': False,
            'error': 'Login failed',
            'details': str(e)
        }), 500

@app.route('/api/auth/verify', methods=['POST'])
def verify_token():
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({
                'success': False,
                'error': 'No data provided'
            }), 400
        
        token = data.get('token')
        
        if not token:
            return jsonify({
                'success': False,
                'error': 'Token is required'
            }), 400
        
        # Verify token with secure authentication system
        success, message, result = auth_system.verify_token(token)
        
        if success:
            return jsonify({
                'success': True,
                'valid': True,
                'message': message,
                'user': result['user']
            }), 200
        else:
            return jsonify({
                'success': False,
                'valid': False,
                'error': message
            }), 401
            
    except Exception as e:
        return jsonify({
            'success': False,
            'error': 'Token verification failed',
            'details': str(e)
        }), 500

@app.route('/api/auth/logout', methods=['POST'])
def logout():
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({
                'success': False,
                'error': 'No data provided'
            }), 400
        
        token = data.get('token')
        
        if not token:
            return jsonify({
                'success': False,
                'error': 'Token is required'
            }), 400
        
        # Logout user with secure authentication system
        success, message = auth_system.logout_user(token)
        
        if success:
            return jsonify({
                'success': True,
                'message': message
            }), 200
        else:
            return jsonify({
                'success': False,
                'error': message
            }), 400
            
    except Exception as e:
        return jsonify({
            'success': False,
            'error': 'Logout failed',
            'details': str(e)
        }), 500

# Mock fish endpoints for testing
@app.route('/api/fish/identify', methods=['POST'])
def identify_fish():
    return jsonify({
        'success': True,
        'result': {
            'id': 'test_identification',
            'scientific_name': 'Test Fish',
            'common_name': 'Test Fish',
            'confidence': 95
        }
    }), 200

@app.route('/api/fish/history', methods=['GET'])
def get_fish_history():
    return jsonify({
        'success': True,
        'history': []
    }), 200

@app.route('/api/fish/save', methods=['POST'])
def save_to_log():
    return jsonify({
        'success': True,
        'message': 'Fish saved to log successfully'
    }), 200

if __name__ == "__main__":
    port = int(os.environ.get('PORT', 5001))
    print(f"🚀 Starting simplified Flask app on port {port}")
    print(f"🔗 Health check: http://localhost:{port}/health")
    print(f"📝 Register: http://localhost:{port}/api/auth/register")
    print(f"🔐 Login: http://localhost:{port}/api/auth/login")
    app.run(debug=True, host='0.0.0.0', port=port) 