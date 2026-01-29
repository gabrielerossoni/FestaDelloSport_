import json
import signal
import sys
from datetime import datetime
from flask import Flask, request, jsonify, session, redirect, url_for, render_template_string, send_from_directory
from flask_cors import CORS
import os
import psycopg2
from psycopg2.extras import RealDictCursor
from werkzeug.security import generate_password_hash, check_password_hash
from functools import wraps

# ================================
# CONFIGURAZIONE SERVER
# ================================
app = Flask(__name__)
app.secret_key = 'chiave-segreta-admin-festa-sport'  # CAMBIARE IN PRODUZIONE
# CORS configurato per produzione - MODIFICA CON IL TUO DOMINIO
ALLOWED_ORIGINS = [
    "https://gabrielerossoni.github.io",
    "https://gabrielerossoni.github.io/FestaDelloSport_/",  # GitHub Pages
    #"https://festa-sport-capralba.it",    Dominio personalizzato (se lo hai)
    "http://localhost:3000",               # Per test locali
    "http://localhost:5500",               # Per test locali (Live Server porta 5500)
    "http://127.0.0.1:5500",              # Per test locali (Live Server)
    "http://localhost",                    # Per test locali (qualsiasi porta)
    "http://127.0.0.1",                   # Per test locali (qualsiasi porta)
]

# Configurazione CORS
# Per sviluppo locale, puoi temporaneamente usare CORS(app) per permettere tutte le origini
# ATTENZIONE: Non usare in produzione! Usa sempre ALLOWED_ORIGINS in produzione
CORS(app, resources={
    r"/api/*": {
        "origins": ALLOWED_ORIGINS,
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type"],
        "supports_credentials": False
    }
})
PORT = 3001

# Credenziali admin hardcoded (in produzione, usa file JSON sicuro o DB)
ADMIN_CREDENTIALS = {
    'admin': generate_password_hash('password123')  # Cambiare password
}

# Decorator per richiedere login admin
def admin_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'admin_logged_in' not in session:
            return redirect(url_for('admin_login'))
        return f(*args, **kwargs)
    return decorated_function

# Middleware per logging delle richieste
@app.before_request
def log_request():
    origin = request.headers.get('Origin', 'N/A')
    print(f"[REQUEST] {request.method} {request.url} | Origin: {origin}")
    
@app.after_request
def after_request(response):
    origin = request.headers.get('Origin', 'N/A')
    print(f"[RESPONSE] {request.method} {request.url} | Status: {response.status_code} | Origin: {origin}")
    return response

# ================================
# DATABASE SETUP
# ================================
DATABASE_URL = os.environ.get("DATABASE_URL")

if not DATABASE_URL:
    print("[ERROR] DATABASE_URL non trovata nelle variabili d'ambiente!")
    sys.exit(1)

# Fix per Render: postgres:// -> postgresql://
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)
    print("[FIX] DATABASE_URL convertito da postgres:// a postgresql://")

def get_db_connection():
    """Crea una nuova connessione al database PostgreSQL"""
    try:
        return psycopg2.connect(
            DATABASE_URL,
            cursor_factory=RealDictCursor,
            sslmode="require"
        )
    except Exception as e:
        print(f"[ERROR] Impossibile connettersi al database: {e}")
        raise

