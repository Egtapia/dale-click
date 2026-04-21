document.addEventListener("DOMContentLoaded", () => {
  const sellersGrid = document.getElementById("sellers-grid");
  const searchInput = document.getElementById("sellers-search-input");
  const locationFilter = document.getElementById("sellers-location-filter");
  const noResultsMessage = document.getElementById("sellers-no-results");
  const resultsCount = document.getElementById("sellers-results-count");
  const resultsTitle = document.getElementById("sellers-results-title");
  const heroBadge = document.getElementById("sellers-hero-badge");
  const heroTitle = document.getElementById("sellers-hero-title");
  const heroDescription = document.getElementById("sellers-hero-description");
  const heroIcon = document.getElementById("sellers-hero-icon");
  const toolbarSection = document.querySelector(".sellers-toolbar-section");
  const searchArea = document.getElementById("sellers-search-area");
  const locationArea = document.getElementById("sellers-location-area");
  const selectedUniversityCard = document.getElementById("sellers-selected-university");
  const selectedUniversityName = document.getElementById("sellers-selected-university-name");
  const backLink = document.getElementById("sellers-back-link");
  const viewLinks = document.querySelectorAll("[data-sellers-view-link]");

  if (!sellersGrid) return;

  const API_BASE = "/api/businesses";
  const DEFAULT_LOGO = "/assets/images/logo-seller-default.svg";
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

  function getLogoUrl(value) {
    return value && String(value).trim() !== "" ? value : DEFAULT_LOGO;
  }

  function getStateFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const rawView = normalizeText(params.get("view"));
    const view = rawView === "universities" ? "universities" : "local";

    return {
      view,
      university: normalizeText(params.get("university"))
    };
  }

  function updateViewLinkState(view) {
    viewLinks.forEach((link) => {
      const isActive = link.dataset.sellersViewLink === view;
      link.classList.toggle("active", isActive);
      link.setAttribute("aria-current", isActive ? "page" : "false");
    });
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
    const logoURL = escapeHtml(getLogoUrl(seller.logoURL));
    const detailUrl = `./seller-profile.html?id=${encodeURIComponent(businessID)}`;

    return `
      <article class="seller-card">
        <div class="seller-cover">
          <img
            src="${logoURL}"
            alt="${businessName}"
            class="seller-logo"
            onerror="this.src='${DEFAULT_LOGO}'"
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

  function buildUniversityGroups(sellers) {
    const groups = new Map();

    sellers
      .filter((seller) => seller.type === "universitario" && seller.universityName && seller.universityValue)
      .forEach((seller) => {
        const key = seller.universityValue;
        const current = groups.get(key);

        if (current) {
          current.count += 1;
          if (
            seller.universityLogoURL &&
            (!current.logoURL || current.logoURL === DEFAULT_LOGO)
          ) {
            current.logoURL = seller.universityLogoURL;
          }
          return;
        }

        groups.set(key, {
          value: seller.universityValue,
          name: seller.universityName,
          logoURL: seller.universityLogoURL || DEFAULT_LOGO,
          count: 1
        });
      });

    return Array.from(groups.values()).sort((a, b) =>
      a.name.localeCompare(b.name, "es", { sensitivity: "base" })
    );
  }

  function renderUniversityCards(universities) {
    if (!Array.isArray(universities) || universities.length === 0) {
      sellersGrid.innerHTML = "";
      noResultsMessage.style.display = "block";
      noResultsMessage.textContent = "No encontramos universidades con emprendimientos activos.";
      resultsCount.textContent = "0 universidades encontradas";
      return;
    }

    sellersGrid.innerHTML = universities
      .map((university) => {
        const logoURL = escapeHtml(getLogoUrl(university.logoURL));
        const name = escapeHtml(university.name);
        const detailUrl = `./sellers.html?view=universities&university=${encodeURIComponent(university.value)}`;

        return `
          <a href="${detailUrl}" class="university-card">
            <div class="university-card-logo-wrap">
              <img
                src="${logoURL}"
                alt="${name}"
                class="university-card-logo"
                onerror="this.src='${DEFAULT_LOGO}'"
              />
            </div>

            <div class="university-card-body">
              <p class="university-card-label">Universidad</p>
              <h3 class="university-card-name">${name}</h3>
              <p class="university-card-meta">
                ${university.count} emprendimiento${university.count !== 1 ? "s" : ""} disponible${university.count !== 1 ? "s" : ""}
              </p>
            </div>

            <span class="university-card-action">
              Ver emprendimientos
              <span class="material-symbols-outlined">arrow_forward</span>
            </span>
          </a>
        `;
      })
      .join("");

    noResultsMessage.style.display = "none";
    resultsCount.textContent = `${universities.length} universidad${universities.length !== 1 ? "es" : ""} encontrada${universities.length !== 1 ? "s" : ""}`;
  }

  function renderSellerCards(sellers, emptyMessage) {
    if (!Array.isArray(sellers) || sellers.length === 0) {
      sellersGrid.innerHTML = "";
      noResultsMessage.style.display = "block";
      noResultsMessage.textContent = emptyMessage;
      resultsCount.textContent = "0 emprendedores encontrados";
      return;
    }

    sellersGrid.innerHTML = sellers.map(buildSellerCard).join("");
    noResultsMessage.style.display = "none";
    resultsCount.textContent = `${sellers.length} emprendedor${sellers.length !== 1 ? "es" : ""} encontrado${sellers.length !== 1 ? "s" : ""}`;
  }

  function sortOptionLabels(a, b) {
    return a.label.localeCompare(b.label, "es", { sensitivity: "base" });
  }

  function populateLocationOptions(sellers) {
    if (!locationFilter) return;

    const previousValue = locationFilter.value;
    const options = sellers
      .filter((seller) => seller.location && seller.locationValue)
      .map((seller) => ({
        value: seller.locationValue,
        label: seller.location
      }))
      .filter(
        (option, index, collection) =>
          collection.findIndex((item) => item.value === option.value) === index
      )
      .sort(sortOptionLabels);

    locationFilter.innerHTML = [`<option value="todas">Todas las ubicaciones</option>`]
      .concat(
        options.map(
          (option) => `<option value="${escapeHtml(option.value)}">${escapeHtml(option.label)}</option>`
        )
      )
      .join("");

    locationFilter.value = options.some((option) => option.value === previousValue)
      ? previousValue
      : "todas";

    syncCustomDropdowns();
  }

  function syncCustomSelect(selectElement, labelElement, dropdownElement) {
    if (!selectElement || !labelElement || !dropdownElement) return;

    const selectedOption = selectElement.options[selectElement.selectedIndex];
    labelElement.textContent = selectedOption?.textContent || "";

    dropdownElement.querySelectorAll(".category-select-option").forEach((option) => {
      const isSelected = option.dataset.value === selectElement.value;
      option.classList.toggle("is-selected", isSelected);
      option.setAttribute("aria-selected", String(isSelected));
    });
  }

  function closeAllCustomDropdowns() {
    document.querySelectorAll(".sellers-custom-select.is-open").forEach((item) => {
      item.classList.remove("is-open");
      const itemTrigger = item.querySelector(".category-select-trigger");
      const itemDropdown = item.querySelector(".category-select-dropdown");

      if (itemTrigger) itemTrigger.setAttribute("aria-expanded", "false");
      if (itemDropdown) itemDropdown.hidden = true;
    });
  }

  function setupCustomSelect(config) {
    const {
      selectElement,
      wrapperElement,
      triggerElement,
      labelElement,
      dropdownElement
    } = config;

    if (!selectElement || !wrapperElement || !triggerElement || !labelElement || !dropdownElement) {
      return;
    }

    dropdownElement.innerHTML = Array.from(selectElement.options)
      .map((option) => {
        const isSelected = option.value === selectElement.value;

        return `
          <button
            type="button"
            class="category-select-option${isSelected ? " is-selected" : ""}"
            data-value="${escapeHtml(option.value)}"
            role="option"
            aria-selected="${isSelected ? "true" : "false"}"
          >
            ${escapeHtml(option.textContent || "")}
          </button>
        `;
      })
      .join("");

    const closeDropdown = () => {
      wrapperElement.classList.remove("is-open");
      triggerElement.setAttribute("aria-expanded", "false");
      dropdownElement.hidden = true;
    };

    dropdownElement.querySelectorAll(".category-select-option").forEach((button) => {
      button.addEventListener("click", () => {
        selectElement.value = button.dataset.value || selectElement.value;
        syncCustomSelect(selectElement, labelElement, dropdownElement);
        closeDropdown();
        selectElement.dispatchEvent(new Event("change", { bubbles: true }));
      });
    });

    if (wrapperElement.dataset.bound !== "true") {
      triggerElement.addEventListener("click", () => {
        const isOpen = wrapperElement.classList.contains("is-open");

        closeAllCustomDropdowns();

        if (isOpen) return;

        dropdownElement.hidden = false;
        wrapperElement.classList.add("is-open");
        triggerElement.setAttribute("aria-expanded", "true");
      });

      document.addEventListener("click", (event) => {
        if (!wrapperElement.contains(event.target)) {
          closeDropdown();
        }
      });

      document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
          closeDropdown();
        }
      });

      selectElement.addEventListener("change", () => {
        syncCustomSelect(selectElement, labelElement, dropdownElement);
      });

      wrapperElement.dataset.bound = "true";
    }

    syncCustomSelect(selectElement, labelElement, dropdownElement);
  }

  function syncCustomDropdowns() {
    setupCustomSelect({
      selectElement: locationFilter,
      wrapperElement: document.getElementById("sellers-location-select-wrapper"),
      triggerElement: document.getElementById("sellers-location-select-trigger"),
      labelElement: document.getElementById("sellers-location-select-label"),
      dropdownElement: document.getElementById("sellers-location-select-dropdown")
    });
  }

  function updateHero(state, university) {
    if (state.view === "universities" && university) {
      heroBadge.textContent = "Emprendimientos universitarios";
      heroTitle.textContent = `Emprendimientos de ${university.name}`;
      heroDescription.textContent = "Explora los emprendimientos registrados en esta universidad y mantén la búsqueda enfocada solo en ese campus.";
      heroIcon.textContent = "school";
      return;
    }

    if (state.view === "universities") {
      heroBadge.textContent = "Universidades Dale Click";
      heroTitle.textContent = "Explora universidades y sus emprendimientos";
      heroDescription.textContent = "Selecciona el logo de una universidad para ver todos los emprendimientos que forman parte de ella.";
      heroIcon.textContent = "account_balance";
      return;
    }

    heroBadge.textContent = "Negocios locales";
    heroTitle.textContent = "Descubre negocios locales";
    heroDescription.textContent = "Encuentra negocios locales por nombre o ubicación, manteniendo separados los emprendimientos universitarios.";
    heroIcon.textContent = "storefront";
  }

  function updateToolbar(state, university) {
    const isLocalView = state.view === "local";
    const isUniversityDetail = state.view === "universities" && university;

    if (toolbarSection) {
      toolbarSection.hidden = state.view === "universities" && !university;
    }

    searchArea.hidden = state.view === "universities" && !university;
    locationArea.hidden = !isLocalView;
    selectedUniversityCard.hidden = !isUniversityDetail;

    if (searchInput) {
      searchInput.placeholder = isUniversityDetail
        ? "Escribe el nombre del emprendimiento"
        : "Escribe el nombre del negocio";
    }

    if (selectedUniversityName) {
      selectedUniversityName.textContent = university?.name || "-";
    }

    if (backLink) {
      backLink.href = "./sellers.html?view=universities";
    }
  }

  function applyView() {
    const state = getStateFromUrl();
    const localSellers = allSellers.filter((seller) => seller.type === "local");
    const universities = buildUniversityGroups(allSellers);
    const selectedUniversity = universities.find(
      (item) => normalizeText(item.value) === state.university
    );

    if (state.view === "universities" && state.university && !selectedUniversity) {
      window.history.replaceState({}, "", "./sellers.html?view=universities");
      applyView();
      return;
    }

    const searchTerm = normalizeText(searchInput?.value);
    const selectedLocation = normalizeText(locationFilter?.value || "todas");

    updateViewLinkState(state.view);
    updateHero(state, selectedUniversity);
    updateToolbar(state, selectedUniversity);

    if (state.view === "local") {
      populateLocationOptions(localSellers);

      const filteredLocalSellers = localSellers
        .filter((seller) =>
          !searchTerm || normalizeText(seller.businessName).includes(searchTerm)
        )
        .filter((seller) =>
          selectedLocation === "todas" || normalizeText(seller.locationValue) === selectedLocation
        );

      resultsTitle.textContent = "Negocios locales disponibles";
      renderSellerCards(
        filteredLocalSellers,
        "No encontramos negocios locales con esa búsqueda o ubicación."
      );
      return;
    }

    if (!selectedUniversity) {
      resultsTitle.textContent = "Universidades disponibles";
      renderUniversityCards(universities);
      return;
    }

    const filteredUniversitySellers = allSellers
      .filter((seller) => seller.type === "universitario")
      .filter((seller) => normalizeText(seller.universityValue) === selectedUniversity.value)
      .filter((seller) =>
        !searchTerm || normalizeText(seller.businessName).includes(searchTerm)
      );

    resultsTitle.textContent = `Emprendimientos de ${selectedUniversity.name}`;
    renderSellerCards(
      filteredUniversitySellers,
      "No encontramos emprendedores en esta universidad con esa búsqueda."
    );
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
      applyView();
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

  searchInput?.addEventListener("input", applyView);
  locationFilter?.addEventListener("change", applyView);
  window.addEventListener("popstate", applyView);

  syncCustomDropdowns();
  loadBusinesses();
});
