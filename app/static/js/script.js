// Mappa allergeni a emoji
const ALLERGENI_EMOJI = {
  glutine: "🌾",
  latte: "🥛",
  uova: "🥚",
  "frutta a guscio": "🌰",
  arachidi: "🥜",
  soia: "🫘",
  pesce: "🐟",
  crostacei: "🦐",
  molluschi: "🐙",
  sedano: "🥬",
  senape: "🌭",
  sesamo: "🥯",
  solfiti: "🍷",
  lupini: "🌼",
};

function getAllergeniEmojis(allergeniStr) {
  if (!allergeniStr) return "";
  const allergeni = allergeniStr
    .toLowerCase()
    .split(",")
    .map((s) => s.trim());
  return allergeni
    .map((a) => {
      // Cerca parziale
      for (const [key, emoji] of Object.entries(ALLERGENI_EMOJI)) {
        if (a.includes(key)) return `<span title="${a}">${emoji}</span>`;
      }
      return `<span title="${a}">⚠️</span>`;
    })
    .join(" ");
}

// ... existing code ...

// ... existing code ...
document.addEventListener("DOMContentLoaded", function () {
  const reminderBtn = document.getElementById("reminder-btn");
  const reminderModal = document.getElementById("reminder-modal");
  const closeReminderModal = document.getElementById("close-reminder-modal");
  const reminderForm = document.getElementById("reminder-form");
  const reminderSuccess = document.getElementById("reminder-success");

  if (reminderBtn) {
    reminderBtn.addEventListener("click", () => {
      reminderModal.classList.remove("hidden");
    });
  }

  if (closeReminderModal) {
    closeReminderModal.addEventListener("click", () => {
      reminderModal.classList.add("hidden");
      if (reminderForm) reminderForm.reset();
      if (reminderSuccess) reminderSuccess.classList.add("hidden");
    });
  }

  // Chiudi modal cliccando fuori
  if (reminderModal) {
    reminderModal.addEventListener("click", function (e) {
      if (e.target === reminderModal) {
        reminderModal.classList.add("hidden");
        if (reminderForm) reminderForm.reset();
        if (reminderSuccess) reminderSuccess.classList.add("hidden");
      }
    });
  }

  if (reminderForm) {
    reminderForm.addEventListener("submit", function (e) {
      e.preventDefault();
      const contact = reminderForm.querySelector('input[name="contact"]');
      const reminderError = document.getElementById("reminder-error");
      if (reminderError) reminderError.classList.add("hidden");

      if (!contact || !contact.value.trim()) {
        if (reminderError) {
          reminderError.textContent =
            "Inserisci un'email o un numero di telefono.";
          reminderError.classList.remove("hidden");
        }
        return;
      }

      const rawContact = contact.value.trim();
      const isEmail = rawContact.includes("@");

      // Se non è email, trattalo come numero e validalo
      if (!isEmail) {
        if (!validatePhone(rawContact)) {
          if (reminderError) {
            reminderError.textContent =
              "Numero di telefono non valido. Usa formato 3331234567, +393331234567 o 00393331234567.";
            reminderError.classList.remove("hidden");
          }
          contact.focus();
          return;
        }
      }

      // Invio dati al backend con retry
      fetchWithRetry(`${CONFIG.API_BASE_URL}/api/reminder`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contact: rawContact,
        }),
      })
        .then((res) => {
          if (!res.ok) {
            return res.json().then((data) => {
              throw new Error(data.error || `Errore ${res.status}`);
            });
          }
          return res.json();
        })
        .then((data) => {
          if (data.success) {
            if (reminderSuccess) reminderSuccess.classList.remove("hidden");
            reminderForm.reset();
            setTimeout(() => {
              reminderModal.classList.add("hidden");
              if (reminderSuccess) reminderSuccess.classList.add("hidden");
            }, 3500);
          }
        })
        .catch((error) => {
          console.error("Errore reminder:", error);
          // In caso di errore, mostra comunque il messaggio di successo per non confondere l'utente
          if (reminderSuccess) reminderSuccess.classList.remove("hidden");
          reminderForm.reset();
          setTimeout(() => {
            reminderModal.classList.add("hidden");
            if (reminderSuccess) reminderSuccess.classList.add("hidden");
          }, 3500);
        });
    });
  }
});

// ==== TABLE RESERVATION MODAL =====
// Simulazione di risposta dal backend
function mostraErrore(msg) {
  const errorDiv = document.getElementById("reservation-error");
  const bottone = document.getElementById("btnPrenota");

  // Mostra messaggio errore
  errorDiv.textContent = msg;
  errorDiv.classList.remove("hidden");

  // Applica "shake" al bottone
  bottone.classList.add("shake");

  // Rimuovi la classe dopo l’animazione per poterla riapplicare in futuro
  bottone.addEventListener(
    "animationend",
    () => {
      bottone.classList.remove("shake");
    },
    { once: true },
  );
}

