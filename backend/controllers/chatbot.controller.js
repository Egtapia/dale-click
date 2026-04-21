import pool from "../config/db.js";
import jwt from "jsonwebtoken";
import {
  CATEGORY_ALIASES,
  CHATBOT_NAME,
  DEFAULT_SUGGESTIONS,
  FAQ_ENTRIES
} from "../utils/chatbot-knowledge.js";

const CATEGORY_FILTER_GROUPS = {
  comida: ["alimentos", "restaurantes"],
  tecnologia: ["tecnologia"],
  ropa: ["ropa y accesorios"],
  belleza: ["belleza y cosmeticos", "salud y bienestar"],
  hogar: ["hogar y muebles"],
  servicios: ["servicios", "educacion y tutoria"]
};

const UNIVERSITY_ALIASES = {
  "la uni": "uni",
  uni: "uni",
  "la u": "uni",
  "universidad nacional de ingenieria": "uni",
  "u n i": "uni",
  uam: "uam",
  americana: "uam",
  unan: "unan",
  "unan managua": "unan managua",
  "unan leon": "unan leon",
  "universidad nacional autonoma": "unan",
  unicit: "unicit",
  ucc: "ucc",
  ucn: "ucn",
  una: "una",
  udem: "udem",
  keiser: "keiser",
  upoli: "upoli",
  uca: "uca",
  "la salle": "la salle"
};

function normalizeText(value) {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s$-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function toTitleCase(value) {
  return String(value ?? "")
    .split(" ")
    .filter(Boolean)
    .map((item) => item.charAt(0).toUpperCase() + item.slice(1))
    .join(" ");
}

function formatPrice(value) {
  const amount = Number(value ?? 0);
  return `C$ ${amount.toFixed(2)}`;
}

function levenshteinDistance(source, target) {
  const a = normalizeText(source);
  const b = normalizeText(target);

  if (!a) return b.length;
  if (!b) return a.length;

  const matrix = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));

  for (let i = 0; i <= a.length; i += 1) {
    matrix[i][0] = i;
  }

  for (let j = 0; j <= b.length; j += 1) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  return matrix[a.length][b.length];
}

function areSimilarTerms(source, target) {
  const a = normalizeText(source);
  const b = normalizeText(target);

  if (!a || !b) return false;
  if (a === b) return true;
  if (a.includes(b) || b.includes(a)) return true;

  const distance = levenshteinDistance(a, b);
  const maxLength = Math.max(a.length, b.length);

  if (maxLength <= 5) {
    return distance <= 1;
  }

  return distance <= 2;
}

function getMeaningfulWords(value) {
  return normalizeText(value)
    .split(" ")
    .map((word) => word.trim())
    .filter((word) => word.length >= 3);
}

function findBestCatalogMatch(message, values, options = {}) {
  const normalizedMessage = normalizeText(message);
  const messageWords = getMeaningfulWords(message);
  const minimumScore = options.minimumScore ?? 2;
  let bestMatch = "";
  let bestScore = 0;

  for (const rawValue of values) {
    const candidate = normalizeText(rawValue);
    if (!candidate) continue;

    let score = 0;

    if (normalizedMessage.includes(candidate)) {
      score += Math.min(candidate.length + 4, 24);
    }

    const candidateWords = getMeaningfulWords(candidate);

    for (const candidateWord of candidateWords) {
      if (messageWords.some((messageWord) => areSimilarTerms(messageWord, candidateWord))) {
        score += candidateWord.length >= 5 ? 3 : 2;
      }
    }

    if (
      candidateWords.length > 1 &&
      candidateWords.every((candidateWord) =>
        messageWords.some((messageWord) => areSimilarTerms(messageWord, candidateWord))
      )
    ) {
      score += 5;
    }

    if (score > bestScore || (score === bestScore && candidate.length > bestMatch.length)) {
      bestScore = score;
      bestMatch = candidate;
    }
  }

  return bestScore >= minimumScore ? bestMatch : "";
}

