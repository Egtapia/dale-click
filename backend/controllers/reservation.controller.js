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

    const [stockUpdateResult] = await connection.query(
      `
      UPDATE Products
      SET stock = stock - ?
      WHERE productID = ? AND stock >= ?
      `,
      [parsedQuantity, product.productID, parsedQuantity]
    );

    if (stockUpdateResult.affectedRows === 0) {
      await connection.rollback();
      return res.status(400).json({
        ok: false,
        message: "No hay stock suficiente para completar la reserva."
      });
    }

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

export async function cancelReservation(req, res) {
  const connection = await pool.getConnection();

  try {
    const userID = req.user.userID;
    const orderID = cleanNumber(req.params.id);

    if (!orderID) {
      return res.status(400).json({
        ok: false,
        message: "El identificador de la reserva no es valido."
      });
    }

    await connection.beginTransaction();

    const [rows] = await connection.query(
      `
      SELECT
        o.orderID,
        o.orderStatus,
        o.paymentMethod,
        od.productID,
        od.quantity
      FROM Orders o
      INNER JOIN OrderDetails od ON o.orderID = od.orderID
      WHERE o.orderID = ? AND o.userID = ?
      `,
      [orderID, userID]
    );

    if (!rows.length) {
      await connection.rollback();
      return res.status(404).json({
        ok: false,
        message: "Reserva no encontrada."
      });
    }

    const reservation = rows[0];
    const status = String(reservation.orderStatus || "").toLowerCase().trim();

    if (status === "cancelada") {
      await connection.rollback();
      return res.status(400).json({
        ok: false,
        message: "La reserva ya estaba cancelada."
      });
    }

    if (status === "entregado") {
      await connection.rollback();
      return res.status(400).json({
        ok: false,
        message: "No puedes cancelar una reserva ya entregada."
      });
    }

    await connection.query(
      `
      UPDATE Orders
      SET
        orderStatus = 'Cancelada',
        paymentStatus = CASE
          WHEN LOWER(COALESCE(paymentMethod, '')) = 'wallet' THEN 'Refunded'
          ELSE paymentStatus
        END
      WHERE orderID = ? AND userID = ?
      `,
      [orderID, userID]
    );

    for (const item of rows) {
      await connection.query(
        `
        UPDATE Products
        SET stock = stock + ?
        WHERE productID = ?
        `,
        [Number(item.quantity) || 0, item.productID]
      );
    }

    await connection.commit();

    const refundedToWallet = rows.some(
      (item) => String(item.paymentMethod || "").toLowerCase().trim() === "wallet"
    );

    return res.json({
      ok: true,
      message: refundedToWallet
        ? "Reserva cancelada correctamente. El monto vuelve a estar disponible en wallet."
        : "Reserva cancelada correctamente."
    });
  } catch (error) {
    await connection.rollback();
    console.error("Error cancelReservation:", error);
    return res.status(500).json({
      ok: false,
      message: "Error interno al cancelar la reserva."
    });
  } finally {
    connection.release();
  }
}
