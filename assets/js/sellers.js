document.addEventListener("DOMContentLoaded", () => {
  const sellersGrid = document.getElementById("sellers-grid");
  const searchInput = document.getElementById("sellers-search-input");
  const typeFilter = document.getElementById("sellers-type-filter");
  const universityFilter = document.getElementById("sellers-university-filter");
  const locationFilter = document.getElementById("sellers-location-filter");
  const noResultsMessage = document.getElementById("sellers-no-results");
  const resultsCount = document.getElementById("sellers-results-count");

  if (!sellersGrid) return;

  const mockSellers = [
    {
      businessID: 1,
      businessName: "Maria Store",
      description: "Moda, ropa y accesorios para quienes buscan estilo y comodidad.",
      category: "Ropa",
      categoryValue: "ropa",
      location: "Esquipulas",
      locationValue: "esquipulas",
      type: "local",
      universityName: "",
      universityValue: "",
      logoURL: "../assets/images/logo-seller-1.png",
      contactPhone: "7777 7777"
    },
    {
      businessID: 2,
      businessName: "Foto Studio",
      description: "Cámaras, accesorios y artículos de fotografía para estudiantes y emprendedores.",
      category: "Tecnología",
      categoryValue: "tecnologia",
      location: "Managua",
      locationValue: "managua",
      type: "universitario",
      universityName: "Keiser University Latin American Campus (Managua)",
      universityValue: "keiser-managua",
      logoURL: "../assets/images/logo-seller-2.png",
      contactPhone: "8888 8888"
    },
    {
      businessID: 3,
      businessName: "Beauty Box",
      description: "Productos de belleza, cuidado personal y sets pensados para el día a día.",
      category: "Belleza",
      categoryValue: "belleza",
      location: "San Marcos",
      locationValue: "san-marcos",
      type: "universitario",
      universityName: "Keiser University Latin American Campus (San Marcos)",
      universityValue: "keiser-san-marcos",
      logoURL: "../assets/images/logo-seller-3.png",
      contactPhone: "8585 8585"
    },
    {
      businessID: 4,
      businessName: "Casa Nova",
      description: "Artículos para el hogar, decoración y soluciones prácticas para tus espacios.",
      category: "Hogar",
      categoryValue: "hogar",
      location: "San Marcos",
      locationValue: "san-marcos",
      type: "local",
      universityName: "",
      universityValue: "",
      logoURL: "../assets/images/logo-seller-4.png",
      contactPhone: "8383 8383"
    },
    {
      businessID: 5,
      businessName: "Snack Point",
      description: "Bebidas, snacks y alimentos listos para acompañarte en tu rutina diaria.",
      category: "Alimentos",
      categoryValue: "alimentos",
      location: "Managua",
      locationValue: "managua",
      type: "universitario",
      universityName: "UAM",
      universityValue: "uam",
      logoURL: "../assets/images/logo-seller-5.png",
      contactPhone: "8787 8787"
    },
    {
      businessID: 6,
      businessName: "ServiClick",
      description: "Servicios prácticos dirigidos a estudiantes, emprendedores y negocios locales.",
      category: "Servicios",
      categoryValue: "servicios",
      location: "San Marcos",
      locationValue: "san-marcos",
      type: "universitario",
      universityName: "UNI",
      universityValue: "uni",
      logoURL: "../assets/images/logo-seller-6.png",
      contactPhone: "8686 8686"
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

  function getLogoUrl(seller) {
    if (seller.logoURL && seller.logoURL.trim() !== "") {
      return seller.logoURL;
    }

    return "../assets/images/logo-seller-default.png";
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
    if (seller.type !== "universitario" || !seller.universityName) {
      return "";
    }

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
    const searchTerm = normalizeText(searchInput.value);
    const selectedType = normalizeText(typeFilter.value);
    const selectedUniversity = normalizeText(universityFilter.value);
    const selectedLocation = normalizeText(locationFilter.value);

    let filteredSellers = [...mockSellers];

    if (searchTerm) {
      filteredSellers = filteredSellers.filter((seller) =>
        normalizeText(seller.businessName).includes(searchTerm)
      );
    }

    if (selectedType !== "todos") {
      filteredSellers = filteredSellers.filter(
        (seller) => normalizeText(seller.type) === selectedType
      );
    }

    if (selectedUniversity !== "todas") {
      filteredSellers = filteredSellers.filter(
        (seller) => normalizeText(seller.universityValue) === selectedUniversity
      );
    }

    if (selectedLocation !== "todas") {
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

  if (locationFilter) {
    locationFilter.addEventListener("change", applyFilters);
  }
});