function parsePriceRange(message) {
  const normalized = normalizeText(message);
  const rangePatterns = [
    /\bentre\s+c?\$?\s*(\d{1,6})\s+y\s+c?\$?\s*(\d{1,6})\b/,
    /\bentre\s+c?\$?\s*(\d{1,6})\s+y\s+(\d{1,6})\b/,
    /\bde\s+c?\$?\s*(\d{1,6})\s+a\s+c?\$?\s*(\d{1,6})\b/
  ];

  for (const pattern of rangePatterns) {
    const match = normalized.match(pattern);
    if (match) {
      const first = Number(match[1]);
      const second = Number(match[2]);
      return {
        minPrice: Math.min(first, second),
        maxPrice: Math.max(first, second)
      };
    }
  }

  const upToMatch = normalized.match(/\b(?:menos de|maximo de|maximo|hasta|por)\s*c?\$?\s*(\d{1,6})\b/);
  if (upToMatch) {
    return { minPrice: null, maxPrice: Number(upToMatch[1]) };
  }

  const fromMatch = normalized.match(/\b(?:desde|mayor a|mas de|minimo de|minimo)\s*c?\$?\s*(\d{1,6})\b/);
  if (fromMatch) {
    return { minPrice: Number(fromMatch[1]), maxPrice: null };
  }

  const genericMatch = normalized.match(/\bc?\$?\s*(\d{1,6})\s*(?:o menos|maximo|para abajo|cordobas|cordoba)?\b/);
  if (genericMatch) {
    return { minPrice: null, maxPrice: Number(genericMatch[1]) };
  }

  return { minPrice: null, maxPrice: null };
}

function detectCategory(message) {
  const normalized = normalizeText(message);
  const words = getMeaningfulWords(normalized);

  for (const category of CATEGORY_ALIASES) {
    if (category.terms.some((term) => normalized.includes(term))) {
      return category.value;
    }

    if (category.terms.some((term) => words.some((word) => areSimilarTerms(word, term)))) {
      return category.value;
    }
  }

  return "";
}

function detectGreeting(message) {
  const normalized = normalizeText(message);
  return ["hola", "holi", "buenas", "buenos dias", "buenas tardes", "buenas noches", "hey", "hello"].some(
    (term) => normalized === term || normalized.startsWith(`${term} `)
  );
}

function detectFaq(message) {
  const normalized = normalizeText(message);
  const messageWords = getMeaningfulWords(normalized);

  const directMatch = FAQ_ENTRIES.find((entry) =>
    entry.patterns.some((pattern) => normalized.includes(pattern))
  );

  if (directMatch) {
    return directMatch;
  }

  return FAQ_ENTRIES.find((entry) =>
    entry.patterns.some((pattern) => {
      const patternWords = getMeaningfulWords(pattern);
      if (!patternWords.length) return false;

      const matches = patternWords.filter((patternWord) =>
        messageWords.some((messageWord) => areSimilarTerms(messageWord, patternWord))
      );

      return matches.length >= Math.min(2, patternWords.length);
    })
  ) || null;
}

function detectLocationNeed(message) {
  const normalized = normalizeText(message);

  return (
    normalized.includes("cerca de mi") ||
    normalized.includes("cerca de esta ubicacion") ||
    normalized.includes("cerca de mi ubicacion") ||
    normalized.includes("por mi ubicacion") ||
    normalized.includes("cerca")
  );
}

function extractCity(message) {
  const normalized = normalizeText(message);
  const match = normalized.match(/\b(?:en|de|cerca de|por)\s+([a-z]+(?:\s+[a-z]+)?)/);

  if (!match) return "";

  const candidate = match[1].trim();

  if (["linea", "dale click", "mi cuenta", "persona", "mi ubicacion", "esta ubicacion"].includes(candidate)) {
    return "";
  }

  return candidate;
}

function detectUniversity(message) {
  const normalized = normalizeText(message);

  for (const [alias, value] of Object.entries(UNIVERSITY_ALIASES)) {
    if (normalized.includes(alias) || areSimilarTerms(normalized, alias)) {
      return value;
    }
  }

  return "";
}

