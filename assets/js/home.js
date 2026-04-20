const PRODUCTS_API_URL = "http://localhost:3001/api/products";
const CATEGORIES_API_URL = "http://localhost:3001/api/products/categories";
let allHomeProducts = [];
const DEFAULT_PRODUCTS_SECTION_TITLE = "Productos destacados";
const DEFAULT_PRODUCTS_SECTION_DESCRIPTION =
  "Descubre opciones de emprendedores universitarios y negocios locales.";

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

  return "../assets/images/producto-default.jpg";
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
          onerror="this.src='../assets/images/producto-default.jpg'"
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
  const response = await fetch(PRODUCTS_API_URL);
  const data = await response.json();

  if (!response.ok || !data.ok || !Array.isArray(data.products)) {
    throw new Error("Respuesta invalida al obtener productos.");
  }

  return data.products;
}

async function fetchCategories() {
  const response = await fetch(CATEGORIES_API_URL);
  const data = await response.json();

  if (!response.ok || !data.ok || !Array.isArray(data.categories)) {
    throw new Error("Respuesta invalida al obtener categorias.");
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

document.addEventListener("DOMContentLoaded", loadHomeData);
