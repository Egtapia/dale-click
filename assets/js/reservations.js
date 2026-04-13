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

  const session = getSession();
  const token = getToken();

  if (!session || !token) {
    window.location.href = "./login.html";
    return;
  }

  const avatarEl = document.getElementById("account-avatar");
  const fullNameEl = document.getElementById("account-fullname");
  const emailEl = document.getElementById("account-email");

  if (avatarEl) avatarEl.textContent = (session.firstName || "U").charAt(0).toUpperCase();
  if (fullNameEl) fullNameEl.textContent = `${session.firstName || ""} ${session.lastName || ""}`.trim();
  if (emailEl) emailEl.textContent = session.email || "-";

  const reservationsList = document.getElementById("reservations-list");
  const reservationsEmpty = document.getElementById("reservations-empty");
  const reservationsCountText = document.getElementById("reservations-count-text");

  if (!reservationsList || !reservationsEmpty || !reservationsCountText) return;

  function formatPrice(price) {
    const numericPrice = Number(price) || 0;
    return `${numericPrice.toLocaleString("es-NI")} C$`;
  }

  function formatDate(dateString) {
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return "Fecha no disponible";

    return date.toLocaleString("es-NI", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  }

  async function loadReservations() {
    try {
      const response = await fetch("http://localhost:3001/api/reservations/mine", {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (!response.ok) {
        reservationsList.innerHTML = "";
        reservationsEmpty.style.display = "block";
        reservationsCountText.textContent = data.message || data.error || "No se pudieron cargar las reservas.";
        return;
      }

      const reservations = Array.isArray(data.reservations) ? data.reservations : [];

      if (reservations.length === 0) {
        reservationsList.innerHTML = "";
        reservationsEmpty.style.display = "block";
        reservationsCountText.textContent = "Aún no has realizado reservas.";
        return;
      }

      reservationsEmpty.style.display = "none";
      reservationsCountText.textContent = `${reservations.length} reserva${reservations.length !== 1 ? "s" : ""} registrada${reservations.length !== 1 ? "s" : ""}.`;

      reservationsList.innerHTML = reservations
        .map((reservation) => {
          return `
            <article class="reservation-card reveal reveal-delay-2">
              <img
                src="${reservation.imageURL || "../assets/images/producto-default.jpg"}"
                alt="${reservation.productName}"
                class="reservation-image"
                onerror="this.src='../assets/images/producto-default.jpg'"
              />

              <div class="reservation-content">
                <p class="reservation-category">${reservation.categoryName || "General"}</p>
                <h3 class="reservation-title">${reservation.productName}</h3>
                <p class="reservation-business"><strong>Negocio:</strong> ${reservation.businessName}</p>
                <p class="reservation-note"><strong>Estado:</strong> ${reservation.orderStatus || "Pendiente"}</p>
                <p class="reservation-date"><strong>Fecha:</strong> ${formatDate(reservation.orderDate)}</p>
              </div>

              <div class="reservation-side">
                <p class="reservation-price">${formatPrice(reservation.totalAmount)}</p>
                <span class="reservation-status">
                  <span class="material-symbols-outlined">schedule</span>
                  ${reservation.orderStatus || "Pendiente"}
                </span>
                <p><strong>Cantidad:</strong> ${reservation.quantity}</p>
              </div>
            </article>
          `;
        })
        .join("");
    } catch (error) {
      reservationsList.innerHTML = "";
      reservationsEmpty.style.display = "block";
      reservationsCountText.textContent = "No se pudo conectar con el servidor.";
    }
  }

  loadReservations();
});