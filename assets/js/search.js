document.addEventListener("DOMContentLoaded", () => {
  const searchInput = document.getElementById("search-input");
  const categoryFilter = document.getElementById("category-filter");
  const searchButton = document.querySelector(".search-button");
  const noResultsMessage = document.getElementById("no-results-message");
  const categoryCards = document.querySelectorAll(".category-card");

  function normalizeText(text) {
    return (text || "")
      .toString()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();
  }

  function getProductCards() {
    return document.querySelectorAll(".product-card");
  }

  function showNoResults(show) {
    if (!noResultsMessage) return;
    noResultsMessage.style.display = show ? "block" : "none";
  }

  function filterProducts() {
    const productCards = getProductCards();

    if (!productCards.length) {
      showNoResults(false);
      return;
    }

    const searchTerm = normalizeText(searchInput ? searchInput.value : "");
    const selectedCategory = normalizeText(categoryFilter ? categoryFilter.value : "todas");

    let visibleCount = 0;

    productCards.forEach((card) => {
      const productName = normalizeText(card.dataset.name);
      const productCategory = normalizeText(card.dataset.category);

      const matchesSearch =
        searchTerm === "" || productName.includes(searchTerm);

      const matchesCategory =
        selectedCategory === "todas" || productCategory === selectedCategory;

      if (matchesSearch && matchesCategory) {
        card.style.display = "block";
        visibleCount++;
      } else {
        card.style.display = "none";
      }
    });

    showNoResults(visibleCount === 0);
  }

  function setCategoryAndFilter(categoryValue) {
    if (!categoryFilter) return;

    categoryFilter.value = categoryValue;
    filterProducts();

    const productsSection = document.querySelector(".products-section");
    if (productsSection) {
      productsSection.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    }
  }

  function handleCategoryCardClick(event) {
    const card = event.currentTarget;
    const href = card.getAttribute("href");

    if (!href || !href.includes("?categoria=")) return;

    event.preventDefault();

    const url = new URL(href, window.location.origin);
    const categoria = url.searchParams.get("categoria");

    if (categoria) {
      setCategoryAndFilter(categoria);
    }
  }

  function bindEvents() {
    if (searchInput) {
      searchInput.addEventListener("input", filterProducts);

      searchInput.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          filterProducts();
        }
      });
    }

    if (categoryFilter) {
      categoryFilter.addEventListener("change", filterProducts);
    }

    if (searchButton) {
      searchButton.addEventListener("click", filterProducts);
    }

    if (categoryCards.length > 0) {
      categoryCards.forEach((card) => {
        card.addEventListener("click", handleCategoryCardClick);
      });
    }
  }

  bindEvents();

  /*
    products.js dispara este evento cuando termina de renderizar
    las cards dinámicamente.
  */
  window.addEventListener("productsRendered", () => {
    filterProducts();
  });

  filterProducts();
});