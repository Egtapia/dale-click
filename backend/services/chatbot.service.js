import pool from "../config/db.js";
import {
  BUSINESS_INTENT_TERMS,
  CATEGORY_SYNONYMS,
  CHATBOT_NAME,
  COLOR_TERMS,
  CONTEXT_RULES,
  DEFAULT_SUGGESTIONS,
  FAQ_DEFINITIONS,
  NEARBY_PATTERNS,
  PRODUCT_INTENT_TERMS,
  SOCIAL_PATTERNS,
  UNIVERSITY_ALIASES
} from "../utils/chatbot-knowledge.js";

const DEFAULT_PRODUCT_IMAGE = "/assets/images/producto-default.svg";
const DEFAULT_BUSINESS_LOGO = "/assets/images/logo-seller-default.svg";
const METADATA_TTL_MS = 5 * 60 * 1000;

const STOPWORDS = new Set([
  "a", "al", "algo", "alla", "alli", "and", "ante", "barato", "barata", "baratos", "baratas",
  "busca", "buscame", "busco", "casi", "cerca", "como", "con", "cordoba", "cordobas", "cual",
  "cuales", "cuanto", "cuesta", "de", "del", "dime", "donde", "el", "ella", "ellas", "ellos",
  "en", "entre", "es", "esa", "ese", "eso", "esta", "este", "estos", "favor", "hay", "hola",
  "la", "las", "le", "les", "lo", "los", "mas", "me", "mi", "mis", "muestrame", "muestrame",
  "mostrar", "mostrarme", "necesito", "negocio", "negocios", "o", "para", "pero", "por",
  "producto", "productos", "que", "quiero", "recomienda", "recomendame", "recomendar",
  "recomendaciones", "se", "si", "sin", "sobre", "su", "sus", "te", "tengo", "ti", "tu", "un",
  "una", "uno", "unos", "unas", "ver", "vendo", "venden", "verme", "y", "emprendimiento",
  "emprendimientos", "vendedor", "vendedores", "tienda", "tiendas", "lugar", "lugares",
  "recomienden", "recomendarme", "recomiendame", "comprarme", "local", "locales"
]);

