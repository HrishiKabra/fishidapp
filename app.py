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
import sqlite3

from fishid_client import predict          # wrapper you already have
from fish_meta.fish_meta import get as meta_for  # enriched facts
from fish_fallback_data import get_fallback_data  # fallback data
from auth_system import auth_system  # secure authentication system

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
        
        if not data:
            return jsonify({
                'success': False,
                'error': 'No data provided'
            }), 400
        
        email = data.get('email', '').strip().lower()
        username = data.get('username', data.get('name', '')).strip()  # Support both 'username' and 'name'
        password = data.get('password', '')
        fish_icon = data.get('fish_icon', '/images/fish-icons/001-gold-fish.png')
        
        # Validate required fields
        if not email or not username or not password:
            return jsonify({
                'success': False,
                'error': 'Email, username, and password are required'
            }), 400
        
        # Register user with secure authentication system
        success, message, result = auth_system.register_user(email, username, password, fish_icon)
        
        if success:
            return jsonify({
                'success': True,
                'message': message,
                'token': result['token'],
                'user': {
                    'id': result['user']['id'],
                    'email': result['user']['email'],
                    'username': result['user']['username'],
                    'name': result['user']['username'],  # Include 'name' for frontend compatibility
                    'fish_icon': result['user']['fish_icon']
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
                    'name': result['user']['username'],  # Include 'name' for frontend compatibility
                    'fish_icon': result['user']['fish_icon']
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
                'user': {
                    'id': result['user']['id'],
                    'email': result['user']['email'],
                    'username': result['user']['username'],
                    'name': result['user']['username'],  # Include 'name' for frontend compatibility
                    'fish_icon': result['user']['fish_icon']
                }
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

@app.route('/api/auth/profile', methods=['GET'])
def get_profile():
    try:
        # Get token from Authorization header
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({
                'success': False,
                'error': 'Authorization header required'
            }), 401
        
        token = auth_header.split(' ')[1]
        
        # Verify token and get user profile
        success, message, result = auth_system.verify_token(token)
        
        if not success:
            return jsonify({
                'success': False,
                'error': message
            }), 401
        
        user_id = result['user']['id']
        profile = auth_system.get_user_profile(user_id)
        
        if profile:
            return jsonify({
                'success': True,
                'profile': profile
            }), 200
        else:
            return jsonify({
                'success': False,
                'error': 'Profile not found'
            }), 404
            
    except Exception as e:
        return jsonify({
            'success': False,
            'error': 'Failed to get profile',
            'details': str(e)
        }), 500

@app.route('/api/auth/reset', methods=['POST'])
def reset_auth_data():
    """Clear all authentication data (for testing/reset)"""
    try:
        # This should be protected in production - only allow in development
        if os.getenv('FLASK_ENV') != 'development':
            return jsonify({
                'success': False,
                'error': 'Reset not allowed in production'
            }), 403
        
        auth_system.clear_all_users()
        
        return jsonify({
            'success': True,
            'message': 'All authentication data cleared'
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': 'Reset failed',
            'details': str(e)
        }), 500

@app.route('/api/auth/update-icon', methods=['POST'])
def update_fish_icon():
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({
                'success': False,
                'error': 'No data provided'
            }), 400
        
        token = data.get('token')
        fish_icon = data.get('fish_icon')
        
        if not token:
            return jsonify({
                'success': False,
                'error': 'Token is required'
            }), 400
        
        if not fish_icon:
            return jsonify({
                'success': False,
                'error': 'Fish icon is required'
            }), 400
        
        # Verify token and get user
        success, message, result = auth_system.verify_token(token)
        
        if not success:
            return jsonify({
                'success': False,
                'error': message
            }), 401
        
        user_id = result['user']['id']
        
        # Update fish icon in database
        with auth_system._get_db() as (conn, cursor):
            cursor.execute('UPDATE users SET fish_icon = ? WHERE id = ?', (fish_icon, user_id))
            conn.commit()
        
        return jsonify({
            'success': True,
            'message': 'Fish icon updated successfully',
            'fish_icon': fish_icon
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': 'Failed to update fish icon',
            'details': str(e)
        }), 500

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
        fallback = get_fallback_data(scientific)

        # Format response for frontend with fallback information
        result = {
            'id': f'identification_{datetime.utcnow().timestamp()}',
            'scientific_name': scientific,
            'common_name': meta.get('common_name', ''),
            'confidence': confidence,
            'description': meta.get('description', meta.get('intro', 'No description available')),
            'habitat': meta.get('habitat') or fallback.get('habitat', 'Habitat information not available'),
            'distribution': meta.get('distribution') or fallback.get('distribution', 'Distribution information not available'),
            'max_length_cm': meta.get('max_length_cm') or fallback.get('max_length_cm', ''),
            'conservation_status': meta.get('iucn_status') or fallback.get('conservation_status', ''),
            'fun_facts': meta.get('fun_facts') or fallback.get('fun_facts', 'Fun facts not available'),
            'reference_image': meta.get('picture', ''),
            'visual_cues': meta.get('visual_cues') or fallback.get('visual_cues', 'Visual identification cues not available')
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

# Species database routes
@app.route('/api/species', methods=['GET'])
def get_species():
    """Get all species with optional filtering from database"""
    try:
        # Get query parameters
        search = request.args.get('search', '').lower()
        region = request.args.get('region', 'all')
        habitat = request.args.get('habitat', 'all')
        status = request.args.get('status', 'all')
        page = int(request.args.get('page', 1))
        limit = int(request.args.get('limit', 20))
        
        # Connect to database
        conn = sqlite3.connect('species.db')
        cursor = conn.cursor()
        
        # Build query with filters
        query = "SELECT * FROM species WHERE 1=1"
        params = []
        
        if search:
            query += " AND (common_name LIKE ? OR scientific_name LIKE ?)"
            params.extend([f'%{search}%', f'%{search}%'])
            
        if region != 'all':
            query += " AND location LIKE ?"
            params.append(f'%{region}%')
            
        if habitat != 'all':
            query += " AND habitat LIKE ?"
            params.append(f'%{habitat}%')
            
        if status != 'all':
            query += " AND iucn_status = ?"
            params.append(status)
        
        # Get total count
        count_query = query.replace("SELECT *", "SELECT COUNT(*)")
        cursor.execute(count_query, params)
        total = cursor.fetchone()[0]
        
        # Add pagination
        query += " ORDER BY common_name LIMIT ? OFFSET ?"
        offset = (page - 1) * limit
        params.extend([limit, offset])
        
        # Execute query
        cursor.execute(query, params)
        rows = cursor.fetchall()
        
        # Convert to JSON format
        species_list = []
        for row in rows:
            species_obj = {
                'id': row[0],
                'scientific_name': row[1],
                'common_name': row[2],
                'image_url': row[3],
                'habitat': row[4],
                'distribution': row[5],  # location field
                'max_length_cm': row[6],  # size field
                'conservation_status': row[7],  # iucn_status field
                'description': row[8],
                'family': 'Various',  # Default family
                'region': row[5]  # location field
            }
            species_list.append(species_obj)
        
        conn.close()
        
        return jsonify({
            'success': True,
            'species': species_list,
            'total': total,
            'page': page,
            'total_pages': (total + limit - 1) // limit,
            'limit': limit
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': 'Failed to fetch species',
            'details': str(e)
        }), 500

@app.route('/api/species/<species_id>', methods=['GET'])
def get_species_detail(species_id):
    """Get detailed information for a specific species from database"""
    try:
        # Connect to database
        conn = sqlite3.connect('species.db')
        cursor = conn.cursor()
        
        # Get species details
        cursor.execute("SELECT * FROM species WHERE id = ?", (species_id,))
        row = cursor.fetchone()
        
        conn.close()
        
        if not row:
            return jsonify({
                'success': False,
                'error': 'Species not found'
            }), 404
        
        species_obj = {
            'id': row[0],
            'scientific_name': row[1],
            'common_name': row[2],
            'image_url': row[3],
            'habitat': row[4],
            'distribution': row[5],  # location field
            'max_length_cm': row[6],  # size field
            'conservation_status': row[7],  # iucn_status field
            'description': row[8],
            'fun_facts': 'Fun facts not available',
            'visual_cues': 'Visual identification cues not available',
            'family': 'Various',
            'region': row[5]  # location field
        }
        
        return jsonify({
            'success': True,
            'species': species_obj
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': 'Failed to fetch species details',
            'details': str(e)
        }), 500

@app.route('/api/species/filters', methods=['GET'])
def get_species_filters():
    """Get available filter options for species from database"""
    try:
        # Connect to database
        conn = sqlite3.connect('species.db')
        cursor = conn.cursor()
        
        # Get unique values for filters
        cursor.execute("SELECT DISTINCT location FROM species WHERE location IS NOT NULL")
        regions = [row[0] for row in cursor.fetchall()]
        
        cursor.execute("SELECT DISTINCT habitat FROM species WHERE habitat IS NOT NULL")
        habitats = [row[0] for row in cursor.fetchall()]
        
        cursor.execute("SELECT DISTINCT iucn_status FROM species WHERE iucn_status IS NOT NULL")
        statuses = [row[0] for row in cursor.fetchall()]
        
        conn.close()
        
        return jsonify({
            'success': True,
            'filters': {
                'regions': regions,
                'habitats': habitats,
                'statuses': statuses
            }
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': 'Failed to fetch filter options',
            'details': str(e)
        }), 500

if __name__ == "__main__":
    port = int(os.environ.get('PORT', 5001))
    app.run(debug=False, host='0.0.0.0', port=port)
