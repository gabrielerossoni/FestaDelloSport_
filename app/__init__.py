
from flask import Flask, request
from flask_cors import CORS
import os
from app.db import init_database

def create_app():
    app = Flask(__name__)
    
    # Configuration
    app.secret_key = os.environ.get('SECRET_KEY', 'chiave-segreta-admin-festa-sport')
    
    # CORS Configuration
    ALLOWED_ORIGINS = [
        "https://gabrielerossoni.github.io",
        "https://gabrielerossoni.github.io/FestaDelloSport_/",
        "http://localhost:3000",
        "http://localhost:5500",
        "http://127.0.0.1:5500",
        "http://localhost",
        "http://127.0.0.1",
        # Allow self (Flask serves frontend now)
        "http://localhost:5000",
        "http://127.0.0.1:5000"
    ]
    
    CORS(app, resources={
        r"/api/*": {
            "origins": ALLOWED_ORIGINS,
            "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
            "allow_headers": ["Content-Type"],
            "supports_credentials": True # Changed from False given we use session for admin
        }
    })
    
    # Register Blueprints
    from app.blueprints.main import main_bp
    from app.blueprints.admin import admin_bp
    from app.blueprints.api import api_bp
    
    app.register_blueprint(main_bp)
    app.register_blueprint(admin_bp)
    app.register_blueprint(api_bp, url_prefix='/api')

    # Logging middleware
    @app.before_request
    def log_request():
        origin = request.headers.get('Origin', 'N/A')
        # print(f"[REQUEST] {request.method} {request.url} | Origin: {origin}") # Reduce noise
    
    @app.after_request
    def after_request(response):
        # origin = request.headers.get('Origin', 'N/A')
        # print(f"[RESPONSE] {request.method} {request.url} | Status: {response.status_code}") # Reduce noise
        return response

    # Initialize DB (optional here, maybe better in run.py or explicit command)
    # But backend.py did it on startup.
    with app.app_context():
        try:
             # Only init if not just importing for some tools
             if os.environ.get("WERKZEUG_RUN_MAIN") == "true" or os.environ.get("FLASK_ENV") != "development":
                 print("[STARTUP] Checking database...")
                 init_database()
        except Exception as e:
            print(f"[STARTUP WARNING] Database initialization check failed: {e}")

    return app
