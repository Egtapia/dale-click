const CHATBOT_API_URL = "/api/chatbot/message";
const CHATBOT_IMAGE_URL = "/assets/images/clicky.png";
const CHATBOT_DEFAULT_SUGGESTIONS = [
  "Quiero algo barato",
  "Mu\u00e9strame comida",
  "Busco ropa",
  "Quiero ver negocios locales"
];

function chatbotEscapeHtml(text) {
  return String(text ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function chatbotFormatPrice(value) {
  const amount = Number(value ?? 0);
  return `C$ ${amount.toFixed(2)}`;
}

function chatbotFormatDate(value) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Reciente";
  }

  return date.toLocaleString("es-NI", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function getChatbotToken() {
  return localStorage.getItem("daleclick_token") || "";
}

function renderChatbotProductCard(product) {
  return `
    <article class="chatbot-card">
      <div class="chatbot-card-media">
        <img
          src="${chatbotEscapeHtml(product.imageURL || "/assets/images/producto-default.svg")}"
          alt="${chatbotEscapeHtml(product.productName || "Producto")}"
          loading="lazy"
          onerror="this.src='/assets/images/producto-default.svg'"
        />
      </div>
      <div class="chatbot-card-body">
        <span class="chatbot-card-badge">${chatbotEscapeHtml(product.categoryName || "Producto")}</span>
        <h4 class="chatbot-card-title">${chatbotEscapeHtml(product.productName || "Producto sin nombre")}</h4>
        <p class="chatbot-card-meta">${chatbotEscapeHtml(product.businessName || "Negocio local")} | ${chatbotEscapeHtml(product.city || "Sin ciudad")}</p>
        <p class="chatbot-card-copy">${chatbotFormatPrice(product.price)} | ${chatbotEscapeHtml(product.availabilityStatus || "Disponible")}</p>
        <div class="chatbot-card-actions">
          <a class="chatbot-card-link" href="${chatbotEscapeHtml(product.detailPath || "#")}">Ver producto</a>
        </div>
      </div>
    </article>
  `;
}

function renderChatbotBusinessCard(business) {
  const locationLabel = business.universityName
    ? `${business.city || "Sin ciudad"} | ${business.universityName}`
    : (business.city || "Sin ciudad");

  return `
    <article class="chatbot-card">
      <div class="chatbot-card-media">
        <img
          src="${chatbotEscapeHtml(business.logoURL || "/assets/images/logo-seller-default.png")}"
          alt="${chatbotEscapeHtml(business.businessName || "Negocio")}"
          loading="lazy"
          onerror="this.src='/assets/images/logo-seller-default.png'"
        />
      </div>
      <div class="chatbot-card-body">
        <span class="chatbot-card-badge">${chatbotEscapeHtml(business.categoryName || "Negocio")}</span>
        <h4 class="chatbot-card-title">${chatbotEscapeHtml(business.businessName || "Negocio sin nombre")}</h4>
        <p class="chatbot-card-meta">${chatbotEscapeHtml(locationLabel)}</p>
        <p class="chatbot-card-copy">${chatbotEscapeHtml(business.description || "Explora sus productos disponibles.")}</p>
        <div class="chatbot-card-actions">
          <a class="chatbot-card-link" href="${chatbotEscapeHtml(business.detailPath || "#")}">Ver negocio</a>
        </div>
      </div>
    </article>
  `;
}

function renderChatbotReservationCard(reservation) {
  return `
    <article class="chatbot-card">
      <div class="chatbot-card-media">
        <img
          src="/assets/images/producto-default.svg"
          alt="${chatbotEscapeHtml(reservation.productName || "Reserva")}"
          loading="lazy"
        />
      </div>
      <div class="chatbot-card-body">
        <span class="chatbot-card-badge">Reserva</span>
        <h4 class="chatbot-card-title">${chatbotEscapeHtml(reservation.productName || "Producto")}</h4>
        <p class="chatbot-card-meta">Estado: ${chatbotEscapeHtml(reservation.orderStatus || "Pendiente")}</p>
        <p class="chatbot-card-copy">Fecha: ${chatbotEscapeHtml(chatbotFormatDate(reservation.orderDate))}</p>
        <div class="chatbot-card-actions">
          <a class="chatbot-card-link" href="./my-reservations.html">Ver mis reservas</a>
        </div>
      </div>
    </article>
  `;
}

function ensureChatbotMarkup() {
  let widget = document.getElementById("chatbot-widget");

  if (widget) {
    return widget;
  }

  widget = document.createElement("section");
  widget.className = "chatbot-widget";
  widget.id = "chatbot-widget";
  widget.setAttribute("aria-label", "Asistente Dale Click");
  widget.innerHTML = `
    <div class="chatbot-panel" role="dialog" aria-modal="false" aria-labelledby="chatbot-title">
      <div class="chatbot-header">
        <div class="chatbot-header-top">
          <div class="chatbot-brand">
            <div class="chatbot-avatar" aria-hidden="true">
              <img src="${CHATBOT_IMAGE_URL}" alt="" />
            </div>
            <div>
              <h2 class="chatbot-title" id="chatbot-title">Clicky</h2>
              <p class="chatbot-subtitle">Tu compa\u00f1ero de compras</p>
            </div>
          </div>

          <button type="button" class="chatbot-close" id="chatbot-close" aria-label="Cerrar chat">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>
      </div>

      <div class="chatbot-messages" id="chatbot-messages" aria-live="polite"></div>
      <div class="chatbot-suggestions" id="chatbot-suggestions"></div>

      <form class="chatbot-form" id="chatbot-form">
        <div class="chatbot-input-wrap">
          <textarea
            class="chatbot-input"
            id="chatbot-input"
            rows="1"
          ></textarea>

          <button type="submit" class="chatbot-submit" id="chatbot-submit" aria-label="Enviar mensaje">
            <span class="material-symbols-outlined">north_east</span>
          </button>
        </div>
      </form>
    </div>

    <button
      type="button"
      class="chatbot-launcher"
      id="chatbot-launcher"
      aria-label="Abrir chat con Clicky"
      aria-expanded="false"
    >
      <img src="${CHATBOT_IMAGE_URL}" alt="" />
    </button>
  `;

  document.body.appendChild(widget);
  return widget;
}

document.addEventListener("DOMContentLoaded", () => {
  const widget = ensureChatbotMarkup();
  if (!widget) return;

  const launcher = document.getElementById("chatbot-launcher");
  const closeButton = document.getElementById("chatbot-close");
  const messages = document.getElementById("chatbot-messages");
  const suggestions = document.getElementById("chatbot-suggestions");
  const form = document.getElementById("chatbot-form");
  const input = document.getElementById("chatbot-input");
  const submitButton = document.getElementById("chatbot-submit");

  function toggleWidget(forceState) {
    const nextState = typeof forceState === "boolean"
      ? forceState
      : !widget.classList.contains("is-open");

    widget.classList.toggle("is-open", nextState);
    launcher.setAttribute("aria-expanded", String(nextState));

    if (nextState) {
      window.setTimeout(() => input.focus(), 120);
    }
  }

  function scrollMessagesToBottom() {
    messages.scrollTop = messages.scrollHeight;
  }

  function renderSuggestions(items) {
    const safeItems = Array.isArray(items) && items.length ? items : CHATBOT_DEFAULT_SUGGESTIONS;

    suggestions.innerHTML = safeItems
      .slice(0, 4)
      .map(
        (item) => `
          <button type="button" class="chatbot-suggestion" data-chatbot-suggestion="${chatbotEscapeHtml(item)}">
            ${chatbotEscapeHtml(item)}
          </button>
        `
      )
      .join("");

    suggestions.querySelectorAll("[data-chatbot-suggestion]").forEach((button) => {
      button.addEventListener("click", () => {
        sendMessage(button.dataset.chatbotSuggestion || "");
      });
    });
  }

  function appendMessage(role, text, payload = {}) {
    const wrapper = document.createElement("div");
    wrapper.className = `chatbot-message is-${role}`;

    let cardsMarkup = "";

    if (Array.isArray(payload.products) && payload.products.length) {
      cardsMarkup += `
        <div class="chatbot-cards">
          ${payload.products.map(renderChatbotProductCard).join("")}
        </div>
      `;
    }

    if (Array.isArray(payload.businesses) && payload.businesses.length) {
      cardsMarkup += `
        <div class="chatbot-cards">
          ${payload.businesses.map(renderChatbotBusinessCard).join("")}
        </div>
      `;
    }

    if (Array.isArray(payload.reservations) && payload.reservations.length) {
      cardsMarkup += `
        <div class="chatbot-cards">
          ${payload.reservations.map(renderChatbotReservationCard).join("")}
        </div>
      `;
    }

    wrapper.innerHTML = `
      <div class="chatbot-bubble">${chatbotEscapeHtml(text)}</div>
      ${cardsMarkup}
    `;

    messages.appendChild(wrapper);
    scrollMessagesToBottom();
  }

  function appendTyping() {
    const typing = document.createElement("div");
    typing.className = "chatbot-message is-bot";
    typing.id = "chatbot-typing";
    typing.innerHTML = `
      <div class="chatbot-typing">
        <span></span>
        <span></span>
        <span></span>
      </div>
    `;
    messages.appendChild(typing);
    scrollMessagesToBottom();
  }

  function removeTyping() {
    const typing = document.getElementById("chatbot-typing");
    if (typing) typing.remove();
  }

async function sendMessage(textFromSuggestion = "") {
    const content = String(textFromSuggestion || input.value || "").trim();
    if (!content) return;

    appendMessage("user", content);
    input.value = "";
    input.style.height = "";
    submitButton.disabled = true;
    appendTyping();

    try {
      const token = getChatbotToken();
      const headers = {
        "Content-Type": "application/json"
      };

      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const apiResponse = window.DaleClickAPI?.requestJson
        ? await window.DaleClickAPI.requestJson(
            CHATBOT_API_URL,
            {
              method: "POST",
              headers,
              body: JSON.stringify({ message: content })
            },
            "Chatbot"
          )
        : {
            response: await fetch(CHATBOT_API_URL, {
              method: "POST",
              headers,
              body: JSON.stringify({ message: content })
            })
          };
      const response = apiResponse.response;
      const data = apiResponse.data || await response.json();
      removeTyping();

      if (!response.ok || !data.ok) {
        appendMessage("bot", "No pude ayudarte en este momento. Intenta nuevamente en unos segundos.");
        return;
      }

      appendMessage("bot", data.reply || "Aqu\u00ed tienes una respuesta.", data);
      renderSuggestions(data.suggestions);
    } catch (error) {
      console.error("Error enviando mensaje al chatbot:", error);
      removeTyping();
      appendMessage("bot", "Ocurri\u00f3 un error de conexi\u00f3n. Revisa la p\u00e1gina e intenta otra vez.");
    } finally {
      submitButton.disabled = false;
      input.focus();
    }
  }

  launcher.addEventListener("click", () => toggleWidget());
  closeButton.addEventListener("click", () => toggleWidget(false));

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    sendMessage();
  });

  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  });

  input.addEventListener("input", () => {
    input.style.height = "auto";
    input.style.height = `${Math.min(input.scrollHeight, 120)}px`;
  });

  appendMessage(
    "bot",
    "\u00a1Hola, soy Clicky! Puedo ayudarte a encontrar productos, negocios y explicarte c\u00f3mo funciona Dale Click."
  );
  renderSuggestions(CHATBOT_DEFAULT_SUGGESTIONS);
});