def init_database():
    """Inizializza il database PostgreSQL"""
    try:
        print("[CONFIG] Inizializzazione database PostgreSQL...")
        
        conn = get_db_connection()
        cur = conn.cursor()
        
        # Crea tabelle se non esistono
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
        
        # Tabelle per dashboard admin
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
        
        # Indici per migliorare le performance
        cur.execute("""
            CREATE INDEX IF NOT EXISTS idx_prenotazioni_data_ora ON prenotazioni(data, ora);
        """)
        cur.execute("""
            CREATE INDEX IF NOT EXISTS idx_prenotazioni_tavolo ON prenotazioni(tavolo);
        """)
        cur.execute("""
            CREATE INDEX IF NOT EXISTS idx_feedbacks_timestamp ON feedbacks(timestamp);
        """)
        cur.execute("""
            CREATE INDEX IF NOT EXISTS idx_reminder_timestamp ON reminder_requests(timestamp);
        """)
        
        # Indici per dashboard admin
        cur.execute("""
            CREATE INDEX IF NOT EXISTS idx_eventi_data ON eventi(data);
        """)
        cur.execute("""
            CREATE INDEX IF NOT EXISTS idx_menu_categoria ON menu_items(categoria);
        """)
        
        conn.commit()
        cur.close()
        conn.close()

        print("[OK] Database PostgreSQL inizializzato correttamente")
        return True
    except Exception as error:
        print(f"[ERROR] Errore nell'inizializzazione del database: {error}")
        raise error

# ================================
# DATI CONFIGURAZIONE TAVOLI
# ================================
TAVOLI_CONFIG = {
    # Tavoli non prenotabili (0 posti)
    "riservati": ["1", "2", "41", "42", "43", "44", "45", "46", "47", "48"],
    
    # Tavoli standard (10 posti ciascuno)
    "standard": [
        "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13", "14", "15",
        "16", "17", "18", "20", "21", "22", "23", "24", "25", "26", "27", "28",
        "29", "30", "31", "32", "33", "34", "35", "36", "37", "38", "39", "40"
    ]
}

# Genera dizionario tavoli con posti
TAVOLI = {}
for t in TAVOLI_CONFIG["riservati"]:
    TAVOLI[t] = 0
for t in TAVOLI_CONFIG["standard"]:
    TAVOLI[t] = 10

# ================================
# INIZIALIZZAZIONE DB ALL'AVVIO
# ================================
# Esegui init_database quando il modulo viene caricato
# (sia con app.run che con Gunicorn)
try:
    print("[STARTUP] Inizializzazione database in corso...")
    init_database()
except Exception as e:
    print(f"[STARTUP ERROR] Impossibile inizializzare il database: {e}")
    # Non bloccare l'avvio, le tabelle potrebbero già esistere

# ================================
# UTILITY FUNCTIONS
# ================================
def calcola_posti_occupati(data, ora, tavolo=None):
    """Calcola i posti occupati per data/ora specifici"""
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        if tavolo:
            # Calcola posti occupati per un tavolo specifico
            cur.execute(
                "SELECT SUM(ospiti) as ospiti_totali FROM prenotazioni WHERE data = %s AND ora = %s AND tavolo = %s",
                (data, ora, tavolo)
            )
            result = cur.fetchone()
            ospiti_totali = result["ospiti_totali"] if result["ospiti_totali"] else 0
            cur.close()
            conn.close()
            return ospiti_totali
        else:
            # Calcola posti occupati per tutti i tavoli
            cur.execute(
                "SELECT tavolo, SUM(ospiti) as ospiti_totali FROM prenotazioni WHERE data = %s AND ora = %s GROUP BY tavolo",
                (data, ora)
            )
            results = cur.fetchall()
            occupati = {}
            for row in results:
                occupati[row["tavolo"]] = row["ospiti_totali"]
            cur.close()
            conn.close()
            return occupati
                
    except Exception as error:
        print(f"Errore nel calcolo posti occupati: {error}")
        return 0 if tavolo else {}

def valida_prenotazione(dati):
    """Valida i dati di una prenotazione"""
    nome = dati.get('nome')
    telefono = dati.get('telefono')
    data = dati.get('data')
    ora = dati.get('ora')
    ospiti = dati.get('ospiti')
    tavolo = dati.get('tavolo')
    
    if not all([nome, telefono, data, ora, ospiti, tavolo]):
        return {"valida": False, "errore": "Compila tutti i campi obbligatori."}
    
    if tavolo not in TAVOLI:
        return {"valida": False, "errore": "Tavolo non valido."}
    
    if TAVOLI[tavolo] == 0:
        return {"valida": False, "errore": "Questo tavolo non è prenotabile."}
    
    return {"valida": True}

