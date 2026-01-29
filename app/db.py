
import os
import psycopg2
from psycopg2.extras import RealDictCursor
from flask import current_app, g

def get_db_connection():
    """Create a new database connection."""
    database_url = os.environ.get("DATABASE_URL")
    if not database_url:
         # Fallback for local testing if absolutely necessary, but prefer erroring if Supabase is required
         raise RuntimeError("DATABASE_URL environment variable is not set. Please configure Supabase.")
    
    # Fix for Render/Supabase if needed (postgres:// -> postgresql://)
    if database_url.startswith("postgres://"):
        database_url = database_url.replace("postgres://", "postgresql://", 1)
        
    try:
        conn = psycopg2.connect(
            database_url,
            cursor_factory=RealDictCursor,
            sslmode="require"
        )
        return conn
    except Exception as e:
        print(f"[ERROR] Cannot connect to database: {e}")
        raise

def init_database():
    """Initialize the database tables."""
    try:
        print("[CONFIG] Initializing PostgreSQL database (Supabase)...")
        conn = get_db_connection()
        cur = conn.cursor()
        
        # Tables for booking
        cur.execute("""
            CREATE TABLE IF NOT EXISTS prenotazioni (
                id SERIAL PRIMARY KEY,
                nome TEXT NOT NULL,
                telefono TEXT NOT NULL,
                data TEXT NOT NULL,
                ora TEXT NOT NULL,
                ospiti INTEGER NOT NULL,
                tavolo TEXT NOT NULL,
                note TEXT DEFAULT '',
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)
        
        cur.execute("""
            CREATE TABLE IF NOT EXISTS feedbacks (
                id SERIAL PRIMARY KEY,
                nome TEXT DEFAULT 'Anonimo',
                rating INTEGER NOT NULL CHECK (rating BETWEEN 0 AND 5),
                message TEXT NOT NULL,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)
        
        cur.execute("""
            CREATE TABLE IF NOT EXISTS reminder_requests (
                id SERIAL PRIMARY KEY,
                contact TEXT NOT NULL,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)
        
        # Tables for admin/events/menu
        cur.execute("""
            CREATE TABLE IF NOT EXISTS eventi (
                id SERIAL PRIMARY KEY,
                nome TEXT NOT NULL,
                data DATE NOT NULL,
                luogo TEXT NOT NULL,
                descrizione TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)
        
        cur.execute("""
            CREATE TABLE IF NOT EXISTS menu_items (
                id SERIAL PRIMARY KEY,
                nome TEXT NOT NULL,
                descrizione TEXT,
                prezzo DECIMAL(5,2),
                categoria TEXT NOT NULL,
                disponibile BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)
        
        # Indexes
        cur.execute("CREATE INDEX IF NOT EXISTS idx_prenotazioni_data_ora ON prenotazioni(data, ora);")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_prenotazioni_tavolo ON prenotazioni(tavolo);")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_feedbacks_timestamp ON feedbacks(timestamp);")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_reminder_timestamp ON reminder_requests(timestamp);")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_eventi_data ON eventi(data);")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_menu_categoria ON menu_items(categoria);")
        
        conn.commit()
        cur.close()
        conn.close()
        print("[OK] Database initialized successfully")
        return True
    except Exception as error:
        print(f"[ERROR] Database initialization failed: {error}")
        raise error
