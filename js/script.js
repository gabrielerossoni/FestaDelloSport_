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
      reminderForm.reset();
      reminderSuccess.classList.add("hidden");
    });
  }

  if (reminderForm) {
    reminderForm.addEventListener("submit", function (e) {
      e.preventDefault();
      reminderSuccess.classList.remove("hidden");
      reminderForm.reset();
      setTimeout(() => {
        reminderModal.classList.add("hidden");
        reminderSuccess.classList.add("hidden");
      }, 3500);
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
  const ratingStars = document.querySelectorAll(".rating-star");
  const ratingInput = document.getElementById("rating");

  if (ratingInput) {
    ratingStars.forEach((star) => {
      star.addEventListener("click", () => {
        const rating = parseInt(star.getAttribute("data-rating"));
        ratingInput.value = rating;

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