# ================================
# API ENDPOINTS - TAVOLI
# ================================
@app.route('/api/tavoli', methods=['GET'])
def get_tavoli():
    try:
        data = request.args.get('data')
        ora = request.args.get('ora')
        
        if not data or not ora:
            return jsonify({"error": "Data e ora sono obbligatorie."}), 400
        
        occupati = calcola_posti_occupati(data, ora)
        
        stato_tavoli = {}
        for tavolo in TAVOLI:
            stato_tavoli[tavolo] = max(0, TAVOLI[tavolo] - occupati.get(tavolo, 0))
        
        totale_prenotazioni = sum(occupati.values())
        
        return jsonify({
            "success": True,
            "data": stato_tavoli,
            "info": {
                "data": data,
                "ora": ora,
                "totalePrenotazioni": totale_prenotazioni
            }
        })
        
    except Exception as error:
        print(f"Errore nel recupero stato tavoli: {error}")
        return jsonify({"error": "Errore interno del server."}), 500

@app.route('/api/tavoli/info', methods=['GET'])
def get_tavoli_info():
    return jsonify({
        "success": True,
        "configurazione": {
            "tavoli_riservati": TAVOLI_CONFIG["riservati"],
            "tavoli_standard": TAVOLI_CONFIG["standard"],
            "posti_per_tavolo_standard": 10,
            "totale_tavoli": len(TAVOLI)
        }
    })

# ================================
# API ENDPOINTS - TEST/HEALTH
# ================================
@app.route('/api/health', methods=['GET'])
def health_check():
    """Endpoint per verificare che il backend sia attivo"""
    db_status = "disconnected"
    db_error = None
    
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("SELECT 1")
        cur.close()
        conn.close()
        db_status = "connected"
    except Exception as e:
        db_error = str(e)
    
    return jsonify({
        "success": True,
        "message": "Backend attivo",
        "timestamp": datetime.now().isoformat(),
        "database": {
            "status": db_status,
            "error": db_error
        }
    })

# ================================
# API ENDPOINTS - PRENOTAZIONI
# ================================
@app.route('/api/prenota', methods=['POST'])
def prenota():
    conn = None
    cur = None
    try:
        dati = request.get_json()
        print(f"[DEBUG] Ricevuta richiesta prenotazione: {dati}")
        
        nome = dati.get('nome')
        telefono = dati.get('telefono')
        data = dati.get('data')
        ora = dati.get('ora')
        ospiti = dati.get('ospiti')
        tavolo = dati.get('tavolo')
        note = dati.get('note', '')
        
        # Validazione base
        validazione = valida_prenotazione(dati)
        if not validazione["valida"]:
            print(f"[ERROR] Validazione fallita: {validazione['errore']}")
            return jsonify({"error": validazione["errore"]}), 400
        
        # Conversione ospiti
        posti_richiesti = 7 if ospiti == "7+" else int(ospiti)
        if posti_richiesti <= 0:
            print(f"[ERROR] Numero ospiti non valido: {ospiti}")
            return jsonify({"error": "Numero ospiti non valido."}), 400
        
        # Controllo disponibilità
        posti_occupati = calcola_posti_occupati(data, ora, tavolo)
        posti_disponibili = TAVOLI[tavolo] - posti_occupati
        
        print(f"[TABLE] Tavolo {tavolo}: {posti_occupati} occupati, {posti_disponibili} disponibili, {posti_richiesti} richiesti")
        
        if posti_richiesti > posti_disponibili:
            print("[ERROR] Posti insufficienti")
            return jsonify({
                "error": "Non ci sono abbastanza posti disponibili su questo tavolo.",
                "info": {
                    "posti_richiesti": posti_richiesti,
                    "posti_disponibili": posti_disponibili,
                    "posti_totali": TAVOLI[tavolo]
                }
            }), 400
        
        # Inserimento prenotazione
        print("[DB] Apertura connessione...")
        conn = get_db_connection()
        cur = conn.cursor()
        
        print("[DB] Esecuzione INSERT...")
        cur.execute(
            """
            INSERT INTO prenotazioni (nome, telefono, data, ora, ospiti, tavolo, note)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            RETURNING id
            """,
            (nome.strip(), telefono.strip(), data, ora, posti_richiesti, tavolo, note.strip())
        )
        
        prenotazione_id = cur.fetchone()["id"]
        conn.commit()
        print(f"[OK] Prenotazione inserita con ID: {prenotazione_id}")
        
        nuova_prenotazione = {
            "id": str(prenotazione_id),
            "nome": nome.strip(),
            "telefono": telefono.strip(),
            "data": data,
            "ora": ora,
            "ospiti": posti_richiesti,
            "tavolo": tavolo,
            "note": note.strip(),
            "timestamp": datetime.now().isoformat()
        }
        
        return jsonify({
            "success": True,
            "prenotazione": nuova_prenotazione,
            "message": "Prenotazione effettuata con successo!"
        })
        
    except Exception as error:
        print(f"[ERROR] Errore nella prenotazione: {error}")
        print(f"[ERROR] Tipo errore: {type(error).__name__}")
        import traceback
        print(f"[ERROR] Traceback: {traceback.format_exc()}")
        return jsonify({"error": f"Errore interno del server: {str(error)}"}), 500
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()

