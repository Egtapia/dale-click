const API_URL = "http://localhost:3001/api/products";

async function loadProducts() {
  try {
    const response = await fetch(API_URL);
    const data = await response.json();

    if (!data.ok || !Array.isArray(data.products)) {
      console.error("Respuesta inválida del backend:", data);
      return;
    }

    renderProducts(data.products);
  } catch (error) {
    console.error("Error cargando productos:", error);
  }
}

function renderProducts(products) {
  const container = document.getElementById("products-grid");
  const noResultsMessage = document.getElementById("no-results-message");

  if (!container) return;

  container.innerHTML = "";

  if (!products.length) {
    if (noResultsMessage) noResultsMessage.style.display = "block";
    return;
  }

  if (noResultsMessage) noResultsMessage.style.display = "none";

  products.slice(0, 12).forEach((product) => {
    const card = document.createElement("article");
    card.className = "product-card";
    card.dataset.name = String(product.productName || "");
    card.dataset.category = String(product.categoryValue || product.categoryName || "");
    card.dataset.business = String(product.businessName || "");

    card.innerHTML = `
      <div class="product-card-image-wrap">
        <img
          class="product-card-image"
          src="${product.imageURL}"
          alt="${product.productName}"
          loading="lazy"
          onerror="this.src='../assets/images/producto-default.jpg'"
        />
      </div>

      <div class="product-card-content">
        <span class="product-card-category">${product.categoryName || "Categoría"}</span>
        <h3 class="product-card-title">${product.productName}</h3>
        <p class="product-card-price">C$ ${Number(product.price).toFixed(2)}</p>
        <p class="product-card-business">${product.businessName || "Negocio local"}</p>

        <a class="product-card-button" href="./product-detail.html?id=${product.productID}">
          Ver
        </a>
      </div>
    `;

    container.appendChild(card);
  });
}

document.addEventListener("DOMContentLoaded", loadProducts);
