#!/usr/bin/env python3
"""
Script sicuro per creare backup, svuotare tabelle e resettare sqlite_sequence.
Uso:
  py -3 clear_db.py        # chiede conferma
  py -3 clear_db.py --yes  # procede senza prompt
"""
import os
import sqlite3
import shutil
import sys
from datetime import datetime

DB_DIR = os.path.dirname(__file__)
DB_PATH = os.path.join(DB_DIR, "festa_sport.db")
BACKUP_DIR = os.path.join(DB_DIR, "backups")

# Prova a riusare la funzione di backup già presente
try:
    from backup_db import create_backup as _create_backup
except Exception:
    _create_backup = None

TABLES_TO_CLEAR = ["prenotazioni", "feedbacks", "reminder_requests"]


def fallback_backup():
    try:
        os.makedirs(BACKUP_DIR, exist_ok=True)
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        dest = os.path.join(BACKUP_DIR, f"festa_sport_backup_{timestamp}.db")
        shutil.copy2(DB_PATH, dest)
        print(f"[OK] Backup creato: {dest}")
        return True
    except Exception as e:
        print(f"[ERROR] Backup fallback fallito: {e}")
        return False


def do_backup():
    if not os.path.exists(DB_PATH):
        print(f"[ERROR] Database non trovato: {DB_PATH}")
        return False

    if _create_backup:
        try:
            # la funzione in backup_db restituisce True/False
            return _create_backup()
        except Exception as e:
            print(f"[WARN] create_backup() ha fallito: {e}")
            return fallback_backup()
    else:
        return fallback_backup()


def clear_and_reset():
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    for t in TABLES_TO_CLEAR:
        cur.execute(f"DELETE FROM {t};")
        print(f"[OK] Cancellate righe da: {t}")

    # Azzeramento delle sequenze AUTOINCREMENT
    try:
        # Usare DELETE per rimuovere le righe corrispondenti nella tabella sqlite_sequence
        placeholders = ",".join(["?" for _ in TABLES_TO_CLEAR])
        cur.execute(f"DELETE FROM sqlite_sequence WHERE name IN ({placeholders});", TABLES_TO_CLEAR)
        print("[OK] Resettati gli autoincrement in sqlite_sequence")
    except sqlite3.OperationalError as e:
        # Se sqlite_sequence non esiste (improbabile), logga e continua
        print(f"[WARN] Impossibile resettare sqlite_sequence: {e}")

    conn.commit()
    # Riduce il file DB e rimuove spazio non usato
    cur.execute("VACUUM;")
    conn.close()
    print("[OK] VACUUM completato")


if __name__ == '__main__':
    if not os.path.exists(DB_PATH):
        print(f"[ERROR] Database non trovato: {DB_PATH}")
        sys.exit(1)

    auto_yes = any(arg in ("--yes", "-y") for arg in sys.argv[1:])

    print("ATTENZIONE: questa operazione cancellerà i dati definitivi nelle tabelle:")
    for t in TABLES_TO_CLEAR:
        print(f" - {t}")
    print("Verrà inoltre azzerato l'autoincrement (sqlite_sequence) e eseguito VACUUM.")

    if not auto_yes:
        ans = input("Procedere? (yes/no) ").strip().lower()
        if ans not in ("y", "yes"):
            print("Operazione annullata.")
            sys.exit(0)

    print("[INFO] Eseguo backup prima della cancellazione...")
    ok = do_backup()
    if not ok:
        print("[WARN] Backup fallito o non riuscito. Procedo comunque su richiesta.")

    try:
        clear_and_reset()
        print("[OK] Database svuotato e sequenze resettate.")
    except Exception as e:
        print(f"[ERROR] Errore durante la pulizia del DB: {e}")
        sys.exit(1)
