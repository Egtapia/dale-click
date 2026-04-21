import pool from "../config/db.js";
import jwt from "jsonwebtoken";
import {
  CATEGORY_ALIASES,
  CHATBOT_NAME,
  DEFAULT_SUGGESTIONS,
  FAQ_ENTRIES
} from "../utils/chatbot-knowledge.js";

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
    return {
      minPrice: null,
      maxPrice: Number(upToMatch[1])
    };
  }

  const fromMatch = normalized.match(/\b(?:desde|mayor a|mas de|minimo de|minimo)\s*c?\$?\s*(\d{1,6})\b/);
  if (fromMatch) {
    return {
      minPrice: Number(fromMatch[1]),
      maxPrice: null
    };
  }

  const genericMatch = normalized.match(/\bc?\$?\s*(\d{1,6})\s*(?:o menos|maximo|para abajo)?\b/);
  if (genericMatch) {
    return {
      minPrice: null,
      maxPrice: Number(genericMatch[1])
    };
  }

  return {
    minPrice: null,
    maxPrice: null
  };
}

function detectCategory(message) {
  const normalized = normalizeText(message);

  for (const category of CATEGORY_ALIASES) {
    if (category.terms.some((term) => normalized.includes(term))) {
      return category.value;
    }
  }

  return "";
}

function detectGreeting(message) {
  const normalized = normalizeText(message);
  return ["hola", "buenas", "buenos dias", "buenas tardes", "buenas noches", "hey"].some((term) =>
    normalized === term || normalized.startsWith(`${term} `)
  );
}

