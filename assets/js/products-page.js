document.addEventListener("DOMContentLoaded", async () => {
  const productsGrid = document.getElementById("all-products-grid");
  const resultsCount = document.getElementById("products-results-count");
  const noResultsMessage = document.getElementById("all-products-no-results");
  const searchInput = document.getElementById("products-search-input");
  const categoryFilter = document.getElementById("products-category-filter");
  const sortFilter = document.getElementById("products-sort-filter");

  if (!productsGrid) return;

  const API_URL = "http://localhost:3001/api/products";
  let allProducts = [];

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
      .trim();
  }

  function normalizeCategoryValue(categoryName) {
    return normalizeText(categoryName).replace(/\s+/g, "-");
  }

  function formatPrice(price) {
    const numericPrice = Number(price) || 0;
    return `${numericPrice.toLocaleString("es-NI", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })} C$`;
  }

  function getImageUrl(product) {
    if (product.imageURL && String(product.imageURL).trim() !== "") {
      return product.imageURL;
    }
    return "../assets/images/producto-default.jpg";
  }

  function getCategoryLabel(product) {
    return product.categoryName || product.category || "General";
  }

  function getCategoryValue(product) {
    if (product.categoryValue) return product.categoryValue;
    return normalizeCategoryValue(getCategoryLabel(product));
  }

  function getUrlCategory() {
    const params = new URLSearchParams(window.location.search);
    return params.get("category") || "todas";
  }

  function updateUrlCategory(category) {
    const url = new URL(window.location.href);

    if (!category || category === "todas") {
      url.searchParams.delete("category");
    } else {
      url.searchParams.set("category", category);
    }

    window.history.replaceState({}, "", url);
  }

  function buildProductCard(product) {
    const productID = product.productID || "";
    const productName = escapeHtml(product.productName || "Producto sin nombre");
    const price = formatPrice(product.price);
    const categoryLabel = escapeHtml(getCategoryLabel(product));
    const imageURL = escapeHtml(getImageUrl(product));
    const businessName = escapeHtml(product.businessName || "Emprendedor");
    const detailUrl = `./product-detail.html?id=${encodeURIComponent(productID)}`;

    return `
      <article class="product-card">
        <img
          src="${imageURL}"
          alt="${productName}"
          class="product-image"
          onerror="this.src='../assets/images/producto-default.jpg'"
        />
        <div class="product-info">
          <p class="product-category">${categoryLabel}</p>
          <h3 class="product-name">${productName}</h3>
          <p class="product-price">${price}</p>
          <p class="product-business">${businessName}</p>
          <a href="${detailUrl}" class="btn btn-small">Ver</a>
        </div>
      </article>
    `;
  }

  function renderProducts(products) {
    if (!Array.isArray(products) || products.length === 0) {
      productsGrid.innerHTML = "";
      noResultsMessage.style.display = "block";
      resultsCount.textContent = "0 productos encontrados";
      return;
    }

    productsGrid.innerHTML = products.map(buildProductCard).join("");
    noResultsMessage.style.display = "none";
    resultsCount.textContent = `${products.length} producto${products.length !== 1 ? "s" : ""} encontrado${products.length !== 1 ? "s" : ""}`;
  }

  function applyFilters() {
    let filteredProducts = [...allProducts];

    const searchTerm = normalizeText(searchInput?.value || "");
    const selectedCategory = categoryFilter?.value || "todas";
    const selectedSort = sortFilter?.value || "default";

    if (searchTerm) {
      filteredProducts = filteredProducts.filter((product) =>
        normalizeText(product.productName).includes(searchTerm) ||
        normalizeText(product.businessName).includes(searchTerm) ||
        normalizeText(getCategoryLabel(product)).includes(searchTerm)
      );
    }

    if (selectedCategory !== "todas") {
      filteredProducts = filteredProducts.filter(
        (product) => getCategoryValue(product) === selectedCategory
      );
    }

    if (selectedSort === "price-asc") {
      filteredProducts.sort((a, b) => Number(a.price) - Number(b.price));
    } else if (selectedSort === "price-desc") {
      filteredProducts.sort((a, b) => Number(b.price) - Number(a.price));
    } else if (selectedSort === "name-asc") {
      filteredProducts.sort((a, b) => String(a.productName).localeCompare(String(b.productName), "es"));
    } else if (selectedSort === "name-desc") {
      filteredProducts.sort((a, b) => String(b.productName).localeCompare(String(a.productName), "es"));
    }

    renderProducts(filteredProducts);
  }

  function renderLoadingState() {
    productsGrid.innerHTML = `
      <article class="products-message-card">
        <p>Cargando productos...</p>
      </article>
    `;
  }

  function renderErrorState() {
    productsGrid.innerHTML = `
      <article class="products-message-card">
        <p>No se pudieron cargar los productos en este momento.</p>
      </article>
    `;
  }

  async function fetchProductsFromApi() {
    const response = await fetch(API_URL);
    if (!response.ok) {
      throw new Error(`Error al obtener productos: ${response.status}`);
    }

    const data = await response.json();

    if (Array.isArray(data)) return data;
    if (Array.isArray(data.products)) return data.products;
    if (Array.isArray(data.data)) return data.data;

    return [];
  }

  async function loadProducts() {
    try {
      renderLoadingState();

      allProducts = await fetchProductsFromApi();

      const urlCategory = getUrlCategory();
      if (categoryFilter && urlCategory) {
        categoryFilter.value = urlCategory;
      }

      applyFilters();
    } catch (error) {
      console.error("Error cargando productos:", error);
      renderErrorState();
    }
  }

  searchInput?.addEventListener("input", applyFilters);

  categoryFilter?.addEventListener("change", () => {
    updateUrlCategory(categoryFilter.value);
    applyFilters();
  });

  sortFilter?.addEventListener("change", applyFilters);

  await loadProducts();
});