@app.route('/api/prenotazioni', methods=['GET'])
def get_prenotazioni():
    try:
        data = request.args.get('data')
        ora = request.args.get('ora')
        tavolo = request.args.get('tavolo')
        limit = min(int(request.args.get('limit', 100)), 500)  # max 500
        
        # Costruzione query dinamica
        query = "SELECT * FROM prenotazioni WHERE 1=1"
        params = []
        
        if data:
            query += " AND data = %s"
            params.append(data)
        if ora:
            query += " AND ora = %s"
            params.append(ora)
        if tavolo:
            query += " AND tavolo = %s"
            params.append(tavolo)
            
        query += " ORDER BY data DESC, ora DESC LIMIT %s"
        params.append(limit)
        
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute(query, params)
        prenotazioni = cur.fetchall()
        cur.close()
        conn.close()
        
        return jsonify({
            "success": True,
            "data": prenotazioni,
            "totale": len(prenotazioni)
        })
        
    except Exception as error:
        print(f"Errore nel recupero prenotazioni: {error}")
        return jsonify({"error": "Errore interno del server."}), 500

# ================================
# API ENDPOINTS - FEEDBACK
# ================================
@app.route('/api/feedback', methods=['POST'])
def post_feedback():
    try:
        dati = request.get_json()
        nome = dati.get('nome', 'Anonimo')
        rating = int(dati.get('rating', 0))
        message = dati.get('message', '').strip()
        
        if not message:
            return jsonify({"error": "Il messaggio di feedback è obbligatorio."}), 400
        
        if rating < 0 or rating > 5:
            return jsonify({"error": "Il rating deve essere tra 0 e 5."}), 400
        
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute(
            """
            INSERT INTO feedbacks (nome, rating, message)
            VALUES (%s, %s, %s)
            RETURNING id
            """,
            (nome.strip(), rating, message)
        )
        feedback_id = cur.fetchone()["id"]
        conn.commit()
        cur.close()
        conn.close()
        
        nuovo_feedback = {
            "id": str(feedback_id),
            "nome": nome.strip(),
            "rating": rating,
            "message": message,
            "timestamp": datetime.now().isoformat()
        }
        
        return jsonify({
            "success": True,
            "feedback": nuovo_feedback,
            "message": "Feedback salvato con successo!"
        })
        
    except Exception as error:
        print(f"Errore nel salvataggio feedback: {error}")
        return jsonify({"error": "Errore interno del server."}), 500

