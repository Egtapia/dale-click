document.addEventListener("DOMContentLoaded", () => {
  const discountsGrid = document.getElementById("discounts-grid");
  const searchInput = document.getElementById("discounts-search-input");
  const typeFilter = document.getElementById("discounts-type-filter");
  const universityFilter = document.getElementById("discounts-university-filter");
  const noResultsMessage = document.getElementById("discounts-no-results");
  const resultsCount = document.getElementById("discounts-results-count");

  if (!discountsGrid) return;

  const mockDiscounts = [
    {
      productID: 1,
      productName: "Cámara Canon",
      businessName: "Foto Studio",
      oldPrice: 12000,
      newPrice: 11000,
      discountPercent: 8,
      category: "Tecnología",
      type: "universitario",
      universityName: "Keiser University Latin American Campus (Managua)",
      universityValue: "keiser-managua",
      imageURL: "../assets/images/producto-1.jpg"
    },
    {
      productID: 3,
      productName: "Set de cuidado personal",
      businessName: "Beauty Box",
      oldPrice: 3600,
      newPrice: 3000,
      discountPercent: 17,
      category: "Belleza",
      type: "universitario",
      universityName: "Keiser University Latin American Campus (San Marcos)",
      universityValue: "keiser-san-marcos",
      imageURL: "../assets/images/producto-3.jpg"
    },
    {
      productID: 4,
      productName: "Zapatos casuales",
      businessName: "Maria Store",
      oldPrice: 4200,
      newPrice: 3500,
      discountPercent: 17,
      category: "Ropa",
      type: "local",
      universityName: "",
      universityValue: "",
      imageURL: "../assets/images/producto-4.jpg"
    },
    {
      productID: 5,
      productName: "Tacones elegantes",
      businessName: "Maria Store",
      oldPrice: 7200,
      newPrice: 6500,
      discountPercent: 10,
      category: "Ropa",
      type: "local",
      universityName: "",
      universityValue: "",
      imageURL: "../assets/images/producto-5.jpg"
    },
    {
      productID: 7,
      productName: "Snack saludable",
      businessName: "Snack Point",
      oldPrice: 150,
      newPrice: 120,
      discountPercent: 20,
      category: "Alimentos",
      type: "universitario",
      universityName: "UAM",
      universityValue: "uam",
      imageURL: "../assets/images/producto-default.jpg"
    },
    {
      productID: 8,
      productName: "Asesoría express",
      businessName: "ServiClick",
      oldPrice: 650,
      newPrice: 500,
      discountPercent: 23,
      category: "Servicios",
      type: "universitario",
      universityName: "UNI",
      universityValue: "uni",
      imageURL: "../assets/images/producto-default.jpg"
    }
  ];

  function normalizeText(text) {
    return (text || "")
      .toString()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();
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

  function getTypeBadge(discount) {
    if (discount.type === "universitario") {
      return `
        <span class="discount-type-badge university">
          <span class="material-symbols-outlined">school</span>
          Emprendimiento universitario
        </span>
      `;
    }

    return `
      <span class="discount-type-badge local">
        <span class="material-symbols-outlined">store</span>
        Negocio local
      </span>
    `;
  }

  function getUniversityTag(discount) {
    if (discount.type !== "universitario" || !discount.universityName) {
      return "";
    }

    return `
      <span class="discount-tag">
        <span class="material-symbols-outlined">account_balance</span>
        ${escapeHtml(discount.universityName)}
      </span>
    `;
  }

  function buildDiscountCard(discount) {
    const detailUrl = `./product-detail.html?id=${encodeURIComponent(discount.productID)}`;

    return `
      <article class="discount-card reveal reveal-delay-2">
        <div class="discount-image-wrapper">
          <img
            src="${escapeHtml(discount.imageURL)}"
            alt="${escapeHtml(discount.productName)}"
            class="discount-image"
            onerror="this.src='../assets/images/producto-default.jpg'"
          />
          <span class="discount-badge">-${escapeHtml(discount.discountPercent)}%</span>
        </div>

        <div class="discount-body">
          <div class="discount-badges">
            ${getTypeBadge(discount)}
          </div>

          <h3 class="discount-title">${escapeHtml(discount.productName)}</h3>
          <p class="discount-business">${escapeHtml(discount.businessName)}</p>

          <div class="discount-prices">
            <span class="discount-price-old">${formatPrice(discount.oldPrice)}</span>
            <span class="discount-price-new">${formatPrice(discount.newPrice)}</span>
          </div>

          <div class="discount-meta">
            <span class="discount-tag">
              <span class="material-symbols-outlined">sell</span>
              ${escapeHtml(discount.category)}
            </span>

            ${getUniversityTag(discount)}
          </div>

          <div class="discount-actions">
            <a href="${detailUrl}" class="btn btn-small">Ver oferta</a>
          </div>
        </div>
      </article>
    `;
  }

  function renderDiscounts(discounts) {
    if (!Array.isArray(discounts) || discounts.length === 0) {
      discountsGrid.innerHTML = "";
      noResultsMessage.style.display = "block";
      resultsCount.textContent = "0 descuentos encontrados";
      return;
    }

    discountsGrid.innerHTML = discounts.map(buildDiscountCard).join("");
    noResultsMessage.style.display = "none";
    resultsCount.textContent = `${discounts.length} descuento${discounts.length !== 1 ? "s" : ""} encontrado${discounts.length !== 1 ? "s" : ""}`;
  }

  function applyFilters() {
    const searchTerm = normalizeText(searchInput.value);
    const selectedType = normalizeText(typeFilter.value);
    const selectedUniversity = normalizeText(universityFilter.value);

    let filteredDiscounts = [...mockDiscounts];

    if (searchTerm) {
      filteredDiscounts = filteredDiscounts.filter((discount) => {
        const productMatch = normalizeText(discount.productName).includes(searchTerm);
        const businessMatch = normalizeText(discount.businessName).includes(searchTerm);
        return productMatch || businessMatch;
      });
    }

    if (selectedType !== "todos") {
      filteredDiscounts = filteredDiscounts.filter(
        (discount) => normalizeText(discount.type) === selectedType
      );
    }

    if (selectedUniversity !== "todas") {
      filteredDiscounts = filteredDiscounts.filter(
        (discount) => normalizeText(discount.universityValue) === selectedUniversity
      );
    }

    renderDiscounts(filteredDiscounts);
  }

  function renderLoadingState() {
    discountsGrid.innerHTML = `
      <article class="discounts-message-card">
        <p>Cargando descuentos...</p>
      </article>
    `;
  }

  renderLoadingState();

  setTimeout(() => {
    applyFilters();
  }, 150);

  if (searchInput) {
    searchInput.addEventListener("input", applyFilters);
  }

  if (typeFilter) {
    typeFilter.addEventListener("change", applyFilters);
  }

  if (universityFilter) {
    universityFilter.addEventListener("change", applyFilters);
  }
});