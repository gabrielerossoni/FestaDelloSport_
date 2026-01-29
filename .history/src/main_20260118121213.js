/* ================================
   CONFIG
================================ */
const PRODUCTION_API_URL = "https://festadellosport.onrender.com";

const CONFIG = {
  API_BASE_URL: (() => {
    const h = window.location.hostname;
    if (h === "localhost" || h === "127.0.0.1" || h === "") {
      return "http://localhost:3001";
    }
    return PRODUCTION_API_URL;
  })(),
};

/* ================================
   UTILITIES
================================ */
function validatePhone(phone) {
  const clean = phone.replace(/\s|[-\/()]/g, "");
  return /^(\+39|0039)?3\d{9}$/.test(clean);
}

function validateFutureDate(date) {
  const d = new Date(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return d >= today;
}

async function fetchWithRetry(url, options = {}, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const r = await fetch(url, options);
      if (r.ok || i === retries - 1) return r;
    } catch {
      if (i === retries - 1) throw new Error("Errore di rete");
    }
    await new Promise(r => setTimeout(r, 800 * (i + 1)));
  }
}

/* ================================
   REMINDER
================================ */
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("reminder-form");
  if (!form) return;

  form.addEventListener("submit", async e => {
    e.preventDefault();
    const contact = form.contact.value.trim();
    if (!contact) return;

    if (!contact.includes("@") && !validatePhone(contact)) return;

    await fetchWithRetry(`${CONFIG.API_BASE_URL}/api/reminder`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contact }),
    });

    form.reset();
    document.getElementById("reminder-success")?.classList.remove("hidden");
  });
});

/* ================================
   PRENOTAZIONE TAVOLI
================================ */
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("reservation-form");
  if (!form) return;

  form.addEventListener("submit", async e => {
    e.preventDefault();

    const data = Object.fromEntries(new FormData(form));

    if (!validatePhone(data.phone)) return;
    if (!validateFutureDate(data.date)) return;
    if (!form.querySelector("#privacy-consent")?.checked) return;

    const res = await fetchWithRetry(`${CONFIG.API_BASE_URL}/api/prenota`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    const json = await res.json();
    if (json.success) {
      form.reset();
      document.getElementById("reservation-success")?.classList.remove("hidden");
    }
  });
});

/* ================================
   COUNTDOWN
================================ */
document.addEventListener("DOMContentLoaded", () => {
  const target = new Date("2026-05-29T19:00:00");
  setInterval(() => {
    const d = target - new Date();
    if (d <= 0) return;
    document.getElementById("cd-days").textContent = Math.floor(d / 86400000);
  }, 1000);
});

/* ================================
   FEEDBACK
================================ */
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("feedback-form");
  if (!form) return;

  form.addEventListener("submit", async e => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form));

    await fetchWithRetry(`${CONFIG.API_BASE_URL}/api/feedback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    form.reset();
  });
});

/* ================================
   SERVICE WORKER
================================ */
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js");
  });
}