// ===== FUNZIONI DI VALIDAZIONE =====
function validatePhone(phone) {
  // Rimuovi spazi e caratteri speciali per la validazione
  const cleanPhone = phone.replace(/\s/g, "").replace(/[-\/\(\)]/g, "");
  // Accetta: 3xxxxxxxxx, +393xxxxxxxxx, 00393xxxxxxxxx
  // I numeri italiani iniziano con 3 e hanno 10 cifre totali
  const phoneRegex = /^(\+39|0039)?3\d{9}$/;
  return phoneRegex.test(cleanPhone);
}

function validateFutureDate(date) {
  const selectedDate = new Date(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Reset ore per confronto corretto
  return selectedDate >= today;
}

function formatPhoneError(phone) {
  if (!phone.trim()) return "Il telefono è obbligatorio";
  const cleanPhone = phone.replace(/\s/g, "");
  if (cleanPhone.length < 10) return "Il numero di telefono è troppo corto";
  if (!/^[\d\+\s\-\(\)]+$/.test(cleanPhone))
    return "Il telefono contiene caratteri non validi";
  return "Il formato del telefono non è valido. Inserisci un numero italiano (es: 3331234567)";
}

// ===== GESTIONE ERRORI MIGLIORATA =====
async function fetchWithRetry(url, options = {}, retries = 3, delay = 1000) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, options);

      // Se la risposta è ok, restituiscila
      if (response.ok) {
        return response;
      }

      // Se non è l'ultimo tentativo e l'errore è 5xx (server error), riprova
      if (i < retries - 1 && response.status >= 500) {
        await new Promise((resolve) => setTimeout(resolve, delay * (i + 1)));
        continue;
      }

      // Altrimenti restituisci la risposta (anche se non ok) per gestire 4xx
      return response;
    } catch (error) {
      // Se è l'ultimo tentativo, lancia l'errore
      if (i === retries - 1) {
        throw error;
      }
      // Altrimenti aspetta e riprova (errore di rete)
      await new Promise((resolve) => setTimeout(resolve, delay * (i + 1)));
    }
  }
}

function getErrorMessage(error, defaultMsg = "Errore di connessione") {
  // Errore di rete o CORS
  if (error instanceof TypeError) {
    if (
      error.message.includes("fetch") ||
      error.message.includes("Failed to fetch")
    ) {
      return "Impossibile connettersi al server. Verifica che il backend sia attivo.";
    }
    if (error.message.includes("CORS")) {
      return "Errore CORS: verifica la configurazione del backend.";
    }
  }

  // Errore di rete generico
  if (
    error.message &&
    (error.message.includes("network") || error.message.includes("Network"))
  ) {
    return "Errore di rete. Verifica la connessione e che il backend sia attivo.";
  }

  // Altri errori con messaggio
  if (error.message) {
    return error.message;
  }

  return defaultMsg;
}

// ESEMPIO: richiama la funzione se c'è errore
// mostraErrore("Compila tutti i campi obbligatori.");

