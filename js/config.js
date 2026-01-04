const CONFIG = {
  API_BASE_URL: (() => {
    // Se siamo in localhost o 127.0.0.1, usa il backend locale
    const hostname = window.location.hostname;
    if (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === ""
    ) {
      return "http://localhost:3001";
    }
    // Altrimenti usa l'URL di produzione (modifica con il tuo URL reale)
    // Esempio: return 'https://tuo-backend.herokuapp.com';
    // Per ora, se non sei in locale, prova comunque localhost (per test)
    console.warn(
      "ATTENZIONE: Configura l'URL del backend di produzione in config.js"
    );
    return "http://localhost:3001";
  })(),
};
