
from functools import wraps
from flask import session, jsonify
from app.db import get_db_connection

# Table configuration
TAVOLI_CONFIG = {
    "riservati": ["1", "2", "41", "42", "43", "44", "45", "46", "47", "48"],
    "standard": [
        "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13", "14", "15",
        "16", "17", "18", "20", "21", "22", "23", "24", "25", "26", "27", "28",
        "29", "30", "31", "32", "33", "34", "35", "36", "37", "38", "39", "40"
    ]
}

TAVOLI = {}
for t in TAVOLI_CONFIG["riservati"]:
    TAVOLI[t] = 0
for t in TAVOLI_CONFIG["standard"]:
    TAVOLI[t] = 10

def admin_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'admin_logged_in' not in session:
            return jsonify({"error": "Accesso negato. Effettua il login."}), 401
        return f(*args, **kwargs)
    return decorated_function

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
            ospiti_totali = result["ospiti_totali"] if result and result["ospiti_totali"] else 0
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