let metadataCache = {
  expiresAt: 0,
  value: null
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
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatPrice(value) {
  const amount = Number(value ?? 0);
  return `C$ ${amount.toFixed(2)}`;
}

function uniqueValues(values) {
  return Array.from(new Set(values.filter(Boolean)));
}

function tokenize(value) {
  return uniqueValues(
    normalizeText(value)
      .split(" ")
      .map((token) => token.trim())
      .filter((token) => token.length >= 2)
  );
}

function includesWholePhrase(text, term) {
  const haystack = ` ${normalizeText(text)} `;
  const needle = ` ${normalizeText(term)} `;
  return haystack.includes(needle) || haystack.includes(` ${normalizeText(term)}s `);
}

function countMatchedTerms(text, terms) {
  return terms.filter((term) => includesWholePhrase(text, term));
}

function isWithinBudget(price, minPrice, maxPrice) {
  const amount = Number(price ?? 0);

  if (minPrice !== null && amount < Number(minPrice)) {
    return false;
  }

  if (maxPrice !== null && amount > Number(maxPrice)) {
    return false;
  }

  return true;
}

function parsePriceRange(message) {
  const normalized = normalizeText(message);
  const rangePatterns = [
    /\bentre\s+c?\$?\s*(\d{1,6})\s+y\s+c?\$?\s*(\d{1,6})\b/,
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

  const maxMatch = normalized.match(/\b(?:menos de|maximo de|maximo|hasta|a|por)\s*c?\$?\s*(\d{1,6})\b/);
  if (maxMatch) {
    return { minPrice: null, maxPrice: Number(maxMatch[1]) };
  }

  const minMatch = normalized.match(/\b(?:desde|mas de|minimo de|minimo)\s*c?\$?\s*(\d{1,6})\b/);
  if (minMatch) {
    return { minPrice: Number(minMatch[1]), maxPrice: null };
  }

  const genericBudgetMatch = normalized.match(/\bc?\$?\s*(\d{1,6})\s*(?:cordobas|cordoba)?\b/);
  if (genericBudgetMatch && /(tengo|presupuesto|hasta|por|menos|maximo|barato|barata|economico|economica)/.test(normalized)) {
    return { minPrice: null, maxPrice: Number(genericBudgetMatch[1]) };
  }

  return { minPrice: null, maxPrice: null };
}

function detectSocialIntent(message) {
  const normalized = normalizeText(message);

  for (const term of SOCIAL_PATTERNS.greeting) {
    if (normalized === term || normalized.startsWith(`${term} `)) {
      return "greeting";
    }
  }

  for (const term of SOCIAL_PATTERNS.wellbeing) {
    if (normalized.includes(term)) return "wellbeing";
  }

  for (const term of SOCIAL_PATTERNS.thanks) {
    if (normalized.includes(term)) return "thanks";
  }

  for (const term of SOCIAL_PATTERNS.goodbye) {
    if (normalized.includes(term)) return "goodbye";
  }

  for (const term of SOCIAL_PATTERNS.deescalate) {
    if (normalized.includes(term)) return "deescalate";
  }

  return "";
}

function detectFaq(message) {
  const normalized = normalizeText(message);
  return FAQ_DEFINITIONS.find((item) =>
    item.patterns.some((pattern) => normalized.includes(normalizeText(pattern)))
  ) || null;
}

function detectContexts(message) {
  const normalized = normalizeText(message);

  return CONTEXT_RULES.filter((rule) =>
    rule.aliases.some((alias) => includesWholePhrase(normalized, alias))
  );
}

function detectNearby(message) {
  const normalized = normalizeText(message);
  return NEARBY_PATTERNS.some((pattern) => normalized.includes(normalizeText(pattern)));
}

function detectAvailability(message) {
  const normalized = normalizeText(message);

  if (normalized.includes("agotado") || normalized.includes("sin stock")) {
    return "agotado";
  }

  if (normalized.includes("disponible") || normalized.includes("en stock")) {
    return "disponible";
  }

  return "";
}

function detectBusinessType(message) {
  const normalized = normalizeText(message);

  if (normalized.includes("universitario") || normalized.includes("universitaria")) {
    return "universitario";
  }

  if (normalized.includes("local") || normalized.includes("locales")) {
    return "local";
  }

  return "";
}

function buildCategoryLookup(metadata) {
  const lookup = new Map();

  for (const category of metadata.categories) {
    lookup.set(normalizeText(category.categoryName), category.categoryName);
  }

  for (const alias of CATEGORY_SYNONYMS) {
    for (const label of alias.labels) {
      lookup.set(normalizeText(label), label);
    }

    for (const term of alias.terms) {
      lookup.set(normalizeText(term), alias.labels[0]);
    }
  }

  return lookup;
}

function detectCategory(message, metadata) {
  const normalized = normalizeText(message);
  const lookup = buildCategoryLookup(metadata);

  const matchedLabels = [];

  for (const [term, label] of lookup.entries()) {
    if (includesWholePhrase(normalized, term)) {
      matchedLabels.push(label);
    }
  }

  const contexts = detectContexts(message);
  for (const context of contexts) {
    for (const categoryLabel of context.categoryLabels) {
      matchedLabels.push(categoryLabel);
    }
  }

  return uniqueValues(matchedLabels).filter((label) =>
    metadata.categories.some((category) => normalizeText(category.categoryName) === normalizeText(label))
  );
}

function detectColorTerms(message) {
  const normalized = normalizeText(message);
  return COLOR_TERMS.filter((color) => includesWholePhrase(normalized, color));
}

function buildUniversityLookup(metadata) {
  const lookup = new Map();

  for (const university of metadata.universities) {
    lookup.set(normalizeText(university.universityName), university.universityName);
  }

  for (const [alias, label] of Object.entries(UNIVERSITY_ALIASES)) {
    lookup.set(normalizeText(alias), label);
  }

  return lookup;
}

function detectUniversity(message, metadata) {
  const normalized = normalizeText(message);
  const lookup = buildUniversityLookup(metadata);

  for (const [term, label] of lookup.entries()) {
    if (includesWholePhrase(normalized, term)) {
      return metadata.universities.find((item) =>
        normalizeText(item.universityName) === normalizeText(label)
      )?.universityName || label;
    }
  }

  return "";
}

function buildLocationLookup(metadata) {
  return metadata.locations
    .map((item) => ({
      raw: item,
      normalized: normalizeText(item)
    }))
    .sort((a, b) => b.normalized.length - a.normalized.length);
}

function detectLocation(message, metadata) {
  const normalized = normalizeText(message);

  for (const location of buildLocationLookup(metadata)) {
    if (includesWholePhrase(normalized, location.normalized)) {
      return location.raw;
    }
  }

  return "";
}

function buildProductKeywordCandidates(message, parsed) {
  const normalized = normalizeText(message);
  const consumedTerms = new Set();

  const registerConsumed = (value) => {
    if (!value) return;
    const normalizedValue = normalizeText(value);
    if (!normalizedValue) return;
    consumedTerms.add(normalizedValue);
    for (const token of tokenize(normalizedValue)) {
      consumedTerms.add(token);
    }
  };

  parsed.categoryLabels.forEach(registerConsumed);
  parsed.contexts.forEach((item) => item.aliases.forEach(registerConsumed));
  parsed.contextSearchTerms.forEach(registerConsumed);
  parsed.colorTerms.forEach(registerConsumed);
  registerConsumed(parsed.locationText);
  registerConsumed(parsed.universityName);
  registerConsumed(parsed.businessType);
  registerConsumed("comida");
  registerConsumed("comer");

  return tokenize(normalized).filter((token) => {
    if (STOPWORDS.has(token)) return false;
    if (consumedTerms.has(token)) return false;
    if (/^\d+$/.test(token)) return false;
    return token.length >= 3;
  });
}

function determineIntent(message, parsed) {
  const normalized = normalizeText(message);

  if (parsed.faq) return parsed.faq.key;
  if (parsed.socialIntent) return parsed.socialIntent;

  const wantsReservations =
    normalized.includes("mis reservas") ||
    normalized.includes("mis pedidos") ||
    normalized.includes("historial") ||
    normalized.includes("ver reservas");

  if (wantsReservations) {
    return "my_reservations";
  }

  const wantsBusiness =
    BUSINESS_INTENT_TERMS.some((term) => normalized.includes(term)) ||
    normalized.startsWith("que emprendimientos") ||
    normalized.startsWith("que negocios") ||
    normalized.includes("donde venden") ||
    normalized.includes("lugares para comer");

  const wantsRecommendation =
    normalized.includes("recomienda") ||
    normalized.includes("recomendame") ||
    normalized.includes("dame ideas") ||
    normalized.includes("quiero algo para") ||
    normalized.includes("no se que comprar");

  if (wantsBusiness) {
    return parsed.isFoodIntent ? "food_business_search" : "business_search";
  }

  if (wantsRecommendation || parsed.contexts.length > 0) {
    return parsed.isFoodIntent ? "recommend_food" : "recommend_products";
  }

  if (
    PRODUCT_INTENT_TERMS.some((term) => normalized.includes(term)) ||
    parsed.keywordTerms.length > 0 ||
    parsed.categoryLabels.length > 0
  ) {
    return parsed.isFoodIntent ? "product_search" : "product_search";
  }

  return "fallback";
}

async function getCatalogMetadata() {
  const now = Date.now();
  if (metadataCache.value && metadataCache.expiresAt > now) {
    return metadataCache.value;
  }

  const [categories] = await pool.query(`
    SELECT categoryID, categoryName
    FROM Categories
    ORDER BY categoryName ASC
  `);

  const [universities] = await pool.query(`
    SELECT universityID, universityName, city, department
    FROM Universities
    ORDER BY universityName ASC
  `);

  const [locations] = await pool.query(`
    SELECT city AS locationName
    FROM BusinessProfiles
    WHERE city IS NOT NULL AND TRIM(city) <> ''
    UNION
    SELECT department AS locationName
    FROM BusinessProfiles
    WHERE department IS NOT NULL AND TRIM(department) <> ''
    UNION
    SELECT city AS locationName
    FROM Universities
    WHERE city IS NOT NULL AND TRIM(city) <> ''
    UNION
    SELECT department AS locationName
    FROM Universities
    WHERE department IS NOT NULL AND TRIM(department) <> ''
    ORDER BY locationName ASC
  `);

  metadataCache = {
    expiresAt: now + METADATA_TTL_MS,
    value: {
      categories,
      universities,
      locations: locations.map((row) => row.locationName).filter(Boolean)
    }
  };

  return metadataCache.value;
}

function logDebug(label, payload) {
  console.log(`[CHATBOT] ${label}`, payload);
}

function logQuery(label, sql, params) {
  console.log(`[CHATBOT SQL] ${label}`, {
    sql: sql.replace(/\s+/g, " ").trim(),
    params
  });
}

function buildInClause(values) {
  return values.map(() => "?").join(", ");
}

function buildProductCandidateQuery(filters) {
  const conditions = [];
  const params = [];

  if (filters.onlyAvailable) {
    conditions.push("(COALESCE(p.stock, 0) > 0 OR LOWER(COALESCE(p.availabilityStatus, '')) = 'disponible')");
  }

  if (filters.availability === "agotado") {
    conditions.push("(COALESCE(p.stock, 0) <= 0 OR LOWER(COALESCE(p.availabilityStatus, '')) = 'agotado')");
  }

  if (filters.categoryLabels.length > 0) {
    conditions.push(`c.categoryName IN (${buildInClause(filters.categoryLabels)})`);
    params.push(...filters.categoryLabels);
  }

  if (filters.minPrice !== null) {
    conditions.push("p.price >= ?");
    params.push(filters.minPrice);
  }

  if (filters.maxPrice !== null) {
    conditions.push("p.price <= ?");
    params.push(filters.maxPrice);
  }

  if (filters.locationText) {
    conditions.push(`(
      LOWER(COALESCE(b.city, '')) LIKE ?
      OR LOWER(COALESCE(b.department, '')) LIKE ?
    )`);
    const like = `%${normalizeText(filters.locationText)}%`;
    params.push(like, like);
  }

  if (filters.universityName) {
    conditions.push("LOWER(COALESCE(u.universityName, '')) LIKE ?");
    params.push(`%${normalizeText(filters.universityName)}%`);
  }

  if (filters.businessType === "local") {
    conditions.push("sp.studentProfileID IS NULL");
  }

  if (filters.businessType === "universitario") {
    conditions.push("sp.studentProfileID IS NOT NULL");
  }

  const sql = `
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
      b.department,
      c.categoryName,
      u.universityName,
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
    LEFT JOIN StudentProfiles sp ON b.userID = sp.userID
    LEFT JOIN Universities u ON sp.universityID = u.universityID
    ${conditions.length ? `WHERE ${conditions.join(" AND ")}` : ""}
    ORDER BY p.productID DESC
    LIMIT 250
  `;

  return { sql, params };
}

async function queryProductCandidates(filters) {
  const { sql, params } = buildProductCandidateQuery(filters);
  logQuery("product_candidates", sql, params);
  const [rows] = await pool.query(sql, params);
  return rows;
}

function buildBusinessCandidateQuery(filters) {
  const conditions = [];
  const params = [];

  if (filters.locationText) {
    conditions.push(`(
      LOWER(COALESCE(b.city, '')) LIKE ?
      OR LOWER(COALESCE(b.department, '')) LIKE ?
    )`);
    const like = `%${normalizeText(filters.locationText)}%`;
    params.push(like, like);
  }

  if (filters.universityName) {
    conditions.push("LOWER(COALESCE(u.universityName, '')) LIKE ?");
    params.push(`%${normalizeText(filters.universityName)}%`);
  }

  if (filters.businessType === "local") {
    conditions.push("sp.studentProfileID IS NULL");
  }

  if (filters.businessType === "universitario") {
    conditions.push("sp.studentProfileID IS NOT NULL");
  }

  if (filters.categoryLabels.length > 0) {
    conditions.push(`(
      bc.categoryName IN (${buildInClause(filters.categoryLabels)})
      OR EXISTS (
        SELECT 1
        FROM Products px
        INNER JOIN Categories cx ON px.categoryID = cx.categoryID
        WHERE px.businessID = b.businessID
          AND cx.categoryName IN (${buildInClause(filters.categoryLabels)})
      )
    )`);
    params.push(...filters.categoryLabels, ...filters.categoryLabels);
  }

  const sql = `
    SELECT
      b.businessID,
      b.businessName,
      b.description,
      b.logoURL,
      b.contactPhone,
      b.city,
      b.department,
      u.universityName,
      bc.categoryName AS businessCategoryName,
      COUNT(DISTINCT p.productID) AS totalProducts,
      SUM(
        CASE
          WHEN COALESCE(p.stock, 0) > 0 OR LOWER(COALESCE(p.availabilityStatus, '')) = 'disponible'
            THEN 1
          ELSE 0
        END
      ) AS availableProducts,
      SUM(
        CASE
          WHEN LOWER(COALESCE(c.categoryName, '')) IN ('alimentos', 'restaurantes')
            THEN 1
          ELSE 0
        END
      ) AS foodProducts,
      GROUP_CONCAT(DISTINCT p.productName SEPARATOR ' || ') AS productNames,
      GROUP_CONCAT(DISTINCT c.categoryName SEPARATOR ' || ') AS productCategories
    FROM BusinessProfiles b
    LEFT JOIN Categories bc ON b.categoryID = bc.categoryID
    LEFT JOIN StudentProfiles sp ON b.userID = sp.userID
    LEFT JOIN Universities u ON sp.universityID = u.universityID
    LEFT JOIN Products p ON p.businessID = b.businessID
    LEFT JOIN Categories c ON p.categoryID = c.categoryID
    ${conditions.length ? `WHERE ${conditions.join(" AND ")}` : ""}
    GROUP BY
      b.businessID,
      b.businessName,
      b.description,
      b.logoURL,
      b.contactPhone,
      b.city,
      b.department,
      u.universityName,
      bc.categoryName
    ORDER BY b.businessName ASC
    LIMIT 100
  `;

  return { sql, params };
}

async function queryBusinessCandidates(filters) {
  const { sql, params } = buildBusinessCandidateQuery(filters);
  logQuery("business_candidates", sql, params);
  const [rows] = await pool.query(sql, params);
  return rows;
}

function buildSearchSummary(filters) {
  const subjectPieces = [];
  const filterPieces = [];

  if (filters.keywordTerms.length > 0) {
    subjectPieces.push(filters.keywordTerms.join(" "));
  }

  if (filters.colorTerms.length > 0) {
    subjectPieces.push(filters.colorTerms.join(" "));
  }

  if (!subjectPieces.length && filters.contexts.some((item) => item.key === "playa")) {
    subjectPieces.push("productos para playa");
  }

  if (!subjectPieces.length && filters.contexts.some((item) => item.key === "regalo")) {
    subjectPieces.push("algo para regalo");
  }

  if (!subjectPieces.length && filters.isFoodIntent) {
    subjectPieces.push("comida");
  }

  const hasNamedContextSubject =
    filters.isFoodIntent ||
    filters.contexts.some((item) => ["playa", "regalo"].includes(item.key));

  if (filters.categoryLabels.length > 0 && filters.keywordTerms.length === 0 && !hasNamedContextSubject) {
    subjectPieces.push(filters.categoryLabels.join(", "));
  }

  if (filters.locationText) {
    filterPieces.push(`en ${toTitleCase(filters.locationText)}`);
  }

  if (filters.universityName) {
    filterPieces.push(`en ${filters.universityName}`);
  }

  if (filters.maxPrice !== null) {
    filterPieces.push(`hasta ${formatPrice(filters.maxPrice)}`);
  }

  if (!subjectPieces.length && filters.universityName) {
    return `la universidad ${filters.universityName}`;
  }

  if (!subjectPieces.length && filters.locationText) {
    return `la ubicacion ${toTitleCase(filters.locationText)}`;
  }

  const subject = subjectPieces.join(" ").trim();
  const suffix = filterPieces.join(" ").trim();

  return [subject, suffix].filter(Boolean).join(" ").trim() || "esa busqueda";
}

function productSearchText(row) {
  return normalizeText([
    row.productName,
    row.description,
    row.categoryName,
    row.businessName,
    row.city,
    row.department,
    row.universityName
  ].join(" "));
}

function businessSearchText(row) {
  return normalizeText([
    row.businessName,
    row.description,
    row.businessCategoryName,
    row.city,
    row.department,
    row.universityName,
    row.productNames,
    row.productCategories
  ].join(" "));
}

function scoreProduct(row, filters, stage) {
  const searchText = productSearchText(row);
  const matchedKeywords = countMatchedTerms(searchText, filters.keywordTerms);
  const matchedColors = countMatchedTerms(searchText, filters.colorTerms);
  const matchedContext = countMatchedTerms(searchText, filters.contextSearchTerms);
  const hardBudgetMatch = isWithinBudget(row.price, filters.minPrice, filters.maxPrice);
  const locationMatch =
    !filters.locationText ||
    [row.city, row.department].some((item) => includesWholePhrase(item, filters.locationText));
  const universityMatch =
    !filters.universityName || includesWholePhrase(row.universityName, filters.universityName);
  const categoryMatch =
    filters.categoryLabels.length === 0 ||
    filters.categoryLabels.some((label) => normalizeText(label) === normalizeText(row.categoryName));
  const businessTypeMatch =
    !filters.businessType ||
    (filters.businessType === "local" ? !row.universityName : Boolean(row.universityName));

  const explicitSatisfied =
    matchedKeywords.length === filters.keywordTerms.length &&
    matchedColors.length === filters.colorTerms.length;

  const contextSatisfied =
    filters.contextSearchTerms.length === 0 ||
    matchedContext.length > 0;

  let score = 0;

  score += matchedKeywords.length * 8;
  score += matchedColors.length * 6;
  score += Math.min(matchedContext.length * 3, 9);
  score += categoryMatch ? 5 : 0;
  score += locationMatch ? 5 : 0;
  score += universityMatch ? 5 : 0;
  score += hardBudgetMatch ? 4 : 0;
  score += businessTypeMatch ? 2 : 0;

  const hardFiltersMatch = locationMatch && universityMatch && categoryMatch && businessTypeMatch;
  const budgetOk = stage.ignoreBudget ? true : hardBudgetMatch;
  const hasExplicitQuery = filters.keywordTerms.length > 0 || filters.colorTerms.length > 0;

  let matchLevel = "partial";
  if (hardFiltersMatch && budgetOk && explicitSatisfied && contextSatisfied) {
    matchLevel = "exact";
  } else if (
    hardFiltersMatch &&
    budgetOk &&
    (
      hasExplicitQuery
        ? (matchedKeywords.length > 0 || matchedColors.length > 0 || matchedContext.length > 0)
        : (matchedContext.length > 0 || categoryMatch)
    )
  ) {
    matchLevel = "high";
  }

  return {
    ...row,
    price: Number(row.price || 0),
    score,
    matchLevel,
    debug: {
      matchedKeywords,
      matchedColors,
      matchedContext,
      hardFiltersMatch,
      budgetOk
    }
  };
}

function scoreBusiness(row, filters, stage) {
  const searchText = businessSearchText(row);
  const businessOwnText = normalizeText([
    row.businessName,
    row.description,
    row.businessCategoryName
  ].join(" "));
  const matchedKeywords = countMatchedTerms(searchText, filters.keywordTerms);
  const matchedContext = countMatchedTerms(searchText, filters.contextSearchTerms);
  const locationMatch =
    !filters.locationText ||
    [row.city, row.department].some((item) => includesWholePhrase(item, filters.locationText));
  const universityMatch =
    !filters.universityName || includesWholePhrase(row.universityName, filters.universityName);
  const foodRatio =
    Number(row.totalProducts || 0) > 0
      ? Number(row.foodProducts || 0) / Number(row.totalProducts || 0)
      : 0;
  const foodBusinessStrong =
    Number(row.foodProducts || 0) >= 2 ||
    foodRatio >= 0.25 ||
    ["comida", "cocina", "kitchen", "snack", "restaurante", "cafeteria", "bebida"].some((term) =>
      includesWholePhrase(businessOwnText, term)
    );
  const categoryMatch =
    filters.categoryLabels.length === 0 ||
    filters.categoryLabels.some((label) => includesWholePhrase(searchText, label));
  const businessTypeMatch =
    !filters.businessType ||
    (filters.businessType === "local" ? !row.universityName : Boolean(row.universityName));

  let score = 0;
  score += matchedKeywords.length * 8;
  score += Math.min(matchedContext.length * 3, 9);
  score += locationMatch ? 5 : 0;
  score += universityMatch ? 5 : 0;
  score += categoryMatch ? 5 : 0;
  score += foodBusinessStrong && filters.isFoodIntent ? 8 : 0;
  score += businessTypeMatch ? 2 : 0;

  const hardFiltersMatch = locationMatch && universityMatch && categoryMatch && businessTypeMatch;
  const explicitSatisfied = matchedKeywords.length === filters.keywordTerms.length;

  let matchLevel = "partial";
  if (hardFiltersMatch && explicitSatisfied && (!filters.isFoodIntent || foodBusinessStrong)) {
    matchLevel = "exact";
  } else if (
    hardFiltersMatch &&
    (!filters.isFoodIntent || foodBusinessStrong) &&
    (matchedKeywords.length > 0 || matchedContext.length > 0 || foodBusinessStrong || !filters.keywordTerms.length)
  ) {
    matchLevel = "high";
  }

  if (filters.isFoodIntent && matchLevel === "exact" && !foodBusinessStrong) {
    matchLevel = "partial";
  }

  return {
    ...row,
    score,
    matchLevel,
    debug: {
      matchedKeywords,
      matchedContext,
      hardFiltersMatch,
      foodBusinessStrong
    }
  };
}

function sortByScore(items) {
  return [...items].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return Number(b.productID || b.businessID || 0) - Number(a.productID || a.businessID || 0);
  });
}

