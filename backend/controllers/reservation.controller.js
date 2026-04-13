import pool from "../config/db.js";
import { cleanOptionalText, cleanNumber } from "../utils/sanitize.js";

export const createReservation = async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const userID = req.user.userID;
    const productID = cleanNumber(req.body.productID);
    const quantity = cleanNumber(req.body.quantity);
    const note = cleanOptionalText(req.body.note, 300);

    if (!productID || !quantity) {
      return res.status(400).json({
        ok: false,
        message: "productID y quantity son obligatorios."
      });
    }

    const parsedQuantity = Number(quantity);

    if (!Number.isInteger(parsedQuantity) || parsedQuantity <= 0) {
      return res.status(400).json({
        ok: false,
        message: "La cantidad debe ser un número entero mayor que 0."
      });
    }

    const [products] = await connection.query(
      `
      SELECT
        p.productID,
        p.productName,
        p.price,
        p.stock,
        p.availabilityStatus,
        p.businessID
      FROM Products p
      WHERE p.productID = ?
      LIMIT 1
      `,
      [productID]
    );

    if (products.length === 0) {
      return res.status(404).json({
        ok: false,
        message: "Producto no encontrado."
      });
    }

    const product = products[0];

    if (String(product.availabilityStatus).toLowerCase() !== "disponible") {
      return res.status(400).json({
        ok: false,
        message: "Este producto no está disponible para reserva."
      });
    }

    if (Number(product.stock) < parsedQuantity) {
      return res.status(400).json({
        ok: false,
        message: "No hay stock suficiente para la cantidad solicitada."
      });
    }

    const totalAmount = Number(product.price) * parsedQuantity;

    await connection.beginTransaction();

    const [orderResult] = await connection.query(
      `
      INSERT INTO Orders (
        userID,
        businessID,
        orderStatus,
        paymentMethod,
        paymentStatus,
        verifiedIdentityID,
        totalAmount
      )
      VALUES (?, ?, 'Reservado', 'Offline', 'Pending', NULL, ?)
      `,
      [userID, product.businessID, totalAmount]
    );

    const orderID = orderResult.insertId;

    await connection.query(
      `
      INSERT INTO OrderDetails (
        orderID,
        productID,
        quantity,
        unitPrice
      )
      VALUES (?, ?, ?, ?)
      `,
      [orderID, product.productID, parsedQuantity, product.price]
    );

    await connection.commit();

    return res.status(201).json({
      ok: true,
      message: "Reserva creada correctamente.",
      reservation: {
        orderID,
        productID: product.productID,
        productName: product.productName,
        quantity: parsedQuantity,
        totalAmount,
        note
      }
    });
  } catch (error) {
    await connection.rollback();
    return res.status(500).json({
      ok: false,
      error: error.message
    });
  } finally {
    connection.release();
  }
};

export const getMyReservations = async (req, res) => {
  try {
    const userID = req.user.userID;

    const [rows] = await pool.query(
      `
      SELECT
        o.orderID,
        o.orderDate,
        o.orderStatus,
        o.totalAmount,
        bp.businessName,
        p.productID,
        p.productName,
        p.availabilityStatus,
        c.categoryName,
        od.quantity,
        od.unitPrice,
        (
          SELECT pi.imageURL
          FROM ProductImages pi
          WHERE pi.productID = p.productID
          LIMIT 1
        ) AS imageURL
      FROM Orders o
      INNER JOIN OrderDetails od ON o.orderID = od.orderID
      INNER JOIN Products p ON od.productID = p.productID
      INNER JOIN Categories c ON p.categoryID = c.categoryID
      INNER JOIN BusinessProfiles bp ON o.businessID = bp.businessID
      WHERE o.userID = ?
      ORDER BY o.orderDate DESC
      `,
      [userID]
    );

    return res.json({
      ok: true,
      reservations: rows
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error.message
    });
  }
};