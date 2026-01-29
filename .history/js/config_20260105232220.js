// ================================
// CONFIGURAZIONE BACKEND URL
// ================================
// IMPORTANTE: Configura l'URL del backend di produzione qui sotto
// Esempi:
//   - Heroku: 'https://tuo-app.herokuapp.com'
//   - Railway: 'https://tuo-app.railway.app'
//   - Render: 'https://tuo-app.onrender.com'
//   - Server proprio: 'https://api.tuodominio.com'
const PRODUCTION_API_URL = "https://festadellosport.onrender.com/"; // <-- MODIFICA QUESTO con il tuo URL di produzione

const CONFIG = {
  API_BASE_URL: (() => {
    const hostname = window.location.hostname;
    const isLocal =
      hostname === "localhost" || hostname === "127.0.0.1" || hostname === "";

    // In sviluppo locale, usa sempre localhost
    if (isLocal) {
      return "http://localhost:3001";
    }

    // In produzione, richiedi configurazione esplicita
    if (!PRODUCTION_API_URL || PRODUCTION_API_URL === null) {
      const errorMsg = `
      `;
      console.error(errorMsg);
      // Lancia un errore che impedisce l'esecuzione
      throw new Error(
        "Backend URL non configurato per produzione. " +
          "Configura PRODUCTION_API_URL in js/config.js"
      );
    }

    return PRODUCTION_API_URL;
  })(),
};