document.addEventListener("DOMContentLoaded", function () {
  const tableBtns = document.querySelectorAll(".table2d-btn");
  const selectedTableLabel = document.getElementById("selected-table-label");
  const selectedTableSpan = document.getElementById("selected-table");
  const reservationForm = document.getElementById("reservation-form");
  const reservationError = document.getElementById("reservation-error");
  const reservationSuccess = document.getElementById("reservation-success");

  // Funzione per caricare lo stato dei tavoli dal backend
  function loadTableStatus(data, ora) {
    if (!data || !ora) {
      // Se data/ora non sono selezionate, mostra tutti i tavoli come disponibili
      tableBtns.forEach((btn) => {
        btn.classList.remove("booked");
        btn.disabled = false;
        btn.title = "Seleziona data e ora per vedere la disponibilità";
      });
      return;
    }

    // Mostra loading state (opzionale)
    tableBtns.forEach((btn) => {
      btn.disabled = true;
      btn.style.opacity = "0.5";
    });

    fetchWithRetry(`${CONFIG.API_BASE_URL}/api/tavoli?data=${data}&ora=${ora}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          tableBtns.forEach((btn) => {
            const tableNum = btn.dataset.table;
            const disponibili = data.data[tableNum] || 0;

            btn.style.opacity = "1";

            // Tavoli riservati (0 posti) o senza disponibilità
            if (disponibili === 0) {
              btn.classList.add("booked");
              btn.disabled = true;
              btn.title = "Tavolo non disponibile";
            } else {
              btn.classList.remove("booked");
              btn.disabled = false;
              btn.title = `${disponibili} posti disponibili`;
            }
          });
        } else {
          // Reset buttons if API response is unsuccessful
          tableBtns.forEach((btn) => {
            btn.style.opacity = "1";
            btn.classList.remove("booked");
            btn.disabled = false;
            btn.title = "Errore nel caricamento, riprova";
          });
        }
      })
      .catch((err) => {
        console.error("Errore caricamento tavoli:", err);
        // In caso di errore, abilita tutti i tavoli (fallback)
        tableBtns.forEach((btn) => {
          btn.style.opacity = "1";
          btn.classList.remove("booked");
          btn.disabled = false;
          btn.title = "Errore nel caricamento, riprova";
        });
      });
  }

  // Carica lo stato quando vengono selezionate data/ora
  const dateInput = reservationForm?.querySelector('[name="date"]');
  const timeInput = reservationForm?.querySelector('[name="time"]');

  if (dateInput && timeInput) {
    const updateTableStatus = () => {
      if (dateInput.value && timeInput.value) {
        loadTableStatus(dateInput.value, timeInput.value);
      } else {
        // Reset stato tavoli se data/ora non sono entrambe selezionate
        tableBtns.forEach((btn) => {
          btn.classList.remove("booked");
          btn.disabled = false;
          btn.style.opacity = "1";
        });
      }
    };

    dateInput.addEventListener("change", updateTableStatus);
    timeInput.addEventListener("change", updateTableStatus);
  }

  // Gestione selezione tavolo
  tableBtns.forEach((btn) => {
    btn.addEventListener("click", function () {
      if (btn.classList.contains("booked") || btn.disabled) return;
      tableBtns.forEach((b) => b.classList.remove("selected"));
      btn.classList.add("selected");
      selectedTableLabel.classList.remove("hidden");
      selectedTableSpan.textContent = btn.dataset.table;
      // Aggiungi il tavolo selezionato come hidden input al form
      let input = reservationForm.querySelector('input[name="table"]');
      if (!input) {
        input = document.createElement("input");
        input.type = "hidden";
        input.name = "table";
        reservationForm.appendChild(input);
      }
      input.value = btn.dataset.table;
    });
  });

  // Validazione e submit form prenotazione
  reservationForm.addEventListener("submit", function (e) {
    e.preventDefault();
    let errorMsg = "";

    // Rimuovi tutti gli attributi aria-invalid prima di validare
    reservationForm.querySelectorAll("[aria-invalid]").forEach((el) => {
      el.removeAttribute("aria-invalid");
    });

    // 1. Controllo tavolo selezionato (PRIMA di tutto)
    const tableInput = reservationForm.querySelector('input[name="table"]');
    if (!tableInput || !tableInput.value) {
      errorMsg = "Seleziona un tavolo prima di prenotare!";
      reservationError.textContent = errorMsg;
      reservationError.classList.remove("hidden");
      mostraErrore(errorMsg);
      return;
    }

    // 2. Validazione nome
    const nameInput = reservationForm.querySelector('[name="name"]');
    if (!nameInput || !nameInput.value.trim()) {
      errorMsg = "Il nome è obbligatorio";
      nameInput?.setAttribute("aria-invalid", "true");
    } else if (nameInput.value.trim().length < 2) {
      errorMsg = "Il nome deve contenere almeno 2 caratteri";
      nameInput?.setAttribute("aria-invalid", "true");
    }

    // 3. Validazione telefono (con formato italiano)
    const phoneInput = reservationForm.querySelector('[name="phone"]');
    if (!errorMsg && (!phoneInput || !phoneInput.value.trim())) {
      errorMsg = "Il telefono è obbligatorio";
      phoneInput?.setAttribute("aria-invalid", "true");
    } else if (!errorMsg && !validatePhone(phoneInput.value)) {
      errorMsg = formatPhoneError(phoneInput.value);
      phoneInput?.setAttribute("aria-invalid", "true");
    }

    // 4. Validazione data (deve essere futura)
    const dateInput = reservationForm.querySelector('[name="date"]');
    if (!errorMsg && (!dateInput || !dateInput.value)) {
      errorMsg = "La data è obbligatoria";
      dateInput?.setAttribute("aria-invalid", "true");
    } else if (!errorMsg && !validateFutureDate(dateInput.value)) {
      errorMsg = "La data deve essere oggi o una data futura";
      dateInput?.setAttribute("aria-invalid", "true");
    }

    // 5. Validazione ora
    const timeInput = reservationForm.querySelector('[name="time"]');
    if (!errorMsg && (!timeInput || !timeInput.value)) {
      errorMsg = "L'ora è obbligatoria";
      timeInput?.setAttribute("aria-invalid", "true");
    }

    // 6. Validazione ospiti
    const guestsInput = reservationForm.querySelector('[name="guests"]');
    if (!errorMsg && (!guestsInput || !guestsInput.value)) {
      errorMsg = "Seleziona il numero di persone";
      guestsInput?.setAttribute("aria-invalid", "true");
    }

    // 7. Validazione consenso privacy
    const privacyConsent = reservationForm.querySelector("#privacy-consent");
    const privacyError = document.getElementById("privacy-error");
    if (!errorMsg && (!privacyConsent || !privacyConsent.checked)) {
      errorMsg =
        "Devi accettare la Privacy Policy per completare la prenotazione";
      if (privacyError) {
        privacyError.textContent = "Devi accettare la Privacy Policy";
        privacyError.classList.remove("hidden");
      }
      if (privacyConsent) {
        privacyConsent.setAttribute("aria-invalid", "true");
      }
    } else if (privacyError) {
      privacyError.classList.add("hidden");
    }

    // Se ci sono errori, mostra e ferma
    if (errorMsg) {
      reservationError.textContent = errorMsg;
      reservationError.classList.remove("hidden");
      mostraErrore(errorMsg);
      return;
    } else {
      reservationError.classList.add("hidden");
    }

    // Salva data e ora prima del reset (per ricaricare i tavoli dopo)
    const savedDate = dateInput.value;
    const savedTime = timeInput.value;

    // INVIO DATI AL BACKEND con retry
    fetchWithRetry(`${CONFIG.API_BASE_URL}/api/prenota`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nome: nameInput.value.trim(),
        telefono: phoneInput.value.trim(),
        data: dateInput.value,
        ora: timeInput.value,
        ospiti: guestsInput.value,
        tavolo: tableInput.value,
        note:
          reservationForm.querySelector('[name="notes"]')?.value.trim() || "",
      }),
    })
      .then((res) => {
        // Controlla se la risposta è ok prima di parsare JSON
        if (!res.ok) {
          return res
            .json()
            .then((data) => {
              throw new Error(
                data.error || `Errore ${res.status}: ${res.statusText}`,
              );
            })
            .catch(() => {
              throw new Error(`Errore ${res.status}: ${res.statusText}`);
            });
        }
        return res.json();
      })
      .then((data) => {
        if (data.success) {
          reservationSuccess.classList.remove("hidden");
          reservationForm.reset();
          tableBtns.forEach((b) => b.classList.remove("selected"));
          selectedTableLabel.classList.add("hidden");
          selectedTableSpan.textContent = "";
          let input = reservationForm.querySelector('input[name="table"]');
          if (input) input.value = "";

          // Ricarica lo stato dei tavoli dopo una prenotazione riuscita
          if (savedDate && savedTime) {
            loadTableStatus(savedDate, savedTime);
          }

          setTimeout(() => {
            reservationSuccess.classList.add("hidden");
          }, 5000);
        } else {
          reservationError.textContent =
            data.error || "Errore nella prenotazione.";
          reservationError.classList.remove("hidden");
          mostraErrore(reservationError.textContent);
        }
      })
      .catch((error) => {
        console.error("Errore prenotazione:", error);
        console.error("URL tentato:", `${CONFIG.API_BASE_URL}/api/prenota`);
        reservationError.textContent = getErrorMessage(
          error,
          "Errore di connessione al server.",
        );
        reservationError.classList.remove("hidden");
        mostraErrore(reservationError.textContent);
      });
  });
});

// ===== COUNTDOWN =====
document.addEventListener("DOMContentLoaded", function () {
  const festaDate = new Date("2026-05-29T19:00:00");

  function updateCountdown() {
    const now = new Date();
    const diff = festaDate - now;

    if (diff > 0) {
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((diff / (1000 * 60)) % 60);
      const seconds = Math.floor((diff / 1000) % 60);

      document.getElementById("cd-days").textContent = days;
      document.getElementById("cd-hours").textContent = hours
        .toString()
        .padStart(2, "0");
      document.getElementById("cd-minutes").textContent = minutes
        .toString()
        .padStart(2, "0");
      document.getElementById("cd-seconds").textContent = seconds
        .toString()
        .padStart(2, "0");
    }
  }

  updateCountdown();
  setInterval(updateCountdown, 1000);
});

// ===== MOBILE MENU TOGGLE =====
document.addEventListener("DOMContentLoaded", function () {
  const menuToggle = document.getElementById("menu-toggle");
  const mobileMenu = document.getElementById("mobile-menu");

  if (menuToggle && mobileMenu) {
    menuToggle.addEventListener("click", () => {
      const isHidden = mobileMenu.classList.contains("hidden");
      mobileMenu.classList.toggle("hidden");
      menuToggle.setAttribute("aria-expanded", isHidden ? "true" : "false");
    });
  }
});

// ===== SCROLLSPY - VERSIONE FINALE =====
document.addEventListener("DOMContentLoaded", function () {
  const navLinks = document.querySelectorAll(".nav-link");
  const sections = document.querySelectorAll("section[id]");

  function updateActiveNav() {
    let current = "";

    sections.forEach((section) => {
      const sectionTop = section.offsetTop;
      if (window.scrollY >= sectionTop - 150) {
        current = section.getAttribute("id");
      }
    });

    navLinks.forEach((link) => {
      link.classList.remove("active");
      if (link.getAttribute("href") === "#" + current) {
        link.classList.add("active");
      }
    });
  }

  updateActiveNav();

  let ticking = false;
  window.addEventListener(
    "scroll",
    function () {
      if (!ticking) {
        window.requestAnimationFrame(function () {
          updateActiveNav();
          ticking = false;
        });
        ticking = true;
      }
    },
    false,
  );

  navLinks.forEach((link) => {
    link.addEventListener("click", function () {
      setTimeout(updateActiveNav, 100);
    });
  });
});

// ===== RATING STARS =====
document.addEventListener("DOMContentLoaded", function () {
  const feedbackForm = document.getElementById("feedback-form");
  const ratingInput = document.getElementById("rating");

  if (feedbackForm && ratingInput) {
    // Seleziona solo le stelle all'interno del form feedback
    const ratingStars = feedbackForm.querySelectorAll(".rating-star");

    ratingStars.forEach((star) => {
      star.addEventListener("click", function () {
        const rating = parseInt(this.getAttribute("data-rating"));
        if (isNaN(rating)) return;

        ratingInput.value = rating;

        // Aggiorna l'aspetto di tutte le stelle nel form — usa classe "selected" per maggiore specificità
        ratingStars.forEach((s) => {
          const starRating = parseInt(s.getAttribute("data-rating"));
          if (starRating <= rating) {
            s.classList.add("selected");
            s.classList.remove("text-gray-300");
          } else {
            s.classList.remove("selected");
            s.classList.add("text-gray-300");
          }
        });
      });
    });
  }
});

// ===== FAQ ACCORDION =====
document.addEventListener("DOMContentLoaded", function () {
  const faqQuestions = document.querySelectorAll(".faq-question");

  faqQuestions.forEach((btn) => {
    btn.addEventListener("click", function () {
      const answer = this.parentElement.querySelector(".faq-answer");
      const icon = this.querySelector("i");
      const isOpen = !answer.classList.contains("hidden");

      document
        .querySelectorAll(".faq-answer")
        .forEach((a) => a.classList.add("hidden"));
      document
        .querySelectorAll(".faq-question i")
        .forEach((i) => i.classList.remove("rotate-180"));

      if (!isOpen) {
        answer.classList.remove("hidden");
        icon.classList.add("rotate-180");
      }
    });
  });
});

// ===== SMOOTH SCROLLING FOR ANCHOR LINKS =====
document.addEventListener("DOMContentLoaded", function () {
  const navbar = document.getElementById("navbar");

  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener("click", function (e) {
      e.preventDefault();
      const targetId = this.getAttribute("href");
      const targetElement = document.querySelector(targetId);

      if (targetElement) {
        const navbarHeight = navbar ? navbar.offsetHeight : 0;
        const targetPosition =
          targetElement.getBoundingClientRect().top +
          window.pageYOffset -
          navbarHeight;

        window.scrollTo({
          top: targetPosition,
          behavior: "smooth",
        });

        const mobileMenu = document.getElementById("mobile-menu");
        if (mobileMenu && !mobileMenu.classList.contains("hidden")) {
          mobileMenu.classList.add("hidden");
        }
      }
    });
  });
});

// ===== FEEDBACK FORM =====
document.addEventListener("DOMContentLoaded", function () {
  const feedbackForm = document.getElementById("feedback-form");
  const feedbackSuccess = document.getElementById("feedback-success");
  const feedbackError = document.getElementById("feedback-error");
  const errorMessage = document.getElementById("error-message");
  const submitText = document.getElementById("submit-text");
  const loadingText = document.getElementById("loading-text");
  const feedbackList = document.getElementById("feedback-list");
  const feedbackLoading = document.getElementById("feedback-loading");
  const noFeedback = document.getElementById("no-feedback");

  // Carica feedback esistenti
  function loadFeedbacks() {
    if (!feedbackList) return;

    fetchWithRetry(`${CONFIG.API_BASE_URL}/api/feedback?limit=10`)
      .then((res) => res.json())
      .then((data) => {
        if (feedbackLoading) feedbackLoading.classList.add("hidden");

        if (data.success && data.data && data.data.length > 0) {
          feedbackList.innerHTML = "";
          data.data.forEach((feedback) => {
            const feedbackItem = document.createElement("div");
            feedbackItem.className =
              "bg-gray-50 p-4 rounded-lg border border-gray-200";
            feedbackItem.innerHTML = `
              <div class="flex justify-between items-start mb-2">
                <div>
                  <p class="font-semibold text-gray-800">${
                    feedback.nome || "Anonimo"
                  }</p>
                  <p class="text-xs text-gray-500">
                    ${new Date(feedback.timestamp).toLocaleDateString("it-IT", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                    })}
                  </p>
                </div>
                <div class="flex">
                  ${Array.from({ length: 5 }, (_, i) => {
                    return `<span class="${
                      i < feedback.rating ? "text-yellow-500" : "text-gray-300"
                    }">★</span>`;
                  }).join("")}
                </div>
              </div>
              <p class="text-gray-700 text-sm">${feedback.message}</p>
            `;
            feedbackList.appendChild(feedbackItem);
          });
          feedbackList.classList.remove("hidden");
          if (noFeedback) noFeedback.classList.add("hidden");
        } else {
          feedbackList.classList.add("hidden");
          if (noFeedback) noFeedback.classList.remove("hidden");
        }
      })
      .catch(() => {
        if (feedbackLoading) feedbackLoading.classList.add("hidden");
        feedbackList.classList.add("hidden");
        if (noFeedback) noFeedback.classList.remove("hidden");
      });
  }

  // Carica feedback all'avvio
  loadFeedbacks();

  // Gestione invio feedback
  if (feedbackForm) {
    feedbackForm.addEventListener("submit", function (e) {
      e.preventDefault();

      const ratingInput = document.getElementById("rating");
      const messageInput = document.getElementById("feedback-message");
      const nameInput = document.getElementById("feedback-name");

      if (!ratingInput || !messageInput) return;

      const rating = parseInt(ratingInput.value) || 0;
      const message = messageInput.value.trim();
      const name = nameInput ? nameInput.value.trim() : "";

      if (rating === 0) {
        if (feedbackError && errorMessage) {
          errorMessage.textContent =
            "Per favore, seleziona una valutazione prima di inviare.";
          feedbackError.classList.remove("hidden");
        }
        return;
      }

      if (!message) {
        if (feedbackError && errorMessage) {
          errorMessage.textContent = "Il messaggio è obbligatorio.";
          feedbackError.classList.remove("hidden");
        }
        return;
      }

      // Mostra stato di caricamento
      if (submitText) submitText.classList.add("hidden");
      if (loadingText) loadingText.classList.remove("hidden");
      if (feedbackError) feedbackError.classList.add("hidden");

      // Invio dati al backend
      fetchWithRetry(`${CONFIG.API_BASE_URL}/api/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: name || "Anonimo",
          rating: rating,
          message: message,
        }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (submitText) submitText.classList.remove("hidden");
          if (loadingText) loadingText.classList.add("hidden");

          if (data.success) {
            feedbackForm.reset();
            // Reset solo le stelle del form feedback
            const ratingStars = feedbackForm.querySelectorAll(".rating-star");
            ratingStars.forEach((star) => {
              star.classList.remove("text-yellow-500");
              star.classList.add("text-gray-300");
            });
            if (ratingInput) ratingInput.value = "0";

            if (feedbackSuccess) feedbackSuccess.classList.remove("hidden");
            if (feedbackError) feedbackError.classList.add("hidden");

            // Ricarica la lista feedback
            setTimeout(() => {
              loadFeedbacks();
              if (feedbackSuccess) feedbackSuccess.classList.add("hidden");
            }, 2000);
          } else {
            if (feedbackError && errorMessage) {
              errorMessage.textContent =
                data.error || "Errore nell'invio del feedback.";
              feedbackError.classList.remove("hidden");
            }
          }
        })
        .catch(() => {
          if (submitText) submitText.classList.remove("hidden");
          if (loadingText) loadingText.classList.add("hidden");
          if (feedbackError && errorMessage) {
            errorMessage.textContent =
              "Errore di connessione al server. Riprova più tardi.";
            feedbackError.classList.remove("hidden");
          }
        });
    });
  }
});