@app.route('/api/feedback', methods=['GET'])
def get_feedback():
    conn = None
    cur = None
    try:
        limit = min(int(request.args.get('limit', 10)), 50)  # max 50
        
        print(f"[DB] Recupero feedback (limit={limit})...")
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute(
            "SELECT * FROM feedbacks ORDER BY timestamp DESC LIMIT %s",
            (limit,)
        )
        feedbacks = cur.fetchall()
        
        return jsonify({
            "success": True,
            "data": feedbacks,
            "totale": len(feedbacks)
        })
        
    except Exception as error:
        print(f"Errore nel recupero feedback: {error}")
        import traceback
        print(f"[ERROR] Traceback: {traceback.format_exc()}")
        return jsonify({"error": f"Errore interno del server: {str(error)}"}), 500
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()

# ================================
# API ENDPOINTS - PROMEMORIA
# ================================
@app.route('/api/reminder', methods=['POST'])
def post_reminder():
    try:
        dati = request.get_json()
        contact = dati.get('contact', '').strip()
        
        if not contact:
            return jsonify({"error": "Il contatto è obbligatorio."}), 400
        
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute(
            """
            INSERT INTO reminder_requests (contact)
            VALUES (%s)
            RETURNING id
            """,
            (contact,)
        )
        reminder_id = cur.fetchone()["id"]
        conn.commit()
        cur.close()
        conn.close()
        
        nuovo_promemoria = {
            "id": str(reminder_id),
            "contact": contact,
            "timestamp": datetime.now().isoformat()
        }
        
        return jsonify({
            "success": True,
            "promemoria": nuovo_promemoria,
            "message": "Richiesta promemoria salvata!"
        })
        
    except Exception as error:
        print(f"Errore nel salvataggio promemoria: {error}")
        return jsonify({"error": "Errore interno del server."}), 500

@app.route('/api/reminder', methods=['GET'])
def get_reminder():
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute(
            "SELECT * FROM reminder_requests ORDER BY timestamp DESC LIMIT 20"
        )
        reminders = cur.fetchall()
        cur.close()
        conn.close()
        
        return jsonify({
            "success": True,
            "data": reminders,
            "totale": len(reminders)
        })
        
    except Exception as error:
        print(f"Errore nel recupero promemoria: {error}")
        return jsonify({"error": "Errore interno del server."}), 500

# ================================
# API ENDPOINTS - STATISTICHE
# ================================
@app.route('/api/stats', methods=['GET'])
def get_stats():
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        # Stats prenotazioni
        cur.execute("SELECT COUNT(*) as totale, SUM(ospiti) as ospiti_totali FROM prenotazioni")
        stats_prenotazioni = cur.fetchone()
        
        # Stats feedback
        cur.execute("SELECT COUNT(*) as totale, AVG(rating) as rating_medio FROM feedbacks")
        stats_feedback = cur.fetchone()
        
        # Stats reminder
        cur.execute("SELECT COUNT(*) as totale FROM reminder_requests")
        stats_reminder = cur.fetchone()
        
        cur.close()
        conn.close()
        
        stats = {
            "prenotazioni": {
                "totale": stats_prenotazioni["totale"] or 0,
                "ospiti_totali": stats_prenotazioni["ospiti_totali"] or 0
            },
            "feedback": {
                "totale": stats_feedback["totale"] or 0,
                "rating_medio": f"{stats_feedback['rating_medio']:.1f}" if stats_feedback["rating_medio"] else "0"
            },
            "promemoria": {
                "totale": stats_reminder["totale"] or 0
            },
            "tavoli": {
                "totale": len(TAVOLI),
                "prenotabili": len(TAVOLI_CONFIG["standard"]),
                "riservati": len(TAVOLI_CONFIG["riservati"])
            }
        }
        
        return jsonify({
            "success": True,
            "data": stats
        })
        
    except Exception as error:
        print(f"Errore nel recupero statistiche: {error}")
        return jsonify({"error": "Errore interno del server."}), 500

