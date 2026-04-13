document.addEventListener("DOMContentLoaded", () => {
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
    } catch (error) {
      clearSession();
      window.location.href = "./login.html";
    }
  }

  loadMyAccount();
});