function mapProductCard(item, responseKind = "Coincidencia exacta") {
  return {
    productID: item.productID,
    productName: item.productName,
    description: item.description || "",
    price: Number(item.price || 0),
    priceLabel: formatPrice(item.price),
    stock: Number(item.stock || 0),
    availabilityStatus: item.availabilityStatus || "",
    categoryName: item.categoryName || "Sin categoria",
    businessID: item.businessID,
    businessName: item.businessName || "",
    city: item.city || "",
    department: item.department || "",
    universityName: item.universityName || "",
    imageURL: item.imageURL || DEFAULT_PRODUCT_IMAGE,
    detailPath: `./product-detail.html?id=${encodeURIComponent(item.productID)}`,
    matchLevel: item.matchLevel,
    matchLabel: responseKind,
    score: item.score
  };
}

function mapBusinessCard(item, responseKind = "Coincidencia exacta") {
  return {
    businessID: item.businessID,
    businessName: item.businessName || "",
    description: item.description || "",
    categoryName: item.businessCategoryName || "Sin categoria",
    city: item.city || "",
    department: item.department || "",
    universityName: item.universityName || "",
    contactPhone: item.contactPhone || "",
    logoURL: item.logoURL || DEFAULT_BUSINESS_LOGO,
    detailPath: `./seller-profile.html?id=${encodeURIComponent(item.businessID)}`,
    matchLevel: item.matchLevel,
    matchLabel: responseKind,
    score: item.score
  };
}

