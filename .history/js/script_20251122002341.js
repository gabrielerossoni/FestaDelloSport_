document.addEventListener("DOMContentLoaded", function () {
  const reminderBtn = document.getElementById("reminder-btn");
  const reminderModal = document.getElementById("reminder-modal");
  const closeReminderModal = document.getElementById("close-reminder-modal");
  const reminderForm = document.getElementById("reminder-form");
  const reminderSuccess = document.getElementById("reminder-success");
  reminderBtn.addEventListener("click", () => {
    reminderModal.classList.remove("hidden");
  });
  closeReminderModal.addEventListener("click", () => {
    reminderModal.classList.add("hidden");
    reminderForm.reset();
    reminderSuccess.classList.add("hidden");
  });
  reminderForm.addEventListener("submit", function (e) {
    e.preventDefault();
    // Qui dovresti inviare il dato a un backend che gestisce l'invio del promemoria
    reminderSuccess.classList.remove("hidden");
    reminderForm.reset();
    setTimeout(() => {
      reminderModal.classList.add("hidden");
      reminderSuccess.classList.add("hidden");
    }, 3500);
  });
});

document.addEventListener("DOMContentLoaded", function () {
  // Data della prossima festa: 29 maggio 2026, ore 19:00
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
    } else {
      document.getElementById("countdown-timer").innerHTML =
        '<span class="text-3xl text-yellow-600">La festa è iniziata!</span>';
    }
  }
  updateCountdown();
  setInterval(updateCountdown, 1000);
});

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
  // Demo: tavoli già prenotati (puoi sostituire con dati reali)
  const bookedTables = [
    "1",
    "2",
    "41",
    "42",
    "43",
    "44",
    "45",
    "46",
    "47",
    "48",
  ];
  const tableBtns = document.querySelectorAll(".table2d-btn");
  const selectedTableLabel = document.getElementById("selected-table-label");
  const selectedTableSpan = document.getElementById("selected-table");
  const reservationForm = document.getElementById("reservation-form");
  const reservationError = document.getElementById("reservation-error");
  const reservationSuccess = document.getElementById("reservation-success");

  // Stato iniziale: libero/prenotato
  tableBtns.forEach((btn) => {
    if (bookedTables.includes(btn.dataset.table)) {
      btn.classList.add("booked");
      btn.disabled = true;
      btn.title = "Tavolo già prenotato";
    } else {
      btn.title = "Tavolo libero";
    }
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
    fetch("http://localhost:3001/api/prenota", {
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

// Meteo demo: sostituisci con una vera API se vuoi dati reali
document.addEventListener("DOMContentLoaded", function () {
  // Inserisci qui la tua API KEY meteo se vuoi usare una vera API
  const METEO_API_KEY = ""; // <-- INSERISCI QUI LA TUA API KEY

  // Demo meteo statico per tutti gli eventi
  document.getElementById("meteo-10-07").textContent = "28°C, Soleggiato";
});

// Gestione del rating con stelle
let selectedRating = 0;
const stars = document.querySelectorAll(".rating-star");
consratingInput = document.getElementById("rating");

stars.forEach((star) => {
  star.addEventListener("click", function () {
    selectedRating = parseInt(this.getAttribute("data-rating"));
    ratingInput.value = selectedRating;
    updateStars();
  });

  star.addEventListener("mouseenter", function () {
    const hoverRating = parseInt(this.getAttribute("data-rating"));
    highlightStars(hoverRating);
  });
});

document
  .querySelector(".flex.space-x-2")
  .addEventListener("mouseleave", function () {
    updateStars();
  });

function updateStars() {
  stars.forEach((star, index) => {
    if (index < selectedRating) {
      star.classList.remove("text-gray-300");
      star.classList.add("text-yellow-500");
    } else {
      star.classList.remove("text-yellow-500");
      star.classList.add("text-gray-300");
    }
  });
}

function highlightStars(rating) {
  stars.forEach((star, index) => {
    if (index < rating) {
      star.classList.remove("text-gray-300");
      star.classList.add("text-yellow-500");
    } else {
      star.classList.remove("text-yellow-500");
      star.classList.add("text-gray-300");
    }
  });
}

// Funzione per creare le stelle per la visualizzazione
function createStars(rating) {
  let stars = "";
  for (let i = 1; i <= 5; i++) {
    stars += i <= rating ? "★" : "☆";
  }
  return stars;
}

// Funzione per caricare i feedback
async function loadFeedbacks() {
  try {
    const response = await fetch("http://localhost:3001/api/feedback?limit=10");

    const loadingDiv = document.getElementById("feedback-loading");
    const feedbackList = document.getElementById("feedback-list");
    const noFeedbackDiv = document.getElementById("no-feedback");

    loadingDiv.classList.add("hidden");

    if (data.success && data.data && data.data.length > 0) {
      feedbackList.innerHTML = "";

      data.data.forEach((feedback) => {
        const feedbackElement = document.createElement("div");
        feedbackElement.className = "border-b border-gray-200 pb-4";

        const nome = feedback.nome || "Anonimo";
        const rating = feedback.rating || 0;
        const message = feedback.message || "";

        feedbackElement.innerHTML = `
                            <div class="flex items-center mb-2">
                                <div class="text-yellow-500">${createStars(
                                  rating
                                )}</div>
                                <span class="ml-2 font-medium">${nome}</span>
                            </div>
                            <p class="text-gray-700">${message}</p>
                        `;

        feedbackList.appendChild(feedbackElement);
      });

      feedbackList.classList.remove("hidden");
    } else {
      noFeedbackDiv.classList.remove("hidden");
    }
  } catch (error) {
    console.error("Errore nel caricamento dei feedback:", error);
    const loadingDiv = document.getElementById("feedback-loading");
    loadingDiv.innerHTML =
      '<p class="text-red-500">Errore nel caricamento dei feedback.</p>';
  }
}

// Gestione del form di invio feedback
document
  .getElementById("feedback-form")
  .addEventListener("submit", async function (e) {
    e.preventDefault();

    const submitButton = e.target.querySelector('button[type="submit"]');
    const submitText = document.getElementById("submit-text");
    const loadingText = document.getElementById("loading-text");
    const successDiv = document.getElementById("feedback-success");
    const errorDiv = document.getElementById("feedback-error");
    const errorMessage = document.getElementById("error-message");

    // Reset dei messaggi precedenti
    successDiv.classList.add("hidden");
    errorDiv.classList.add("hidden");

    // Mostra loading
    submitText.classList.add("hidden");
    loadingText.classList.remove("hidden");
    submitButton.disabled = true;

    try {
      const formData = new FormData(e.target);
      const nome = formData.get("name") || "Anonimo";
      const message = formData.get("message").trim();
      const rating = parseInt(ratingInput.value);

      if (!message) {
        throw new Error("Il messaggio di feedback è obbligatorio.");
      }

      if (rating < 1 || rating > 5) {
        throw new Error("Seleziona una valutazione da 1 a 5 stelle.");
      }

      const response = await fetch("http://localhost:3001/api/feedback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          nome: nome,
          rating: rating,
          message: message,
        }),
      });

      const data = await response.json();

      if (data.success) {
        successDiv.classList.remove("hidden");
        e.target.reset();
        selectedRating = 0;
        ratingInput.value = 0;
        updateStars();

        // Ricarica i feedback per mostrare quello appena inserito
        setTimeout(() => {
          loadFeedbacks();
        }, 1000);
      } else {
        throw new Error(data.error || "Errore sconosciuto");
      }
    } catch (error) {
      console.error("Errore nell'invio del feedback:", error);
      errorMessage.textContent = error.message;
      errorDiv.classList.remove("hidden");
    } finally {
      // Nascondi loading
      submitText.classList.remove("hidden");
      loadingText.classList.add("hidden");
      submitButton.disabled = false;
    }
  });

// Carica i feedback al caricamento della pagina
document.addEventListener("DOMContentLoaded", function () {
  loadFeedbacks();
});

document.querySelectorAll(".faq-question").forEach((btn) => {
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

// Mobile menu toggle
const menuToggle = document.getElementById("menu-toggle");
const mobileMenu = document.getElementById("mobile-menu");

menuToggle.addEventListener("click", () => {
  mobileMenu.classList.toggle("hidden");
});

// Navbar scroll effect
const navbar = document.getElementById("navbar");

window.addEventListener("scroll", () => {
  if (window.scrollY > 50) {
    navbar.classList.add("shadow-lg");
  } else {
    navbar.classList.remove("shadow-lg");
  }
});

// Menu category tabs
const menuCategoryBtns = document.querySelectorAll(".menu-category-btn");
const menuContents = document.querySelectorAll(".menu-content");

menuCategoryBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    // Remove active class from all buttons
    menuCategoryBtns.forEach((b) => {
      b.classList.remove("active", "bg-blue-700", "text-white");
      b.classList.add("bg-gray-200");
    });

    // Add active class to clicked button
    btn.classList.add("active", "bg-blue-700", "text-white");
    btn.classList.remove("bg-gray-200");

    // Hide all content
    menuContents.forEach((content) => {
      content.classList.add("hidden");
    });

    // Show selected content
    const category = btn.getAttribute("data-category");
    document.getElementById(`${category}-menu`).classList.remove("hidden");
  });
});

