(() => {
  if (typeof window === "undefined" || window.DaleClickAPI?.ready) {
    return;
  }

  const API_BASE_STORAGE_KEY = "daleclick_api_base_url";
  const API_BASE_QUERY_KEY = "apiBaseUrl";
  const nativeFetch = window.fetch.bind(window);

  function normalizeBaseUrl(value) {
    const rawValue = String(value || "").trim();
    if (!rawValue) return "";

    try {
      const url = new URL(rawValue, window.location.origin);
      const pathname = url.pathname.replace(/\/+$/, "");
      return `${url.origin}${pathname === "/" ? "" : pathname}`;
    } catch {
      return "";
    }
  }

  function persistBaseUrl(value) {
    const normalizedValue = normalizeBaseUrl(value);

    if (!normalizedValue) {
      window.localStorage.removeItem(API_BASE_STORAGE_KEY);
      return "";
    }

    window.localStorage.setItem(API_BASE_STORAGE_KEY, normalizedValue);
    return normalizedValue;
  }

  function readMetaBaseUrl() {
    const metaTag = document.querySelector('meta[name="daleclick-api-base-url"]');
    return metaTag?.content || "";
  }

  function consumeQueryBaseUrl() {
    const url = new URL(window.location.href);
    const queryValue = url.searchParams.get(API_BASE_QUERY_KEY);

    if (!queryValue) {
      return "";
    }

    url.searchParams.delete(API_BASE_QUERY_KEY);
    window.history.replaceState({}, "", url);
    return persistBaseUrl(queryValue);
  }

  function readConfiguredBaseUrl() {
    const queryBaseUrl = consumeQueryBaseUrl();
    if (queryBaseUrl) return queryBaseUrl;

    const runtimeBaseUrl = normalizeBaseUrl(window.DALECLICK_API_BASE_URL);
    if (runtimeBaseUrl) return runtimeBaseUrl;

    const metaBaseUrl = normalizeBaseUrl(readMetaBaseUrl());
    if (metaBaseUrl) return metaBaseUrl;

    return normalizeBaseUrl(window.localStorage.getItem(API_BASE_STORAGE_KEY));
  }

  function isApiLikePath(value) {
    return typeof value === "string" && /^\/api(\/|$)/i.test(value);
  }

  function resolveApiUrl(value) {
    const rawValue = String(value || "");
    if (!isApiLikePath(rawValue)) {
      return rawValue;
    }

    const configuredBaseUrl = readConfiguredBaseUrl();
    if (!configuredBaseUrl) {
      return rawValue;
    }

    return new URL(rawValue, `${configuredBaseUrl}/`).toString();
  }

  function patchedFetch(input, init) {
    if (typeof input === "string") {
      return nativeFetch(resolveApiUrl(input), init);
    }

    if (input instanceof URL) {
      return nativeFetch(resolveApiUrl(input.toString()), init);
    }

    if (input instanceof Request) {
      const resolvedUrl = resolveApiUrl(input.url);

      if (resolvedUrl !== input.url) {
        return nativeFetch(new Request(resolvedUrl, input), init);
      }
    }

    return nativeFetch(input, init);
  }

  async function requestJson(input, init = {}, contextLabel = "API") {
    const response = await patchedFetch(input, init);
    const contentType = String(response.headers.get("content-type") || "").toLowerCase();
    const rawBody = await response.text();

    if (!contentType.includes("application/json")) {
      const preview = rawBody.replace(/\s+/g, " ").trim().slice(0, 140);
      throw new Error(
        `${contextLabel} devolvio una respuesta no JSON (${response.status}) desde ${response.url}. Preview: ${preview || "sin contenido"}`
      );
    }

    let data;

    try {
      data = rawBody ? JSON.parse(rawBody) : null;
    } catch {
      throw new Error(`${contextLabel} devolvio JSON invalido desde ${response.url}.`);
    }

    return { response, data };
  }

  window.fetch = patchedFetch;
  window.DaleClickAPI = {
    ready: true,
    getBaseUrl: readConfiguredBaseUrl,
    setBaseUrl: persistBaseUrl,
    clearBaseUrl: () => persistBaseUrl(""),
    buildUrl: resolveApiUrl,
    requestJson
  };
})();

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

      @media (max-width: 576px) {
        .user-menu-trigger {
          gap: 8px;
          padding: 8px 10px;
          box-shadow: 0 6px 14px rgba(0, 0, 0, 0.04);
        }

        .user-avatar {
          width: 28px;
          height: 28px;
          font-size: 0.82rem;
        }

        .user-menu-trigger .material-symbols-outlined {
          font-size: 18px;
        }

        .user-menu-dropdown {
          min-width: 184px;
          border-radius: 16px;
          padding: 8px;
        }

        .user-menu-link {
          padding: 10px 12px;
          border-radius: 12px;
          font-size: 0.88rem;
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
