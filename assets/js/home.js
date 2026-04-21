const PRODUCTS_API_URL = "/api/products";
const CATEGORIES_API_URL = "/api/products/categories";
const DEFAULT_PRODUCT_IMAGE = "/assets/images/producto-default.svg";
let allHomeProducts = [];
const DEFAULT_PRODUCTS_SECTION_TITLE = "Productos destacados";
const DEFAULT_PRODUCTS_SECTION_DESCRIPTION =
  "Descubre opciones de emprendedores universitarios y negocios locales.";

async function requestHomeJson(url, contextLabel) {
  if (window.DaleClickAPI?.requestJson) {
    return window.DaleClickAPI.requestJson(url, {}, contextLabel);
  }

  const response = await fetch(url);
  const data = await response.json();
  return { response, data };
}

function initHeroCarousel() {
  const slides = Array.from(document.querySelectorAll(".hero-bg-slide"));
  const indicators = Array.from(document.querySelectorAll(".hero-slide-indicator"));

  if (slides.length === 0) return;

  let currentIndex = 0;
  let autoplayId = null;

  const setActiveSlide = (index) => {
    currentIndex = index;

    slides.forEach((slide, slideIndex) => {
      slide.classList.toggle("is-active", slideIndex === index);
    });

    indicators.forEach((indicator, indicatorIndex) => {
      indicator.classList.toggle("is-active", indicatorIndex === index);
      indicator.setAttribute("aria-pressed", String(indicatorIndex === index));
    });
  };

  const startAutoplay = () => {
    window.clearInterval(autoplayId);
    autoplayId = window.setInterval(() => {
      const nextIndex = (currentIndex + 1) % slides.length;
      setActiveSlide(nextIndex);
    }, 4200);
  };

  indicators.forEach((indicator, index) => {
    indicator.addEventListener("click", () => {
      setActiveSlide(index);
      startAutoplay();
    });
  });

  setActiveSlide(0);
  startAutoplay();
}

function updateProductsSectionCopy(hasActiveFilters, resultsCount) {
  const productsSection = document.getElementById("products-section");
  const title = document.getElementById("products-section-title");
  const description = document.getElementById("products-section-description");

  if (!productsSection || !title || !description) return;

  productsSection.classList.toggle("is-searching", hasActiveFilters);

  if (!hasActiveFilters) {
    title.textContent = DEFAULT_PRODUCTS_SECTION_TITLE;
    description.textContent = DEFAULT_PRODUCTS_SECTION_DESCRIPTION;
    return;
  }

  title.textContent = "Resultados de tu búsqueda";

  if (resultsCount === 0) {
    description.textContent = "No encontramos coincidencias con los filtros seleccionados.";
    return;
  }

  description.textContent =
    resultsCount === 1
      ? "Encontramos 1 producto que coincide con tu búsqueda."
      : `Encontramos ${resultsCount} productos que coinciden con tu búsqueda.`;
}

