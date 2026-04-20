import pool from "../config/db.js";

function normalizeCategoryValue(categoryName) {
  return String(categoryName ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

function mapCategory(category) {
  const categoryName = category.categoryName || "Sin categoria";

  return {
    categoryID: category.categoryID,
    categoryName,
    categoryValue: normalizeCategoryValue(categoryName),
    productsCount: Number(category.productsCount || 0)
  };
}

function mapProduct(product) {
  const categoryName = product.categoryName || "Sin categoria";

  return {
    ...product,
    categoryName,
    categoryValue: normalizeCategoryValue(categoryName),
    imageURL: product.imageURL || "../assets/images/producto-default.jpg"
  };
}

export async function getAllProducts(req, res) {
  try {
    const [rows] = await pool.query(`
      SELECT
        p.productID,
        p.productName,
        p.description,
        p.price,
        p.stock,
        p.availabilityStatus,
        b.businessID,
        b.businessName,
        b.contactPhone,
        b.contactEmail,
        b.city,
        b.department,
        c.categoryID,
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
      ORDER BY p.createdAt DESC, p.productID DESC
    `);

    return res.json({
      ok: true,
      products: rows.map(mapProduct)
    });
  } catch (error) {
    console.error("Error getAllProducts:", error);
    return res.status(500).json({
      ok: false,
      message: "Error al obtener productos"
    });
  }
}

export async function getAllCategories(req, res) {
  try {
    const [rows] = await pool.query(`
      SELECT
        c.categoryID,
        c.categoryName,
        COUNT(p.productID) AS productsCount
      FROM Categories c
      LEFT JOIN Products p ON p.categoryID = c.categoryID
      GROUP BY c.categoryID, c.categoryName
      ORDER BY c.categoryName ASC
    `);

    return res.json({
      ok: true,
      categories: rows.map(mapCategory)
    });
  } catch (error) {
    console.error("Error getAllCategories:", error);
    return res.status(500).json({
      ok: false,
      message: "Error al obtener categorias"
    });
  }
}

export async function getProductById(req, res) {
  try {
    const { id } = req.params;

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
        b.contactPhone,
        b.contactEmail,
        b.instagram,
        b.tiktok,
        b.city,
        b.department,
        c.categoryID,
        c.categoryName
      FROM Products p
      INNER JOIN BusinessProfiles b ON p.businessID = b.businessID
      INNER JOIN Categories c ON p.categoryID = c.categoryID
      WHERE p.productID = ?
      LIMIT 1
      `,
      [id]
    );

    if (!rows.length) {
      return res.status(404).json({
        ok: false,
        message: "Producto no encontrado"
      });
    }

    const [images] = await pool.query(
      `
      SELECT imageID, imageURL
      FROM ProductImages
      WHERE productID = ?
      ORDER BY imageID DESC
      `,
      [id]
    );

    const primaryImageURL =
      images.find((image) => image?.imageURL && String(image.imageURL).trim() !== "")?.imageURL ||
      rows[0].imageURL;

    return res.json({
      ok: true,
      product: {
        ...mapProduct({
          ...rows[0],
          imageURL: primaryImageURL
        }),
        images
      }
    });
  } catch (error) {
    console.error("Error getProductById:", error);
    return res.status(500).json({
      ok: false,
      message: "Error al obtener detalle del producto"
    });
  }
}
