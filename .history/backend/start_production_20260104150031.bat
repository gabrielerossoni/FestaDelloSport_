@echo off
REM Script per avviare il backend in produzione su Windows
REM Per Linux/Unix, usa start_production.sh con Gunicorn

echo [INFO] Avvio backend in modalità produzione...

REM Verifica che Python sia installato
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python non trovato. Installa Python prima di continuare.
    exit /b 1
)

REM Verifica se siamo nella directory corretta
if not exist "backend2.py" (
    echo [ERROR] File backend2.py non trovato. Assicurati di essere nella directory backend.
    exit /b 1
)

REM Prova prima con Waitress (server WSGI per Windows)
python -c "import waitress" >nul 2>&1
if not errorlevel 1 (
    echo [INFO] Utilizzo Waitress come server WSGI...
    python -c "from waitress import serve; from backend import app; serve(app, host='0.0.0.0', port=3001, threads=4)"
) else (
    echo [WARNING] Waitress non trovato. Installa con: pip install waitress
    echo [INFO] Avvio con Flask development server (non raccomandato per produzione)...
    echo [INFO] Per produzione su Windows, installa Waitress: pip install waitress
    set FLASK_ENV=production
    python backend.py
)