// ===== BACK TO TOP BUTTON =====
document.addEventListener("DOMContentLoaded", function () {
  const backToTopBtn = document.getElementById("back-to-top");

  if (backToTopBtn) {
    // Mostra/nascondi button in base allo scroll
    window.addEventListener("scroll", function () {
      if (window.pageYOffset > 300) {
        backToTopBtn.classList.remove("opacity-0", "invisible");
        backToTopBtn.classList.add("opacity-100", "visible");
      } else {
        backToTopBtn.classList.add("opacity-0", "invisible");
        backToTopBtn.classList.remove("opacity-100", "visible");
      }
    });

    // Click per tornare in cima
    backToTopBtn.addEventListener("click", function () {
      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    });
  }
});

// ===== ATTENTION POPUP (dopo 5 minutI di inattività) =====
document.addEventListener("DOMContentLoaded", function () {
  const attentionPopup = document.getElementById("attention-popup");
  const closeAttentionPopup = document.getElementById("close-attention-popup");
  const attentionMessage = document.getElementById("attention-message");

  if (!attentionPopup || !closeAttentionPopup) return;

  const messages = [
    "Stai ancora qui? Non perdere l'occasione di prenotare un tavolo! 🍽️",
    "La Festa dello Sport ti aspetta! Controlla il programma eventi! ⚽",
    "Hai visto il nostro menu? C'è qualcosa di delizioso per tutti! 🍕",
    "Non dimenticare di prenotare il tuo tavolo per non perdere il tuo posto! 🎉",
    "Scopri tutti gli eventi in programma per la Festa dello Sport! 🎊",
  ];

  let inactivityTimer;
  let hasShownPopup = false;

  function resetTimer() {
    clearTimeout(inactivityTimer);
    if (!hasShownPopup) {
      inactivityTimer = setTimeout(() => {
        if (attentionMessage) {
          attentionMessage.textContent =
            messages[Math.floor(Math.random() * messages.length)];
        }
        attentionPopup.classList.remove("hidden");
        hasShownPopup = true;
      }, 300000); // 5 minuto
    }
  }

  // Reset timer su eventi utente
  const events = ["mousedown", "keydown", "scroll", "touchstart"];
  events.forEach((event) => {
    document.addEventListener(event, resetTimer, { passive: true });
  });

  // Chiudi popup
  closeAttentionPopup.addEventListener("click", () => {
    attentionPopup.classList.add("hidden");
  });

  // Inizia il timer
  resetTimer();
});