# ================================
# ROUTES ADMIN DASHBOARD
# ================================

@app.route('/admin-login', methods=['GET', 'POST'])
def admin_login():
    """Schermata login admin con form HTML"""
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        
        if username in ADMIN_CREDENTIALS and check_password_hash(ADMIN_CREDENTIALS[username], password):
            session['admin_logged_in'] = True
            session['admin_username'] = username
            return redirect(url_for('admin_dashboard'))
        else:
            error = "Credenziali non valide"
            return render_template_string(LOGIN_HTML, error=error)
    
    return render_template_string(LOGIN_HTML, error=None)

@app.route('/admin-logout')
def admin_logout():
    """Logout admin"""
    session.pop('admin_logged_in', None)
    session.pop('admin_username', None)
    return redirect(url_for('admin_login'))

@app.route('/admin-dashboard')
@admin_required
def admin_dashboard():
    """Dashboard admin principale"""
    return render_template_string(DASHBOARD_HTML, username=session.get('admin_username'))

# API per CRUD Eventi
@app.route('/api/admin/eventi', methods=['GET'])
@admin_required
def get_eventi():
    """Ottieni lista eventi"""
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("SELECT * FROM eventi ORDER BY data ASC")
        eventi = cur.fetchall()
        cur.close()
        conn.close()
        return jsonify({"success": True, "data": eventi})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/admin/eventi', methods=['POST'])
@admin_required
def create_evento():
    """Crea nuovo evento"""
    try:
        data = request.get_json()
        nome = data['nome']
        data_evento = data['data']
        luogo = data['luogo']
        descrizione = data.get('descrizione', '')
        
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("""
            INSERT INTO eventi (nome, data, luogo, descrizione)
            VALUES (%s, %s, %s, %s) RETURNING id
        """, (nome, data_evento, luogo, descrizione))
        evento_id = cur.fetchone()['id']
        conn.commit()
        cur.close()
        conn.close()
        
        return jsonify({"success": True, "id": evento_id})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/admin/eventi/<int:evento_id>', methods=['PUT'])
@admin_required
def update_evento(evento_id):
    """Aggiorna evento esistente"""
    try:
        data = request.get_json()
        nome = data['nome']
        data_evento = data['data']
        luogo = data['luogo']
        descrizione = data.get('descrizione', '')
        
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("""
            UPDATE eventi SET nome=%s, data=%s, luogo=%s, descrizione=%s, updated_at=CURRENT_TIMESTAMP
            WHERE id=%s
        """, (nome, data_evento, luogo, descrizione, evento_id))
        conn.commit()
        cur.close()
        conn.close()
        
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/admin/eventi/<int:evento_id>', methods=['DELETE'])
@admin_required
def delete_evento(evento_id):
    """Cancella evento"""
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("DELETE FROM eventi WHERE id=%s", (evento_id,))
        conn.commit()
        cur.close()
        conn.close()
        
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

# API per CRUD Menu
@app.route('/api/admin/menu', methods=['GET'])
@admin_required
def get_menu():
    """Ottieni lista voci menu"""
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("SELECT * FROM menu_items ORDER BY categoria, nome")
        menu = cur.fetchall()
        cur.close()
        conn.close()
        return jsonify({"success": True, "data": menu})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/admin/menu', methods=['POST'])
@admin_required
def create_menu_item():
    """Crea nuova voce menu"""
    try:
        data = request.get_json()
        nome = data['nome']
        descrizione = data.get('descrizione', '')
        prezzo = data.get('prezzo')
        categoria = data['categoria']
        disponibile = data.get('disponibile', True)
        
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("""
            INSERT INTO menu_items (nome, descrizione, prezzo, categoria, disponibile)
            VALUES (%s, %s, %s, %s, %s) RETURNING id
        """, (nome, descrizione, prezzo, categoria, disponibile))
        item_id = cur.fetchone()['id']
        conn.commit()
        cur.close()
        conn.close()
        
        return jsonify({"success": True, "id": item_id})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/admin/menu/<int:item_id>', methods=['PUT'])
