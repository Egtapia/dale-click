document.addEventListener("DOMContentLoaded", () => {
  const DEFAULT_PRODUCT_IMAGE = "/assets/images/producto-default.svg";
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

  function setReservedTotal(value) {
    localStorage.setItem(WALLET_RESERVED_KEY, String(Number(value || 0)));
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
  const reservationsList = document.getElementById("reservations-list");
  const reservationsEmpty = document.getElementById("reservations-empty");
  const reservationsCountText = document.getElementById("reservations-count-text");
  const historyToggleButton = document.getElementById("history-toggle-button");
  const reservationsViewTitle = document.getElementById("reservations-view-title");
  const reservationsNavLink = document.getElementById("reservations-nav-link");

  const urlParams = new URLSearchParams(window.location.search);
  let currentView = urlParams.get("view") === "history" ? "history" : "reservations";
  let latestReservations = [];

  if (avatarEl) avatarEl.textContent = (session.firstName || "U").charAt(0).toUpperCase();
  if (fullNameEl) fullNameEl.textContent = `${session.firstName || ""} ${session.lastName || ""}`.trim();
  if (emailEl) emailEl.textContent = session.email || "-";

  if (!reservationsList || !reservationsEmpty || !reservationsCountText) return;

  function formatPrice(price) {
    const numericPrice = Number(price) || 0;
    return `C$ ${numericPrice.toLocaleString("es-NI", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
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

  function normalizeStatus(status) {
    return String(status || "").toLowerCase().trim();
  }

  function isCancelable(status) {
    const normalized = normalizeStatus(status);
    return normalized !== "cancelada" && normalized !== "entregado";
  }

  function isActiveForWallet(status) {
    const normalized = normalizeStatus(status);
    return normalized !== "cancelada" && normalized !== "entregado";
  }

  function isHistoryReservation(status) {
    return normalizeStatus(status) === "entregado";
  }

  function getVisibleReservations(allReservations) {
    if (currentView === "history") {
      return allReservations.filter((reservation) => isHistoryReservation(reservation.orderStatus));
    }

    return allReservations.filter((reservation) => {
      const normalizedStatus = normalizeStatus(reservation.orderStatus);
      return normalizedStatus !== "cancelada" && normalizedStatus !== "entregado";
    });
  }

  function updateViewState() {
    const historyActive = currentView === "history";

    if (reservationsNavLink) {
      reservationsNavLink.classList.toggle("active", !historyActive);
    }

    if (historyToggleButton) {
      historyToggleButton.classList.toggle("active", historyActive);
      historyToggleButton.setAttribute("aria-pressed", historyActive ? "true" : "false");
    }

    if (reservationsViewTitle) {
      reservationsViewTitle.textContent = historyActive ? "Historial" : "Mis reservas";
    }
  }

  function getEmptyStateCopy() {
    if (currentView === "history") {
      return {
        countText: "No tienes productos entregados en tu historial.",
        title: "Aún no tienes compras entregadas",
        message: "Cuando se te entregue un producto en Dale Click, aparecerá aquí."
      };
    }

    return {
      countText: "No tienes reservas activas en este momento.",
      title: "Aún no tienes reservas",
      message: "Cuando reserves un producto en Dale Click, aparecerá aquí."
    };
  }

  function renderReservations(reservations) {
    const emptyTitle = reservationsEmpty.querySelector("h3");
    const emptyMessage = reservationsEmpty.querySelector("p");
    const emptyCopy = getEmptyStateCopy();

    if (reservations.length === 0) {
      reservationsList.innerHTML = "";
      reservationsEmpty.style.display = "block";
      reservationsCountText.textContent = emptyCopy.countText;
      if (emptyTitle) emptyTitle.textContent = emptyCopy.title;
      if (emptyMessage) emptyMessage.textContent = emptyCopy.message;
      return;
    }

    reservationsEmpty.style.display = "none";
    reservationsCountText.textContent =
      currentView === "history"
        ? `${reservations.length} compra${reservations.length !== 1 ? "s" : ""} en tu historial.`
        : `${reservations.length} reserva${reservations.length !== 1 ? "s" : ""} registrada${reservations.length !== 1 ? "s" : ""}.`;

    reservationsList.innerHTML = reservations
      .map((reservation) => {
        const status = reservation.orderStatus || "Pendiente";
        const actionArea =
          currentView === "history"
            ? `
              <span class="reservation-status-note">
                Producto entregado correctamente
              </span>
            `
            : isCancelable(status)
              ? `
                <button
                  type="button"
                  class="reservation-cancel-btn"
                  data-order-id="${reservation.orderID}"
                >
                  Cancelar reserva
                </button>
              `
              : `
                <span class="reservation-status-note">
                  Esta reserva ya no puede cancelarse
                </span>
              `;

        return `
          <article class="reservation-card">
            <img
              src="${reservation.imageURL || DEFAULT_PRODUCT_IMAGE}"
              alt="${reservation.productName}"
              class="reservation-image"
              onerror="this.src='${DEFAULT_PRODUCT_IMAGE}'"
            />

            <div class="reservation-content">
              <p class="reservation-category">${reservation.categoryName || "General"}</p>
              <h3 class="reservation-title">${reservation.productName}</h3>
              <p class="reservation-business"><strong>Negocio:</strong> ${reservation.businessName}</p>
              <p class="reservation-note"><strong>Estado:</strong> ${status}</p>
              <p class="reservation-date"><strong>Fecha:</strong> ${formatDate(reservation.orderDate)}</p>
            </div>

            <div class="reservation-side">
              <p class="reservation-price">${formatPrice(reservation.totalAmount)}</p>
              <span class="reservation-status">
                <span class="material-symbols-outlined">schedule</span>
                ${status}
              </span>
              <p><strong>Cantidad:</strong> ${reservation.quantity}</p>
              ${actionArea}
            </div>
          </article>
        `;
      })
      .join("");

    reservationsList.querySelectorAll(".reservation-cancel-btn").forEach((button) => {
      button.addEventListener("click", () => {
        cancelReservation(button.dataset.orderId);
      });
    });
  }

  async function cancelReservation(orderID) {
    const confirmCancel = window.confirm("¿Deseas cancelar esta reserva?");
    if (!confirmCancel) return;

    try {
      const response = await fetch(`/api/reservations/${orderID}/cancel`, {
        method: "PATCH",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        alert(data.message || "No se pudo cancelar la reserva.");
        return;
      }

      await loadReservations();
    } catch (error) {
      alert("No se pudo conectar con el servidor.");
    }
  }

  async function loadReservations() {
    try {
      const response = await fetch("/api/reservations/mine", {
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
        setReservedTotal(0);
        return;
      }

      latestReservations = Array.isArray(data.reservations) ? data.reservations : [];

      const reservedTotal = latestReservations
        .filter((reservation) => isActiveForWallet(reservation.orderStatus))
        .reduce((sum, reservation) => sum + Number(reservation.totalAmount || 0), 0);

      setReservedTotal(reservedTotal);
      updateViewState();
      renderReservations(getVisibleReservations(latestReservations));
    } catch (error) {
      reservationsList.innerHTML = "";
      reservationsEmpty.style.display = "block";
      reservationsCountText.textContent = "No se pudo conectar con el servidor.";
      setReservedTotal(0);
    }
  }

  historyToggleButton?.addEventListener("click", () => {
    currentView = currentView === "history" ? "reservations" : "history";
    const nextUrl = new URL(window.location.href);

    if (currentView === "history") {
      nextUrl.searchParams.set("view", "history");
    } else {
      nextUrl.searchParams.delete("view");
    }

    window.history.replaceState({}, "", nextUrl);
    updateViewState();
    renderReservations(getVisibleReservations(latestReservations));
  });

  updateViewState();
  loadReservations();
});
