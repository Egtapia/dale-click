const API_BASE_URL = "http://localhost:3001/api";

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