function buildMatchSummary(kind, label, details = {}) {
  return {
    kind,
    label,
    ...details
  };
}

function buildClarificationReply(filters) {
  if (filters.needsNearby && !filters.locationText && !filters.universityName) {
    return {
      ok: true,
      reply:
        "Puedo filtrar por cercania usando ciudad o universidad, pero necesito que me indiques una referencia real, por ejemplo Managua, San Marcos, UNI o Keiser.",
      intent: filters.intent,
      assistantName: CHATBOT_NAME,
      products: [],
      businesses: [],
      reservations: [],
      suggestions: DEFAULT_SUGGESTIONS,
      matchSummary: buildMatchSummary("needs_clarification", "Sin coincidencias exactas", {
        missing: ["ciudad o universidad"]
      }),
      intentData: buildIntentData(filters)
    };
  }

  return null;
}

function buildIntentData(filters) {
  return {
    type: filters.intent,
    categoryLabels: filters.categoryLabels,
    keywordTerms: filters.keywordTerms,
    colorTerms: filters.colorTerms,
    locationText: filters.locationText,
    universityName: filters.universityName,
    businessType: filters.businessType,
    minPrice: filters.minPrice,
    maxPrice: filters.maxPrice,
    contexts: filters.contexts.map((item) => item.key)
  };
}