// ===== SERVICE WORKER REGISTRATION =====
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        console.log("Service Worker registrato:", registration.scope);
      })
      .catch((error) => {
        console.log("Service Worker non registrato:", error);
      });
  });
}

// ===== HERO BACKGROUND: switch desktop/mobile =====
document.addEventListener("DOMContentLoaded", function () {
  const hero = document.querySelector(".hero-section");
  if (!hero) return;

  const mq = window.matchMedia("(max-width: 640px)");

  function applyHeroClass() {
    if (mq.matches) {
      hero.classList.add("hero-mobile");
      hero.classList.remove("hero-desktop");
    } else {
      hero.classList.add("hero-desktop");
      hero.classList.remove("hero-mobile");
    }
  }

  applyHeroClass();

  // Supporta sia addEventListener('change') che addListener per compatibilità
  if (typeof mq.addEventListener === "function") {
    mq.addEventListener("change", applyHeroClass);
  } else if (typeof mq.addListener === "function") {
    mq.addListener(applyHeroClass);
  }

  window.addEventListener("orientationchange", applyHeroClass);
  window.addEventListener("resize", applyHeroClass);
});

// ===== COOKIE CONSENT =====
document.addEventListener("DOMContentLoaded", function () {
  const cookieConsent = document.getElementById("cookie-consent");
  const acceptBtn = document.getElementById("accept-cookies");
  const declineBtn = document.getElementById("decline-cookies");

  // Controlla se l'utente ha già deciso
  const consent = localStorage.getItem("cookie-consent");
  if (!consent) {
    // Mostra il banner se non ha deciso
    cookieConsent.classList.remove("hidden");
  }

  // Accetta cookies
  acceptBtn.addEventListener("click", function () {
    localStorage.setItem("cookie-consent", "accepted");
    cookieConsent.classList.add("hidden");
    // Qui puoi abilitare analytics o altri cookie
  });

  // Rifiuta cookies
  declineBtn.addEventListener("click", function () {
    localStorage.setItem("cookie-consent", "declined");
    cookieConsent.classList.add("hidden");
    // Disabilita cookie non essenziali
  });
});