function escapeHtml(text) {
  return String(text ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function normalizeText(text) {
  return String(text ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s-]/g, "")
    .trim();
}

function normalizeCategoryValue(categoryName) {
  return normalizeText(categoryName).replace(/\s+/g, "-");
}

function formatPrice(price) {
  const numericPrice = Number(price) || 0;
  return `C$ ${numericPrice.toFixed(2)}`;
}

function getImageUrl(product) {
  if (product.imageURL && String(product.imageURL).trim() !== "") {
    return product.imageURL;
  }

  return DEFAULT_PRODUCT_IMAGE;
}

function syncCategoryDropdown() {
  const categoryFilter = document.getElementById("category-filter");
  const label = document.getElementById("category-select-label");
  const dropdown = document.getElementById("category-select-dropdown");

  if (!categoryFilter || !label || !dropdown) return;

  const selectedOption = categoryFilter.options[categoryFilter.selectedIndex];
  label.textContent = selectedOption?.textContent || "Todas las categorÃ­as";

  dropdown.querySelectorAll(".category-select-option").forEach((option) => {
    const isSelected = option.dataset.value === categoryFilter.value;
    option.classList.toggle("is-selected", isSelected);
    option.setAttribute("aria-selected", String(isSelected));
  });
}

function buildCategoryDropdownOptions() {
  const categoryFilter = document.getElementById("category-filter");
  const dropdown = document.getElementById("category-select-dropdown");
  const wrapper = document.getElementById("category-select-wrapper");
  const trigger = document.getElementById("category-select-trigger");

  if (!categoryFilter || !dropdown || !wrapper || !trigger) return;

  dropdown.innerHTML = Array.from(categoryFilter.options)
    .map((option) => {
      const isSelected = option.value === categoryFilter.value;

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
    wrapper.classList.remove("is-open");
    trigger.setAttribute("aria-expanded", "false");
    dropdown.hidden = true;
  };

  dropdown.querySelectorAll(".category-select-option").forEach((button) => {
    button.addEventListener("click", () => {
      categoryFilter.value = button.dataset.value || "todas";
      syncCategoryDropdown();
      closeDropdown();
      categoryFilter.dispatchEvent(new Event("change", { bubbles: true }));
    });
  });
}

function setupCategoryDropdown() {
  const categoryFilter = document.getElementById("category-filter");
  const dropdown = document.getElementById("category-select-dropdown");
  const wrapper = document.getElementById("category-select-wrapper");
  const trigger = document.getElementById("category-select-trigger");

  if (!categoryFilter || !dropdown || !wrapper || !trigger) return;

  const closeDropdown = () => {
    wrapper.classList.remove("is-open");
    trigger.setAttribute("aria-expanded", "false");
    dropdown.hidden = true;
  };

  const openDropdown = () => {
    dropdown.hidden = false;
    wrapper.classList.add("is-open");
    trigger.setAttribute("aria-expanded", "true");
  };

  if (wrapper.dataset.bound !== "true") {
    trigger.addEventListener("click", () => {
      if (wrapper.classList.contains("is-open")) {
        closeDropdown();
        return;
      }

      openDropdown();
    });

    document.addEventListener("click", (event) => {
      if (!wrapper.contains(event.target)) {
        closeDropdown();
      }
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        closeDropdown();
      }
    });

    categoryFilter.addEventListener("change", syncCategoryDropdown);
    wrapper.dataset.bound = "true";
  }

  buildCategoryDropdownOptions();
  syncCategoryDropdown();
}

function populateCategoryFilter(categories) {
  const categoryFilter = document.getElementById("category-filter");
  if (!categoryFilter) return;

  const uniqueCategories = categories
    .filter((category) => category && category.categoryName)
    .filter(
      (category, index, list) =>
        list.findIndex((item) => item.categoryValue === category.categoryValue) === index
    );

  categoryFilter.innerHTML = `
    <option value="todas">Todas las categorías</option>
    ${uniqueCategories
      .map(
        (category) =>
          `<option value="${escapeHtml(category.categoryValue)}">${escapeHtml(category.categoryName)}</option>`
      )
      .join("")}
  `;

  setupCategoryDropdown();
  window.dispatchEvent(new Event("categoriesLoaded"));
}

function renderProducts(products, limit = 12) {
  const container = document.getElementById("products-grid");
  const noResultsMessage = document.getElementById("no-results-message");

  if (!container) return;

  container.innerHTML = "";

  if (!Array.isArray(products) || products.length === 0) {
    if (noResultsMessage) noResultsMessage.style.display = "block";
    window.dispatchEvent(new Event("productsRendered"));
    return;
  }

  if (noResultsMessage) noResultsMessage.style.display = "none";

  products.slice(0, limit).forEach((product) => {
    const card = document.createElement("article");
    card.className = "product-card";
    card.dataset.name = String(product.productName || "");
    card.dataset.category = String(product.categoryValue || normalizeCategoryValue(product.categoryName));
    card.dataset.business = String(product.businessName || "");

    card.innerHTML = `
      <div class="product-card-image-wrap">
        <img
          class="product-card-image"
          src="${escapeHtml(getImageUrl(product))}"
          alt="${escapeHtml(product.productName || "Producto")}"
          loading="lazy"
          onerror="this.src='${DEFAULT_PRODUCT_IMAGE}'"
        />
      </div>

      <div class="product-card-content">
        <span class="product-card-category">${escapeHtml(product.categoryName || "Categoría")}</span>
        <h3 class="product-card-title">${escapeHtml(product.productName || "Producto sin nombre")}</h3>
        <p class="product-card-price">${formatPrice(product.price)}</p>
        <p class="product-card-business">${escapeHtml(product.businessName || "Negocio local")}</p>

        <a class="product-card-button" href="./product-detail.html?id=${encodeURIComponent(product.productID || "")}">
          Ver
        </a>
      </div>
    `;

    container.appendChild(card);
  });

  window.dispatchEvent(new Event("productsRendered"));
}

function getActiveHomeFilters() {
  const searchInput = document.getElementById("search-input");
  const categoryFilter = document.getElementById("category-filter");

  return {
    searchTerm: normalizeText(searchInput?.value || ""),
    selectedCategory: categoryFilter?.value || "todas"
  };
}

function getFilteredHomeProducts() {
  const { searchTerm, selectedCategory } = getActiveHomeFilters();

  return allHomeProducts.filter((product) => {
    const productName = normalizeText(product.productName);
    const businessName = normalizeText(product.businessName);
    const categoryName = normalizeText(product.categoryName);
    const categoryValue = normalizeText(product.categoryValue);

    const matchesSearch =
      searchTerm === "" ||
      productName.includes(searchTerm) ||
      businessName.includes(searchTerm) ||
      categoryName.includes(searchTerm) ||
      categoryValue.includes(searchTerm);

    const matchesCategory =
      selectedCategory === "todas" ||
      product.categoryValue === selectedCategory;

    return matchesSearch && matchesCategory;
  });
}

function applyHomeFilters() {
  const { searchTerm, selectedCategory } = getActiveHomeFilters();
  const filteredProducts = getFilteredHomeProducts();
  const shouldLimitResults = searchTerm === "" && selectedCategory === "todas";

  updateProductsSectionCopy(!shouldLimitResults, filteredProducts.length);
  renderProducts(filteredProducts, shouldLimitResults ? 12 : filteredProducts.length);
}

async function fetchProducts() {
  const { response, data } = await requestHomeJson(PRODUCTS_API_URL, "Productos del home");

  if (!response.ok || !data.ok || !Array.isArray(data.products)) {
    throw new Error(`Respuesta invalida al obtener productos desde ${response.url}.`);
  }

  return data.products;
}

async function fetchCategories() {
  const { response, data } = await requestHomeJson(CATEGORIES_API_URL, "Categorias del home");

  if (!response.ok || !data.ok || !Array.isArray(data.categories)) {
    throw new Error(`Respuesta invalida al obtener categorias desde ${response.url}.`);
  }

  return data.categories;
}

async function loadHomeData() {
  try {
    const [categories, products] = await Promise.all([
      fetchCategories(),
      fetchProducts()
    ]);

    allHomeProducts = Array.isArray(products) ? products : [];
    populateCategoryFilter(categories);
    window.applyHomeFilters = applyHomeFilters;
    applyHomeFilters();
  } catch (error) {
    console.error("Error cargando datos del home:", error);
    renderProducts([]);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  initHeroCarousel();
  loadHomeData();
});