function stripNoiseWords(message, category, city, university) {
  const normalized = normalizeText(message);
  const stopWords = new Set([
    "hola", "holi", "buenas", "hello",
    "quiero", "busco", "muestrame", "mostrar", "muestreme", "dame", "ver", "verme", "algo",
    "productos", "producto", "negocio", "negocios", "tienda", "tiendas", "local", "locales",
    "emprendedor", "emprendedores", "vendedor", "vendedores", "barato", "barata", "baratos", "baratas",
    "economico", "economica", "economicos", "economicas", "recomendacion", "recomendaciones",
    "recomiendas", "comprar", "compra", "puedo", "con", "poco", "dinero", "en", "de", "por", "para",
    "hay", "que", "me", "quiera", "necesito", "buscar", "precio", "precios", "ciudad", "ubicacion",
    "cerca", "menos", "maximo", "hasta", "entre", "desde", "mostrarme", "tal", "cordobas", "cordoba"
  ]);

  const words = normalized
    .split(" ")
    .filter(Boolean)
    .filter((word) => !stopWords.has(word));

  return words
    .filter((word) => word !== category && word !== city && word !== university)
    .join(" ")
    .trim();
}

function detectIntent(message) {
  const normalized = normalizeText(message);

  if (detectGreeting(normalized)) {
    return { type: "greeting" };
  }

  const faq = detectFaq(normalized);
  const category = detectCategory(normalized);
  const city = extractCity(normalized);
  const university = detectUniversity(normalized);
  const { minPrice, maxPrice } = parsePriceRange(normalized);
  const needsNearby = detectLocationNeed(normalized);

  const wantsBusinesses =
    normalized.includes("negocio") ||
    normalized.includes("negocios") ||
    normalized.includes("emprendedor") ||
    normalized.includes("emprendedores") ||
    normalized.includes("vendedor") ||
    normalized.includes("vendedores") ||
    normalized.includes("tienda") ||
    normalized.includes("tiendas");

  const wantsCheap =
    normalized.includes("barato") ||
    normalized.includes("economico") ||
    normalized.includes("poco dinero") ||
    maxPrice !== null;

  const wantsRecommendation =
    normalized.includes("recomiendas") ||
    normalized.includes("recomendar") ||
    normalized.includes("dame ideas") ||
    normalized.includes("no se que comprar") ||
    normalized.includes("sugiere");

  const wantsReservations =
    normalized.includes("mis reservas") ||
    normalized.includes("mis pedidos") ||
    normalized.includes("mi pedido") ||
    normalized.includes("historial") ||
    normalized.includes("ver reservas");

  const wantsProducts =
    normalized.includes("producto") ||
    normalized.includes("productos") ||
    normalized.includes("comprar") ||
    normalized.includes("buscar") ||
    normalized.includes("muestrame") ||
    Boolean(category);

  const searchText = stripNoiseWords(normalized, category, city, university);

  if (wantsBusinesses || needsNearby) {
    return {
      type: "business_search",
      category,
      city,
      university,
      searchText,
      minPrice,
      maxPrice,
      needsNearby
    };
  }

  if (wantsReservations) {
    return { type: "my_reservations" };
  }

  if (wantsCheap) {
    return {
      type: "cheap_products",
      category,
      city,
      university,
      searchText,
      minPrice,
      maxPrice,
      needsNearby
    };
  }

  if (wantsRecommendation) {
    return {
      type: "recommend_products",
      category,
      city,
      university,
      searchText,
      minPrice,
      maxPrice,
      needsNearby
    };
  }

  if (wantsProducts || searchText) {
    return {
      type: "product_search",
      category,
      city,
      university,
      searchText,
      minPrice,
      maxPrice,
      needsNearby
    };
  }

  if (faq) {
    return {
      type: "faq",
      faq
    };
  }

  return {
    type: "fallback",
    category,
    city,
    university,
    searchText,
    minPrice,
    maxPrice,
    needsNearby
  };
}

function buildCategoryClause(fieldName, category) {
  const categoryTerms = CATEGORY_FILTER_GROUPS[category] || [category];
  return {
    clause: `(${categoryTerms.map(() => `LOWER(${fieldName}) LIKE ?`).join(" OR ")})`,
    params: categoryTerms.map((term) => `%${term}%`)
  };
}

