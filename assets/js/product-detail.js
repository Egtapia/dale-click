const PRODUCT_API_BASE = "http://localhost:3001/api/products";
const WALLET_ENABLED_KEY = "daleclick_wallet_enabled";
const WALLET_BUDGET_KEY = "daleclick_wallet_budget";
const WALLET_RESERVED_KEY = "daleclick_wallet_reserved_total";

function getProductIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get("id");
}

function formatPrice(value) {
  const number = Number(value || 0);
  return `C$ ${number.toLocaleString("es-NI", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
}

function safeText(value, fallback = "-") {
  return value && String(value).trim() ? String(value).trim() : fallback;
}

function getValidImageUrl(url) {
  return url && String(url).trim() !== ""
    ? String(url).trim()
    : "../assets/images/producto-default.jpg";
}

function getSession() {
  const raw = localStorage.getItem("daleclick_session");
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
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

function setWalletReserved(value) {
  localStorage.setItem(WALLET_RESERVED_KEY, String(Math.max(Number(value || 0), 0)));
}

function getWalletAnalysis(productPrice) {
  const enabled = getWalletEnabled();
  const budget = getWalletBudget();
  const reserved = getWalletReserved();
  const available = Math.max(budget - reserved, 0);
  const price = Number(productPrice || 0);

  if (!enabled) {
    return {
      enabled: false
    };
  }

  if (budget <= 0) {
    return {
      enabled: true,
      validBudget: false
    };
  }

  const difference = available - price;
  const percentage = available > 0 ? (price / available) * 100 : 0;

  return {
    enabled: true,
    validBudget: true,
    budget,
    reserved,
    available,
    price,
    canAfford: difference >= 0,
    difference: Math.abs(difference),
    percentage
  };
}

function renderWalletBox(productPrice) {
  const wallet = getWalletAnalysis(productPrice);

  if (!wallet.enabled) {
    return `
      <div class="product-detail-panel wallet-panel">
        <h3>Cartera inteligente</h3>
        <p class="wallet-panel-text">
          Tienes esta función desactivada. Puedes activarla desde <strong>Mi cuenta</strong>
          para comparar tu presupuesto con este producto.
        </p>
      </div>
    `;
  }

  if (!wallet.validBudget) {
    return `
      <div class="product-detail-panel wallet-panel">
        <h3>Cartera inteligente</h3>
        <p class="wallet-panel-text">
          Tu cartera está activa, pero aún no has guardado un presupuesto válido en <strong>Mi cuenta</strong>.
        </p>
      </div>
    `;
  }

  const statusClass = wallet.canAfford ? "success" : "warning";
  const statusText = wallet.canAfford ? "Sí te alcanza" : "No te alcanza";
  const detailText = wallet.canAfford
    ? `Tomando en cuenta tus otras reservas, después de comprarlo te sobrarían ${formatPrice(wallet.difference)}.`
    : `Tomando en cuenta tus otras reservas, te faltarían ${formatPrice(wallet.difference)} para poder comprarlo.`;

  return `
    <div class="product-detail-panel wallet-panel ${statusClass}">
      <h3>Cartera inteligente</h3>
      <ul>
        <li><strong>Presupuesto total:</strong> ${formatPrice(wallet.budget)}</li>
        <li><strong>Comprometido en reservas:</strong> ${formatPrice(wallet.reserved)}</li>
        <li><strong>Disponible real para comprar:</strong> ${formatPrice(wallet.available)}</li>
        <li><strong>Estado:</strong> ${statusText}</li>
        <li><strong>Análisis:</strong> ${detailText}</li>
        <li><strong>Impacto en tu presupuesto:</strong> ${wallet.percentage.toFixed(1)}%</li>
      </ul>
    </div>
  `;
}

function renderGallery(images, productName, preferredImageUrl) {
  const thumbsContainer = document.getElementById("product-thumbnails");
  const mainImage = document.getElementById("product-main-image");

  if (!thumbsContainer || !mainImage) return;

  thumbsContainer.innerHTML = "";

  const uniqueImages = [];
  const seenUrls = new Set();

  const addImage = (url) => {
    const resolvedUrl = getValidImageUrl(url);

    if (seenUrls.has(resolvedUrl)) return;

    seenUrls.add(resolvedUrl);
    uniqueImages.push({ imageURL: resolvedUrl });
  };

  addImage(preferredImageUrl);

  if (Array.isArray(images)) {
    images.forEach((image) => addImage(image?.imageURL));
  }

  if (uniqueImages.length === 0) {
    addImage("");
  }

  const imageList = uniqueImages;

  mainImage.src = imageList[0].imageURL;
  mainImage.alt = productName || "Producto";

  imageList.forEach((image, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `product-detail-thumb ${index === 0 ? "active" : ""}`;
    button.setAttribute("data-image", image.imageURL);

    button.innerHTML = `
      <img
        src="${image.imageURL}"
        alt="${productName} ${index + 1}"
        onerror="this.src='../assets/images/producto-default.jpg'"
      />
    `;

    button.addEventListener("click", () => {
      document.querySelectorAll(".product-detail-thumb").forEach((btn) => btn.classList.remove("active"));
      button.classList.add("active");
      mainImage.src = button.getAttribute("data-image");
      mainImage.alt = productName || "Producto";
    });

    thumbsContainer.appendChild(button);
  });
}

function bindReserveButton(product) {
  const reserveButton = document.getElementById("reserve-product-button");
  const authRequiredModal = document.getElementById("auth-required-modal");
  const reserveModal = document.getElementById("reserve-modal");
  const reserveForm = document.getElementById("reserve-form");
  const reserveSuccessModal = document.getElementById("reserve-success-modal");

  const closeAuthModal = document.getElementById("close-auth-modal");
  const cancelAuthModal = document.getElementById("cancel-auth-modal");

  const closeReserveModal = document.getElementById("close-reserve-modal");
  const cancelReserveModal = document.getElementById("cancel-reserve-modal");

  const closeSuccessModal = document.getElementById("close-success-modal");
  const closeSuccessButton = document.getElementById("close-success-button");

  const reserveProductName = document.getElementById("reserve-product-name");
  const reserveProductPrice = document.getElementById("reserve-product-price");
  const reserveBusinessName = document.getElementById("reserve-business-name");

  if (!reserveButton) return;

  function openModal(modal) {
    if (!modal) return;
    modal.classList.add("active");
    modal.setAttribute("aria-hidden", "false");
  }

  function closeModal(modal) {
    if (!modal) return;
    modal.classList.remove("active");
    modal.setAttribute("aria-hidden", "true");
  }

  reserveButton.addEventListener("click", () => {
    const session = getSession();

    if (!session) {
      openModal(authRequiredModal);
      return;
    }

    if (reserveProductName) reserveProductName.textContent = safeText(product.productName);
    if (reserveProductPrice) reserveProductPrice.textContent = formatPrice(product.price);
    if (reserveBusinessName) reserveBusinessName.textContent = safeText(product.businessName);

    openModal(reserveModal);
  });

  closeAuthModal?.addEventListener("click", () => closeModal(authRequiredModal));
  cancelAuthModal?.addEventListener("click", () => closeModal(authRequiredModal));

  closeReserveModal?.addEventListener("click", () => closeModal(reserveModal));
  cancelReserveModal?.addEventListener("click", () => closeModal(reserveModal));

  closeSuccessModal?.addEventListener("click", () => closeModal(reserveSuccessModal));
  closeSuccessButton?.addEventListener("click", () => closeModal(reserveSuccessModal));

  authRequiredModal?.addEventListener("click", (event) => {
    if (event.target === authRequiredModal) closeModal(authRequiredModal);
  });

  reserveModal?.addEventListener("click", (event) => {
    if (event.target === reserveModal) closeModal(reserveModal);
  });

  reserveSuccessModal?.addEventListener("click", (event) => {
    if (event.target === reserveSuccessModal) closeModal(reserveSuccessModal);
  });

  reserveForm?.addEventListener("submit", async (event) => {
    event.preventDefault();

    const token = localStorage.getItem("daleclick_token");
    const quantity = Number(document.getElementById("reserve-quantity")?.value || 1);
    const note = document.getElementById("reserve-note")?.value?.trim() || "";

    if (!token) {
      closeModal(reserveModal);
      openModal(authRequiredModal);
      return;
    }

    try {
      const response = await fetch("http://localhost:3001/api/reservations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          productID: product.productID,
          quantity,
          note
        })
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        alert(data.message || "No se pudo registrar la reserva.");
        return;
      }

      if (getWalletEnabled()) {
        const reservationAmount =
          Number(data?.reservation?.totalAmount || 0) ||
          (Number(product.price || 0) * quantity);
        setWalletReserved(getWalletReserved() + reservationAmount);
      }

      reserveForm.reset();
      const quantityInput = document.getElementById("reserve-quantity");
      if (quantityInput) quantityInput.value = 1;

      closeModal(reserveModal);
      openModal(reserveSuccessModal);
    } catch (error) {
      console.error("Error enviando reserva:", error);
      alert("No se pudo conectar con el servidor.");
    }
  });
}

function renderProductDetail(product) {
  const container = document.getElementById("product-detail-card");
  if (!container) return;

  const cityText = [safeText(product.city, ""), safeText(product.department, "")]
    .filter(Boolean)
    .join(", ");

  container.innerHTML = `
    <div class="product-detail-body">
      <div class="product-detail-gallery">
        <div class="product-detail-image-wrapper">
          <img
            id="product-main-image"
            class="product-detail-image"
            src="../assets/images/producto-default.jpg"
            alt="${safeText(product.productName, "Producto")}"
            onerror="this.src='../assets/images/producto-default.jpg'"
          />
        </div>

        <div class="product-detail-thumbs" id="product-thumbnails"></div>
      </div>

      <div class="product-detail-info">
        <div class="product-detail-badges">
          <span class="product-detail-badge category">
            <span class="material-symbols-outlined">sell</span>
            ${safeText(product.categoryName)}
          </span>

          <span class="product-detail-badge status">
            <span class="material-symbols-outlined">inventory</span>
            ${safeText(product.availabilityStatus, "Disponible")}
          </span>
        </div>

        <h1 class="product-detail-title">${safeText(product.productName)}</h1>
        <p class="product-detail-price">${formatPrice(product.price)}</p>

        <p class="product-detail-description">
          ${safeText(product.description, "Sin descripción disponible.")}
        </p>

        <div class="product-detail-meta">
          <span class="product-detail-tag">
            <span class="material-symbols-outlined">storefront</span>
            ${safeText(product.businessName)}
          </span>

          <span class="product-detail-tag">
            <span class="material-symbols-outlined">location_on</span>
            ${cityText || "Ubicación no disponible"}
          </span>
        </div>

        <div class="product-detail-panels">
          <div class="product-detail-panel">
            <h3>Información del producto</h3>
            <ul>
              <li><strong>Categoría:</strong> ${safeText(product.categoryName)}</li>
              <li><strong>Disponibilidad:</strong> ${safeText(product.availabilityStatus, "Disponible")}</li>
              <li><strong>Stock estimado:</strong> ${safeText(product.stock)}</li>
            </ul>
          </div>

          <div class="product-detail-panel">
            <h3>Información del emprendimiento</h3>
            <ul>
              <li><strong>Negocio:</strong> ${safeText(product.businessName)}</li>
              <li><strong>Teléfono:</strong> ${safeText(product.contactPhone)}</li>
              <li><strong>Correo:</strong> ${safeText(product.contactEmail)}</li>
            </ul>
          </div>

          ${renderWalletBox(product.price)}
        </div>

        <div class="product-detail-actions">
          <button
            class="btn btn-small product-detail-primary-btn"
            id="reserve-product-button"
            data-product-id="${product.productID}"
            type="button"
          >
            Reservar producto
          </button>

          <a
            href="./seller-profile.html?id=${product.businessID}"
            class="btn product-detail-secondary-btn"
            id="view-business-button"
          >
            Ver emprendimiento
          </a>

          <button
            type="button"
            class="btn product-detail-outline-btn"
            onclick="window.history.back()"
          >
            Volver
          </button>
        </div>
      </div>
    </div>
  `;

  renderGallery(product.images, product.productName, product.imageURL);
  bindReserveButton(product);
}

async function loadProductDetail() {
  const productId = getProductIdFromUrl();
  const container = document.getElementById("product-detail-card");

  if (!productId) {
    if (container) {
      container.innerHTML = `<div class="product-detail-loading">Producto no encontrado.</div>`;
    }
    return;
  }

  try {
    const response = await fetch(`${PRODUCT_API_BASE}/${productId}`);
    const data = await response.json();

    if (!response.ok || !data.ok || !data.product) {
      if (container) {
        container.innerHTML = `<div class="product-detail-loading">Producto no encontrado.</div>`;
      }
      return;
    }

    renderProductDetail(data.product);
  } catch (error) {
    console.error("Error cargando detalle del producto:", error);
    if (container) {
      container.innerHTML = `<div class="product-detail-loading">Error cargando producto.</div>`;
    }
  }
}

document.addEventListener("DOMContentLoaded", loadProductDetail);
