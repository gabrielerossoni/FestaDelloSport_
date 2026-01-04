#!/bin/bash
# Script per avviare il backend in produzione con Gunicorn

echo "[INFO] Avvio backend in modalità produzione..."

# Verifica che Gunicorn sia installato
if ! command -v gunicorn &> /dev/null; then
    echo "[ERROR] Gunicorn non trovato. Installa con: pip install gunicorn"
    exit 1
fi

# Avvia con Gunicorn (4 worker processes)
gunicorn -w 4 -b 0.0.0.0:3001 --timeout 120 --access-logfile - --error-logfile - backend2:app