function detectFaq(message) {
  const normalized = normalizeText(message);

  return FAQ_ENTRIES.find((entry) =>
    entry.patterns.some((pattern) => normalized.includes(pattern))
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

function stripNoiseWords(message, category, city) {
  const normalized = normalizeText(message);
  const stopWords = new Set([
    "quiero", "busco", "muestrame", "mostrar", "muestreme", "dame", "ver", "verme", "algo",
    "productos", "producto", "negocio", "negocios", "tienda", "tiendas", "local", "locales",
    "emprendedor", "emprendedores", "vendedor", "vendedores", "barato", "barata", "baratos", "baratas",
    "economico", "economica", "economicos", "economicas", "recomendacion", "recomendaciones",
    "recomiendas", "comprar", "compra", "puedo", "con", "poco", "dinero", "en", "de", "por", "para",
    "hay", "que", "me", "quiera", "necesito", "buscar", "precio", "precios", "ciudad", "ubicacion",
    "ubicacion", "cerca", "menos", "maximo", "hasta", "entre", "desde", "mostrarme", "tal"
  ]);

  const words = normalized
    .split(" ")
    .filter(Boolean)
    .filter((word) => !stopWords.has(word));

  return words.filter((word) => word !== category && word !== city).join(" ").trim();
}

function detectIntent(message) {
  const normalized = normalizeText(message);
  const faq = detectFaq(normalized);
  const category = detectCategory(normalized);
  const city = extractCity(normalized);
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

  const searchText = stripNoiseWords(normalized, category, city);

  if (wantsBusinesses || needsNearby) {
    return {
      type: "business_search",
      category,
      city,
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

  if (detectGreeting(normalized)) {
    return { type: "greeting" };
  }

  return {
    type: "fallback",
    category,
    city,
    searchText,
    minPrice,
    maxPrice,
    needsNearby
  };
}

function buildProductWhere({ searchText, category, city, minPrice, maxPrice }) {
  const conditions = ["(p.stock > 0 OR LOWER(COALESCE(p.availabilityStatus, '')) = 'disponible')"];
  const params = [];

  if (searchText) {
    const likeValue = `%${searchText}%`;
    conditions.push(`(
      p.productName LIKE ?
      OR p.description LIKE ?
      OR c.categoryName LIKE ?
      OR b.businessName LIKE ?
    )`);
    params.push(likeValue, likeValue, likeValue, likeValue);
  }

  if (category) {
    conditions.push("LOWER(c.categoryName) LIKE ?");
    params.push(`%${category}%`);
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

function buildBusinessWhere({ searchText, category, city }) {
  const conditions = [];
  const params = [];

  if (searchText) {
    const likeValue = `%${searchText}%`;
    conditions.push(`(
      b.businessName LIKE ?
      OR b.description LIKE ?
      OR b.city LIKE ?
      OR EXISTS (
        SELECT 1
        FROM Products px
        WHERE px.businessID = b.businessID
          AND (
            px.productName LIKE ?
            OR px.description LIKE ?
          )
      )
    )`);
    params.push(likeValue, likeValue, likeValue, likeValue, likeValue);
  }

  if (city) {
    conditions.push("LOWER(b.city) LIKE ?");
    params.push(`%${city}%`);
  }

  if (category) {
    conditions.push(`EXISTS (
      SELECT 1
      FROM Products p2
      INNER JOIN Categories c2 ON p2.categoryID = c2.categoryID
      WHERE p2.businessID = b.businessID
        AND LOWER(c2.categoryName) LIKE ?
    )`);
    params.push(`%${category}%`);
  }

  return {
    where: conditions.length ? `WHERE ${conditions.join(" AND ")}` : "",
    params
  };
}

async function findProducts(filters, mode = "latest", limit = 4) {
  const queryParts = buildProductWhere(filters);
  let orderBy = "ORDER BY p.createdAt DESC, p.productID DESC";

  if (mode === "cheap") {
    orderBy = "ORDER BY p.price ASC, p.productID DESC";
  }

  if (filters.searchText) {
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
  }

  const params = [...queryParts.params];

  if (filters.searchText) {
    const exact = normalizeText(filters.searchText);
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
    categoryName: item.categoryName || "Sin categoria",
    businessID: item.businessID,
    businessName: item.businessName || "",
    city: item.city || "",
    imageURL: item.imageURL || "/assets/images/producto-default.svg",
    detailPath: `./product-detail.html?id=${encodeURIComponent(item.productID)}`
  }));
}

async function findBusinesses(filters, limit = 4) {
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
      (
        SELECT c.categoryName
        FROM Products p
        LEFT JOIN Categories c ON p.categoryID = c.categoryID
        WHERE p.businessID = b.businessID
        ORDER BY p.productID ASC
        LIMIT 1
      ) AS categoryName
    FROM BusinessProfiles b
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
    categoryName: item.categoryName || "Sin categoria",
    city: item.city || "",
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

  return {
    categories: categoryRows.map((item) => String(item.categoryName || "").trim()).filter(Boolean),
    cities: cityRows.map((item) => String(item.city || "").trim()).filter(Boolean),
    products: productRows.map((item) => String(item.productName || "").trim()).filter(Boolean)
  };
}

function detectCategoryFromCatalog(message, categories) {
  const normalized = normalizeText(message);
  const match = categories.find((categoryName) => normalized.includes(normalizeText(categoryName)));
  return match ? normalizeText(match) : detectCategory(normalized);
}

function detectCityFromCatalog(message, cities) {
  const normalized = normalizeText(message);
  const directMatch = cities.find((city) => normalized.includes(normalizeText(city)));

  if (directMatch) {
    return normalizeText(directMatch);
  }

  return extractCity(normalized);
}

function detectProductFromCatalog(message, products) {
  const normalized = normalizeText(message);
  let bestMatch = "";

  for (const productName of products) {
    const normalizedProduct = normalizeText(productName);
    if (!normalizedProduct) continue;

    if (normalized.includes(normalizedProduct)) {
      if (normalizedProduct.length > bestMatch.length) {
        bestMatch = normalizedProduct;
      }
    }
  }

  return bestMatch;
}

function enrichIntentWithCatalog(intent, message, catalogHints) {
  if (!catalogHints) return intent;

  const category = intent.category || detectCategoryFromCatalog(message, catalogHints.categories);
  const city = intent.city || detectCityFromCatalog(message, catalogHints.cities);
  const specificProduct = detectProductFromCatalog(message, catalogHints.products);

  return {
    ...intent,
    category,
    city,
    searchText: intent.searchText || specificProduct
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
    return "Hola, soy Clicky. Puedo ayudarte a encontrar productos, negocios y explicarte como funciona Dale Click.";
  }

  const firstName = profile.user.firstName || profile.user.username || "usuario";
  const reservationCount = Array.isArray(profile.reservations) ? profile.reservations.length : 0;

  if (!reservationCount) {
    return `Hola, ${firstName}. Soy Clicky y puedo ayudarte a encontrar productos, negocios o explicarte como reservar dentro de Dale Click.`;
  }

  return `Hola, ${firstName}. Veo que ya has usado Dale Click. Si quieres, puedo ayudarte a buscar nuevos productos o revisar el estado general de tus reservas.`;
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
      reply: "No encontre reservas recientes en tu cuenta. Si quieres, te ayudo a buscar algo para apartar.",
      reservations: []
    };
  }

  const summary = profile.reservations
    .map((item) => `${item.productName} (${item.orderStatus})`)
    .join(", ");

  return {
    reply: `Estas son tus reservas mas recientes: ${summary}. Si quieres, tambien puedo ayudarte a encontrar productos parecidos.`,
    reservations: profile.reservations
  };
}

function buildLocationPromptReply(intentType) {
  if (intentType === "business_search") {
    return "Puedo recomendarte negocios cercanos, pero necesito que me indiques una ciudad o ubicacion de referencia, por ejemplo: Managua, Leon o Esteli.";
  }

  return "Puedo buscar productos cercanos, pero necesito una ciudad o ubicacion de referencia. Por ejemplo: Managua, Granada o Carazo.";
}

function buildProductReply(intent, products, filters) {
  if (!products.length) {
    if (filters.needsNearby && !filters.city) {
      return buildLocationPromptReply(intent);
    }

    if (intent === "cheap_products") {
      return "No encontre productos economicos con esos filtros. Puedes probar otra categoria, ciudad o ampliar el presupuesto.";
    }

    if (intent === "recommend_products") {
      return "No encontre recomendaciones exactas con esos datos, pero puedes probar otra categoria o ciudad para mostrarte mas opciones.";
    }

    if (filters.searchText) {
      return `No encontre productos que coincidan con "${filters.searchText}". Puedes intentar con otro nombre, otra ciudad o un rango de precio diferente.`;
    }

    return "No encontre productos que coincidan con lo que buscas. Puedes intentar con otra categoria, ciudad o rango de precio.";
  }

  const intro =
    intent === "cheap_products"
      ? "Te comparto algunas opciones economicas"
      : intent === "recommend_products"
        ? "Estas opciones pueden interesarte"
        : "Encontre estos productos para ti";

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
    return "No encontre negocios que coincidan con esa busqueda. Puedes intentar con otra ciudad, categoria o producto de referencia.";
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

  const contextText = contextParts.length ? ` ${contextParts.join(" ")}` : "";
  return `Encontre estos negocios${contextText}. Puedes entrar a su perfil para ver sus productos y datos de contacto.`;
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
        : await findBusinesses(intent, 4);

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
        : await findProducts(intent, searchMode, 4);

      if (!products.length && intent.type === "fallback") {
        const faq = detectFaq(rawMessage);
        if (faq) {
          return res.json(buildFaqResponse(faq));
        }
      }

      return res.json({
        ok: true,
        reply: buildProductReply(intent.type, products, intent),
        intent: intent.type,
        assistantName: CHATBOT_NAME,
        products,
        businesses: [],
        reservations: [],
        suggestions: DEFAULT_SUGGESTIONS
      });
    }

    return res.json({
      ok: true,
      reply:
        "Puedo ayudarte a encontrar productos, negocios o explicarte como funciona Dale Click. Dime que buscas y te ayudo.",
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
