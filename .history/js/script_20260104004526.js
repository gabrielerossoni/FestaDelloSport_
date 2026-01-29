// ===== REMINDER MODAL =====
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
      if (!contact || !contact.value.trim()) {
        return;
      }

      // Invio dati al backend
      fetch(`${CONFIG.API_BASE_URL}/api/reminder`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contact: contact.value.trim(),
        }),
      })
        .then((res) => res.json())
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
        .catch(() => {
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
    { once: true }
  );
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

    fetch(`${CONFIG.API_BASE_URL}/api/tavoli?data=${data}&ora=${ora}`)
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

  // Gestione selezione tavolo
  tableBtns.forEach((btn) => {
    btn.addEventListener("click", function () {
      if (btn.classList.contains("booked")) return;
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

    // Controllo tavolo selezionato
    const tableInput = reservationForm.querySelector('input[name="table"]');
    if (!tableInput || !tableInput.value) {
      errorMsg = "Seleziona un tavolo prima di prenotare!";
    }

    // Controllo campi obbligatori
    const requiredFields = ["name", "phone", "date", "time", "guests"];
    requiredFields.forEach((id) => {
      const el = reservationForm.querySelector(`[name="${id}"]`);
      if (el && !el.value) {
        errorMsg = "Compila tutti i campi obbligatori!";
      }
    });

    if (errorMsg) {
      reservationError.textContent = errorMsg;
      reservationError.classList.remove("hidden");
      return;
    } else {
      reservationError.classList.add("hidden");
    }

    // INVIO DATI AL BACKEND
    fetch(`${CONFIG.API_BASE_URL}/api/prenota`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nome: reservationForm.name.value,
        telefono: reservationForm.phone.value,
        data: reservationForm.date.value,
        ora: reservationForm.time.value,
        ospiti: reservationForm.guests.value,
        tavolo: tableInput.value,
        note: reservationForm.notes.value,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          reservationSuccess.classList.remove("hidden");
          reservationForm.reset();
          tableBtns.forEach((b) => b.classList.remove("selected"));
          selectedTableLabel.classList.add("hidden");
          selectedTableSpan.textContent = "";
          let input = reservationForm.querySelector('input[name="table"]');
          if (input) input.value = "";
          setTimeout(() => {
            reservationSuccess.classList.add("hidden");
          }, 5000);
        } else {
          reservationError.textContent =
            data.error || "Errore nella prenotazione.";
          reservationError.classList.remove("hidden");
        }
      })
      .catch(() => {
        reservationError.textContent = "Errore di connessione al server.";
        reservationError.classList.remove("hidden");
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
      mobileMenu.classList.toggle("hidden");
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
    false
  );

  navLinks.forEach((link) => {
    link.addEventListener("click", function () {
      setTimeout(updateActiveNav, 100);
    });
  });
});

// ===== MENU CATEGORY TABS =====
document.addEventListener("DOMContentLoaded", function () {
  const menuCategoryBtns = document.querySelectorAll(".menu-category-btn");
  const menuContents = document.querySelectorAll(".menu-content");

  menuCategoryBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      menuCategoryBtns.forEach((b) => {
        b.classList.remove("active", "bg-blue-700", "text-white");
        b.classList.add("bg-gray-200");
      });

      btn.classList.add("active", "bg-blue-700", "text-white");
      btn.classList.remove("bg-gray-200");

      menuContents.forEach((content) => {
        content.classList.add("hidden");
      });

      const category = btn.getAttribute("data-category");
      const content = document.getElementById(`${category}-menu`);
      if (content) content.classList.remove("hidden");
    });
  });
});