// Event day tabs
const eventDayBtns = document.querySelectorAll(".event-day-btn");
const eventDayContents = document.querySelectorAll(".event-day-content");

eventDayBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    // Remove active class from all buttons
    eventDayBtns.forEach((b) => {
      b.classList.remove("active", "bg-blue-700", "text-white");
      b.classList.add("bg-gray-200");
    });

    // Add active class to clicked button
    btn.classList.add("active", "bg-blue-700", "text-white");
    btn.classList.remove("bg-gray-200");

    // Hide all content
    eventDayContents.forEach((content) => {
      content.classList.add("hidden");
    });

    // Show selected content
    const day = btn.getAttribute("data-day");
    document.getElementById(`events-${day}`).classList.remove("hidden");
  });
});

// Rating stars
const ratingStars = document.querySelectorAll(".rating-star");
const ratingInput = document.getElementById("rating");

ratingStars.forEach((star) => {
  star.addEventListener("click", () => {
    const rating = parseInt(star.getAttribute("data-rating"));
    ratingInput.value = rating;

    // Update stars appearance
    ratingStars.forEach((s, index) => {
      if (index < rating) {
        s.classList.remove("text-gray-300");
        s.classList.add("text-yellow-500");
      } else {
        s.classList.remove("text-yellow-500");
        s.classList.add("text-gray-300");
      }
    });
  });
});

