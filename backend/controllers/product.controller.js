import pool from "../config/db.js";

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
        c.categoryName,
        (
          SELECT pi.imageURL
          FROM ProductImages pi
          WHERE pi.productID = p.productID
          ORDER BY pi.imageID ASC
          LIMIT 1
        ) AS imageURL
      FROM Products p
      JOIN BusinessProfiles b ON p.businessID = b.businessID
      JOIN Categories c ON p.categoryID = c.categoryID
      ORDER BY p.createdAt DESC, p.productID DESC
    `);

    return res.json({
      ok: true,
      products: rows
    });
  } catch (error) {
    console.error("Error getAllProducts:", error);
    return res.status(500).json({
      ok: false,
      message: "Error al obtener productos"
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
        b.city,
        b.department,
        c.categoryName
      FROM Products p
      JOIN BusinessProfiles b ON p.businessID = b.businessID
      JOIN Categories c ON p.categoryID = c.categoryID
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

    const product = rows[0];

    const [images] = await pool.query(
      `
      SELECT imageID, imageURL
      FROM ProductImages
      WHERE productID = ?
      ORDER BY imageID ASC
      `,
      [id]
    );

    return res.json({
      ok: true,
      product: {
        ...product,
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