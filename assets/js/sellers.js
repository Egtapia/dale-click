document.addEventListener("DOMContentLoaded", () => {
  const sellersGrid = document.getElementById("sellers-grid");
  const searchInput = document.getElementById("sellers-search-input");
  const typeFilter = document.getElementById("sellers-type-filter");
  const universityFilter = document.getElementById("sellers-university-filter");
  const locationFilter = document.getElementById("sellers-location-filter");
  const noResultsMessage = document.getElementById("sellers-no-results");
  const resultsCount = document.getElementById("sellers-results-count");

  if (!sellersGrid) return;

  const API_BASE = "http://localhost:3001/api/businesses";
  let allSellers = [];

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

  function getLogoUrl(seller) {
    return seller.logoURL && seller.logoURL.trim() !== ""
      ? seller.logoURL
      : "../assets/images/logo-seller-default.png";
  }

  function getTypeBadge(seller) {
    if (seller.type === "universitario") {
      return `
        <span class="seller-badge university">
          <span class="material-symbols-outlined">school</span>
          Emprendimiento universitario
        </span>
      `;
    }

    return `
      <span class="seller-badge local">
        <span class="material-symbols-outlined">store</span>
        Negocio local
      </span>
    `;
  }

  function getUniversityTag(seller) {
    if (seller.type !== "universitario" || !seller.universityName) return "";

    return `
      <span class="seller-tag">
        <span class="material-symbols-outlined">account_balance</span>
        ${escapeHtml(seller.universityName)}
      </span>
    `;
  }

  function buildSellerCard(seller) {
    const businessID = seller.businessID || "";
    const businessName = escapeHtml(seller.businessName || "Negocio");
    const description = escapeHtml(seller.description || "Sin descripción disponible.");
    const category = escapeHtml(seller.category || "General");
    const location = escapeHtml(seller.location || "Ubicación no disponible");
    const contactPhone = escapeHtml(seller.contactPhone || "Sin contacto");
    const logoURL = escapeHtml(getLogoUrl(seller));
    const detailUrl = `./seller-profile.html?id=${encodeURIComponent(businessID)}`;

    return `
      <article class="seller-card">
        <div class="seller-cover">
          <img
            src="${logoURL}"
            alt="${businessName}"
            class="seller-logo"
            onerror="this.src='../assets/images/logo-seller-default.png'"
          />
        </div>

        <div class="seller-body">
          <div class="seller-badges">
            ${getTypeBadge(seller)}
          </div>

          <p class="seller-category">${category}</p>
          <h3 class="seller-name">${businessName}</h3>
          <p class="seller-description">${description}</p>

          <div class="seller-meta">
            <span class="seller-tag">
              <span class="material-symbols-outlined">location_on</span>
              ${location}
            </span>

            <span class="seller-tag">
              <span class="material-symbols-outlined">call</span>
              ${contactPhone}
            </span>

            ${getUniversityTag(seller)}
          </div>

          <div class="seller-actions">
            <a href="${detailUrl}" class="btn btn-small">Ver perfil</a>
          </div>
        </div>
      </article>
    `;
  }

  function renderSellers(sellers) {
    if (!Array.isArray(sellers) || sellers.length === 0) {
      sellersGrid.innerHTML = "";
      noResultsMessage.style.display = "block";
      resultsCount.textContent = "0 emprendedores encontrados";
      return;
    }

    sellersGrid.innerHTML = sellers.map(buildSellerCard).join("");
    noResultsMessage.style.display = "none";
    resultsCount.textContent = `${sellers.length} emprendedor${sellers.length !== 1 ? "es" : ""} encontrado${sellers.length !== 1 ? "s" : ""}`;
  }

  function applyFilters() {
    const searchTerm = normalizeText(searchInput?.value);
    const selectedType = normalizeText(typeFilter?.value);
    const selectedUniversity = normalizeText(universityFilter?.value);
    const selectedLocation = normalizeText(locationFilter?.value);

    let filteredSellers = [...allSellers];

    if (searchTerm) {
      filteredSellers = filteredSellers.filter((seller) =>
        normalizeText(seller.businessName).includes(searchTerm)
      );
    }

    if (selectedType && selectedType !== "todos") {
      filteredSellers = filteredSellers.filter(
        (seller) => normalizeText(seller.type) === selectedType
      );
    }

    if (selectedUniversity && selectedUniversity !== "todas") {
      filteredSellers = filteredSellers.filter(
        (seller) => normalizeText(seller.universityValue) === selectedUniversity
      );
    }

    if (selectedLocation && selectedLocation !== "todas") {
      filteredSellers = filteredSellers.filter(
        (seller) => normalizeText(seller.locationValue) === selectedLocation
      );
    }

    renderSellers(filteredSellers);
  }

  function renderLoadingState() {
    sellersGrid.innerHTML = `
      <article class="sellers-message-card">
        <p>Cargando emprendedores...</p>
      </article>
    `;
  }

  async function loadBusinesses() {
    renderLoadingState();

    try {
      const response = await fetch(API_BASE);
      const data = await response.json();

      if (!response.ok || !data.ok || !Array.isArray(data.businesses)) {
        sellersGrid.innerHTML = `
          <article class="sellers-message-card">
            <p>No se pudieron cargar los emprendedores.</p>
          </article>
        `;
        resultsCount.textContent = "No disponible";
        return;
      }

      allSellers = data.businesses;
      applyFilters();
    } catch (error) {
      console.error("Error cargando emprendedores:", error);
      sellersGrid.innerHTML = `
        <article class="sellers-message-card">
          <p>Error al conectar con el servidor.</p>
        </article>
      `;
      resultsCount.textContent = "No disponible";
    }
  }

  searchInput?.addEventListener("input", applyFilters);
  typeFilter?.addEventListener("change", applyFilters);
  universityFilter?.addEventListener("change", applyFilters);
  locationFilter?.addEventListener("change", applyFilters);

  loadBusinesses();
});