// Form submissions
// (Questo blocco era ridondante: la validazione e la gestione submit sono già gestite nello script della sezione prenotazione)

const feedbackForm = document.getElementById("feedback-form");
const feedbackSuccess = document.getElementById("feedback-success");

feedbackForm.addEventListener("submit", (e) => {
  e.preventDefault();
  // In a real application, you would send the form data to a server here
  feedbackSuccess.classList.remove("hidden");
  feedbackForm.reset();

  // Reset stars
  ratingStars.forEach((s) => {
    s.classList.remove("text-yellow-500");
    s.classList.add("text-gray-300");
  });
  ratingInput.value = 0;

  // Hide success message after 5 seconds
  setTimeout(() => {
    feedbackSuccess.classList.add("hidden");
  }, 5000);
});

// Back to top button
const backToTopBtn = document.getElementById("back-to-top");

window.addEventListener("scroll", () => {
  if (window.scrollY > 300) {
    backToTopBtn.classList.remove("opacity-0", "invisible");
    backToTopBtn.classList.add("opacity-100", "visible");
  } else {
    backToTopBtn.classList.remove("opacity-100", "visible");
    backToTopBtn.classList.add("opacity-0", "invisible");
  }
});

backToTopBtn.addEventListener("click", () => {
  window.scrollTo({
    top: 0,
    behavior: "smooth",
  });
});

// Smooth scrolling for navigation links
document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
  anchor.addEventListener("click", function (e) {
    e.preventDefault();

    const targetId = this.getAttribute("href");
    const targetElement = document.querySelector(targetId);

    if (targetElement) {
      const navbarHeight = navbar.offsetHeight;
      const targetPosition =
        targetElement.getBoundingClientRect().top +
        window.pageYOffset -
        navbarHeight;

      window.scrollTo({
        top: targetPosition,
        behavior: "smooth",
      });

      // Close mobile menu if open
      if (!mobileMenu.classList.contains("hidden")) {
        mobileMenu.classList.add("hidden");
      }
    }
  });
});


// Update active nav link on scroll - VERSIONE ROBUSTA
// Update active nav link on scroll - VERSIONE ROBUSTA FIX COMPLETO
const sections = document.querySelectorAll("section[id]");
const navLinks = document.querySelectorAll(".nav-link, #mobile-menu a[href^='#']");

function updateActiveNavLink() {
  const scrollPosition = window.scrollY + window.innerHeight * 0.25;
  let activeId = "";
  
  sections.forEach(section => {
    if (
      scrollPosition >= section.offsetTop &&
      scrollPosition < section.offsetTop + section.offsetHeight
    ) {
      activeId = section.getAttribute("id");
    }
  });
  
  navLinks.forEach(link => {
    link.classList.remove("active");
    const href = link.getAttribute("href").substring(1);
    if (href === activeId) {
      link.classList.add("active");
    }
  });
}

window.addEventListener("scroll", updateActiveNavLink);
navLinks.forEach(link => {
  link.addEventListener("click", () => {
    setTimeout(updateActiveNavLink, 100);
  });
});
document.addEventListener("DOMContentLoaded", () => {
  setTimeout(updateActiveNavLink, 50);
});


setTimeout(() => {
  const messages = [
    "Sembra che tu sia rimasto bloccato. Hai bisogno di aiuto?",
    "Tutto ok laggiù? La festa ti aspetta! 🎉",
    "Sei ancora con noi? Forse è il momento di ordinare una pizza! 🍕",
    "Non lasciare che il menu ti ipnotizzi... 😄",
    "Serve una mano? Siamo qui per aiutarti!",
  ];
  const msg = messages[Math.floor(Math.random() * messages.length)];
  document.getElementById("attention-message").textContent = msg;
  document.getElementById("attention-popup").classList.remove("hidden");
}, 300000);

document
  .getElementById("close-attention-popup")
  .addEventListener("click", function () {
    document.getElementById("attention-popup").classList.add("hidden");
  });