function buildProductWhere({ searchText, category, city, minPrice, maxPrice }) {
  const conditions = ["(p.stock > 0 OR LOWER(COALESCE(p.availabilityStatus, '')) = 'disponible')"];
  const params = [];

  if (searchText) {
    const likeValue = `%${searchText}%`;
    conditions.push(`(
      LOWER(p.productName) LIKE ?
      OR LOWER(p.description) LIKE ?
      OR LOWER(c.categoryName) LIKE ?
      OR LOWER(b.businessName) LIKE ?
    )`);
    params.push(likeValue, likeValue, likeValue, likeValue);
  }

  if (category) {
    const categoryClause = buildCategoryClause("c.categoryName", category);
    conditions.push(categoryClause.clause);
    params.push(...categoryClause.params);
  }

  if (city) {
    conditions.push("LOWER(b.city) LIKE ?");
    params.push(`%${city}%`);
  }

  if (minPrice !== null) {
    conditions.push("p.price >= ?");
    params.push(minPrice);
  }

  if (maxPrice !== null) {
    conditions.push("p.price <= ?");
    params.push(maxPrice);
  }

  return {
    where: conditions.length ? `WHERE ${conditions.join(" AND ")}` : "",
    params
  };
}

function buildBusinessWhere({ searchText, category, city, university }) {
  const conditions = [];
  const params = [];

  if (searchText) {
    const likeValue = `%${searchText}%`;
    conditions.push(`(
      LOWER(b.businessName) LIKE ?
      OR LOWER(b.description) LIKE ?
      OR LOWER(b.city) LIKE ?
      OR LOWER(COALESCE(u.universityName, '')) LIKE ?
      OR EXISTS (
        SELECT 1
        FROM Products px
        WHERE px.businessID = b.businessID
          AND (
            LOWER(px.productName) LIKE ?
            OR LOWER(px.description) LIKE ?
          )
      )
    )`);
    params.push(likeValue, likeValue, likeValue, likeValue, likeValue, likeValue);
  }

  if (city) {
    conditions.push("LOWER(b.city) LIKE ?");
    params.push(`%${city}%`);
  }

  if (category) {
    const categoryClause = buildCategoryClause("c2.categoryName", category);
    conditions.push(`EXISTS (
      SELECT 1
      FROM Products p2
      INNER JOIN Categories c2 ON p2.categoryID = c2.categoryID
      WHERE p2.businessID = b.businessID
        AND ${categoryClause.clause}
    )`);
    params.push(...categoryClause.params);
  }

  if (university) {
    conditions.push("LOWER(COALESCE(u.universityName, '')) LIKE ?");
    params.push(`%${university}%`);
  }

  return {
    where: conditions.length ? `WHERE ${conditions.join(" AND ")}` : "",
    params
  };
}

async function findProducts(filters, mode = "latest", limit = 6) {
  const queryParts = buildProductWhere(filters);
  let orderBy = "ORDER BY p.createdAt DESC, p.productID DESC";
  const params = [...queryParts.params];

  if (mode === "cheap") {
    orderBy = "ORDER BY p.price ASC, p.productID DESC";
  }

  if (filters.searchText) {
    const exact = normalizeText(filters.searchText);
    orderBy = `
      ORDER BY
        CASE
          WHEN LOWER(p.productName) = ? THEN 0
          WHEN LOWER(p.productName) LIKE ? THEN 1
          ELSE 2
        END,
        ${mode === "cheap" ? "p.price ASC," : ""}
        p.productID DESC
    `;
    params.push(exact, `%${exact}%`);
  }

  params.push(limit);

  const [rows] = await pool.query(
    `
    SELECT
      p.productID,
      p.productName,
      p.description,
      p.price,
      p.stock,
      p.availabilityStatus,
      b.businessID,
      b.businessName,
      b.city,
      c.categoryName,
      (
        SELECT pi.imageURL
        FROM ProductImages pi
        WHERE pi.productID = p.productID
        ORDER BY pi.imageID DESC
        LIMIT 1
      ) AS imageURL
    FROM Products p
    INNER JOIN BusinessProfiles b ON p.businessID = b.businessID
    INNER JOIN Categories c ON p.categoryID = c.categoryID
    ${queryParts.where}
    ${orderBy}
    LIMIT ?
    `,
    params
  );

  return rows.map((item) => ({
    productID: item.productID,
    productName: item.productName,
    description: item.description || "",
    price: Number(item.price || 0),
    priceLabel: formatPrice(item.price),
    stock: Number(item.stock || 0),
    availabilityStatus: item.availabilityStatus || "",
    categoryName: item.categoryName || "Sin categoría",
    businessID: item.businessID,
    businessName: item.businessName || "",
    city: item.city || "",
    imageURL: item.imageURL || "/assets/images/producto-default.svg",
    detailPath: `./product-detail.html?id=${encodeURIComponent(item.productID)}`
  }));
}

