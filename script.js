/* ============================================================
   JAVASCRIPT MODULES
   Organized as IIFE namespaced under window.PortfolioApp
   ============================================================ */
(function () {
  "use strict";

  const App = window.PortfolioApp || (window.PortfolioApp = {});

  /* ----------------------------------------
     Module 1: Mobile navigation toggle
     ---------------------------------------- */
  App.Nav = (function () {
    function init() {
      const toggle = document.getElementById("nav-toggle");
      const nav = document.getElementById("primary-nav");
      if (!toggle || !nav) return;

      toggle.addEventListener("click", function () {
        const isOpen = nav.classList.toggle("is-open");
        toggle.setAttribute("aria-expanded", String(isOpen));
        toggle.setAttribute("aria-label", isOpen ? "Close menu" : "Open menu");
      });

      // Close nav when a link is clicked (mobile UX)
      nav.querySelectorAll("a").forEach(function (link) {
        link.addEventListener("click", function () {
          nav.classList.remove("is-open");
          toggle.setAttribute("aria-expanded", "false");
        });
      });

      // Close on Escape
      document.addEventListener("keydown", function (e) {
        if (e.key === "Escape" && nav.classList.contains("is-open")) {
          nav.classList.remove("is-open");
          toggle.setAttribute("aria-expanded", "false");
          toggle.focus();
        }
      });
    }

    return { init: init };
  })();

  /* ----------------------------------------
     Module 2: Scroll reveal animations
     Uses IntersectionObserver — no libraries.
     ---------------------------------------- */
  App.Reveal = (function () {
    function init() {
      const reveals = document.querySelectorAll(".reveal");
      if (!reveals.length) return;

      // Fallback: if IO not supported, show everything
      if (!("IntersectionObserver" in window)) {
        reveals.forEach((el) => el.classList.add("is-visible"));
        return;
      }

      const observer = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              entry.target.classList.add("is-visible");
              observer.unobserve(entry.target);
            }
          });
        },
        {
          threshold: 0.12,
          rootMargin: "0px 0px -40px 0px",
        },
      );

      reveals.forEach((el) => observer.observe(el));
    }

    return { init: init };
  })();

  /* ----------------------------------------
     Module 3: Contact form validation
     Vanilla JS — no libraries.
     ---------------------------------------- */
  App.ContactForm = (function () {
    function init() {
      const form = document.getElementById("contact-form");
      const status = document.getElementById("form-status");
      if (!form) return;

      form.addEventListener("submit", function (e) {
        e.preventDefault();

        const name = form.elements["name"];
        const email = form.elements["email"];
        const message = form.elements["message"];

        // Reset prior states
        [name, email, message].forEach(clearError);
        status.classList.remove("visible");

        let valid = true;

        if (!name.value.trim()) {
          showError(name, "Name is required.");
          valid = false;
        }
        if (!email.value.trim()) {
          showError(email, "Email is required.");
          valid = false;
        } else if (!isValidEmail(email.value)) {
          showError(email, "Please enter a valid email.");
          valid = false;
        }
        if (!message.value.trim()) {
          showError(message, "Message cannot be empty.");
          valid = false;
        } else if (message.value.trim().length < 10) {
          showError(message, "Message should be at least 10 characters.");
          valid = false;
        }

        if (valid) {
          // Simulated success — in real impl, POST to endpoint
          status.classList.add("visible");
          form.reset();
          // Hide status after 6 seconds
          setTimeout(() => status.classList.remove("visible"), 6000);
        }
      });

      // Helper functions
      function isValidEmail(value) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
      }
      function showError(field, msg) {
        field.style.borderColor = "var(--red)";
        field.style.boxShadow = "4px 4px 0 var(--red)";
        field.setAttribute("aria-invalid", "true");
        // Insert error message if not already there
        let err = field.parentNode.querySelector(".field-error");
        if (!err) {
          err = document.createElement("span");
          err.className = "field-error";
          err.style.cssText =
            "display:block;color:var(--red);font-size:0.8rem;margin-top:0.35rem;font-family:var(--font-pixel);font-size:0.55rem";
          field.parentNode.appendChild(err);
        }
        err.textContent = "! " + msg;
      }
      function clearError(field) {
        field.style.borderColor = "";
        field.style.boxShadow = "";
        field.removeAttribute("aria-invalid");
        const err = field.parentNode.querySelector(".field-error");
        if (err) err.remove();
      }
    }

    return { init: init };
  })();

  /* ----------------------------------------
     Module 4: Resume download handler
     Simulated — replace with real PDF path.
     ---------------------------------------- */
  App.Resume = (function () {
    function init() {
      // Bound via inline onclick in hero — expose globally
      window.handleResumeDownload = function (e) {
        e.preventDefault();
        // In production: window.open('/resume.pdf', '_blank');
        // For prototype: visual feedback only
        const btn = e.currentTarget;
        const original = btn.textContent;
        btn.textContent = "COMING SOON...";
        btn.style.background = "var(--red)";
        btn.style.color = "var(--paper)";
        setTimeout(() => {
          btn.textContent = original;
          btn.style.background = "";
          btn.style.color = "";
        }, 1800);
      };
    }
    return { init: init };
  })();

  /* ----------------------------------------
     Module 5: Active nav link highlighting
     Tracks which section is in view.
     ---------------------------------------- */
  App.ActiveNav = (function () {
    function init() {
      const navLinks = document.querySelectorAll(".nav__link");
      const sections = Array.from(navLinks)
        .map((l) => document.querySelector(l.getAttribute("href")))
        .filter(Boolean);
      if (!sections.length || !("IntersectionObserver" in window)) return;

      const observer = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              navLinks.forEach((l) => l.classList.remove("is-active"));
              const active = document.querySelector(
                `.nav__link[href="#${entry.target.id}"]`,
              );
              if (active) active.classList.add("is-active");
            }
          });
        },
        { threshold: 0.4 },
      );

      sections.forEach((s) => observer.observe(s));
    }
    return { init: init };
  })();

  /* ----------------------------------------
     Module 6: Game container mount contract
     ----------------------------------------
     Documents the pluggable architecture for the
     future game implementation. Any game module
     (Pac-Man, Snake, Tetris, etc.) should follow
     this interface to mount inside #game-container
     without modifying surrounding layout.
     ---------------------------------------- */
  App.Game = (function () {
    /**
     * mountGame(container, config)
     * @param {HTMLElement} container - the #game-container div
     * @param {Object} config - { game: 'pacman'|'snake'|'tetris'|... }
     *
     * Future implementation replaces the placeholder DOM
     * inside `container` with the game's canvas/elements.
     * The container's 16:11 aspect ratio and parent layout
     * must remain untouched.
     */
    function mount(container, config) {
      // TODO: implement when game is ready
      // Example:
      //   container.innerHTML = '';
      //   const canvas = document.createElement('canvas');
      //   canvas.width = container.clientWidth;
      //   canvas.height = container.clientHeight;
      //   container.appendChild(canvas);
      //   GameEngine.start(canvas, config);
      console.info("[Game] mount() called — implementation pending.", {
        container,
        config,
      });
    }

    function init() {
      // Detect container existence for diagnostics
      const container = document.getElementById("game-container");
      if (container) {
        container.dataset.ready = "true";
        container.dataset.mountedGame = "none";
      }
    }

    return { init: init, mount: mount };
  })();

  /* ----------------------------------------
     Boot
     ---------------------------------------- */
  function boot() {
    App.Nav.init();
    App.Reveal.init();
    App.ContactForm.init();
    App.Resume.init();
    App.ActiveNav.init();
    App.Game.init();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();

/*
                  send email function 
*/

const form = document.getElementById("contact-form");
const status = document.getElementById("form-status");

async function handleSubmbit(event) {
  event.preventDefault();
  const data = new FormData(event.target);

  fetch(event.target.action, {
    method: form.method,
    body: data,
    headers: {
      Accept: "application/json",
    },
  })
    .then((response) => {
      if (response.ok) {
        status.style.display = "block";
        status.innerHTML = "✓ Message received. I'll get back to you shortly.";
        form.reset();
      } else {
        response.json().then((data) => {
          if (Object.hasOwn(data, "errors")) {
            status.innerHTML = data["errors"]
              .map((error) => error["message"])
              .join(", ");
          } else {
            status.innerHTML = "Oops! There was a problem submitting your form";
          }
        });
      }
    })
    .catch((error) => {
      status.style.display = "block";
      status.innerHTML = "Oops! There was a problem submitting your form";
    });
}

form.addEventListener("submit", handleSubmbit);
