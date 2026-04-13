document.addEventListener("DOMContentLoaded", () => {
  const registerForm = document.getElementById("register-form");
  const loginForm = document.getElementById("login-form");
  const togglePasswordButtons = document.querySelectorAll(".toggle-password-btn");

  const API_BASE_URL = "http://localhost:3001/api";

  function sanitizeClientText(value) {
  return String(value || "").trim();
}

  function showMessage(element, message) {
    if (!element) return;
    element.textContent = message;
    element.style.display = "block";
  }

  function hideMessage(element) {
    if (!element) return;
    element.textContent = "";
    element.style.display = "none";
  }

  function normalizeText(value) {
    return String(value || "").trim();
  }

  function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  function validatePhone(phone) {
    return /^[0-9+\-\s()]{8,20}$/.test(phone);
  }

  function setSession(user, token) {
    const safeSession = {
      userID: user.userID,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone,
      roleID: user.roleID
    };

    localStorage.setItem("daleclick_session", JSON.stringify(safeSession));
    localStorage.setItem("daleclick_token", token);
  }

  function clearLegacyMockUsers() {
    localStorage.removeItem("daleclick_mock_users");
  }

  function togglePasswordVisibility(targetId, button) {
    const input = document.getElementById(targetId);
    if (!input || !button) return;

    const icon = button.querySelector(".material-symbols-outlined");
    const isPassword = input.type === "password";

    input.type = isPassword ? "text" : "password";

    if (icon) {
      icon.textContent = isPassword ? "visibility_off" : "visibility";
    }
  }

  togglePasswordButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const targetId = button.dataset.target;
      togglePasswordVisibility(targetId, button);
    });
  });

  if (registerForm) {
    registerForm.addEventListener("submit", async (event) => {
      event.preventDefault();

      const errorMessage = document.getElementById("register-error-message");
      const successMessage = document.getElementById("register-success-message");

      hideMessage(errorMessage);
      hideMessage(successMessage);

      const firstName = normalizeText(document.getElementById("first-name")?.value);
      const lastName = normalizeText(document.getElementById("last-name")?.value);
      const username = normalizeText(document.getElementById("username")?.value);
      const email = normalizeText(document.getElementById("email")?.value);
      const phone = normalizeText(document.getElementById("phone")?.value);
      const password = normalizeText(document.getElementById("password")?.value);
      const confirmPassword = normalizeText(document.getElementById("confirm-password")?.value);
      const acceptedTerms = document.getElementById("terms")?.checked;

      if (!firstName || !lastName || !username || !email || !phone || !password || !confirmPassword) {
        showMessage(errorMessage, "Completa todos los campos obligatorios.");
        return;
      }

      if (!validateEmail(email)) {
        showMessage(errorMessage, "Ingresa un correo electrónico válido.");
        return;
      }

      if (!validatePhone(phone)) {
        showMessage(errorMessage, "Ingresa un número de teléfono válido.");
        return;
      }

      if (password.length < 6) {
        showMessage(errorMessage, "La contraseña debe tener al menos 6 caracteres.");
        return;
      }

      if (password !== confirmPassword) {
        showMessage(errorMessage, "Las contraseñas no coinciden.");
        return;
      }

      if (!acceptedTerms) {
        showMessage(errorMessage, "Debes aceptar los términos para continuar.");
        return;
      }

      try {
        const response = await fetch(`${API_BASE_URL}/auth/register`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            username,
            firstName,
            lastName,
            email,
            password,
            phone
          })
        });

        const data = await response.json();

        if (!response.ok) {
          showMessage(errorMessage, data.message || data.error || "No se pudo crear la cuenta.");
          return;
        }

        clearLegacyMockUsers();
        showMessage(successMessage, data.message || "Cuenta creada correctamente.");

        registerForm.reset();

        setTimeout(() => {
          window.location.href = "./login.html";
        }, 1200);
      } catch (error) {
        showMessage(errorMessage, "No se pudo conectar con el servidor.");
      }
    });
  }

  if (loginForm) {
    loginForm.addEventListener("submit", async (event) => {
      event.preventDefault();

      const errorMessage = document.getElementById("login-error-message");
      const successMessage = document.getElementById("login-success-message");

      hideMessage(errorMessage);
      hideMessage(successMessage);

      const identifier = normalizeText(document.getElementById("login-email")?.value);
      const password = normalizeText(document.getElementById("login-password")?.value);

      if (!identifier || !password) {
        showMessage(errorMessage, "Completa todos los campos.");
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
          showMessage(errorMessage, data.message || data.error || "No se pudo iniciar sesión.");
          return;
        }

        if (!data.token || !data.user) {
          showMessage(errorMessage, "La respuesta del servidor no es válida.");
          return;
        }

        setSession(data.user, data.token);
        showMessage(successMessage, data.message || "Inicio de sesión exitoso.");

        loginForm.reset();

        setTimeout(() => {
          window.location.href = "./index.html";
        }, 1000);
      } catch (error) {
        showMessage(errorMessage, "No se pudo conectar con el servidor.");
      }
    });
  }
});