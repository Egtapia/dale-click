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

  function redirectIfNoSession() {
    const session = getSession();

    if (!session) {
      window.location.href = "./login.html";
      return null;
    }

    return session;
  }

  const session = redirectIfNoSession();
  if (!session) return;

  const fullName = `${session.firstName || ""} ${session.lastName || ""}`.trim() || "Usuario";
  const avatar = (session.firstName || "U").charAt(0).toUpperCase();

  const avatarEl = document.getElementById("account-avatar");
  const fullNameEl = document.getElementById("account-fullname");
  const emailEl = document.getElementById("account-email");

  const infoFirstName = document.getElementById("info-first-name");
  const infoLastName = document.getElementById("info-last-name");
  const infoUsername = document.getElementById("info-username");
  const infoEmail = document.getElementById("info-email");
  const infoPhone = document.getElementById("info-phone");

  if (avatarEl) avatarEl.textContent = avatar;
  if (fullNameEl) fullNameEl.textContent = fullName;
  if (emailEl) emailEl.textContent = session.email || "-";

  const fullUser = session;

  if (infoFirstName) infoFirstName.textContent = fullUser?.firstName || session.firstName || "-";
  if (infoLastName) infoLastName.textContent = fullUser?.lastName || session.lastName || "-";
  if (infoUsername) infoUsername.textContent = fullUser?.username || session.username || "-";
  if (infoEmail) infoEmail.textContent = fullUser?.email || session.email || "-";
  if (infoPhone) infoPhone.textContent = fullUser?.phone || "-";
});