document.addEventListener("DOMContentLoaded", async () => {
  const productsGrid = document.getElementById("products-grid");

  if (!productsGrid) return;

  const USE_API = false;
  const API_URL = "http://localhost:3000/api/products/featured";

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

  function escapeHtml(text) {
    return String(text ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function normalizeCategoryValue(categoryName) {
    return String(categoryName ?? "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .replace(/\s+/g, "-");
  }

  function formatPrice(price) {
    const numericPrice = Number(price) || 0;
    return `${numericPrice.toLocaleString("es-NI")} C$`;
  }

  function getImageUrl(product) {
    if (product.imageURL && product.imageURL.trim() !== "") {
      return product.imageURL;
    }

    return "../assets/images/producto-default.jpg";
  }

  function getCategoryLabel(product) {
    return product.category || product.categoryName || "General";
  }

  function getCategoryValue(product) {
    if (product.categoryValue) return product.categoryValue;
    return normalizeCategoryValue(product.category || product.categoryName || "general");
  }

  function buildProductCard(product) {
    const productID = product.productID || product.id || "";
    const productName = escapeHtml(product.productName || "Producto sin nombre");
    const price = formatPrice(product.price);
    const categoryLabel = escapeHtml(getCategoryLabel(product));
    const categoryValue = escapeHtml(getCategoryValue(product));
    const imageURL = escapeHtml(getImageUrl(product));
    const businessName = escapeHtml(product.businessName || "Emprendedor");
    const detailUrl = `./product-detail.html?id=${encodeURIComponent(productID)}`;

    return `
      <article class="product-card" data-name="${productName.toLowerCase()}" data-category="${categoryValue}">
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
      window.dispatchEvent(new CustomEvent("productsRendered"));
      return;
    }

    productsGrid.innerHTML = products.map(buildProductCard).join("");
    window.dispatchEvent(new CustomEvent("productsRendered"));
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

  async function loadProducts() {
  try {
    renderLoadingState();

    let products = [];

    if (USE_API) {
      products = await fetchProductsFromApi();
    } else {
      products = mockProducts;
    }

    // 🔥 NUEVO: leer categoría desde URL
    const params = new URLSearchParams(window.location.search);
    const selectedCategory = params.get("category");

    if (selectedCategory && selectedCategory !== "todas") {
      products = products.filter(
        (p) => getCategoryValue(p) === selectedCategory
      );
    }

    renderProducts(products);
  } catch (error) {
    console.error("Error cargando productos:", error);
    renderErrorState();
    window.dispatchEvent(new CustomEvent("productsRendered"));
  }
}
const categoryFilter = document.getElementById("products-category-filter");
if (categoryFilter && selectedCategory) {
  categoryFilter.value = selectedCategory;
}
  window.DaleClickProducts = {
    loadProducts,
    renderProducts
  };

  await loadProducts();
});