// ===== DYNAMIC CONTENT LOADING =====
document.addEventListener("DOMContentLoaded", function () {
  loadMenu();
  loadEvents();
});

async function loadMenu() {
  try {
    console.log("Loading menu...");
    const response = await fetchWithRetry(
      `${CONFIG.API_BASE_URL}/api/public/menu`,
    );
    const result = await response.json();

    if (result.success && result.data) {
      renderMenu(result.data);
    } else {
      console.error("Failed to load menu data", result);
    }
  } catch (e) {
    console.error("Error loading menu:", e);
  }
}

function renderMenu(menuData) {
  const tabsContainer = document.getElementById("menu-tabs");
  const tabsMobileContainer = document.getElementById("menu-tabs-mobile");
  const menuContainer = document.getElementById("menu-container");

  if (!tabsContainer || !menuContainer) return;

  const categories = Object.keys(menuData);
  if (categories.length === 0) {
    menuContainer.innerHTML =
      "<p class='text-center w-full'>Nessun menu disponibile.</p>";
    return;
  }

  const renderTabs = (container) => {
    container.innerHTML = "";
    const wrapper = document.createElement("div");
    wrapper.className = "segmented-tabs";

    categories.forEach((cat, index) => {
      const tab = document.createElement("div");
      tab.className = `tab-item ${index === 0 ? "active" : ""}`;
      tab.dataset.category = cat;
      tab.textContent = cat.charAt(0).toUpperCase() + cat.slice(1);
      tab.onclick = () => {
        container
          .querySelectorAll(".tab-item")
          .forEach((t) => t.classList.remove("active"));
        tab.classList.add("active");

        // Sync desktop/mobile tabs
        const otherContainer =
          container.id === "menu-tabs" ? tabsMobileContainer : tabsContainer;
        if (otherContainer) {
          otherContainer.querySelectorAll(".tab-item").forEach((t) => {
            if (t.dataset.category === cat) t.classList.add("active");
            else t.classList.remove("active");
          });
        }

        renderMenuItems(menuData[cat]);
      };
      wrapper.appendChild(tab);
    });
    container.appendChild(wrapper);
  };

  renderTabs(tabsContainer);
  if (tabsMobileContainer) {
    tabsMobileContainer.classList.remove("hidden");
    renderTabs(tabsMobileContainer);
  }

  renderMenuItems(menuData[categories[0]]);
}

