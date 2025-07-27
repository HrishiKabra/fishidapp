# app.py – Fishial-powered API Backend for Next.js Frontend
import os
import json
from io import BytesIO
from pathlib import Path
from datetime import datetime
from flask import Flask, request, jsonify
from flask_cors import CORS
from PIL import Image
from dotenv import load_dotenv

from fishid_client import predict          # wrapper you already have
from fish_meta.fish_meta import get as meta_for  # enriched facts

# ---------------------------------------------------------------
load_dotenv()                               # loads Fishial + Groq keys
app = Flask(__name__)
app.secret_key = os.getenv("SECRET_KEY", "fishid-dev")

# Enable CORS for all routes with more permissive settings
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

ALLOWED_EXT = {"jpg","jpeg","png","gif","bmp","webp","tiff","heic"}
def _ext_ok(name): return "." in name and name.rsplit(".",1)[1].lower() in ALLOWED_EXT

# ---------------------------------------------------------------

# Health check endpoint
@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({
        'status': 'healthy',
        'message': 'FishID Flask backend is running',
        'timestamp': datetime.utcnow().isoformat()
    })

# Root endpoint - API only
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
            },
            'fish': {
                'identify': '/api/fish/identify',
                'history': '/api/fish/history',
                'save': '/api/fish/save'
            }
        }
    })

# Authentication routes
@app.route('/api/auth/register', methods=['POST'])
def register():
    try:
        data = request.get_json()
        # TODO: Implement user registration logic
        # For now, return a mock response
        return jsonify({
            'success': True,
            'message': 'User registered successfully',
            'user': {
                'id': 'user_123',
                'email': data.get('email', ''),
                'username': data.get('username', '')
            }
        }), 201
    except Exception as e:
        return jsonify({
            'success': False,
            'error': 'Registration failed',
            'details': str(e)
        }), 400

@app.route('/api/auth/login', methods=['POST'])
def login():
    try:
        data = request.get_json()
        # TODO: Implement user login logic
        # For now, return a mock response
        return jsonify({
            'success': True,
            'message': 'Login successful',
            'token': 'mock_jwt_token_123',
            'user': {
                'id': 'user_123',
                'email': data.get('email', ''),
                'username': data.get('username', '')
            }
        }), 200
    except Exception as e:
        return jsonify({
            'success': False,
            'error': 'Login failed',
            'details': str(e)
        }), 401

@app.route('/api/auth/verify', methods=['POST'])
def verify_token():
    try:
        data = request.get_json()
        token = data.get('token')
        # TODO: Implement JWT token verification
        # For now, return a mock response
        return jsonify({
            'success': True,
            'valid': True,
            'user': {
                'id': 'user_123',
                'email': 'user@example.com'
            }
        }), 200
    except Exception as e:
        return jsonify({
            'success': False,
            'error': 'Token verification failed',
            'details': str(e)
        }), 401

@app.route('/api/auth/logout', methods=['POST'])
def logout():
    try:
        # TODO: Implement logout logic (invalidate token, etc.)
        return jsonify({
            'success': True,
            'message': 'Logout successful'
        }), 200
    except Exception as e:
        return jsonify({
            'success': False,
            'error': 'Logout failed',
            'details': str(e)
        }), 400

# Fish identification routes
@app.route('/api/fish/identify', methods=['POST'])
def identify_fish():
    try:
        if 'image' not in request.files:
            return jsonify({
                'success': False,
                'error': 'No image file provided'
            }), 400

        file = request.files['image']
        if file.filename == '':
            return jsonify({
                'success': False,
                'error': 'No image file selected'
            }), 400

        if not _ext_ok(file.filename):
            return jsonify({
                'success': False,
                'error': 'Unsupported file type'
            }), 400

        # Read and validate image
        raw = file.read()
        try:
            Image.open(BytesIO(raw)).verify()
        except Exception:
            return jsonify({
                'success': False,
                'error': 'Could not read image'
            }), 400

        # Predict using Fishial AI
        try:
            out = predict(raw)  # {'species': str, 'prob': float}
        except Exception as e:
            return jsonify({
                'success': False,
                'error': f'Prediction error: {e}'
            }), 500

        scientific = out["species"]
        confidence = int(out["prob"] * 100)
        meta = meta_for(scientific)

        # Format response for frontend
        result = {
            'id': f'identification_{datetime.utcnow().timestamp()}',
            'scientific_name': scientific,
            'common_name': meta.get('common_name', ''),
            'confidence': confidence,
            'description': meta.get('description', ''),
            'habitat': meta.get('habitat', ''),
            'distribution': meta.get('distribution', ''),
            'max_length_cm': meta.get('max_length_cm', ''),
            'conservation_status': meta.get('conservation_status', ''),
            'fun_facts': meta.get('fun_facts', ''),
            'reference_image': meta.get('reference_image', '')
        }

        return jsonify({
            'success': True,
            'result': result
        }), 200

    except Exception as e:
        return jsonify({
            'success': False,
            'error': 'Identification failed',
            'details': str(e)
        }), 500

@app.route('/api/fish/history', methods=['GET'])
def get_fish_history():
    try:
        # TODO: Implement user-specific fish history
        # For now, return mock data
        return jsonify({
            'success': True,
            'history': [
                {
                    'id': 'hist_1',
                    'scientific_name': 'Paracanthurus hepatus',
                    'common_name': 'Blue Tang',
                    'confidence': 92,
                    'timestamp': datetime.utcnow().isoformat(),
                    'image_url': 'https://example.com/image1.jpg'
                }
            ]
        }), 200
    except Exception as e:
        return jsonify({
            'success': False,
            'error': 'Failed to fetch history',
            'details': str(e)
        }), 500

@app.route('/api/fish/save', methods=['POST'])
def save_to_log():
    try:
        data = request.get_json()
        # TODO: Implement save to user's fish log
        return jsonify({
            'success': True,
            'message': 'Fish saved to log successfully',
            'saved_id': data.get('identification_id')
        }), 200
    except Exception as e:
        return jsonify({
            'success': False,
            'error': 'Failed to save to log',
            'details': str(e)
        }), 500

if __name__ == "__main__":
    port = int(os.environ.get('PORT', 5000))
    app.run(debug=False, host='0.0.0.0', port=port)
