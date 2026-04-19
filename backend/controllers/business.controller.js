import pool from "../config/db.js";

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function normalizeUniversityValue(name) {
  const value = normalizeText(name).replace(/[^a-z0-9\s-]/g, "");
  if (!value) return "";

  if (value.includes("keiser") && value.includes("managua")) return "keiser-managua";
  if (value.includes("keiser") && value.includes("san marcos")) return "keiser-san-marcos";
  if (value === "uam") return "uam";
  if (value === "uni") return "uni";

  return value.replace(/\s+/g, "-");
}

function normalizeLocationValue(city) {
  return normalizeText(city).replace(/\s+/g, "-");
}

export async function getAllBusinesses(req, res) {
  try {
    const [rows] = await pool.query(`
      SELECT
        b.businessID,
        b.userID,
        b.businessName,
        b.description,
        b.logoURL,
        b.contactPhone,
        b.contactEmail,
        b.department,
        b.city,
        b.addressLine,
        b.referenceNote,
        b.status,
        sp.studentProfileID,
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
      ORDER BY b.businessName ASC
    `);

    const businesses = rows.map((business) => {
      const type = business.studentProfileID ? "universitario" : "local";

      return {
        businessID: business.businessID,
        businessName: business.businessName,
        description: business.description || "Sin descripción disponible.",
        category: business.categoryName || "Sin categoría",
        categoryValue: normalizeText(business.categoryName).replace(/\s+/g, "-"),
        location: business.city || "Ubicación no disponible",
        locationValue: normalizeLocationValue(business.city),
        type,
        universityName: "",
        universityValue: "",
        logoURL: business.logoURL || "../assets/images/logo-seller-default.png",
        contactPhone: business.contactPhone || "Sin contacto"
      };
    });

    return res.json({
      ok: true,
      businesses
    });
  } catch (error) {
    console.error("Error getAllBusinesses:", error);
    return res.status(500).json({
      ok: false,
      message: "Error al obtener emprendedores."
    });
  }
}

export async function getBusinessById(req, res) {
  try {
    const { id } = req.params;

    const [businessRows] = await pool.query(
      `
      SELECT
        b.businessID,
        b.userID,
        b.businessName,
        b.description,
        b.logoURL,
        b.contactPhone,
        b.contactEmail,
        b.department,
        b.city,
        b.addressLine,
        b.referenceNote,
        b.status,
        sp.studentProfileID,
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
      WHERE b.businessID = ?
      LIMIT 1
      `,
      [id]
    );

    if (!businessRows.length) {
      return res.status(404).json({
        ok: false,
        message: "Emprendimiento no encontrado."
      });
    }

    const business = businessRows[0];

    const [hoursRows] = await pool.query(
      `
      SELECT
        businessHourID,
        dayOfWeek,
        isClosed,
        openTime,
        closeTime
      FROM BusinessHours
      WHERE businessID = ?
      ORDER BY businessHourID ASC
      `,
      [id]
    );

    const [productRows] = await pool.query(
      `
      SELECT
        p.productID,
        p.productName,
        p.description,
        p.price,
        p.stock,
        p.availabilityStatus,
        p.categoryID,
        c.categoryName,
        (
          SELECT pi.imageURL
          FROM ProductImages pi
          WHERE pi.productID = p.productID
          ORDER BY pi.imageID ASC
          LIMIT 1
        ) AS imageURL
      FROM Products p
      LEFT JOIN Categories c ON p.categoryID = c.categoryID
      WHERE p.businessID = ?
      ORDER BY p.createdAt DESC, p.productID DESC
      `,
      [id]
    );

    const businessType = business.studentProfileID ? "universitario" : "local";

    return res.json({
      ok: true,
      business: {
        businessID: business.businessID,
        businessName: business.businessName,
        description: business.description,
        logoURL: business.logoURL,
        contactPhone: business.contactPhone,
        contactEmail: business.contactEmail,
        department: business.department,
        city: business.city,
        addressLine: business.addressLine,
        referenceNote: business.referenceNote,
        status: business.status,
        category: business.categoryName || "Sin categoría",
        type: businessType,
        universityName: ""
      },
      hours: hoursRows.map((item) => ({
        businessHourID: item.businessHourID,
        dayOfWeek: item.dayOfWeek,
        isClosed: Boolean(item.isClosed),
        openTime: item.openTime,
        closeTime: item.closeTime
      })),
      products: productRows.map((item) => ({
        productID: item.productID,
        productName: item.productName,
        description: item.description,
        price: item.price,
        stock: item.stock,
        availabilityStatus: item.availabilityStatus,
        categoryValue: String(item.categoryID || ""),
        categoryName: item.categoryName || "Sin categoría",
        imageURL: item.imageURL || "../assets/images/producto-default.jpg",
        businessID: Number(id)
      }))
    });
  } catch (error) {
    console.error("Error getBusinessById:", error);
    return res.status(500).json({
      ok: false,
      message: "Error al obtener el perfil del emprendimiento."
    });
  }
}