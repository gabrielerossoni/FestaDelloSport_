
from flask import Blueprint, request, jsonify
from datetime import datetime
from app.db import get_db_connection
from app.utils import TAVOLI, TAVOLI_CONFIG, calcola_posti_occupati, valida_prenotazione

api_bp = Blueprint('api', __name__)

# ================================
# API ENDPOINTS - TAVOLI
# ================================
@api_bp.route('/tavoli', methods=['GET'])
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

@api_bp.route('/tavoli/info', methods=['GET'])
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
@api_bp.route('/health', methods=['GET'])
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
@api_bp.route('/prenota', methods=['POST'])
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
            return jsonify({"error": "Numero ospiti non valido."}), 400
        
        # Controllo disponibilità
        posti_occupati = calcola_posti_occupati(data, ora, tavolo)
        posti_disponibili = TAVOLI[tavolo] - posti_occupati
        
        if posti_richiesti > posti_disponibili:
            return jsonify({
                "error": "Non ci sono abbastanza posti disponibili su questo tavolo.",
                "info": {
                    "posti_richiesti": posti_richiesti,
                    "posti_disponibili": posti_disponibili,
                    "posti_totali": TAVOLI[tavolo]
                }
            }), 400
        
        # Inserimento prenotazione
        conn = get_db_connection()
        cur = conn.cursor()
        
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
        return jsonify({"error": f"Errore interno del server"}), 500
    finally:
        if cur: cur.close()
        if conn: conn.close()

@api_bp.route('/prenotazioni', methods=['GET'])
def get_prenotazioni():
    try:
        data = request.args.get('data')
        ora = request.args.get('ora')
        tavolo = request.args.get('tavolo')
        limit = min(int(request.args.get('limit', 100)), 500)
        
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
@api_bp.route('/feedback', methods=['POST'])
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

@api_bp.route('/feedback', methods=['GET'])
def get_feedback():
    conn = None
    cur = None
    try:
        limit = min(int(request.args.get('limit', 10)), 50)
        
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
        return jsonify({"error": f"Errore interno del server"}), 500
    finally:
        if cur: cur.close()
        if conn: conn.close()

# ================================
# API ENDPOINTS - PROMEMORIA
# ================================
@api_bp.route('/reminder', methods=['POST'])
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

@api_bp.route('/reminder', methods=['GET'])
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
# API ENDPOINTS - STATISTICHE (Public view? No this was admin/stats but backend had /api/stats too)
# backend.py had /api/stats which was public-ish or at least not admin_required in code.
# ================================
        return jsonify({"error": "Errore interno del server."}), 500

# ================================
# API ENDPOINTS - PUBLIC DATA
# ================================
@api_bp.route('/public/menu', methods=['GET'])
def get_public_menu():
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("SELECT * FROM menu_items WHERE disponibile = TRUE ORDER BY categoria, nome")
        items = cur.fetchall()
        cur.close()
        conn.close()
        
        # Group by category
        menu = {}
        for item in items:
            cat = item['categoria']
            if cat not in menu:
                menu[cat] = []
            menu[cat].append(item)
            
        return jsonify({"success": True, "data": menu})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@api_bp.route('/public/events', methods=['GET'])
def get_public_events():
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        # Fetch events, maybe order by date?
        cur.execute("SELECT * FROM eventi ORDER BY data ASC")
        events = cur.fetchall()
        cur.close()
        conn.close()
        return jsonify({"success": True, "data": events})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500