function buildProductReply(resultKind, filters, counts = {}) {
  const summary = buildSearchSummary(filters);

  if (resultKind === "exact") {
    return `Encontre ${counts.total} producto${counts.total === 1 ? "" : "s"} que si coincide${counts.total === 1 ? "" : "n"} con ${summary}.`;
  }

  if (resultKind === "similar") {
    return `No encontre ${summary} exactamente, pero si estas alternativas similares dentro de los filtros principales.`;
  }

  if (resultKind === "over_budget") {
    return `No encontre opciones dentro de tu presupuesto para ${summary}. Estas son las mas cercanas que encontre fuera de ese rango.`;
  }

  if (resultKind === "other_location") {
    return `No encontre resultados reales con esa ubicacion para ${summary}. Si encontre opciones parecidas en otras ubicaciones.`;
  }

  return `No encontre resultados reales para ${summary}. Si quieres, puedo intentar con menos filtros o con otra ubicacion.`;
}

function buildBusinessReply(resultKind, filters, counts = {}) {
  const summary = buildSearchSummary(filters);
  const foodSummary = filters.isFoodIntent
    ? `comida${filters.locationText ? ` en ${toTitleCase(filters.locationText)}` : ""}${filters.universityName ? ` en ${filters.universityName}` : ""}`
    : summary;
  const localSummary =
    filters.businessType === "local" && filters.locationText
      ? `negocios locales en ${toTitleCase(filters.locationText)}`
      : summary;

  if (resultKind === "exact") {
    return `Encontre ${counts.total} negocio${counts.total === 1 ? "" : "s"} que si coincide${counts.total === 1 ? "" : "n"} con ${filters.businessType === "local" ? localSummary : summary}.`;
  }

  if (resultKind === "similar") {
    return `No encontre negocios que cumplan exactamente ${filters.businessType === "local" ? localSummary : summary}, pero si estas alternativas similares.`;
  }

  if (resultKind === "product_fallback") {
    return `No encontre negocios claramente dedicados a ${foodSummary}, pero si productos reales relacionados que pueden servirte como alternativa.`;
  }

  if (resultKind === "other_location") {
    return `No encontre ${filters.businessType === "local" ? localSummary : `negocios registrados para ${summary}`} con esa ubicacion exacta. Si encontre opciones parecidas en otras zonas.`;
  }

  return `No encontre negocios reales para ${filters.businessType === "local" ? localSummary : summary} en este momento.`;
}