// ===== EVENT DAY TABS =====
document.addEventListener("DOMContentLoaded", function () {
  const eventDayBtns = document.querySelectorAll(".event-day-btn");
  const eventDayContents = document.querySelectorAll(".event-day-content");

  eventDayBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      eventDayBtns.forEach((b) => {
        b.classList.remove("active", "bg-blue-700", "text-white");
        b.classList.add("bg-gray-200");
      });

      btn.classList.add("active", "bg-blue-700", "text-white");
      btn.classList.remove("bg-gray-200");

      eventDayContents.forEach((content) => {
        content.classList.add("hidden");
      });

      const day = btn.getAttribute("data-day");
      const content = document.getElementById(`events-${day}`);
      if (content) content.classList.remove("hidden");
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

        // Aggiorna l'aspetto di tutte le stelle nel form
        ratingStars.forEach((s) => {
          const starRating = parseInt(s.getAttribute("data-rating"));
          if (starRating <= rating) {
            s.classList.remove("text-gray-300");
            s.classList.add("text-yellow-500");
          } else {
            s.classList.remove("text-yellow-500");
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

    fetch(`${CONFIG.API_BASE_URL}/api/feedback?limit=10`)
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
      fetch(`${CONFIG.API_BASE_URL}/api/feedback`, {
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

// ===== DOWNLOAD MENU =====
document.addEventListener("DOMContentLoaded", function () {
  // Trova tutti i link che contengono "Scarica il menu"
  document.querySelectorAll("a").forEach((link) => {
    if (
      link.textContent.includes("Scarica il menu") ||
      link.textContent.includes("menu completo")
    ) {
      link.addEventListener("click", function (e) {
        e.preventDefault();
        downloadMenu();
      });
    }
  });
});

function downloadMenu() {
  const menuSection = document.getElementById("menu");
  if (!menuSection) return;

  // Clona la sezione e mostra tutti i contenuti
  const clonedSection = menuSection.cloneNode(true);
  const menuContents = clonedSection.querySelectorAll(".menu-content");
  menuContents.forEach((content) => {
    content.classList.remove("hidden");
  });

  // Rimuovi i tab buttons dalla versione stampabile
  const tabsContainer = clonedSection.querySelector(".mb-8");
  if (tabsContainer) tabsContainer.remove();

  // Crea una nuova finestra per la stampa
  const printWindow = window.open("", "_blank");
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Menu - Festa dello Sport</title>
      <meta charset="UTF-8">
      <style>
        @media print {
          @page { margin: 1cm; }
        }
        body {
          font-family: 'Montserrat', Arial, sans-serif;
          padding: 20px;
          max-width: 800px;
          margin: 0 auto;
          color: #1f2937;
        }
        h1 {
          text-align: center;
          color: #1e40af;
          margin-bottom: 30px;
          font-size: 2.5em;
        }
        h2 {
          color: #2563eb;
          border-bottom: 2px solid #2563eb;
          padding-bottom: 10px;
          margin-top: 30px;
          font-size: 1.5em;
        }
        .menu-content {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 20px;
          margin-top: 20px;
        }
        .menu-item {
          margin-bottom: 20px;
          padding: 15px;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          background: #fff;
        }
        .menu-item h3 {
          margin: 0 0 10px 0;
          color: #1f2937;
          font-size: 1.2em;
        }
        .menu-item p {
          margin: 0;
          color: #6b7280;
          font-size: 0.95em;
        }
        .hidden {
          display: none !important;
        }
      </style>
    </head>
    <body>
      <h1>Menu - Festa dello Sport di Capralba</h1>
      ${clonedSection.innerHTML}
    </body>
    </html>
  `);
  printWindow.document.close();
  setTimeout(() => {
    printWindow.print();
  }, 250);
}

// ===== DOWNLOAD PROGRAMMA =====
document.addEventListener("DOMContentLoaded", function () {
  document.querySelectorAll("a").forEach((link) => {
    if (
      link.textContent.includes("Scarica il programma") ||
      link.textContent.includes("programma completo")
    ) {
      link.addEventListener("click", function (e) {
        e.preventDefault();
        downloadProgramma();
      });
    }
  });
});

function downloadProgramma() {
  const eventsSection = document.getElementById("events");
  if (!eventsSection) return;

  // Clona la sezione e mostra tutti i contenuti degli eventi
  const clonedSection = eventsSection.cloneNode(true);
  const eventContents = clonedSection.querySelectorAll(".event-day-content");
  eventContents.forEach((content) => {
    content.classList.remove("hidden");
  });

  // Rimuovi i tab buttons dalla versione stampabile
  const tabsContainer = clonedSection.querySelector(".mb-8");
  if (tabsContainer) tabsContainer.remove();

  const printWindow = window.open("", "_blank");
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Programma Eventi - Festa dello Sport</title>
      <meta charset="UTF-8">
      <style>
        @media print {
          @page { margin: 1cm; }
        }
        body {
          font-family: 'Montserrat', Arial, sans-serif;
          padding: 20px;
          max-width: 800px;
          margin: 0 auto;
          color: #1f2937;
        }
        h1 {
          text-align: center;
          color: #1e40af;
          margin-bottom: 30px;
          font-size: 2.5em;
        }
        h2 {
          color: #2563eb;
          border-bottom: 2px solid #2563eb;
          padding-bottom: 10px;
          margin-top: 30px;
          font-size: 1.5em;
        }
        .event-day-content {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 20px;
          margin-top: 20px;
        }
        .calendar-day {
          margin-bottom: 20px;
          padding: 15px;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          background: #f9fafb;
        }
        .calendar-day h3 {
          margin: 0 0 10px 0;
          color: #1f2937;
          font-size: 1.2em;
        }
        .calendar-day p {
          margin: 5px 0;
          color: #6b7280;
          font-size: 0.95em;
        }
        .hidden {
          display: none !important;
        }
      </style>
    </head>
    <body>
      <h1>Programma Eventi - Festa dello Sport di Capralba</h1>
      ${clonedSection.innerHTML}
    </body>
    </html>
  `);
  printWindow.document.close();
  setTimeout(() => {
    printWindow.print();
  }, 250);
}

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

// ===== ATTENTION POPUP (dopo 1 minuto di inattività) =====
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
      }, 60000); // 1 minuto
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