function renderMenuItems(items) {
  const container = document.getElementById("menu-container");
  container.innerHTML = "";

  items.forEach((item) => {
    const div = document.createElement("div");
    div.className = "perfect-card flex flex-col justify-between";
    div.innerHTML = `
            <div>
                <h3 class="mb-3">${item.nome}</h3>
                <p class="text-gray-300 text-sm mb-4 leading-relaxed">${item.descrizione || ""}</p>
            </div>
            <div class="mt-auto flex items-center text-xl">
                ${getAllergeniEmojis(item.allergeni)}
            </div>
        `;
    container.appendChild(div);
  });
}

async function loadEvents() {
  try {
    console.log("Loading events...");
    const response = await fetchWithRetry(
      `${CONFIG.API_BASE_URL}/api/public/events`,
    );
    const result = await response.json();

    if (result.success && result.data) {
      renderEvents(result.data);
    }
  } catch (e) {
    console.error("Error loading events:", e);
  }
}

function renderEvents(events) {
  const tabsContainer = document.getElementById("events-tabs");
  const eventsContainer = document.getElementById("events-container");

  if (!tabsContainer || !eventsContainer) return;

  const eventsByDate = {};
  events.forEach((event) => {
    if (!eventsByDate[event.data]) eventsByDate[event.data] = [];
    eventsByDate[event.data].push(event);
  });

  const dates = Object.keys(eventsByDate).sort();
  if (dates.length === 0) {
    eventsContainer.innerHTML =
      "<p class='text-center w-full'>Nessun evento in programma.</p>";
    return;
  }

  tabsContainer.innerHTML = "";
  const wrapper = document.createElement("div");
  wrapper.className = "segmented-tabs";

  dates.forEach((date, index) => {
    const dateObj = new Date(date);
    const dayStr = dateObj.toLocaleDateString("it-IT", {
      day: "numeric",
      month: "numeric",
    });
    const weekdayStr = dateObj.toLocaleDateString("it-IT", {
      weekday: "short",
    });
    const label = `${weekdayStr} ${dayStr}`;

    const tab = document.createElement("div");
    tab.className = `tab-item ${index === 0 ? "active" : ""}`;
    tab.textContent = label.charAt(0).toUpperCase() + label.slice(1);
    tab.onclick = () => {
      wrapper
        .querySelectorAll(".tab-item")
        .forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
      renderEventItems(eventsByDate[date]);
    };
    wrapper.appendChild(tab);
  });
  tabsContainer.appendChild(wrapper);

  renderEventItems(eventsByDate[dates[0]]);
}

