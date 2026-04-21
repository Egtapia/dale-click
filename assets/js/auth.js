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

const API_BASE_URL = window.DaleClickAPI?.buildUrl("/api") || "/api";

function sanitizeClientText(value) {
  return String(value || "").trim();
}

function sanitizeIdentifier(value) {
  return sanitizeClientText(value).replace(/\s+/g, " ");
}

function showMessage(element, message, type = "error") {
  if (!element) return;
  element.textContent = message;
  element.className = `auth-message ${type}`;
}

function setSession(user, token) {
  const safeSession = {
    userID: user.userID,
    username: user.username,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    phone: user.phone,
    nationalID: user.nationalID || "",
    roleID: user.roleID
  };

  localStorage.setItem("daleclick_session", JSON.stringify(safeSession));
  localStorage.setItem("daleclick_token", token);
}

function togglePasswordVisibility(button) {
  const targetId = button.getAttribute("data-target");
  const input = document.getElementById(targetId);
  const icon = button.querySelector(".material-symbols-outlined");

  if (!input || !icon) return;

  const isPassword = input.type === "password";
  input.type = isPassword ? "text" : "password";
  icon.textContent = isPassword ? "visibility_off" : "visibility";
}

document.querySelectorAll(".toggle-password").forEach((button) => {
  button.addEventListener("click", () => togglePasswordVisibility(button));
});

const registerForm = document.getElementById("register-form");
const loginForm = document.getElementById("login-form");

if (registerForm) {
  registerForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const messageBox = document.getElementById("register-message");

    const firstName = sanitizeClientText(document.getElementById("firstName")?.value);
    const lastName = sanitizeClientText(document.getElementById("lastName")?.value);
    const username = sanitizeIdentifier(document.getElementById("username")?.value);
    const email = sanitizeIdentifier(document.getElementById("email")?.value).toLowerCase();
    const phone = sanitizeIdentifier(document.getElementById("phone")?.value);
    const nationalID = sanitizeIdentifier(document.getElementById("nationalID")?.value).toUpperCase();
    const password = sanitizeClientText(document.getElementById("password")?.value);
    const confirmPassword = sanitizeClientText(document.getElementById("confirmPassword")?.value);
    const termsAccepted = document.getElementById("terms")?.checked;

    if (!firstName || !lastName || !username || !email || !phone || !nationalID || !password || !confirmPassword) {
      showMessage(messageBox, "Completa todos los campos obligatorios.");
      return;
    }

    if (!termsAccepted) {
      showMessage(messageBox, "Debes aceptar los términos para crear tu cuenta.");
      return;
    }

    if (password.length < 8) {
      showMessage(messageBox, "La contraseña debe tener al menos 8 caracteres.");
      return;
    }

    if (password !== confirmPassword) {
      showMessage(messageBox, "Las contraseñas no coinciden.");
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          firstName,
          lastName,
          username,
          email,
          phone,
          nationalID,
          password
        })
      });

      const data = await response.json();

      if (!response.ok) {
        showMessage(messageBox, data.message || "No se pudo completar el registro.");
        return;
      }

      showMessage(messageBox, "Cuenta creada correctamente. Ahora puedes iniciar sesión.", "success");

      setTimeout(() => {
        window.location.href = "./login.html";
      }, 1200);
    } catch (error) {
      showMessage(messageBox, "No se pudo conectar con el servidor.");
    }
  });
}

if (loginForm) {
  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const messageBox = document.getElementById("login-message");

    const identifier = sanitizeIdentifier(document.getElementById("identifier")?.value);
    const password = sanitizeClientText(document.getElementById("password")?.value);

    if (!identifier || !password) {
      showMessage(messageBox, "Completa tus credenciales.");
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          identifier,
          password
        })
      });

      const data = await response.json();

      if (!response.ok) {
        showMessage(messageBox, data.message || "No se pudo iniciar sesión.");
        return;
      }

      setSession(data.user, data.token);
      showMessage(messageBox, "Login exitoso. Redirigiendo...", "success");

      setTimeout(() => {
        window.location.href = "./index.html";
      }, 800);
    } catch (error) {
      showMessage(messageBox, "No se pudo conectar con el servidor.");
    }
  });
}
