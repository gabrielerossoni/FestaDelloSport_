import sqlite3
import json
import signal
import sys
from datetime import datetime
from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import threading

# ================================
# CONFIGURAZIONE SERVER
# ================================
app = Flask(__name__)
# CORS configurato per produzione - MODIFICA CON IL TUO DOMINIO
ALLOWED_ORIGINS = [
    "https://gabrielerossoni.github.io/FestaDelloSport_/",  # GitHub Pages
    #"https://festa-sport-capralba.it",    Dominio personalizzato (se lo hai)
    "http://localhost:3000",               # Per test locali
    "http://127.0.0.1:5500",               # Per test locali (Live Server)
]

CORS(app, resources={
    r"/api/*": {
        "origins": ALLOWED_ORIGINS,
        "methods": ["GET", "POST"],
        "allow_headers": ["Content-Type"]
    }
})
PORT = 3001

# Middleware per logging delle richieste
@app.before_request
def log_request():
    print(f"[REQUEST] {request.method} {request.url}")

# ================================
# DATABASE SETUP
# ================================
DB_PATH = os.path.join(os.path.dirname(__file__), "festa_sport.db")
db_lock = threading.Lock()

def get_db_connection():
    """Crea una nuova connessione al database"""
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.execute("PRAGMA foreign_keys = ON")
    conn.row_factory = sqlite3.Row  # Per accedere alle colonne per nome
    return conn

def init_database():
    """Inizializza il database SQLite"""
    try:
        print("[CONFIG] Inizializzazione database SQLite...")
        
        with db_lock:
            conn = get_db_connection()
            
            # Crea tabelle se non esistono
            conn.executescript('''
                CREATE TABLE IF NOT EXISTS prenotazioni (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    nome TEXT NOT NULL,
                    telefono TEXT NOT NULL,
                    data TEXT NOT NULL,
                    ora TEXT NOT NULL,
                    ospiti INTEGER NOT NULL,
                    tavolo TEXT NOT NULL,
                    note TEXT DEFAULT '',
                    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
                );

                CREATE TABLE IF NOT EXISTS feedbacks (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    nome TEXT DEFAULT 'Anonimo',
                    rating INTEGER NOT NULL CHECK (rating >= 0 AND rating <= 5),
                    message TEXT NOT NULL,
                    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
                );

                CREATE TABLE IF NOT EXISTS reminder_requests (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    contact TEXT NOT NULL,
                    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
                );

                -- Indici per migliorare le performance
                CREATE INDEX IF NOT EXISTS idx_prenotazioni_data_ora ON prenotazioni(data, ora);
                CREATE INDEX IF NOT EXISTS idx_prenotazioni_tavolo ON prenotazioni(tavolo);
                CREATE INDEX IF NOT EXISTS idx_feedbacks_timestamp ON feedbacks(timestamp);
                CREATE INDEX IF NOT EXISTS idx_reminder_timestamp ON reminder_requests(timestamp);
            ''')
            
            conn.commit()
            conn.close()

        print("[OK] Database SQLite inizializzato correttamente")
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
# UTILITY FUNCTIONS
# ================================
def calcola_posti_occupati(data, ora, tavolo=None):
    """Calcola i posti occupati per data/ora specifici"""
    try:
        with db_lock:
            conn = get_db_connection()
            
            if tavolo:
                # Calcola posti occupati per un tavolo specifico
                cursor = conn.execute(
                    "SELECT SUM(ospiti) as ospiti_totali FROM prenotazioni WHERE data = ? AND ora = ? AND tavolo = ?",
                    (data, ora, tavolo)
                )
                result = cursor.fetchone()
                ospiti_totali = result["ospiti_totali"] if result["ospiti_totali"] else 0
                conn.close()
                return ospiti_totali
            else:
                # Calcola posti occupati per tutti i tavoli
                cursor = conn.execute(
                    "SELECT tavolo, SUM(ospiti) as ospiti_totali FROM prenotazioni WHERE data = ? AND ora = ? GROUP BY tavolo",
                    (data, ora)
                )
                results = cursor.fetchall()
                occupati = {}
                for row in results:
                    occupati[row["tavolo"]] = row["ospiti_totali"]
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

