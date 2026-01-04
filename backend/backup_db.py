#!/usr/bin/env python3
"""
Script per backup automatico del database SQLite
Esegui questo script periodicamente (es. con cron job)
"""

import sqlite3
import shutil
import os
from datetime import datetime

DB_PATH = os.path.join(os.path.dirname(__file__), "festa_sport.db")
BACKUP_DIR = os.path.join(os.path.dirname(__file__), "backups")

def create_backup():
    """Crea un backup del database"""
    try:
        # Crea la cartella backups se non esiste
        os.makedirs(BACKUP_DIR, exist_ok=True)
        
        # Genera nome file backup con timestamp
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_filename = f"festa_sport_backup_{timestamp}.db"
        backup_path = os.path.join(BACKUP_DIR, backup_filename)
        
        # Verifica che il database esista
        if not os.path.exists(DB_PATH):
            print(f"[ERROR] Database non trovato: {DB_PATH}")
            return False
        
        # Copia il database
        shutil.copy2(DB_PATH, backup_path)
        
        print(f"[OK] Backup creato: {backup_path}")
        
        # Mantieni solo gli ultimi 30 backup (opzionale)
        cleanup_old_backups(BACKUP_DIR, keep_last=30)
        
        return True
        
    except Exception as error:
        print(f"[ERROR] Errore durante il backup: {error}")
        return False

def cleanup_old_backups(backup_dir, keep_last=30):
    """Rimuove i backup più vecchi, mantenendo solo gli ultimi N"""
    try:
        backup_files = [
            os.path.join(backup_dir, f) 
            for f in os.listdir(backup_dir) 
            if f.startswith("festa_sport_backup_") and f.endswith(".db")
        ]
        
        # Ordina per data di modifica (più recenti prima)
        backup_files.sort(key=lambda x: os.path.getmtime(x), reverse=True)
        
        # Rimuovi i backup più vecchi
        if len(backup_files) > keep_last:
            for old_backup in backup_files[keep_last:]:
                os.remove(old_backup)
                print(f"[INFO] Rimosso backup vecchio: {os.path.basename(old_backup)}")
                
    except Exception as error:
        print(f"[WARNING] Errore durante la pulizia backup: {error}")

if __name__ == "__main__":
    create_backup()