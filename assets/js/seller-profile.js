document.addEventListener("DOMContentLoaded", () => {
  const profileCard = document.getElementById("seller-profile-card");
  const categoriesTabs = document.getElementById("seller-categories-tabs");
  const productsGrid = document.getElementById("seller-products-grid");
  const productsCount = document.getElementById("seller-products-count");
  const noResultsMessage = document.getElementById("seller-products-no-results");

  if (!profileCard || !categoriesTabs || !productsGrid || !productsCount || !noResultsMessage) return;

  const API_BASE = "http://localhost:3001/api/businesses";

  let activeCategory = "todas";
  let currentBusiness = null;
  let currentProducts = [];

  function getBusinessIdFromUrl() {
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
    return `${numericPrice.toLocaleString("es-NI", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })} C$`;
  }

  function getImageUrl(url) {
    return url && String(url).trim() !== ""
      ? url
      : "../assets/images/logo-seller-default.png";
  }

  function formatHourRange(hour) {
    if (hour.isClosed) return "Cerrado";

    const open = String(hour.openTime || "").slice(0, 5);
    const close = String(hour.closeTime || "").slice(0, 5);
    return `${open} - ${close}`;
  }

  function getTypeBadge(business) {
    if (business.type === "universitario") {
      return `
        <span class="seller-profile-badge university">
          <span class="material-symbols-outlined">school</span>
          Emprendimiento universitario
        </span>
      `;
    }

    return `
      <span class="seller-profile-badge local">
        <span class="material-symbols-outlined">store</span>
        Negocio local
      </span>
    `;
  }

  function getUniversityBadge(business) {
    if (business.type !== "universitario" || !business.universityName) return "";

    return `
      <span class="seller-profile-badge university">
        <span class="material-symbols-outlined">account_balance</span>
        ${escapeHtml(business.universityName)}
      </span>
    `;
  }

  function renderProfile(business, hours) {
    const addressParts = [
      business.addressLine,
      business.city,
      business.department
    ].filter(Boolean);

    const address = addressParts.length
      ? addressParts.join(", ")
      : "Dirección no disponible";

    const hoursHtml = hours.length
      ? hours.map((hour) => `
          <div class="seller-hours-item">
            <span class="seller-hours-day">${escapeHtml(hour.dayOfWeek)}</span>
            <span>${escapeHtml(formatHourRange(hour))}</span>
          </div>
        `).join("")
      : `<div class="seller-hours-item"><span class="seller-hours-day">Horario</span><span>No disponible</span></div>`;

    profileCard.innerHTML = `
      <div class="seller-profile-cover">
        <img
          src="${escapeHtml(getImageUrl(business.logoURL))}"
          alt="${escapeHtml(business.businessName)}"
          class="seller-profile-logo"
          onerror="this.src='../assets/images/logo-seller-default.png'"
        />
      </div>

      <div class="seller-profile-body">
        <div class="seller-profile-main">
          <div class="seller-profile-badges">
            ${getTypeBadge(business)}
            ${getUniversityBadge(business)}
          </div>

          <p class="seller-profile-category">${escapeHtml(business.category || "Sin categoría")}</p>
          <h1 class="seller-profile-name">${escapeHtml(business.businessName)}</h1>
          <p class="seller-profile-description">${escapeHtml(business.description || "Sin descripción disponible.")}</p>

          <div class="seller-profile-tags">
            <span class="seller-profile-tag">
              <span class="material-symbols-outlined">location_on</span>
              ${escapeHtml([business.city, business.department].filter(Boolean).join(", ") || "Ubicación no disponible")}
            </span>

            <span class="seller-profile-tag">
              <span class="material-symbols-outlined">verified</span>
              ${escapeHtml(business.status || "Activo")}
            </span>
          </div>
        </div>

        <div class="seller-profile-side">
          <div class="seller-info-card">
            <h3>Información de contacto</h3>

            <div class="seller-info-list">
              <div class="seller-info-item">
                <span class="material-symbols-outlined">call</span>
                <span>${escapeHtml(business.contactPhone || "No disponible")}</span>
              </div>

              <div class="seller-info-item">
                <span class="material-symbols-outlined">mail</span>
                <span>${escapeHtml(business.contactEmail || "No disponible")}</span>
              </div>

              <div class="seller-info-item">
                <span class="material-symbols-outlined">home_pin</span>
                <span>${escapeHtml(address)}</span>
              </div>

              <div class="seller-info-item">
                <span class="material-symbols-outlined">info</span>
                <span>${escapeHtml(business.referenceNote || "Sin referencia adicional")}</span>
              </div>
            </div>
          </div>

          <div class="seller-info-card">
            <h3>Horario de atención</h3>
            <div class="seller-hours-list">
              ${hoursHtml}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function getAvailableCategories(products) {
    const map = new Map();

    products.forEach((product) => {
      if (!map.has(product.categoryValue)) {
        map.set(product.categoryValue, product.categoryName);
      }
    });

    return [
      { value: "todas", label: "Todas" },
      ...Array.from(map.entries()).map(([value, label]) => ({ value, label }))
    ];
  }

  function renderCategoryTabs(categories) {
    categoriesTabs.innerHTML = categories
      .map((category) => {
        const isActive = category.value === activeCategory ? "active" : "";
        return `
          <button
            type="button"
            class="seller-category-tab ${isActive}"
            data-category="${escapeHtml(category.value)}"
          >
            ${escapeHtml(category.label)}
          </button>
        `;
      })
      .join("");

    categoriesTabs.querySelectorAll(".seller-category-tab").forEach((tab) => {
      tab.addEventListener("click", () => {
        activeCategory = tab.dataset.category;
        renderCategoryTabs(categories);
        renderProducts();
      });
    });
  }

  function buildProductCard(product) {
    return `
      <article class="product-card">
        <img
          src="${escapeHtml(product.imageURL || "../assets/images/producto-default.jpg")}"
          alt="${escapeHtml(product.productName)}"
          class="product-image"
          onerror="this.src='../assets/images/producto-default.jpg'"
        />
        <div class="product-info">
          <p class="product-category">${escapeHtml(product.categoryName)}</p>
          <h3 class="product-name">${escapeHtml(product.productName)}</h3>
          <p class="product-price">${formatPrice(product.price)}</p>
          <p class="product-business">${escapeHtml(currentBusiness.businessName)}</p>
          <a href="./product-detail.html?id=${encodeURIComponent(product.productID)}" class="btn btn-small">Ver</a>
        </div>
      </article>
    `;
  }

  function renderProducts() {
    let filteredProducts = [...currentProducts];

    if (activeCategory !== "todas") {
      filteredProducts = filteredProducts.filter(
        (product) => product.categoryValue === activeCategory
      );
    }

    if (!filteredProducts.length) {
      productsGrid.innerHTML = "";
      noResultsMessage.style.display = "block";
      productsCount.textContent = "0 productos encontrados";
      return;
    }

    productsGrid.innerHTML = filteredProducts.map(buildProductCard).join("");
    noResultsMessage.style.display = "none";
    productsCount.textContent = `${filteredProducts.length} producto${filteredProducts.length !== 1 ? "s" : ""} disponible${filteredProducts.length !== 1 ? "s" : ""}`;
  }

  async function loadSellerProfile() {
    const businessID = getBusinessIdFromUrl();

    try {
      const response = await fetch(`${API_BASE}/${businessID}`);
      const data = await response.json();

      if (!response.ok || !data.ok || !data.business) {
        profileCard.innerHTML = `
          <div class="seller-profile-loading">
            No se pudo cargar el perfil del emprendimiento.
          </div>
        `;
        productsGrid.innerHTML = "";
        productsCount.textContent = "No disponible";
        noResultsMessage.style.display = "block";
        return;
      }

      currentBusiness = data.business;

      const hours = Array.isArray(data.hours)
        ? data.hours
        : Array.isArray(data.business.hours)
          ? data.business.hours
          : [];

      currentProducts = Array.isArray(data.products)
        ? data.products
        : Array.isArray(data.business.products)
          ? data.business.products
          : [];

      renderProfile(currentBusiness, hours);

      const categories = getAvailableCategories(currentProducts);
      renderCategoryTabs(categories);
      renderProducts();
    } catch (error) {
      console.error("Error cargando seller profile:", error);
      profileCard.innerHTML = `
        <div class="seller-profile-loading">
          Error al cargar el perfil del emprendimiento.
        </div>
      `;
    }
  }

  loadSellerProfile();
});