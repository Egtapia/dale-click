document.addEventListener("DOMContentLoaded", () => {
  const productDetailCard = document.getElementById("product-detail-card");
  const relatedProductsGrid = document.getElementById("related-products-grid");
  const relatedNoResults = document.getElementById("related-products-no-results");

  const authRequiredModal = document.getElementById("auth-required-modal");
  const reserveModal = document.getElementById("reserve-modal");
  const reserveSuccessModal = document.getElementById("reserve-success-modal");

  if (!productDetailCard || !relatedProductsGrid) return;

  const mockBusinesses = window.DALECLICK_DATA?.businesses || [];
const mockProducts = window.DALECLICK_DATA?.products || [];

  let currentProduct = null;
  let currentBusiness = null;

  function getProductIdFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return Number(params.get("id")) || 1;
  }

  function escapeHtml(text) {
    return String(text ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function formatPrice(price) {
    const numericPrice = Number(price) || 0;
    return `${numericPrice.toLocaleString("es-NI")} C$`;
  }

  function getTypeLabel(business) {
    return business.type === "universitario"
      ? "Emprendimiento universitario"
      : "Negocio local";
  }

  function getLocationLabel(business) {
    return `${business.city}, ${business.department}`;
  }

  function buildWhatsAppUrl(phone, productName) {
    const cleanPhone = `505${String(phone || "").replace(/\D/g, "")}`;
    const message = encodeURIComponent(
      `Hola, me interesa el producto "${productName}" que vi en Dale Click.`
    );
    return `https://wa.me/${cleanPhone}?text=${message}`;
  }

  function isUserLoggedIn() {
    /*
      Simulación temporal.
      Luego esto debe venir del backend o de una sesión real segura.
    */
    const session = localStorage.getItem("daleclick_session");
    return Boolean(session);
  }

  function openModal(modal) {
    if (!modal) return;
    modal.classList.add("active");
    modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  }

  function closeModal(modal) {
    if (!modal) return;
    modal.classList.remove("active");
    modal.setAttribute("aria-hidden", "true");

    const anyModalOpen = document.querySelector(".modal-overlay.active");
    if (!anyModalOpen) {
      document.body.style.overflow = "";
    }
  }

  function closeAllModals() {
    document.querySelectorAll(".modal-overlay").forEach((modal) => {
      modal.classList.remove("active");
      modal.setAttribute("aria-hidden", "true");
    });
    document.body.style.overflow = "";
  }

  function buildThumbs(imageURLs) {
    return imageURLs
      .map((url, index) => {
        const activeClass = index === 0 ? "active" : "";
        return `
          <button
            type="button"
            class="product-detail-thumb ${activeClass}"
            data-image="${escapeHtml(url)}"
            aria-label="Ver imagen ${index + 1}"
          >
            <img
              src="${escapeHtml(url)}"
              alt="Miniatura del producto"
              onerror="this.src='../assets/images/producto-default.jpg'"
            />
          </button>
        `;
      })
      .join("");
  }

  function renderProductDetail(product, business) {
    const mainImage = product.imageURLs[0] || "../assets/images/producto-default.jpg";
    const whatsappUrl = buildWhatsAppUrl(business.contactPhone, product.productName);

    productDetailCard.innerHTML = `
      <div class="product-detail-body">
        <div class="product-detail-gallery">
          <div class="product-detail-image-wrapper">
            <img
              src="${escapeHtml(mainImage)}"
              alt="${escapeHtml(product.productName)}"
              class="product-detail-image"
              id="main-product-image"
              onerror="this.src='../assets/images/producto-default.jpg'"
            />
          </div>

          <div class="product-detail-thumbs">
            ${buildThumbs(product.imageURLs)}
          </div>
        </div>

        <div class="product-detail-info">
          <div class="product-detail-badges">
            <span class="product-detail-badge category">
              <span class="material-symbols-outlined">sell</span>
              ${escapeHtml(product.categoryName)}
            </span>

            <span class="product-detail-badge status">
              <span class="material-symbols-outlined">inventory</span>
              ${escapeHtml(product.availabilityStatus)}
            </span>
          </div>

          <h1 class="product-detail-title">${escapeHtml(product.productName)}</h1>
          <p class="product-detail-price">${formatPrice(product.price)}</p>
          <p class="product-detail-description">${escapeHtml(product.description)}</p>

          <div class="product-detail-meta">
            <span class="product-detail-tag">
              <span class="material-symbols-outlined">storefront</span>
              ${escapeHtml(business.businessName)}
            </span>

            <span class="product-detail-tag">
              <span class="material-symbols-outlined">category</span>
              ${escapeHtml(getTypeLabel(business))}
            </span>

            <span class="product-detail-tag">
              <span class="material-symbols-outlined">location_on</span>
              ${escapeHtml(getLocationLabel(business))}
            </span>

            ${
              business.universityName
                ? `
                  <span class="product-detail-tag">
                    <span class="material-symbols-outlined">school</span>
                    ${escapeHtml(business.universityName)}
                  </span>
                `
                : ""
            }
          </div>

          <div class="product-detail-panels">
            <div class="product-detail-panel">
              <h3>Información del producto</h3>
              <ul>
                <li><strong>Categoría:</strong> ${escapeHtml(product.categoryName)}</li>
                <li><strong>Disponibilidad:</strong> ${escapeHtml(product.availabilityStatus)}</li>
                <li><strong>Stock estimado:</strong> ${escapeHtml(product.stock)}</li>
              </ul>
            </div>

            <div class="product-detail-panel">
              <h3>Información del emprendimiento</h3>
              <ul>
                <li><strong>Negocio:</strong> ${escapeHtml(business.businessName)}</li>
                <li><strong>Teléfono:</strong> ${escapeHtml(business.contactPhone)}</li>
                <li><strong>Correo:</strong> ${escapeHtml(business.contactEmail)}</li>
              </ul>
            </div>
          </div>

          <div class="product-detail-actions">
            <button
              type="button"
              class="btn btn-small product-detail-primary-btn"
              id="reserve-product-button"
            >
              Reservar producto
            </button>

            <a
              href="./seller-profile.html?id=${encodeURIComponent(business.businessID)}"
              class="btn product-detail-secondary-btn"
            >
              Ver emprendimiento
            </a>

            <a
              href="${whatsappUrl}"
              target="_blank"
              rel="noopener noreferrer"
              class="btn product-detail-outline-btn"
            >
              Contactar
            </a>
          </div>
        </div>
      </div>
    `;

    bindGalleryEvents();
    bindReserveButton();
  }

  function bindGalleryEvents() {
    const mainImage = document.getElementById("main-product-image");
    const thumbs = document.querySelectorAll(".product-detail-thumb");

    thumbs.forEach((thumb) => {
      thumb.addEventListener("click", () => {
        const selectedImage = thumb.dataset.image;

        if (mainImage && selectedImage) {
          mainImage.src = selectedImage;
        }

        thumbs.forEach((item) => item.classList.remove("active"));
        thumb.classList.add("active");
      });
    });
  }

  function fillReserveModal(product, business) {
    const productNameEl = document.getElementById("reserve-product-name");
    const productPriceEl = document.getElementById("reserve-product-price");
    const businessNameEl = document.getElementById("reserve-business-name");
    const quantityEl = document.getElementById("reserve-quantity");
    const noteEl = document.getElementById("reserve-note");

    if (productNameEl) productNameEl.textContent = product.productName;
    if (productPriceEl) productPriceEl.textContent = formatPrice(product.price);
    if (businessNameEl) businessNameEl.textContent = business.businessName;
    if (quantityEl) quantityEl.value = 1;
    if (noteEl) noteEl.value = "";
  }

  function bindReserveButton() {
    const reserveButton = document.getElementById("reserve-product-button");

    if (!reserveButton) return;

    reserveButton.addEventListener("click", () => {
      if (!isUserLoggedIn()) {
        openModal(authRequiredModal);
        return;
      }

      fillReserveModal(currentProduct, currentBusiness);
      openModal(reserveModal);
    });
  }

  function buildRelatedProductCard(product, business) {
    return `
      <article class="product-card">
        <img
          src="${escapeHtml(product.imageURLs[0] || "../assets/images/producto-default.jpg")}"
          alt="${escapeHtml(product.productName)}"
          class="product-image"
          onerror="this.src='../assets/images/producto-default.jpg'"
        />
        <div class="product-info">
          <p class="product-category">${escapeHtml(product.categoryName)}</p>
          <h3 class="product-name">${escapeHtml(product.productName)}</h3>
          <p class="product-price">${formatPrice(product.price)}</p>
          <p class="product-business">${escapeHtml(business.businessName)}</p>
          <a href="./product-detail.html?id=${encodeURIComponent(product.productID)}" class="btn btn-small">Ver</a>
        </div>
      </article>
    `;
  }

  function renderRelatedProducts(product, business) {
    const relatedProducts = mockProducts.filter((item) => {
      const sameBusiness = item.businessID === product.businessID;
      const sameCategory = item.categoryValue === product.categoryValue;
      const notSameProduct = item.productID !== product.productID;

      return notSameProduct && (sameBusiness || sameCategory);
    });

    if (relatedProducts.length === 0) {
      relatedProductsGrid.innerHTML = "";
      if (relatedNoResults) relatedNoResults.style.display = "block";
      return;
    }

    relatedProductsGrid.innerHTML = relatedProducts
      .slice(0, 6)
      .map((item) => {
        const relatedBusiness =
          mockBusinesses.find((b) => b.businessID === item.businessID) || business;
        return buildRelatedProductCard(item, relatedBusiness);
      })
      .join("");

    if (relatedNoResults) relatedNoResults.style.display = "none";
  }

  function bindModalEvents() {
    const closeAuthModal = document.getElementById("close-auth-modal");
    const cancelAuthModal = document.getElementById("cancel-auth-modal");

    const closeReserveModal = document.getElementById("close-reserve-modal");
    const cancelReserveModal = document.getElementById("cancel-reserve-modal");

    const closeSuccessModal = document.getElementById("close-success-modal");
    const closeSuccessButton = document.getElementById("close-success-button");

    const reserveForm = document.getElementById("reserve-form");

    if (closeAuthModal) {
      closeAuthModal.addEventListener("click", () => closeModal(authRequiredModal));
    }

    if (cancelAuthModal) {
      cancelAuthModal.addEventListener("click", () => closeModal(authRequiredModal));
    }

    if (closeReserveModal) {
      closeReserveModal.addEventListener("click", () => closeModal(reserveModal));
    }

    if (cancelReserveModal) {
      cancelReserveModal.addEventListener("click", () => closeModal(reserveModal));
    }

    if (closeSuccessModal) {
      closeSuccessModal.addEventListener("click", () => closeModal(reserveSuccessModal));
    }

    if (closeSuccessButton) {
      closeSuccessButton.addEventListener("click", () => closeModal(reserveSuccessModal));
    }

    document.querySelectorAll(".modal-overlay").forEach((modal) => {
      modal.addEventListener("click", (event) => {
        if (event.target === modal) {
          closeModal(modal);
        }
      });
    });

    if (reserveForm) {
      reserveForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!currentProduct || !currentBusiness) return;

  const quantityEl = document.getElementById("reserve-quantity");
  const noteEl = document.getElementById("reserve-note");

  const quantity = Number(quantityEl?.value || 1);
  const note = (noteEl?.value || "").trim();

  const token = localStorage.getItem("daleclick_token");

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
        productID: currentProduct.productID,
        quantity,
        note
      })
    });

    const data = await response.json();

    if (!response.ok) {
      alert(data.message || data.error || "No se pudo crear la reserva.");
      return;
    }

    closeModal(reserveModal);
    openModal(reserveSuccessModal);
  } catch (error) {
    alert("No se pudo conectar con el servidor.");
  }
});
    }
  }

  function loadProductDetail() {
    const productID = getProductIdFromUrl();

    currentProduct =
      mockProducts.find((item) => item.productID === productID) ||
      mockProducts[0];

    currentBusiness =
      mockBusinesses.find((item) => item.businessID === currentProduct.businessID) ||
      mockBusinesses[0];

    renderProductDetail(currentProduct, currentBusiness);
    renderRelatedProducts(currentProduct, currentBusiness);
  }

  bindModalEvents();
  loadProductDetail();

  /*
    SOLO PARA PRUEBAS VISUALES:
    Si quieres simular sesión iniciada temporalmente, descomenta esta línea:
    localStorage.setItem("daleclick_session", JSON.stringify({ userID: 1, role: "cliente" }));

    Para quitarla:
    localStorage.removeItem("daleclick_session");
  */
});