function renderEventItems(items) {
  const container = document.getElementById("events-container");
  container.innerHTML = "";

  items.forEach((event) => {
    let icon = "fa-calendar-alt";
    const lowerTitle = event.titolo.toLowerCase();
    if (lowerTitle.includes("calcio") || lowerTitle.includes("torneo"))
      icon = "fa-futbol";
    else if (
      lowerTitle.includes("music") ||
      lowerTitle.includes("dj") ||
      lowerTitle.includes("concerto")
    )
      icon = "fa-music";
    else if (lowerTitle.includes("volley")) icon = "fa-volleyball-ball";
    else if (lowerTitle.includes("cucina")) icon = "fa-utensils";
    else if (lowerTitle.includes("corsa")) icon = "fa-running";

    const timeStr = event.ora ? event.ora.substring(0, 5) : "";

    const div = document.createElement("div");
    div.className = "perfect-card flex gap-4";
    div.innerHTML = `
            <div class="event-icon-circle">
                <i class="fas ${icon}"></i>
            </div>
            <div class="flex-1">
                <h3 class="mb-1">${event.titolo}</h3>
                <p class="text-gray-400 text-sm mb-3">
                    ${timeStr} ${event.luogo ? `- ${event.luogo}` : ""}
                </p>
                <p class="text-gray-300 text-sm leading-relaxed">${event.descrizione || ""}</p>
            </div>
        `;
    container.appendChild(div);
  });
}
