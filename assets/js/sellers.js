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

  function sortOptionLabels(a, b) {
    return a.label.localeCompare(b.label, "es", { sensitivity: "base" });
  }

  function populateFilterOptions(selectElement, defaultOption, options) {
    if (!selectElement) return;

    const previousValue = selectElement.value;
    const markup = [defaultOption]
      .concat(
        options.map(
          (option) => `<option value="${escapeHtml(option.value)}">${escapeHtml(option.label)}</option>`
        )
      )
      .join("");

    selectElement.innerHTML = markup;

    const hasPreviousValue = options.some((option) => option.value === previousValue);
    selectElement.value = hasPreviousValue ? previousValue : defaultOption.value;
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

  function setCustomSelectDisabled(wrapperElement, triggerElement, isDisabled) {
    if (!wrapperElement || !triggerElement) return;

    wrapperElement.classList.toggle("is-disabled", isDisabled);
    triggerElement.disabled = isDisabled;

    if (isDisabled) {
      wrapperElement.classList.remove("is-open");
      triggerElement.setAttribute("aria-expanded", "false");

      const dropdownElement = wrapperElement.querySelector(".category-select-dropdown");
      if (dropdownElement) dropdownElement.hidden = true;
    }
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
        if (triggerElement.disabled) return;

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
      selectElement: typeFilter,
      wrapperElement: document.getElementById("sellers-type-select-wrapper"),
      triggerElement: document.getElementById("sellers-type-select-trigger"),
      labelElement: document.getElementById("sellers-type-select-label"),
      dropdownElement: document.getElementById("sellers-type-select-dropdown")
    });

    setupCustomSelect({
      selectElement: universityFilter,
      wrapperElement: document.getElementById("sellers-university-select-wrapper"),
      triggerElement: document.getElementById("sellers-university-select-trigger"),
      labelElement: document.getElementById("sellers-university-select-label"),
      dropdownElement: document.getElementById("sellers-university-select-dropdown")
    });

    setupCustomSelect({
      selectElement: locationFilter,
      wrapperElement: document.getElementById("sellers-location-select-wrapper"),
      triggerElement: document.getElementById("sellers-location-select-trigger"),
      labelElement: document.getElementById("sellers-location-select-label"),
      dropdownElement: document.getElementById("sellers-location-select-dropdown")
    });
  }

  function syncFilterOptions(sellers) {
    const selectedType = normalizeText(typeFilter?.value || "todos");
    const selectedUniversity = normalizeText(universityFilter?.value || "todas");
    const selectedLocation = normalizeText(locationFilter?.value || "todas");

    if (selectedType !== "universitario" && universityFilter && universityFilter.value !== "todas") {
      universityFilter.value = "todas";
    }

    const universitySource = sellers.filter(
      (seller) => seller.type === "universitario" && seller.universityName && seller.universityValue
    );

    const universityOptions = universitySource
      .filter((seller) => selectedType === "todos" || normalizeText(seller.type) === selectedType)
      .filter((seller) => seller.type === "universitario" && seller.universityName && seller.universityValue)
      .map((seller) => ({
        value: seller.universityValue,
        label: seller.universityName
      }))
      .filter(
        (option, index, collection) =>
          collection.findIndex((item) => item.value === option.value) === index
      )
      .sort(sortOptionLabels);

    const effectiveUniversity = selectedType === "universitario"
      ? normalizeText(universityFilter?.value || "todas")
      : "todas";

    const locationSource = sellers.filter((seller) => {
      const matchesType = selectedType === "todos" || normalizeText(seller.type) === selectedType;
      const matchesUniversity = effectiveUniversity === "todas"
        || normalizeText(seller.universityValue) === effectiveUniversity;

      return matchesType && matchesUniversity;
    });

    const locationOptions = locationSource
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

    populateFilterOptions(universityFilter, {
      value: "todas",
      label: "Todas"
    }, universityOptions);

    populateFilterOptions(locationFilter, {
      value: "todas",
      label: "Todas las ubicaciones"
    }, locationOptions);

    syncCustomDropdowns();

    setCustomSelectDisabled(
      document.getElementById("sellers-university-select-wrapper"),
      document.getElementById("sellers-university-select-trigger"),
      selectedType === "local"
    );

    const activeUniversity = normalizeText(universityFilter?.value || "todas");
    const activeLocation = normalizeText(locationFilter?.value || "todas");
    const hasUniversityOption = universityOptions.some((option) => normalizeText(option.value) === activeUniversity);
    const hasLocationOption = locationOptions.some((option) => normalizeText(option.value) === activeLocation);

    if (universityFilter && activeUniversity !== "todas" && !hasUniversityOption) {
      universityFilter.value = "todas";
      syncCustomDropdowns();
    }

    if (locationFilter && activeLocation !== "todas" && !hasLocationOption) {
      locationFilter.value = "todas";
      syncCustomDropdowns();
    }
  }

  function applyFilters() {
    syncFilterOptions(allSellers);

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
      syncFilterOptions(allSellers);
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

  syncCustomDropdowns();
  loadBusinesses();
});
