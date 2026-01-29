# Setup Google OAuth per Dashboard Admin

## 1. Creazione Progetto Google Cloud

1. Vai su [Google Cloud Console](https://console.cloud.google.com/)
2. Crea un nuovo progetto o seleziona uno esistente
3. Abilita l'API Google+ (per userinfo) e Google OAuth2

## 2. Configurazione OAuth

1. Nel menu laterale, vai su "API e servizi" > "Credenziali"
2. Clicca "Crea credenziali" > "ID client OAuth"
3. Scegli "Applicazione web"
4. Aggiungi URI di reindirizzamento autorizzati:
   - Per sviluppo locale: `http://localhost:3001/login/google/callback`
   - Per produzione: `https://tuodominio.com/login/google/callback`

## 3. Ottieni Credenziali

Dopo la creazione, ottieni:
- **Client ID**: Il tuo Google Client ID
- **Client Secret**: Il tuo Google Client Secret

## 4. Configurazione Ambiente

Aggiungi le variabili d'ambiente al tuo sistema:

### Su Windows (PowerShell):
```powershell
$env:GOOGLE_CLIENT_ID="your_google_client_id_here"
$env:GOOGLE_CLIENT_SECRET="your_google_client_secret_here"
```

### Su Linux/Mac:
```bash
export GOOGLE_CLIENT_ID="your_google_client_id_here"
export GOOGLE_CLIENT_SECRET="your_google_client_secret_here"
```

### Per deploy (es. Render, Heroku):
Aggiungi le variabili nelle impostazioni del tuo servizio di hosting.

## 5. Aggiunta Email Admin

Nel database PostgreSQL, aggiungi le email autorizzate:

```sql
INSERT INTO admin_emails (email, nome) VALUES
('admin@tudominio.com', 'Nome Admin'),
('altroadmin@tudominio.com', 'Altro Admin');
```

## 6. Test

1. Avvia il backend: `python backend.py`
2. Vai su `http://localhost:3001/dashboard/login.html`
3. Clicca "Login con Google"
4. Accedi con un account Google autorizzato
5. Verrai reindirizzato alla dashboard se l'email è nella lista admin

## Note Sicurezza

- **NON** committare mai le credenziali Google nel codice
- Usa sempre HTTPS in produzione
- Limita gli URI di reindirizzamento solo ai domini necessari
- Mantieni aggiornata la lista delle email admin autorizzate

## Troubleshooting

- **Errore "redirect_uri_mismatch"**: Verifica che l'URI di callback sia esattamente quello configurato in Google Cloud
- **"Email non autorizzata"**: Assicurati che l'email sia presente nella tabella `admin_emails`
- **Sessioni non persistenti**: Verifica che `app.secret_key` sia impostata correttamente