function buildEmptyResponse(filters, reply) {
  return {
    ok: true,
    reply,
    intent: filters.intent,
    assistantName: CHATBOT_NAME,
    products: [],
    businesses: [],
    reservations: [],
    suggestions: DEFAULT_SUGGESTIONS,
    matchSummary: buildMatchSummary("none", "Sin coincidencias exactas"),
    intentData: buildIntentData(filters)
  };
}

function rankAndSliceProducts(rows, filters, stage, responseLabel) {
  return sortByScore(rows.map((row) => scoreProduct(row, filters, stage)))
    .slice(0, 12)
    .map((row) => mapProductCard(row, responseLabel));
}

function rankAndSliceBusinesses(rows, filters, stage, responseLabel) {
  return sortByScore(rows.map((row) => scoreBusiness(row, filters, stage)))
    .slice(0, 12)
    .map((row) => mapBusinessCard(row, responseLabel));
}

function splitByMatchLevel(items) {
  return {
    exact: items.filter((item) => item.matchLevel === "exact"),
    high: items.filter((item) => item.matchLevel === "high"),
    partial: items.filter((item) => item.matchLevel === "partial")
  };
}

function buildRelaxedFilters(baseFilters, options = {}) {
  return {
    ...baseFilters,
    minPrice: options.ignoreBudget ? null : baseFilters.minPrice,
    maxPrice: options.ignoreBudget ? null : baseFilters.maxPrice,
    locationText: options.ignoreLocation ? "" : baseFilters.locationText,
    universityName: options.ignoreUniversity ? "" : baseFilters.universityName,
    categoryLabels: options.keepCategories === false ? [] : baseFilters.categoryLabels,
    onlyAvailable: baseFilters.availability !== "agotado",
    availability: baseFilters.availability,
    businessType: baseFilters.businessType,
    isFoodIntent: baseFilters.isFoodIntent
  };
}

async function resolveProductSearch(filters) {
  const clarification = buildClarificationReply(filters);
  if (clarification) return clarification;

  const strictFilters = buildRelaxedFilters(filters);
  const strictRows = await queryProductCandidates(strictFilters);
  const strictRanked = rankAndSliceProducts(strictRows, filters, { ignoreBudget: false }, "Coincidencia exacta");
  const strictGroups = splitByMatchLevel(strictRanked);

  logDebug("strict_product_match_counts", {
    originalMessage: filters.originalMessage,
    exact: strictGroups.exact.length,
    high: strictGroups.high.length,
    partial: strictGroups.partial.length
  });

  const explicitSearch = filters.keywordTerms.length > 0 || filters.colorTerms.length > 0;

  if (strictGroups.exact.length > 0) {
    return {
      ok: true,
      reply: buildProductReply("exact", filters, { total: strictGroups.exact.length }),
      intent: filters.intent,
      assistantName: CHATBOT_NAME,
      products: strictGroups.exact.slice(0, 6),
      businesses: [],
      reservations: [],
      suggestions: DEFAULT_SUGGESTIONS,
      matchSummary: buildMatchSummary("exact", "Coincidencia exacta", {
        exactCount: strictGroups.exact.length
      }),
      intentData: buildIntentData(filters)
    };
  }

  const strictAlternativePool = explicitSearch
    ? [...strictGroups.high]
    : [...strictGroups.high, ...strictGroups.partial];

  if (strictAlternativePool.length > 0) {
    const alternatives = strictAlternativePool.slice(0, 6).map((item) => ({
      ...item,
      matchLabel: "Alternativa similar"
    }));

    return {
      ok: true,
      reply: buildProductReply("similar", filters, { total: alternatives.length }),
      intent: filters.intent,
      assistantName: CHATBOT_NAME,
      products: alternatives,
      businesses: [],
      reservations: [],
      suggestions: DEFAULT_SUGGESTIONS,
      matchSummary: buildMatchSummary("alternative", "Alternativa similar", {
        exactCount: 0,
        alternativeCount: alternatives.length
      }),
      intentData: buildIntentData(filters)
    };
  }

  if (filters.maxPrice !== null || filters.minPrice !== null) {
    const budgetRelaxedFilters = buildRelaxedFilters(filters, { ignoreBudget: true });
    const budgetRows = await queryProductCandidates(budgetRelaxedFilters);
    const budgetRanked = rankAndSliceProducts(budgetRows, { ...filters, minPrice: null, maxPrice: null }, { ignoreBudget: true }, "Alternativa similar");
    const budgetAlternatives = sortByScore(budgetRanked)
      .filter((item) => explicitSearch ? item.matchLevel === "high" : item.matchLevel !== "partial")
      .slice(0, 6);

    if (budgetAlternatives.length > 0) {
      return {
        ok: true,
        reply: buildProductReply("over_budget", filters, { total: budgetAlternatives.length }),
        intent: filters.intent,
        assistantName: CHATBOT_NAME,
        products: budgetAlternatives.map((item) => ({
          ...item,
          matchLabel: "Alternativa similar"
        })),
        businesses: [],
        reservations: [],
        suggestions: DEFAULT_SUGGESTIONS,
        matchSummary: buildMatchSummary("alternative", "Sin coincidencias exactas", {
          reason: "budget",
          alternativeCount: budgetAlternatives.length
        }),
        intentData: buildIntentData(filters)
      };
    }
  }

  if (filters.locationText || filters.universityName) {
    const locationRelaxedFilters = buildRelaxedFilters(filters, {
      ignoreLocation: true,
      ignoreUniversity: true
    });
    const locationRows = await queryProductCandidates(locationRelaxedFilters);
    const locationRanked = rankAndSliceProducts(
      locationRows,
      { ...filters, locationText: "", universityName: "" },
      { ignoreBudget: false },
      "Alternativa similar"
    );
    const locationAlternatives = sortByScore(locationRanked)
      .filter((item) => explicitSearch ? item.matchLevel === "high" : item.matchLevel !== "partial")
      .slice(0, 6);

    if (locationAlternatives.length > 0) {
      return {
        ok: true,
        reply: buildProductReply("other_location", filters, { total: locationAlternatives.length }),
        intent: filters.intent,
        assistantName: CHATBOT_NAME,
        products: locationAlternatives.map((item) => ({
          ...item,
          matchLabel: "Alternativa similar"
        })),
        businesses: [],
        reservations: [],
        suggestions: DEFAULT_SUGGESTIONS,
        matchSummary: buildMatchSummary("alternative", "Sin coincidencias exactas", {
          reason: "location",
          alternativeCount: locationAlternatives.length
        }),
        intentData: buildIntentData(filters)
      };
    }
  }

  return buildEmptyResponse(
    filters,
    buildProductReply("none", filters)
  );
}

