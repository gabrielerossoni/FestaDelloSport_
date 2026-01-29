
from functools import wraps
from flask import session, jsonify

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
