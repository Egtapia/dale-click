document.addEventListener("DOMContentLoaded", () => {
  const WALLET_ENABLED_KEY = "daleclick_wallet_enabled";
  const WALLET_BUDGET_KEY = "daleclick_wallet_budget";
  const WALLET_RESERVED_KEY = "daleclick_wallet_reserved_total";

  function getSession() {
    const raw = localStorage.getItem("daleclick_session");
    if (!raw) return null;

    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  function getToken() {
    return localStorage.getItem("daleclick_token");
  }

  function clearSession() {
    localStorage.removeItem("daleclick_session");
    localStorage.removeItem("daleclick_token");
  }

  function formatCurrency(value) {
    const number = Number(value || 0);
    return `C$ ${number.toLocaleString("es-NI", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  }

  function getWalletEnabled() {
    return localStorage.getItem(WALLET_ENABLED_KEY) === "true";
  }

  function getWalletBudget() {
    return Number(localStorage.getItem(WALLET_BUDGET_KEY) || 0);
  }

  function getWalletReserved() {
    return Number(localStorage.getItem(WALLET_RESERVED_KEY) || 0);
  }

  function saveWalletSettings(enabled, budget) {
    localStorage.setItem(WALLET_ENABLED_KEY, enabled ? "true" : "false");
    localStorage.setItem(WALLET_BUDGET_KEY, String(Number(budget || 0)));
  }

  function bindWalletUI() {
    const walletToggle = document.getElementById("wallet-enabled");
    const walletBudgetInput = document.getElementById("wallet-budget");
    const walletFields = document.getElementById("wallet-fields");
    const walletSummary = document.getElementById("wallet-summary");
    const walletMessage = document.getElementById("wallet-message");
    const walletSaveButton = document.getElementById("wallet-save-button");
    const walletClearButton = document.getElementById("wallet-clear-button");
    const walletReservedInfo = document.getElementById("wallet-reserved-info");
    const walletAvailableInfo = document.getElementById("wallet-available-info");

    if (!walletToggle || !walletBudgetInput || !walletFields || !walletSummary || !walletMessage) {
      return;
    }

    function updateWalletView() {
      const enabled = getWalletEnabled();
      const budget = getWalletBudget();
      const reserved = getWalletReserved();
      const available = Math.max(budget - reserved, 0);

      walletToggle.checked = enabled;
      walletFields.style.display = enabled ? "block" : "none";

      if (enabled) {
        walletBudgetInput.value = budget > 0 ? budget : "";

        if (budget > 0) {
          walletSummary.textContent = `Tu presupuesto total es ${formatCurrency(budget)}.`;
        } else {
          walletSummary.textContent = "Activa tu cartera e ingresa tu presupuesto disponible.";
        }

        if (walletReservedInfo) {
          walletReservedInfo.textContent = `Comprometido en reservas: ${formatCurrency(reserved)}`;
        }

        if (walletAvailableInfo) {
          walletAvailableInfo.textContent = `Disponible restante: ${formatCurrency(available)}`;
        }
      } else {
        walletBudgetInput.value = "";
        walletSummary.textContent = "Tu cartera está desactivada.";

        if (walletReservedInfo) {
          walletReservedInfo.textContent = "Comprometido en reservas: C$ 0.00";
        }

        if (walletAvailableInfo) {
          walletAvailableInfo.textContent = "Disponible restante: C$ 0.00";
        }
      }

      walletMessage.textContent = "";
      walletMessage.className = "wallet-message";
    }

    walletToggle.addEventListener("change", () => {
      const currentBudget = getWalletBudget();
      saveWalletSettings(walletToggle.checked, currentBudget);
      updateWalletView();
    });

    walletSaveButton?.addEventListener("click", () => {
      const enabled = walletToggle.checked;
      const budget = Number(walletBudgetInput.value || 0);

      if (!enabled) {
        walletMessage.textContent = "Primero activa la cartera para guardar un presupuesto.";
        walletMessage.className = "wallet-message error";
        return;
      }

      if (Number.isNaN(budget) || budget <= 0) {
        walletMessage.textContent = "Ingresa un presupuesto válido mayor que cero.";
        walletMessage.className = "wallet-message error";
        return;
      }

      saveWalletSettings(true, budget);
      updateWalletView();

      walletMessage.textContent = "Tu presupuesto fue guardado correctamente.";
      walletMessage.className = "wallet-message success";
    });

    walletClearButton?.addEventListener("click", () => {
      localStorage.setItem(WALLET_RESERVED_KEY, "0");
      saveWalletSettings(false, 0);
      updateWalletView();

      walletMessage.textContent = "Tu cartera fue desactivada y el presupuesto se limpió.";
      walletMessage.className = "wallet-message success";
    });

    updateWalletView();
  }

  async function loadMyAccount() {
    const session = getSession();
    const token = getToken();

    if (!session || !token) {
      window.location.href = "./login.html";
      return;
    }

    const avatarEl = document.getElementById("account-avatar");
    const fullNameEl = document.getElementById("account-fullname");
    const emailEl = document.getElementById("account-email");

    const infoFirstName = document.getElementById("info-first-name");
    const infoLastName = document.getElementById("info-last-name");
    const infoUsername = document.getElementById("info-username");
    const infoEmail = document.getElementById("info-email");
    const infoPhone = document.getElementById("info-phone");
    const infoNationalID = document.getElementById("info-national-id");

    try {
      const response = await fetch("http://localhost:3001/api/auth/me", {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (!response.ok || !data.user) {
        clearSession();
        window.location.href = "./login.html";
        return;
      }

      const user = data.user;
      const fullName = `${user.firstName || ""} ${user.lastName || ""}`.trim() || "Usuario";
      const avatar = (user.firstName || "U").charAt(0).toUpperCase();

      localStorage.setItem(
        "daleclick_session",
        JSON.stringify({
          userID: user.userID,
          username: user.username,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phone: user.phone,
          nationalID: user.nationalID || "",
          roleID: user.roleID
        })
      );

      if (avatarEl) avatarEl.textContent = avatar;
      if (fullNameEl) fullNameEl.textContent = fullName;
      if (emailEl) emailEl.textContent = user.email || "-";

      if (infoFirstName) infoFirstName.textContent = user.firstName || "-";
      if (infoLastName) infoLastName.textContent = user.lastName || "-";
      if (infoUsername) infoUsername.textContent = user.username || "-";
      if (infoEmail) infoEmail.textContent = user.email || "-";
      if (infoPhone) infoPhone.textContent = user.phone || "-";
      if (infoNationalID) infoNationalID.textContent = user.nationalID || "-";

      bindWalletUI();
    } catch (error) {
      clearSession();
      window.location.href = "./login.html";
    }
  }

  loadMyAccount();
});