def dict_from_row(row):
    """Converte una Row di sqlite3 in dizionario"""
    return {key: row[key] for key in row.keys()}

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
# API ENDPOINTS - PRENOTAZIONI
# ================================
@app.route('/api/prenota', methods=['POST'])
def prenota():
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
        with db_lock:
            conn = get_db_connection()
            cursor = conn.execute(
                "INSERT INTO prenotazioni (nome, telefono, data, ora, ospiti, tavolo, note) VALUES (?, ?, ?, ?, ?, ?, ?)",
                (nome.strip(), telefono.strip(), data, ora, posti_richiesti, tavolo, note.strip())
            )
            
            prenotazione_id = cursor.lastrowid
            conn.commit()
            conn.close()
        
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
        
        print(f"[OK] Prenotazione inserita con ID: {prenotazione_id}")
        
        return jsonify({
            "success": True,
            "prenotazione": nuova_prenotazione,
            "message": "Prenotazione effettuata con successo!"
        })
        
    except Exception as error:
        print(f"[ERROR] Errore nella prenotazione: {error}")
        return jsonify({"error": "Errore interno del server."}), 500

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
            query += " AND data = ?"
            params.append(data)
        if ora:
            query += " AND ora = ?"
            params.append(ora)
        if tavolo:
            query += " AND tavolo = ?"
            params.append(tavolo)
            
        query += " ORDER BY data DESC, ora DESC LIMIT ?"
        params.append(limit)
        
        with db_lock:
            conn = get_db_connection()
            cursor = conn.execute(query, params)
            rows = cursor.fetchall()
            prenotazioni = [dict_from_row(row) for row in rows]
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
        
        with db_lock:
            conn = get_db_connection()
            cursor = conn.execute(
                "INSERT INTO feedbacks (nome, rating, message) VALUES (?, ?, ?)",
                (nome.strip(), rating, message)
            )
            feedback_id = cursor.lastrowid
            conn.commit()
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
    try:
        limit = min(int(request.args.get('limit', 10)), 50)  # max 50
        
        with db_lock:
            conn = get_db_connection()
            cursor = conn.execute(
                "SELECT * FROM feedbacks ORDER BY timestamp DESC LIMIT ?",
                (limit,)
            )
            rows = cursor.fetchall()
            feedbacks = [dict_from_row(row) for row in rows]
            conn.close()
        
        return jsonify({
            "success": True,
            "data": feedbacks,
            "totale": len(feedbacks)
        })
        
    except Exception as error:
        print(f"Errore nel recupero feedback: {error}")
        return jsonify({"error": "Errore interno del server."}), 500

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
        
        with db_lock:
            conn = get_db_connection()
            cursor = conn.execute(
                "INSERT INTO reminder_requests (contact) VALUES (?)",
                (contact,)
            )
            reminder_id = cursor.lastrowid
            conn.commit()
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
        with db_lock:
            conn = get_db_connection()
            cursor = conn.execute(
                "SELECT * FROM reminder_requests ORDER BY timestamp DESC LIMIT 20"
            )
            rows = cursor.fetchall()
            reminders = [dict_from_row(row) for row in rows]
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
        with db_lock:
            conn = get_db_connection()
            
            # Stats prenotazioni
            cursor = conn.execute("SELECT COUNT(*) as totale, SUM(ospiti) as ospiti_totali FROM prenotazioni")
            stats_prenotazioni = cursor.fetchone()
            
            # Stats feedback
            cursor = conn.execute("SELECT COUNT(*) as totale, AVG(rating) as rating_medio FROM feedbacks")
            stats_feedback = cursor.fetchone()
            
            # Stats reminder
            cursor = conn.execute("SELECT COUNT(*) as totale FROM reminder_requests")
            stats_reminder = cursor.fetchone()
            
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
        init_database()
        
        print(f"[SERVER] Backend Festa dello Sport avviato su http://localhost:{PORT}")
        print(f"[DB] Database SQLite: {DB_PATH}")
        print(f"[CONFIG] Configurazione tavoli: {len(TAVOLI_CONFIG['standard'])} prenotabili, {len(TAVOLI_CONFIG['riservati'])} riservati")
        
        app.run(host='0.0.0.0', port=PORT, debug=False, threaded=True)
        
    except Exception as error:
        print(f"[ERROR] Errore nell'avvio del server: {error}")
        sys.exit(1)

if __name__ == "__main__":
    start_server()