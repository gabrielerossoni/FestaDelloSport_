
import os
import psycopg2
import sqlite3
from psycopg2.extras import RealDictCursor
from flask import current_app, g

def dict_factory(cursor, row):
    d = {}
    for idx, col in enumerate(cursor.description):
        d[col[0]] = row[idx]
    return d

class SQLiteCursorWrapper:
    def __init__(self, cursor):
        self.cursor = cursor
        self.last_insert_id = None

    def execute(self, query, params=None):
        # Convert PostgreSQL placeholders to SQLite
        query = query.replace('%s', '?')
        
        # Handle RETURNING id support (emulated for SQLite < 3.35 or general compatibility)
        is_insert_returning = "RETURNING id" in query
        if is_insert_returning:
            query = query.replace("RETURNING id", "")
        
        try:
            if params:
                self.cursor.execute(query, params)
            else:
                self.cursor.execute(query)
                
            if is_insert_returning:
                self.last_insert_id = self.cursor.lastrowid
                
        except Exception as e:
            print(f"[SQLITE ERROR] {e} IN QUERY: {query} WITH PARAMS: {params}")
            raise e

    def fetchone(self):
        if self.last_insert_id is not None:
            res = {'id': self.last_insert_id}
            self.last_insert_id = None
            return res
        return self.cursor.fetchone()

    def fetchall(self):
        return self.cursor.fetchall()

    def close(self):
        self.cursor.close()
    
    def __getattr__(self, name):
        return getattr(self.cursor, name)

class SQLiteConnectionWrapper:
    def __init__(self, conn):
        self.conn = conn
    
    def cursor(self):
        return SQLiteCursorWrapper(self.conn.cursor())
    
    def commit(self):
        self.conn.commit()
        
    def close(self):
        self.conn.close()

def get_db_connection():
    """Create a new database connection (Postgres or SQLite)."""
    database_url = os.environ.get("DATABASE_URL")
    
    if not database_url:
        # Default fallback
        database_url = "sqlite:///instance/festa_sport.db"
        print("[WARN] DATABASE_URL not set. Defaulting to sqlite:///instance/festa_sport.db")
        
    if database_url.startswith("sqlite"):
        db_path = database_url.replace("sqlite:///", "")
        conn = sqlite3.connect(db_path)
        conn.row_factory = dict_factory
        return SQLiteConnectionWrapper(conn)
    
    # Fix for Render/Supabase if needed (postgres:// -> postgresql://)
    if database_url.startswith("postgres://"):
        database_url = database_url.replace("postgres://", "postgresql://", 1)
        
    try:
        conn = psycopg2.connect(
            database_url,
            cursor_factory=RealDictCursor,
            sslmode="require" if "localhost" not in database_url else "allow"
        )
        return conn
    except Exception as e:
        print(f"[ERROR] Cannot connect to database: {e}")
        raise

def init_database():
    """Initialize the database tables."""
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        is_sqlite = isinstance(conn, SQLiteConnectionWrapper)
        print(f"[CONFIG] Initializing database ({'SQLite' if is_sqlite else 'PostgreSQL'})...")
        
        # SQL Dialect differences
        SERIAL_PK = "INTEGER PRIMARY KEY AUTOINCREMENT" if is_sqlite else "SERIAL PRIMARY KEY"
        TIMESTAMP_DEFAULT = "TIMESTAMP DEFAULT CURRENT_TIMESTAMP"
        
        # Tables
        cur.execute(f"""
            CREATE TABLE IF NOT EXISTS prenotazioni (
                id {SERIAL_PK},
                nome TEXT NOT NULL,
                telefono TEXT NOT NULL,
                data TEXT NOT NULL,
                ora TEXT NOT NULL,
                ospiti INTEGER NOT NULL,
                tavolo TEXT NOT NULL,
                note TEXT DEFAULT '',
                timestamp {TIMESTAMP_DEFAULT}
            );
        """)
        
        cur.execute(f"""
            CREATE TABLE IF NOT EXISTS feedbacks (
                id {SERIAL_PK},
                nome TEXT DEFAULT 'Anonimo',
                rating INTEGER NOT NULL CHECK (rating BETWEEN 0 AND 5),
                message TEXT NOT NULL,
                timestamp {TIMESTAMP_DEFAULT}
            );
        """)
        
        cur.execute(f"""
            CREATE TABLE IF NOT EXISTS reminder_requests (
                id {SERIAL_PK},
                contact TEXT NOT NULL,
                timestamp {TIMESTAMP_DEFAULT}
            );
        """)
        
        cur.execute(f"""
            CREATE TABLE IF NOT EXISTS eventi (
                id {SERIAL_PK},
                nome TEXT NOT NULL,
                data DATE NOT NULL,
                luogo TEXT NOT NULL,
                descrizione TEXT,
                created_at {TIMESTAMP_DEFAULT},
                updated_at {TIMESTAMP_DEFAULT}
            );
        """)
        
        cur.execute(f"""
            CREATE TABLE IF NOT EXISTS users (
                id {SERIAL_PK},
                username TEXT NOT NULL UNIQUE,
                password_hash TEXT NOT NULL,
                role TEXT DEFAULT 'admin',
                created_at {TIMESTAMP_DEFAULT}
            );
        """)

        cur.execute(f"""
            CREATE TABLE IF NOT EXISTS menu_items (
                id {SERIAL_PK},
                nome TEXT NOT NULL,
                descrizione TEXT,
                prezzo DECIMAL(5,2),
                allergeni TEXT,
                categoria TEXT NOT NULL,
                disponibile BOOLEAN DEFAULT TRUE,
                created_at {TIMESTAMP_DEFAULT},
                updated_at {TIMESTAMP_DEFAULT}
            );
        """)
        
        # Default Admin User
        try:
            from werkzeug.security import generate_password_hash
            default_password = generate_password_hash("password123")
            cur.execute("SELECT id FROM users WHERE username = 'admin'")
            if not cur.fetchone():
                cur.execute("INSERT INTO users (username, password_hash, role) VALUES ('admin', %s, 'admin')", (default_password,))
                print("[CONFIG] Created default admin user")
        except Exception as e:
            print(f"[WARN] Could not create default admin: {e}")
        
        # Indexes (SQLite uses slightly different syntax? No, standard usually ok)
        cur.execute("CREATE INDEX IF NOT EXISTS idx_prenotazioni_data_ora ON prenotazioni(data, ora);")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_prenotazioni_tavolo ON prenotazioni(tavolo);")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_feedbacks_timestamp ON feedbacks(timestamp);")
     
        conn.commit()
        cur.close()
        conn.close()
        print("[OK] Database initialized successfully")
        return True
    except Exception as error:
        print(f"[ERROR] Database initialization failed: {error}")
        raise error