async function findBusinesses(filters, limit = 6) {
  const queryParts = buildBusinessWhere(filters);

  const [rows] = await pool.query(
    `
    SELECT
      b.businessID,
      b.businessName,
      b.description,
      b.logoURL,
      b.contactPhone,
      b.city,
      u.universityName,
      (
        SELECT c.categoryName
        FROM Products p
        LEFT JOIN Categories c ON p.categoryID = c.categoryID
        WHERE p.businessID = b.businessID
        ORDER BY p.productID ASC
        LIMIT 1
      ) AS categoryName
    FROM BusinessProfiles b
    LEFT JOIN StudentProfiles sp ON b.userID = sp.userID
    LEFT JOIN Universities u ON sp.universityID = u.universityID
    ${queryParts.where}
    ORDER BY
      CASE
        WHEN LOWER(b.city) = ? THEN 0
        ELSE 1
      END,
      b.businessName ASC
    LIMIT ?
    `,
    [...queryParts.params, normalizeText(filters.city || ""), limit]
  );

  return rows.map((item) => ({
    businessID: item.businessID,
    businessName: item.businessName,
    description: item.description || "",
    categoryName: item.categoryName || "Sin categoría",
    city: item.city || "",
    universityName: item.universityName || "",
    contactPhone: item.contactPhone || "",
    logoURL: item.logoURL || "/assets/images/logo-seller-default.png",
    detailPath: `./seller-profile.html?id=${encodeURIComponent(item.businessID)}`
  }));
}

async function getCatalogHints() {
  const [categoryRows] = await pool.query(`
    SELECT categoryName
    FROM Categories
    ORDER BY categoryName ASC
  `);

  const [cityRows] = await pool.query(`
    SELECT DISTINCT city
    FROM BusinessProfiles
    WHERE city IS NOT NULL AND TRIM(city) <> ''
    ORDER BY city ASC
  `);

  const [productRows] = await pool.query(`
    SELECT productName
    FROM Products
    ORDER BY productName ASC
  `);

  const [universityRows] = await pool.query(`
    SELECT universityName
    FROM Universities
    ORDER BY universityName ASC
  `);

  return {
    categories: categoryRows.map((item) => String(item.categoryName || "").trim()).filter(Boolean),
    cities: cityRows.map((item) => String(item.city || "").trim()).filter(Boolean),
    products: productRows.map((item) => String(item.productName || "").trim()).filter(Boolean),
    universities: universityRows.map((item) => String(item.universityName || "").trim()).filter(Boolean)
  };
}

function detectCategoryFromCatalog(message, categories) {
  const directCategory = detectCategory(message);
  if (directCategory) return directCategory;

  const match = findBestCatalogMatch(message, categories, { minimumScore: 3 });
  return match ? normalizeText(match) : "";
}

function detectCityFromCatalog(message, cities) {
  const normalized = normalizeText(message);
  const directMatch = cities.find((city) => normalized.includes(normalizeText(city)));

  if (directMatch) {
    return normalizeText(directMatch);
  }

  const extractedCity = extractCity(normalized);
  if (extractedCity) {
    const fuzzyExtractedCity = findBestCatalogMatch(extractedCity, cities, { minimumScore: 2 });
    if (fuzzyExtractedCity) {
      return fuzzyExtractedCity;
    }
  }

  return findBestCatalogMatch(normalized, cities, { minimumScore: 2 }) || extractedCity;
}

