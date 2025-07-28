#!/usr/bin/env python3
"""
Secure Authentication System for FishID
Implements proper user management, password hashing, JWT tokens, and security best practices
"""

import os
import jwt
import bcrypt
import sqlite3
import re
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from dataclasses import dataclass
from contextlib import contextmanager

# Security configuration
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "your-super-secret-jwt-key-change-in-production")
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 168  # 7 days (24 * 7)
PASSWORD_MIN_LENGTH = 8
MAX_LOGIN_ATTEMPTS = 5
LOCKOUT_DURATION_MINUTES = 15

@dataclass
class User:
    id: str
    email: str
    username: str
    password_hash: str
    fish_icon: str
    created_at: datetime
    last_login: Optional[datetime] = None
    login_attempts: int = 0
    locked_until: Optional[datetime] = None
    is_active: bool = True

class AuthSystem:
    def __init__(self, db_path: str = "users.db"):
        self.db_path = db_path
        self._init_database()
    
    def _init_database(self):
        """Initialize the SQLite database with proper schema"""
        with self._get_db() as (conn, cursor):
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS users (
                    id TEXT PRIMARY KEY,
                    email TEXT UNIQUE NOT NULL,
                    username TEXT UNIQUE NOT NULL,
                    password_hash TEXT NOT NULL,
                    fish_icon TEXT DEFAULT '/images/fish-icons/001-gold-fish.png',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    last_login TIMESTAMP,
                    login_attempts INTEGER DEFAULT 0,
                    locked_until TIMESTAMP,
                    is_active BOOLEAN DEFAULT 1
                )
            ''')
            
            # Add fish_icon column if it doesn't exist (for existing databases)
            cursor.execute("PRAGMA table_info(users)")
            columns = [column[1] for column in cursor.fetchall()]
            if 'fish_icon' not in columns:
                cursor.execute('ALTER TABLE users ADD COLUMN fish_icon TEXT DEFAULT "/images/fish-icons/001-gold-fish.png"')
            
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS login_attempts (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    email TEXT NOT NULL,
                    ip_address TEXT,
                    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    success BOOLEAN DEFAULT 0
                )
            ''')
            
            conn.commit()
    
    @contextmanager
    def _get_db(self):
        """Database connection context manager"""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        try:
            yield conn, conn.cursor()
        finally:
            conn.close()
    
    def _validate_email(self, email: str) -> bool:
        """Validate email format"""
        pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        return re.match(pattern, email) is not None
    
    def _validate_password(self, password: str) -> tuple[bool, str]:
        """Validate password strength"""
        if len(password) < PASSWORD_MIN_LENGTH:
            return False, f"Password must be at least {PASSWORD_MIN_LENGTH} characters long"
        
        if not re.search(r'[A-Z]', password):
            return False, "Password must contain at least one uppercase letter"
        
        if not re.search(r'[a-z]', password):
            return False, "Password must contain at least one lowercase letter"
        
        if not re.search(r'\d', password):
            return False, "Password must contain at least one number"
        
        if not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
            return False, "Password must contain at least one special character"
        
        return True, "Password is valid"
    
    def _hash_password(self, password: str) -> str:
        """Hash password using bcrypt"""
        salt = bcrypt.gensalt()
        return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')
    
    def _verify_password(self, password: str, hashed: str) -> bool:
        """Verify password against hash"""
        return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))
    
    def _generate_user_id(self) -> str:
        """Generate unique user ID"""
        import uuid
        return str(uuid.uuid4())
    
    def _generate_jwt_token(self, user_id: str, email: str) -> str:
        """Generate JWT token"""
        payload = {
            'user_id': user_id,
            'email': email,
            'exp': datetime.utcnow() + timedelta(hours=JWT_EXPIRATION_HOURS),
            'iat': datetime.utcnow()
        }
        return jwt.encode(payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)
    
    def _verify_jwt_token(self, token: str) -> Optional[Dict[str, Any]]:
        """Verify JWT token and return payload"""
        try:
            payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
            return payload
        except jwt.ExpiredSignatureError:
            return None
        except jwt.InvalidTokenError:
            return None
    
    def _get_user_by_email(self, email: str) -> Optional[User]:
        """Get user by email"""
        with self._get_db() as (conn, cursor):
            cursor.execute('''
                SELECT * FROM users WHERE email = ?
            ''', (email,))
            row = cursor.fetchone()
            
            if row:
                return User(
                    id=row['id'],
                    email=row['email'],
                    username=row['username'],
                    password_hash=row['password_hash'],
                    fish_icon=row['fish_icon'],
                    created_at=datetime.fromisoformat(row['created_at']),
                    last_login=datetime.fromisoformat(row['last_login']) if row['last_login'] else None,
                    login_attempts=row['login_attempts'],
                    locked_until=datetime.fromisoformat(row['locked_until']) if row['locked_until'] else None,
                    is_active=bool(row['is_active'])
                )
            return None
    
    def _get_user_by_id(self, user_id: str) -> Optional[User]:
        """Get user by ID"""
        with self._get_db() as (conn, cursor):
            cursor.execute('''
                SELECT * FROM users WHERE id = ?
            ''', (user_id,))
            row = cursor.fetchone()
            
            if row:
                return User(
                    id=row['id'],
                    email=row['email'],
                    username=row['username'],
                    password_hash=row['password_hash'],
                    fish_icon=row['fish_icon'],
                    created_at=datetime.fromisoformat(row['created_at']),
                    last_login=datetime.fromisoformat(row['last_login']) if row['last_login'] else None,
                    login_attempts=row['login_attempts'],
                    locked_until=datetime.fromisoformat(row['locked_until']) if row['locked_until'] else None,
                    is_active=bool(row['is_active'])
                )
            return None
    
    def _record_login_attempt(self, email: str, success: bool, ip_address: str = None):
        """Record login attempt for security monitoring"""
        with self._get_db() as (conn, cursor):
            cursor.execute('''
                INSERT INTO login_attempts (email, ip_address, success)
                VALUES (?, ?, ?)
            ''', (email, ip_address, success))
            conn.commit()
    
    def _update_user_login_stats(self, user: User, success: bool):
        """Update user login statistics"""
        with self._get_db() as (conn, cursor):
            if success:
                cursor.execute('''
                    UPDATE users 
                    SET last_login = CURRENT_TIMESTAMP, login_attempts = 0, locked_until = NULL
                    WHERE id = ?
                ''', (user.id,))
            else:
                new_attempts = user.login_attempts + 1
                locked_until = None
                
                if new_attempts >= MAX_LOGIN_ATTEMPTS:
                    locked_until = datetime.utcnow() + timedelta(minutes=LOCKOUT_DURATION_MINUTES)
                
                cursor.execute('''
                    UPDATE users 
                    SET login_attempts = ?, locked_until = ?
                    WHERE id = ?
                ''', (new_attempts, locked_until.isoformat() if locked_until else None, user.id))
            
            conn.commit()
    
    def register_user(self, email: str, username: str, password: str, fish_icon: str = "/images/fish-icons/001-gold-fish.png") -> tuple[bool, str, Optional[Dict]]:
        """Register a new user with security validation"""
        
        # Validate email format
        if not self._validate_email(email):
            return False, "Invalid email format", None
        
        # Validate password strength
        is_valid, password_msg = self._validate_password(password)
        if not is_valid:
            return False, password_msg, None
        
        # Check if email already exists
        existing_user = self._get_user_by_email(email)
        if existing_user:
            return False, "An account with this email already exists. Please sign in instead.", None
        
        # Check if username already exists
        with self._get_db() as (conn, cursor):
            cursor.execute('SELECT id FROM users WHERE username = ?', (username,))
            if cursor.fetchone():
                return False, "Username already taken", None
        
        # Create new user
        try:
            user_id = self._generate_user_id()
            password_hash = self._hash_password(password)
            
            with self._get_db() as (conn, cursor):
                cursor.execute('''
                    INSERT INTO users (id, email, username, password_hash, fish_icon)
                    VALUES (?, ?, ?, ?, ?)
                ''', (user_id, email, username, password_hash, fish_icon))
                conn.commit()
            
            # Generate token for immediate login
            token = self._generate_jwt_token(user_id, email)
            
            return True, "Registration successful", {
                'token': token,
                'user': {
                    'id': user_id,
                    'email': email,
                    'username': username,
                    'fish_icon': fish_icon
                }
            }
            
        except Exception as e:
            return False, f"Registration failed: {str(e)}", None
    
    def login_user(self, email: str, password: str, ip_address: str = None) -> tuple[bool, str, Optional[Dict]]:
        """Login user with security measures"""
        
        # Validate email format
        if not self._validate_email(email):
            self._record_login_attempt(email, False, ip_address)
            return False, "Invalid email format", None
        
        # Get user
        user = self._get_user_by_email(email)
        if not user:
            self._record_login_attempt(email, False, ip_address)
            return False, "Invalid email or password", None
        
        # Check if account is locked
        if user.locked_until and user.locked_until > datetime.utcnow():
            remaining_time = user.locked_until - datetime.utcnow()
            minutes = int(remaining_time.total_seconds() / 60)
            self._record_login_attempt(email, False, ip_address)
            return False, f"Account temporarily locked. Try again in {minutes} minutes.", None
        
        # Check if account is active
        if not user.is_active:
            self._record_login_attempt(email, False, ip_address)
            return False, "Account is deactivated", None
        
        # Verify password
        if not self._verify_password(password, user.password_hash):
            self._record_login_attempt(email, False, ip_address)
            self._update_user_login_stats(user, False)
            return False, "Invalid email or password", None
        
        # Successful login
        self._record_login_attempt(email, True, ip_address)
        self._update_user_login_stats(user, True)
        
        # Generate token
        token = self._generate_jwt_token(user.id, user.email)
        
        return True, "Login successful", {
            'token': token,
            'user': {
                'id': user.id,
                'email': user.email,
                'username': user.username,
                'fish_icon': user.fish_icon
            }
        }
    
    def verify_token(self, token: str) -> tuple[bool, str, Optional[Dict]]:
        """Verify JWT token"""
        payload = self._verify_jwt_token(token)
        if not payload:
            return False, "Invalid or expired token", None
        
        user = self._get_user_by_id(payload['user_id'])
        if not user or not user.is_active:
            return False, "User not found or account deactivated", None
        
        return True, "Token is valid", {
            'user': {
                'id': user.id,
                'email': user.email,
                'username': user.username,
                'fish_icon': user.fish_icon
            }
        }
    
    def logout_user(self, token: str) -> tuple[bool, str]:
        """Logout user (in a real system, you'd blacklist the token)"""
        # For now, we'll just verify the token was valid
        payload = self._verify_jwt_token(token)
        if not payload:
            return False, "Invalid token"
        
        return True, "Logout successful"
    
    def get_user_profile(self, user_id: str) -> Optional[Dict]:
        """Get user profile"""
        user = self._get_user_by_id(user_id)
        if not user:
            return None
        
        return {
            'id': user.id,
            'email': user.email,
            'username': user.username,
            'created_at': user.created_at.isoformat(),
            'last_login': user.last_login.isoformat() if user.last_login else None
        }
    
    def clear_all_users(self):
        """Clear all user data (for testing/reset)"""
        with self._get_db() as (conn, cursor):
            cursor.execute('DELETE FROM users')
            cursor.execute('DELETE FROM login_attempts')
            conn.commit()

# Global auth system instance
auth_system = AuthSystem() 