async function resolveBusinessSearch(filters) {
  const clarification = buildClarificationReply(filters);
  if (clarification) return clarification;

  const strictFilters = buildRelaxedFilters(filters);
  const strictRows = await queryBusinessCandidates(strictFilters);
  const strictRanked = rankAndSliceBusinesses(strictRows, filters, {}, "Coincidencia exacta");
  const strictGroups = splitByMatchLevel(strictRanked);

  logDebug("strict_business_match_counts", {
    originalMessage: filters.originalMessage,
    exact: strictGroups.exact.length,
    high: strictGroups.high.length,
    partial: strictGroups.partial.length
  });

  if (strictGroups.exact.length > 0) {
    return {
      ok: true,
      reply: buildBusinessReply("exact", filters, { total: strictGroups.exact.length }),
      intent: filters.intent,
      assistantName: CHATBOT_NAME,
      products: [],
      businesses: strictGroups.exact.slice(0, 6),
      reservations: [],
      suggestions: DEFAULT_SUGGESTIONS,
      matchSummary: buildMatchSummary("exact", "Coincidencia exacta", {
        exactCount: strictGroups.exact.length
      }),
      intentData: buildIntentData(filters)
    };
  }

  if (filters.isFoodIntent) {
    const productFallback = await resolveProductSearch({
      ...filters,
      intent: "product_search",
      categoryLabels:
        filters.categoryLabels.length > 0 ? filters.categoryLabels : ["Alimentos", "Restaurantes"],
      onlyAvailable: true
    });

    if (productFallback.products.length > 0) {
      return {
        ...productFallback,
        reply: buildBusinessReply("product_fallback", filters, {
          total: productFallback.products.length
        }),
        intent: filters.intent,
        intentData: buildIntentData(filters),
        matchSummary: buildMatchSummary("alternative", "Sin coincidencias exactas", {
          reason: "business_profile_low_confidence"
        })
      };
    }
  }

  if (strictGroups.high.length > 0 || strictGroups.partial.length > 0) {
    const alternatives = [...strictGroups.high, ...strictGroups.partial].slice(0, 6).map((item) => ({
      ...item,
      matchLabel: "Alternativa similar"
    }));

    return {
      ok: true,
      reply: buildBusinessReply("similar", filters, { total: alternatives.length }),
      intent: filters.intent,
      assistantName: CHATBOT_NAME,
      products: [],
      businesses: alternatives,
      reservations: [],
      suggestions: DEFAULT_SUGGESTIONS,
      matchSummary: buildMatchSummary("alternative", "Alternativa similar", {
        alternativeCount: alternatives.length
      }),
      intentData: buildIntentData(filters)
    };
  }

  if (filters.locationText || filters.universityName) {
    const locationRelaxedFilters = buildRelaxedFilters(filters, {
      ignoreLocation: true,
      ignoreUniversity: true
    });
    const locationRows = await queryBusinessCandidates(locationRelaxedFilters);
    const locationRanked = rankAndSliceBusinesses(
      locationRows,
      { ...filters, locationText: "", universityName: "" },
      {},
      "Alternativa similar"
    );
    const locationAlternatives = sortByScore(locationRanked).filter((item) => item.matchLevel !== "partial").slice(0, 6);

    if (locationAlternatives.length > 0) {
      return {
        ok: true,
        reply: buildBusinessReply("other_location", filters, { total: locationAlternatives.length }),
        intent: filters.intent,
        assistantName: CHATBOT_NAME,
        products: [],
        businesses: locationAlternatives.map((item) => ({
          ...item,
          matchLabel: "Alternativa similar"
        })),
        reservations: [],
        suggestions: DEFAULT_SUGGESTIONS,
        matchSummary: buildMatchSummary("alternative", "Sin coincidencias exactas", {
          reason: "location",
          alternativeCount: locationAlternatives.length
        }),
        intentData: buildIntentData(filters)
      };
    }
  }

  return buildEmptyResponse(
    filters,
    buildBusinessReply("none", filters)
  );
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
    return "Hola, soy Clicky. Puedo ayudarte a buscar productos, negocios y dudas reales de Dale Click.";
  }

  const firstName = profile.user.firstName || profile.user.username || "usuario";
  const reservationCount = Array.isArray(profile.reservations) ? profile.reservations.length : 0;

  if (!reservationCount) {
    return `Hola, ${firstName}. Puedo ayudarte a buscar productos, negocios o explicarte como reservar dentro de Dale Click.`;
  }

  return `Hola, ${firstName}. Veo que ya has usado Dale Click. Si quieres, puedo ayudarte a buscar nuevos productos o revisar tus reservas.`;
}