@admin_required
def update_menu_item(item_id):
    """Aggiorna voce menu"""
    try:
        data = request.get_json()
        nome = data['nome']
        descrizione = data.get('descrizione', '')
        prezzo = data.get('prezzo')
        categoria = data['categoria']
        disponibile = data.get('disponibile', True)
        
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("""
            UPDATE menu_items SET nome=%s, descrizione=%s, prezzo=%s, categoria=%s, disponibile=%s, updated_at=CURRENT_TIMESTAMP
            WHERE id=%s
        """, (nome, descrizione, prezzo, categoria, disponibile, item_id))
        conn.commit()
        cur.close()
        conn.close()
        
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/admin/menu/<int:item_id>', methods=['DELETE'])
@admin_required
def delete_menu_item(item_id):
    """Cancella voce menu"""
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("DELETE FROM menu_items WHERE id=%s", (item_id,))
        conn.commit()
        cur.close()
        conn.close()
        
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

# API per statistiche dashboard
@app.route('/api/admin/stats', methods=['GET'])
@admin_required
def get_admin_stats():
    """Statistiche per dashboard admin"""
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        # Conteggi
        cur.execute("SELECT COUNT(*) as totale FROM eventi")
        eventi_count = cur.fetchone()['totale']
        
        cur.execute("SELECT COUNT(*) as totale FROM menu_items")
        menu_count = cur.fetchone()['totale']
        
        cur.execute("SELECT COUNT(*) as totale FROM prenotazioni")
        prenotazioni_count = cur.fetchone()['totale']
        
        cur.close()
        conn.close()
        
        stats = {
            "eventi": eventi_count,
            "menu_items": menu_count,
            "prenotazioni": prenotazioni_count
        }
        
        return jsonify({"success": True, "data": stats})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

# ================================
# GESTIONE ERRORI GLOBALI
# ================================
@app.errorhandler(404)
def not_found(error):
    return jsonify({
        "error": "Endpoint non trovato",
        "path": request.path
    }), 404

@app.errorhandler(500)
def internal_error(error):
    print(f"Errore non gestito: {error}")
    return jsonify({
        "error": "Errore interno del server"
    }), 500

# ================================
# GESTIONE CHIUSURA GRACEFUL
# ================================
def signal_handler(sig, frame):
    print(f"\n[SIGNAL] Ricevuto segnale {sig}, chiusura graceful...")
    print("[OK] Server chiuso correttamente")
    sys.exit(0)

signal.signal(signal.SIGINT, signal_handler)
signal.signal(signal.SIGTERM, signal_handler)

# ================================
# AVVIO SERVER
# ================================
def start_server():
    try:
        print(f"[SERVER] Backend Festa dello Sport avviato su http://localhost:{PORT}")
        print(f"[DB] Database PostgreSQL: {DATABASE_URL[:30]}...")
        print(f"[CONFIG] Configurazione tavoli: {len(TAVOLI_CONFIG['standard'])} prenotabili, {len(TAVOLI_CONFIG['riservati'])} riservati")
        
        # Per produzione, usa Gunicorn invece di app.run()
        # Comando: gunicorn -w 4 -b 0.0.0.0:3001 backend:app
        # Per sviluppo locale, usa app.run()
        if os.environ.get('FLASK_ENV') == 'development':
            app.run(host='0.0.0.0', port=PORT, debug=False, threaded=True)
        else:
            # In produzione, Gunicorn gestirà il server
            # Questo codice non verrà eseguito se usi Gunicorn
            from werkzeug.serving import run_simple
            run_simple('0.0.0.0', PORT, app, threaded=True)
        
    except Exception as error:
        print(f"[ERROR] Errore nell'avvio del server: {error}")
        sys.exit(1)

if __name__ == "__main__":
    start_server()