function detectProductFromCatalog(message, products) {
  return findBestCatalogMatch(message, products, { minimumScore: 4 });
}

function detectUniversityFromCatalog(message, universities) {
  const alias = detectUniversity(message);
  if (alias) return alias;

  const match = findBestCatalogMatch(message, universities, { minimumScore: 2 });
  return match ? normalizeText(match) : "";
}

function enrichIntentWithCatalog(intent, message, catalogHints) {
  if (!catalogHints) return intent;

  const category = intent.category || detectCategoryFromCatalog(message, catalogHints.categories);
  const city = intent.city || detectCityFromCatalog(message, catalogHints.cities);
  const specificProduct = detectProductFromCatalog(message, catalogHints.products);
  const university = intent.university || detectUniversityFromCatalog(message, catalogHints.universities);
  const originalSearchText = intent.searchText || "";
  const refinedSearchText =
    specificProduct ||
    findBestCatalogMatch(originalSearchText, catalogHints.products, { minimumScore: 2 }) ||
    originalSearchText;

  return {
    ...intent,
    category,
    city,
    university,
    searchText: refinedSearchText
  };
}

function getTokenFromRequest(req) {
  const authHeader = String(req.headers.authorization || "");

  if (!authHeader.startsWith("Bearer ")) {
    return "";
  }

  return authHeader.slice(7).trim();
}

function decodeOptionalUser(req) {
  try {
    const token = getTokenFromRequest(req);

    if (!token || !process.env.JWT_SECRET) {
      return null;
    }

    return jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return null;
  }
}

async function getUserChatProfile(userID) {
  if (!userID) return null;

  const [users] = await pool.query(
    `
    SELECT userID, firstName, username
    FROM Users
    WHERE userID = ?
    LIMIT 1
    `,
    [userID]
  );

  if (!users.length) return null;

  const [reservations] = await pool.query(
    `
    SELECT
      o.orderID,
      o.orderDate,
      o.orderStatus,
      p.productName
    FROM Orders o
    INNER JOIN OrderDetails od ON o.orderID = od.orderID
    INNER JOIN Products p ON od.productID = p.productID
    WHERE o.userID = ?
    ORDER BY o.orderDate DESC
    LIMIT 3
    `,
    [userID]
  );

  return {
    user: users[0],
    reservations
  };
}

function buildGreetingReply(profile) {
  if (!profile?.user) {
    return "\u00a1Hola! Soy Clicky. \u00bfEn qu\u00e9 puedo ayudarte hoy? Puedo buscar productos, negocios y explicarte c\u00f3mo funciona Dale Click.";
  }

  const firstName = profile.user.firstName || profile.user.username || "usuario";
  const reservationCount = Array.isArray(profile.reservations) ? profile.reservations.length : 0;

  if (!reservationCount) {
    return `\u00a1Hola, ${firstName}! Soy Clicky. \u00bfEn qu\u00e9 puedo ayudarte hoy? Puedo buscar productos, negocios o explicarte c\u00f3mo reservar dentro de Dale Click.`;
  }

  return `\u00a1Hola, ${firstName}! Veo que ya has usado Dale Click. Si quieres, puedo ayudarte a buscar nuevos productos o revisar el estado general de tus reservas.`;
}

function buildReservationsReply(profile) {
  if (!profile?.user) {
    return {
      reply: "Para revisar tus reservas necesitas iniciar sesi\u00f3n en Dale Click.",
      reservations: []
    };
  }

  if (!profile.reservations?.length) {
    return {
      reply: "No encontr\u00e9 reservas recientes en tu cuenta. Si quieres, te ayudo a buscar algo para apartar.",
      reservations: []
    };
  }

  const summary = profile.reservations
    .map((item) => `${item.productName} (${item.orderStatus})`)
    .join(", ");

  return {
    reply: `Estas son tus reservas m\u00e1s recientes: ${summary}. Si quieres, tambi\u00e9n puedo ayudarte a encontrar productos parecidos.`,
    reservations: profile.reservations
  };
}

