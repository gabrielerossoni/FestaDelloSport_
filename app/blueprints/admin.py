
from flask import Blueprint, request, jsonify, session, redirect, render_template, url_for
from werkzeug.security import generate_password_hash, check_password_hash
from app.db import get_db_connection
from app.utils import admin_required

admin_bp = Blueprint('admin', __name__)

# ================================
# ROUTES PAGINE HTML
# ================================
@admin_bp.route('/admin-login', methods=['GET'])
def login_page():
    if 'admin_logged_in' in session:
        return redirect(url_for('admin.dashboard'))
    return render_template('admin/login.html')

@admin_bp.route('/admin')
def admin_redirect():
    return redirect(url_for('admin.login_page'))

@admin_bp.route('/admin-dashboard', methods=['GET'])
@admin_required
def dashboard():
    return render_template('admin/dashboard.html')

# ================================
# AUTH
# ================================
@admin_bp.route('/admin-login', methods=['POST'])
def login():
    username = request.form.get('username')
    password = request.form.get('password')
    
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("SELECT * FROM users WHERE username = %s", (username,))
        user = cur.fetchone()
        cur.close()
        conn.close()
        
        if user and check_password_hash(user['password_hash'], password):
            session['admin_logged_in'] = True
            session['admin_username'] = username
            session['admin_role'] = user['role']
            return redirect(url_for('admin.dashboard'))
        else:
            return render_template('admin/login.html', error="Credenziali non valide")
    except Exception as e:
        print(f"Login error: {e}")
        return render_template('admin/login.html', error="Errore server")

@admin_bp.route('/admin-logout')
def logout():
    session.pop('admin_logged_in', None)
    session.pop('admin_username', None)
    session.pop('admin_role', None)
    return redirect(url_for('admin.login_page'))

# ================================
# USER MANAGEMENT APIs
# ================================
@admin_bp.route('/api/admin/users', methods=['GET'])
@admin_required
def get_users():
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("SELECT id, username, role, created_at FROM users ORDER BY username")
        users = cur.fetchall()
        cur.close()
        conn.close()
        return jsonify({"success": True, "data": users})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@admin_bp.route('/api/admin/users', methods=['POST'])
@admin_required
def create_user():
    # Solo admin può creare
    if session.get('admin_role') != 'admin':
        return jsonify({"success": False, "error": "Unauthorized"}), 403
        
    try:
        data = request.get_json()
        username = data['username']
        password = data['password']
        role = data.get('role', 'staff')
        
        pwd_hash = generate_password_hash(password)
        
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("INSERT INTO users (username, password_hash, role) VALUES (%s, %s, %s) RETURNING id", (username, pwd_hash, role))
        new_id = cur.fetchone()['id']
        conn.commit()
        cur.close()
        conn.close()
        return jsonify({"success": True, "id": new_id})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@admin_bp.route('/api/admin/users/<int:user_id>', methods=['DELETE'])
@admin_required
def delete_user(user_id):
    if session.get('admin_role') != 'admin':
        return jsonify({"success": False, "error": "Unauthorized"}), 403
        
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        # Prevent self-deletion if needed, or deleting the last admin
        cur.execute("DELETE FROM users WHERE id = %s", (user_id,))
        conn.commit()
        cur.close()
        conn.close()
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

# ================================
# API ADMIN
# ================================

# EVENTI
@admin_bp.route('/api/admin/eventi', methods=['GET'])
@admin_required
def get_eventi():
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

@admin_bp.route('/api/admin/eventi', methods=['POST'])
@admin_required
def create_evento():
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

@admin_bp.route('/api/admin/eventi/<int:evento_id>', methods=['GET'])
@admin_required
def get_evento(evento_id):
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("SELECT * FROM eventi WHERE id=%s", (evento_id,))
        evento = cur.fetchone()
        cur.close()
        conn.close()
        if evento:
            return jsonify({"success": True, "data": evento})
        else:
            return jsonify({"success": False, "error": "Evento non trovato"}), 404
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@admin_bp.route('/api/admin/eventi/<int:evento_id>', methods=['PUT'])
@admin_required
def update_evento(evento_id):
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

@admin_bp.route('/api/admin/eventi/<int:evento_id>', methods=['DELETE'])
@admin_required
def delete_evento(evento_id):
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

# MENU
@admin_bp.route('/api/admin/menu', methods=['GET'])
@admin_required
def get_menu():
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

@admin_bp.route('/api/admin/menu/<int:item_id>', methods=['GET'])
@admin_required
def get_menu_item(item_id):
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("SELECT * FROM menu_items WHERE id=%s", (item_id,))
        item = cur.fetchone()
        cur.close()
        conn.close()
        if item:
            return jsonify({"success": True, "data": item})
        else:
            return jsonify({"success": False, "error": "Voce menu non trovata"}), 404
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@admin_bp.route('/api/admin/menu', methods=['POST'])
@admin_required
def create_menu_item():
    try:
        data = request.get_json()
        nome = data['nome']
        descrizione = data.get('descrizione', '')
        prezzo = data.get('prezzo')
        allergeni = data.get('allergeni', '')
        categoria = data['categoria']
        disponibile = data.get('disponibile', True)
        
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("""
            INSERT INTO menu_items (nome, descrizione, prezzo, allergeni, categoria, disponibile)
            VALUES (%s, %s, %s, %s, %s, %s) RETURNING id
        """, (nome, descrizione, prezzo, allergeni, categoria, disponibile))
        item_id = cur.fetchone()['id']
        conn.commit()
        cur.close()
        conn.close()
        
        return jsonify({"success": True, "id": item_id})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@admin_bp.route('/api/admin/menu/<int:item_id>', methods=['PUT'])
@admin_required
def update_menu_item(item_id):
    try:
        data = request.get_json()
        nome = data['nome']
        descrizione = data.get('descrizione', '')
        prezzo = data.get('prezzo', 0)
        allergeni = data.get('allergeni', '')
        categoria = data['categoria']
        disponibile = data.get('disponibile', True)
        
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("""
            UPDATE menu_items SET nome=%s, descrizione=%s, prezzo=%s, allergeni=%s, categoria=%s, disponibile=%s, updated_at=CURRENT_TIMESTAMP
            WHERE id=%s
        """, (nome, descrizione, prezzo, allergeni, categoria, disponibile, item_id))
        conn.commit()
        cur.close()
        conn.close()
        
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@admin_bp.route('/api/admin/menu/<int:item_id>', methods=['DELETE'])
@admin_required
def delete_menu_item(item_id):
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

# STATS
@admin_bp.route('/api/admin/stats', methods=['GET'])
@admin_required
def get_admin_stats():
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
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