function buildSocialReply(type) {
  if (type === "wellbeing") {
    return "Estoy lista para ayudarte. Dime que producto, negocio o duda tienes dentro de Dale Click.";
  }

  if (type === "thanks") {
    return "Con gusto. Si quieres, seguimos con otra busqueda o una duda del proyecto.";
  }

  if (type === "goodbye") {
    return "Hasta luego. Cuando quieras volver a buscar algo en Dale Click, aqui estare.";
  }

  if (type === "deescalate") {
    return "Puedo seguir ayudandote con respeto. Dime que necesitas buscar y lo revisamos con datos reales.";
  }

  return "Puedo ayudarte con productos, negocios y dudas reales del proyecto.";
}

function buildReservationsReply(profile) {
  if (!profile?.user) {
    return {
      reply: "Para revisar tus reservas necesitas iniciar sesion en Dale Click.",
      reservations: []
    };
  }

  if (!profile.reservations?.length) {
    return {
      reply: "No encontre reservas recientes en tu cuenta.",
      reservations: []
    };
  }

  const summary = profile.reservations
    .map((item) => `${item.productName} (${item.orderStatus})`)
    .join(", ");

  return {
    reply: `Estas son tus reservas mas recientes: ${summary}.`,
    reservations: profile.reservations
  };
}

function parseMessage(message, metadata) {
  const faq = detectFaq(message);
  const socialIntent = detectSocialIntent(message);
  const contexts = detectContexts(message);
  const categoryLabels = detectCategory(message, metadata);
  const colorTerms = detectColorTerms(message);
  const universityName = detectUniversity(message, metadata);
  const locationText = detectLocation(message, metadata);
  const availability = detectAvailability(message);
  const businessType = detectBusinessType(message);
  const needsNearby = detectNearby(message);
  const { minPrice, maxPrice } = parsePriceRange(message);

  const contextSearchTerms = uniqueValues(contexts.flatMap((context) => context.searchTerms));

  const seed = {
    faq,
    socialIntent,
    contexts,
    contextSearchTerms,
    categoryLabels,
    colorTerms,
    universityName,
    locationText,
    availability,
    businessType,
    needsNearby,
    minPrice,
    maxPrice,
    isFoodIntent:
      categoryLabels.some((label) => ["alimentos", "restaurantes"].includes(normalizeText(label))) ||
      contexts.some((item) => item.key === "comida")
  };

  const keywordTerms = buildProductKeywordCandidates(message, seed);
  const intent = determineIntent(message, { ...seed, keywordTerms });

  return {
    ...seed,
    keywordTerms,
    intent,
    originalMessage: message,
    onlyAvailable: availability !== "agotado"
  };
}

function buildFaqResponse(faq, filters) {
  return {
    ok: true,
    reply: faq.answer,
    intent: faq.key,
    assistantName: CHATBOT_NAME,
    products: [],
    businesses: [],
    reservations: [],
    suggestions: DEFAULT_SUGGESTIONS,
    matchSummary: buildMatchSummary("info", "Coincidencia exacta"),
    intentData: buildIntentData(filters)
  };
}

export async function processChatbotMessage({ message, userID = null }) {
  const catalogMetadata = await getCatalogMetadata();
  const filters = parseMessage(message, catalogMetadata);
  const userProfile = userID ? await getUserChatProfile(userID) : null;

  logDebug("parsed_message", {
    originalMessage: message,
    intent: filters.intent,
    filters: buildIntentData(filters)
  });

  if (filters.intent === "greeting") {
    return {
      ok: true,
      reply: buildGreetingReply(userProfile),
      intent: filters.intent,
      assistantName: CHATBOT_NAME,
      products: [],
      businesses: [],
      reservations: [],
      suggestions: DEFAULT_SUGGESTIONS,
      matchSummary: buildMatchSummary("info", "Coincidencia exacta"),
      intentData: buildIntentData(filters)
    };
  }

  if (["wellbeing", "thanks", "goodbye", "deescalate"].includes(filters.intent)) {
    return {
      ok: true,
      reply: buildSocialReply(filters.intent),
      intent: filters.intent,
      assistantName: CHATBOT_NAME,
      products: [],
      businesses: [],
      reservations: [],
      suggestions: DEFAULT_SUGGESTIONS,
      matchSummary: buildMatchSummary("info", "Coincidencia exacta"),
      intentData: buildIntentData(filters)
    };
  }

  if (filters.faq) {
    return buildFaqResponse(filters.faq, filters);
  }

  if (filters.intent === "my_reservations") {
    const reservationInfo = buildReservationsReply(userProfile);
    return {
      ok: true,
      reply: reservationInfo.reply,
      intent: filters.intent,
      assistantName: CHATBOT_NAME,
      products: [],
      businesses: [],
      reservations: reservationInfo.reservations,
      suggestions: DEFAULT_SUGGESTIONS,
      matchSummary: buildMatchSummary("info", "Coincidencia exacta"),
      intentData: buildIntentData(filters)
    };
  }

  if (["business_search", "food_business_search"].includes(filters.intent)) {
    return resolveBusinessSearch(filters);
  }

  if (["recommend_products", "recommend_food", "product_search", "fallback"].includes(filters.intent)) {
    return resolveProductSearch(filters);
  }

  return buildEmptyResponse(
    filters,
    "Puedo ayudarte a buscar productos, negocios o resolver dudas reales de Dale Click. Dime que necesitas y lo reviso con los datos actuales."
  );
}