function buildLocationPromptReply(intentType) {
  if (intentType === "business_search") {
    return "Puedo recomendarte negocios cercanos, pero necesito que me indiques una ciudad o ubicaci\u00f3n de referencia, por ejemplo: Managua, Le\u00f3n o Estel\u00ed.";
  }

  return "Puedo buscar productos cercanos, pero necesito una ciudad o ubicaci\u00f3n de referencia. Por ejemplo: Managua, Granada o Carazo.";
}

function buildProductReply(intent, products, filters) {
  if (!products.length) {
    if (filters.needsNearby && !filters.city) {
      return buildLocationPromptReply(intent);
    }

    if (intent === "cheap_products") {
      return "No encontr\u00e9 productos econ\u00f3micos con esos filtros. Puedes probar otra categor\u00eda, ciudad o ampliar el presupuesto.";
    }

    if (intent === "recommend_products") {
      return "No encontr\u00e9 recomendaciones exactas con esos datos, pero puedes probar otra categor\u00eda o ciudad para mostrarte m\u00e1s opciones.";
    }

    if (filters.searchText) {
      return `No encontr\u00e9 productos que coincidan con "${filters.searchText}". Puedes intentar con otro nombre, otra ciudad o un rango de precio diferente.`;
    }

    return "No encontr\u00e9 productos que coincidan con lo que buscas. Puedes intentar con otra categor\u00eda, ciudad o rango de precio.";
  }

  const intro =
    intent === "cheap_products"
      ? "Te comparto algunas opciones econ\u00f3micas"
      : intent === "recommend_products"
        ? "Estas opciones pueden interesarte"
        : "Encontr\u00e9 estos productos para ti";

  const contextParts = [];

  if (filters.searchText) {
    contextParts.push(`relacionados con ${filters.searchText}`);
  }

  if (filters.category) {
    contextParts.push(`en ${filters.category}`);
  }

  if (filters.city) {
    contextParts.push(filters.needsNearby ? `cerca de ${toTitleCase(filters.city)}` : `en ${toTitleCase(filters.city)}`);
  }

  if (filters.minPrice !== null && filters.maxPrice !== null) {
    contextParts.push(`entre C$ ${filters.minPrice} y C$ ${filters.maxPrice}`);
  } else if (filters.maxPrice !== null) {
    contextParts.push(`por hasta C$ ${filters.maxPrice}`);
  } else if (filters.minPrice !== null) {
    contextParts.push(`desde C$ ${filters.minPrice}`);
  }

  const contextText = contextParts.length ? ` ${contextParts.join(" ")}` : "";
  return `${intro}${contextText}. Recuerda que puedes reservar en la plataforma y pagar directamente al negocio al recoger el producto.`;
}

function buildBusinessReply(businesses, filters) {
  if (filters.needsNearby && !filters.city) {
    return buildLocationPromptReply("business_search");
  }

  if (!businesses.length) {
    return "No encontr\u00e9 negocios que coincidan con esa b\u00fasqueda. Puedes intentar con otra ciudad, categor\u00eda, universidad o producto de referencia.";
  }

  const contextParts = [];

  if (filters.searchText) {
    contextParts.push(`relacionados con ${filters.searchText}`);
  }

  if (filters.category) {
    contextParts.push(`de ${filters.category}`);
  }

  if (filters.city) {
    contextParts.push(filters.needsNearby ? `cerca de ${toTitleCase(filters.city)}` : `en ${toTitleCase(filters.city)}`);
  }

  if (filters.university) {
    contextParts.push(`en ${toTitleCase(filters.university)}`);
  }

  const contextText = contextParts.length ? ` ${contextParts.join(" ")}` : "";
  return `Encontr\u00e9 estos negocios${contextText}. Puedes entrar a su perfil para ver sus productos y datos de contacto.`;
}

