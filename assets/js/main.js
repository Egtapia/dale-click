document.addEventListener("DOMContentLoaded", () => {
  const headerActions = document.querySelector(".header-actions");

  function getSession() {
    const raw = localStorage.getItem("daleclick_session");
    if (!raw) return null;

    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  function clearSession() {
    localStorage.removeItem("daleclick_session");
    localStorage.removeItem("daleclick_token");
  }

  function escapeHtml(text) {
    return String(text ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function injectUserMenuStyles() {
    if (document.getElementById("daleclick-user-menu-styles")) return;

    const style = document.createElement("style");
    style.id = "daleclick-user-menu-styles";
    style.textContent = `
      .user-menu {
        position: relative;
      }

      .user-menu-trigger {
        display: inline-flex;
        align-items: center;
        gap: 10px;
        padding: 10px 14px;
        border-radius: 999px;
        background-color: #ffffff;
        border: 1px solid rgba(0, 0, 0, 0.08);
        box-shadow: 0 6px 14px rgba(0, 0, 0, 0.05);
        cursor: pointer;
      }

      .user-avatar {
        width: 34px;
        height: 34px;
        border-radius: 50%;
        background: linear-gradient(135deg, #1f5cb3, #0f4c97);
        color: #ffffff;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-size: 0.92rem;
        font-weight: 700;
      }

      .user-menu-text {
        font-weight: 600;
        color: #1d1d1f;
      }

      .user-menu-trigger .material-symbols-outlined {
        font-size: 20px;
        color: #1d1d1f;
      }

      .user-menu-dropdown {
        position: absolute;
        top: calc(100% + 10px);
        right: 0;
        min-width: 220px;
        background-color: #ffffff;
        border-radius: 20px;
        box-shadow: 0 18px 28px rgba(0, 0, 0, 0.12);
        border: 1px solid rgba(0, 0, 0, 0.05);
        padding: 10px;
        display: none;
        z-index: 1000;
      }

      .user-menu.active .user-menu-dropdown {
        display: block;
      }

      .user-menu-link {
        width: 100%;
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 12px 14px;
        border-radius: 14px;
        background: none;
        color: #1d1d1f;
        font-size: 0.95rem;
        text-align: left;
        text-decoration: none;
        border: none;
        cursor: pointer;
      }

      .user-menu-link:hover {
        background-color: #f5f8ff;
        color: #0f4c97;
      }

      .user-menu-link .material-symbols-outlined {
        font-size: 20px;
      }

      @media (max-width: 768px) {
        .user-menu-text {
          display: none;
        }

        .user-menu-dropdown {
          right: 0;
          min-width: 200px;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function renderGuestHeader() {
    if (!headerActions) return;

    headerActions.innerHTML = `
      <a href="./login.html" class="btn btn-outline">Iniciar sesión</a>
      <a href="./register.html" class="btn btn-text">Crear cuenta</a>
    `;
  }

  function bindUserMenu() {
    const userMenu = document.getElementById("user-menu");
    const trigger = document.getElementById("user-menu-trigger");
    const logoutButton = document.getElementById("logout-button");

    if (!userMenu || !trigger) return;

    trigger.addEventListener("click", (event) => {
      event.stopPropagation();
      userMenu.classList.toggle("active");
    });

    document.addEventListener("click", (event) => {
      if (!userMenu.contains(event.target)) {
        userMenu.classList.remove("active");
      }
    });

    if (logoutButton) {
      logoutButton.addEventListener("click", () => {
        clearSession();
        window.location.href = "./index.html";
      });
    }
  }

  function renderUserHeader(session) {
    if (!headerActions) return;

    const firstName = escapeHtml(session.firstName || "Usuario");
    const initial = firstName.charAt(0).toUpperCase();

    headerActions.innerHTML = `
      <div class="user-menu" id="user-menu">
        <button type="button" class="user-menu-trigger" id="user-menu-trigger">
          <span class="user-avatar">${initial}</span>
          <span class="user-menu-text">Hola, ${firstName}</span>
          <span class="material-symbols-outlined">expand_more</span>
        </button>

        <div class="user-menu-dropdown" id="user-menu-dropdown">
          <a href="./my-account.html" class="user-menu-link">
            <span class="material-symbols-outlined">person</span>
            Mi cuenta
          </a>

          <a href="./my-reservations.html" class="user-menu-link">
            <span class="material-symbols-outlined">inventory_2</span>
            Mis reservas
          </a>

          <button type="button" class="user-menu-link" id="logout-button">
            <span class="material-symbols-outlined">logout</span>
            Cerrar sesión
          </button>
        </div>
      </div>
    `;

    bindUserMenu();
  }

  injectUserMenuStyles();

  if (!headerActions) {
    console.warn("No se encontró .header-actions en esta página.");
    return;
  }

  const session = getSession();

  if (session && session.firstName) {
    renderUserHeader(session);
  } else {
    renderGuestHeader();
  }
});