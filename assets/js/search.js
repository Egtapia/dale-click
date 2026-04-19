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
      .replace(/[^\w\s-]/g, "")
      .trim();
  }

  function getProductCards() {
    return document.querySelectorAll(".product-card");
  }

  function resolveCategoryValue(rawCategoryValue) {
    if (!categoryFilter) return rawCategoryValue;

    const normalizedRawValue = normalizeText(rawCategoryValue);
    const options = Array.from(categoryFilter.options || []);

    const exactValueMatch = options.find(
      (option) => normalizeText(option.value) === normalizedRawValue
    );

    if (exactValueMatch) {
      return exactValueMatch.value;
    }

    const directMatch = options.find((option) => {
      const optionValue = normalizeText(option.value);
      const optionLabel = normalizeText(option.textContent);

      return (
        optionValue.includes(normalizedRawValue) ||
        normalizedRawValue.includes(optionValue) ||
        optionLabel.includes(normalizedRawValue) ||
        normalizedRawValue.includes(optionLabel)
      );
    });

    if (directMatch) {
      return directMatch.value;
    }

    const featuredAliases = {
      tecnologia: ["tecnologia", "electronica", "dispositivos", "accesorios"],
      ropa: ["ropa", "moda", "vestimenta"],
      belleza: ["belleza", "cosmeticos", "cosmetico", "maquillaje", "cuidado personal"],
      hogar: ["hogar", "muebles", "decoracion", "casa"],
      alimentos: ["alimentos", "restaurantes", "comida", "bebidas", "snacks"],
      servicios: ["servicios", "educacion", "tutoria", "asesoria", "soporte"]
    };

    const aliases = featuredAliases[normalizedRawValue] || [normalizedRawValue];
    const aliasMatch = options.find((option) => {
      const optionValue = normalizeText(option.value);
      const optionLabel = normalizeText(option.textContent);

      return aliases.some(
        (alias) => optionValue.includes(alias) || optionLabel.includes(alias)
      );
    });

    return aliasMatch ? aliasMatch.value : rawCategoryValue;
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
      const productName = normalizeText(card.dataset.name || card.querySelector(".product-card-title")?.textContent);
      const productCategory = normalizeText(card.dataset.category || card.querySelector(".product-card-category")?.textContent);
      const businessName = normalizeText(card.dataset.business || card.querySelector(".product-card-business")?.textContent);

      const matchesSearch =
        searchTerm === "" ||
        productName.includes(searchTerm) ||
        productCategory.includes(searchTerm) ||
        businessName.includes(searchTerm);

      const matchesCategory =
        selectedCategory === "todas" ||
        productCategory === selectedCategory;

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

    categoryFilter.value = resolveCategoryValue(categoryValue);
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

    if (!href) return;

    event.preventDefault();

    const url = new URL(href, window.location.origin);
    const categoria =
      url.searchParams.get("categoria") ||
      url.searchParams.get("category");

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

  window.addEventListener("productsRendered", () => {
    filterProducts();
  });

  window.addEventListener("categoriesLoaded", () => {
    filterProducts();
  });

  filterProducts();
});