function buildFaqResponse(faq) {
  return {
    ok: true,
    reply: faq.answer,
    intent: faq.intent,
    assistantName: CHATBOT_NAME,
    products: [],
    businesses: [],
    reservations: [],
    suggestions: DEFAULT_SUGGESTIONS
  };
}

export async function handleChatbotMessage(req, res) {
  try {
    const rawMessage = String(req.body.message || "").trim();

    if (!rawMessage) {
      return res.status(400).json({
        ok: false,
        message: "Debes enviar un mensaje."
      });
    }

    const optionalUser = decodeOptionalUser(req);
    const userProfilePromise = optionalUser?.userID
      ? getUserChatProfile(optionalUser.userID)
      : Promise.resolve(null);
    const catalogHintsPromise = getCatalogHints().catch(() => null);
    const [userProfile, catalogHints] = await Promise.all([userProfilePromise, catalogHintsPromise]);

    let intent = detectIntent(rawMessage);
    intent = enrichIntentWithCatalog(intent, rawMessage, catalogHints);

    if (intent.type === "greeting") {
      return res.json({
        ok: true,
        reply: buildGreetingReply(userProfile),
        intent: intent.type,
        assistantName: CHATBOT_NAME,
        products: [],
        businesses: [],
        reservations: [],
        suggestions: DEFAULT_SUGGESTIONS
      });
    }

    if (intent.type === "faq" && intent.faq) {
      const faqResponse = buildFaqResponse(intent.faq);

      if (userProfile?.user && intent.faq.intent === "orders") {
        const reservationInfo = buildReservationsReply(userProfile);
        faqResponse.reply = `${faqResponse.reply} ${reservationInfo.reply}`;
        faqResponse.reservations = reservationInfo.reservations;
      }

      return res.json(faqResponse);
    }

    if (intent.type === "my_reservations") {
      const reservationInfo = buildReservationsReply(userProfile);

      return res.json({
        ok: true,
        reply: reservationInfo.reply,
        intent: intent.type,
        assistantName: CHATBOT_NAME,
        products: [],
        businesses: [],
        reservations: reservationInfo.reservations,
        suggestions: DEFAULT_SUGGESTIONS
      });
    }

    if (intent.type === "business_search") {
      const businesses = intent.needsNearby && !intent.city
        ? []
        : await findBusinesses(intent, 6);

      return res.json({
        ok: true,
        reply: buildBusinessReply(businesses, intent),
        intent: intent.type,
        assistantName: CHATBOT_NAME,
        products: [],
        businesses,
        reservations: [],
        suggestions: DEFAULT_SUGGESTIONS
      });
    }

    if (["cheap_products", "recommend_products", "product_search", "fallback"].includes(intent.type)) {
      const searchMode = intent.type === "cheap_products" ? "cheap" : "latest";
      const products = intent.needsNearby && !intent.city
        ? []
        : await findProducts(intent, searchMode, 6);

      if (!products.length && intent.type === "fallback") {
        const faq = detectFaq(rawMessage);
        if (faq) {
          return res.json(buildFaqResponse(faq));
        }
      }

      const businesses =
        intent.category === "comida" || intent.type === "recommend_products"
          ? await findBusinesses(intent, 4)
          : [];

      return res.json({
        ok: true,
        reply: buildProductReply(intent.type, products, intent),
        intent: intent.type,
        assistantName: CHATBOT_NAME,
        products,
        businesses,
        reservations: [],
        suggestions: DEFAULT_SUGGESTIONS
      });
    }

    return res.json({
      ok: true,
      reply:
        "Puedo ayudarte a encontrar productos, negocios o explicarte c\u00f3mo funciona Dale Click. Dime qu\u00e9 buscas y te ayudo.",
      intent: "fallback",
      assistantName: CHATBOT_NAME,
      products: [],
      businesses: [],
      reservations: [],
      suggestions: DEFAULT_SUGGESTIONS
    });
  } catch (error) {
    console.error("Error handleChatbotMessage:", error);
    return res.status(500).json({
      ok: false,
      message: "No pude procesar tu mensaje en este momento."
    });
  }
}
