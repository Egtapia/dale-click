document.addEventListener("DOMContentLoaded", () => {
  const productsGrid = document.getElementById("all-products-grid");
  const searchInput = document.getElementById("products-search-input");
  const categoryFilter = document.getElementById("products-category-filter");
  const sortFilter = document.getElementById("products-sort-filter");
  const noResultsMessage = document.getElementById("all-products-no-results");
  const resultsCount = document.getElementById("products-results-count");

  if (!productsGrid) return;

  const mockProducts = [
    {
      productID: 1,
      productName: "Cámara Canon",
      price: 11000,
      category: "Tecnología",
      categoryValue: "tecnologia",
      imageURL: "../assets/images/producto-1.jpg",
      businessName: "Foto Studio"
    },
    {
      productID: 2,
      productName: "Cámara Sienna",
      price: 4500,
      category: "Tecnología",
      categoryValue: "tecnologia",
      imageURL: "../assets/images/producto-2.jpg",
      businessName: "Foto Studio"
    },
    {
      productID: 3,
      productName: "Set de cuidado personal",
      price: 3000,
      category: "Belleza",
      categoryValue: "belleza",
      imageURL: "../assets/images/producto-3.jpg",
      businessName: "Beauty Box"
    },
    {
      productID: 4,
      productName: "Zapatos casuales",
      price: 3500,
      category: "Ropa",
      categoryValue: "ropa",
      imageURL: "../assets/images/producto-4.jpg",
      businessName: "Maria Store"
    },
    {
      productID: 5,
      productName: "Tacones elegantes",
      price: 6500,
      category: "Ropa",
      categoryValue: "ropa",
      imageURL: "../assets/images/producto-5.jpg",
      businessName: "Maria Store"
    },
    {
      productID: 6,
      productName: "Cámara profesional",
      price: 6900,
      category: "Tecnología",
      categoryValue: "tecnologia",
      imageURL: "../assets/images/producto-6.jpg",
      businessName: "Foto Studio"
    },
    {
      productID: 7,
      productName: "Cámara compacta",
      price: 1500,
      category: "Tecnología",
      categoryValue: "tecnologia",
      imageURL: "../assets/images/producto-7.jpg",
      businessName: "Foto Studio"
    },
    {
      productID: 8,
      productName: "Zapatos deportivos",
      price: 3600,
      category: "Ropa",
      categoryValue: "ropa",
      imageURL: "../assets/images/producto-8.jpg",
      businessName: "Maria Store"
    },
    {
      productID: 9,
      productName: "Lentes fotográficos",
      price: 1500,
      category: "Tecnología",
      categoryValue: "tecnologia",
      imageURL: "../assets/images/producto-9.jpg",
      businessName: "Foto Studio"
    },
    {
      productID: 10,
      productName: "Tacones nude",
      price: 2000,
      category: "Ropa",
      categoryValue: "ropa",
      imageURL: "../assets/images/producto-10.jpg",
      businessName: "Maria Store"
    },
    {
      productID: 11,
      productName: "Cámara vintage",
      price: 2500,
      category: "Tecnología",
      categoryValue: "tecnologia",
      imageURL: "../assets/images/producto-11.jpg",
      businessName: "Foto Studio"
    },
    {
      productID: 12,
      productName: "Cámara clásica",
      price: 3500,
      category: "Tecnología",
      categoryValue: "tecnologia",
      imageURL: "../assets/images/producto-12.jpg",
      businessName: "Foto Studio"
    }
  ];

  let currentProducts = [...mockProducts];

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

  function buildProductCard(product) {
    const productID = product.productID || "";
    const productName = escapeHtml(product.productName || "Producto sin nombre");
    const price = formatPrice(product.price);
    const categoryLabel = escapeHtml(product.category || "General");
    const businessName = escapeHtml(product.businessName || "Emprendedor");
    const imageURL = escapeHtml(product.imageURL || "../assets/images/producto-default.jpg");
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

  function applyFiltersAndSort() {
    const searchTerm = normalizeText(searchInput.value);
    const selectedCategory = normalizeText(categoryFilter.value);
    const selectedSort = sortFilter.value;

    let filteredProducts = [...mockProducts];

    if (searchTerm) {
      filteredProducts = filteredProducts.filter((product) =>
        normalizeText(product.productName).includes(searchTerm)
      );
    }

    if (selectedCategory !== "todas") {
      filteredProducts = filteredProducts.filter(
        (product) => normalizeText(product.categoryValue) === selectedCategory
      );
    }

    if (selectedSort === "price-asc") {
      filteredProducts.sort((a, b) => Number(a.price) - Number(b.price));
    } else if (selectedSort === "price-desc") {
      filteredProducts.sort((a, b) => Number(b.price) - Number(a.price));
    } else if (selectedSort === "name-asc") {
      filteredProducts.sort((a, b) => a.productName.localeCompare(b.productName, "es"));
    } else if (selectedSort === "name-desc") {
      filteredProducts.sort((a, b) => b.productName.localeCompare(a.productName, "es"));
    }

    currentProducts = filteredProducts;
    renderProducts(currentProducts);
  }

  function applyCategoryFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    const categoria = urlParams.get("categoria");

    if (!categoria) return;

    categoryFilter.value = categoria;
  }

  if (searchInput) {
    searchInput.addEventListener("input", applyFiltersAndSort);
  }

  if (categoryFilter) {
    categoryFilter.addEventListener("change", applyFiltersAndSort);
  }

  if (sortFilter) {
    sortFilter.addEventListener("change", applyFiltersAndSort);
  }

  applyCategoryFromUrl();
  applyFiltersAndSort();
});