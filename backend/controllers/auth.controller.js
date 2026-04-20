import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import pool from "../config/db.js";

function sanitizeServerText(value) {
  return String(value || "").trim();
}

function sanitizeServerIdentifier(value) {
  return sanitizeServerText(value).replace(/\s+/g, " ");
}

function looksLikeBcryptHash(value) {
  return /^\$2[aby]\$\d{2}\$/.test(String(value || ""));
}

export async function register(req, res) {
  try {
    const firstName = sanitizeServerText(req.body.firstName);
    const lastName = sanitizeServerText(req.body.lastName);
    const username = sanitizeServerIdentifier(req.body.username);
    const email = sanitizeServerIdentifier(req.body.email).toLowerCase();
    const phone = sanitizeServerIdentifier(req.body.phone);
    const nationalID = sanitizeServerIdentifier(req.body.nationalID).toUpperCase();
    const password = sanitizeServerText(req.body.password);

    if (!firstName || !lastName || !username || !email || !phone || !nationalID || !password) {
      return res.status(400).json({ ok: false, message: "Todos los campos son obligatorios." });
    }

    if (password.length < 8) {
      return res.status(400).json({ ok: false, message: "La contraseña debe tener al menos 8 caracteres." });
    }

    const [existingUsers] = await pool.query(
      `SELECT userID FROM Users WHERE email = ? OR username = ? OR nationalID = ? LIMIT 1`,
      [email, username, nationalID]
    );

    if (existingUsers.length > 0) {
      return res.status(409).json({
        ok: false,
        message: "Ya existe un usuario con ese correo, username o cédula."
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const [result] = await pool.query(
      `
      INSERT INTO Users (
        username,
        firstName,
        lastName,
        email,
        phone,
        nationalID,
        password,
        status,
        roleID
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [username, firstName, lastName, email, phone, nationalID, hashedPassword, "Activo", 1]
    );

    return res.status(201).json({
      ok: true,
      message: "Usuario registrado correctamente.",
      userID: result.insertId
    });
  } catch (error) {
    console.error("Error en register:", error);
    return res.status(500).json({
      ok: false,
      message: "Error interno al registrar usuario."
    });
  }
}

export async function login(req, res) {
  try {
    const identifier = sanitizeServerIdentifier(req.body.identifier);
    const password = sanitizeServerText(req.body.password);

    if (!identifier || !password) {
      return res.status(400).json({
        ok: false,
        message: "Debes enviar identificador y contraseña."
      });
    }

    const [rows] = await pool.query(
      `
      SELECT userID, username, firstName, lastName, email, phone, nationalID, password, roleID
      FROM Users
      WHERE email = ? OR username = ?
      LIMIT 1
      `,
      [identifier, identifier]
    );

    if (rows.length === 0) {
      return res.status(401).json({
        ok: false,
        message: "Credenciales inválidas."
      });
    }

    const user = rows[0];
    let isValidPassword = false;

    if (looksLikeBcryptHash(user.password)) {
      isValidPassword = await bcrypt.compare(password, user.password);
    } else {
      isValidPassword = password === sanitizeServerText(user.password);

      if (isValidPassword) {
        const hashedPassword = await bcrypt.hash(password, 10);

        await pool.query(
          `
          UPDATE Users
          SET password = ?
          WHERE userID = ?
          `,
          [hashedPassword, user.userID]
        );
      }
    }

    if (!isValidPassword) {
      return res.status(401).json({
        ok: false,
        message: "Credenciales inválidas."
      });
    }

    const token = jwt.sign(
      {
        userID: user.userID,
        email: user.email,
        roleID: user.roleID
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "2h" }
    );

    return res.json({
      ok: true,
      message: "Login exitoso.",
      token,
      user: {
        userID: user.userID,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        nationalID: user.nationalID,
        roleID: user.roleID
      }
    });
  } catch (error) {
    console.error("Error en login:", error);
    return res.status(500).json({
      ok: false,
      message: "Error interno al iniciar sesión."
    });
  }
}

export async function me(req, res) {
  try {
    const userID = req.user.userID;

    const [rows] = await pool.query(
      `
      SELECT userID, username, firstName, lastName, email, phone, nationalID, roleID
      FROM Users
      WHERE userID = ?
      LIMIT 1
      `,
      [userID]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        ok: false,
        message: "Usuario no encontrado."
      });
    }

    return res.json({
      ok: true,
      user: rows[0]
    });
  } catch (error) {
    console.error("Error en me:", error);
    return res.status(500).json({
      ok: false,
      message: "Error interno al obtener usuario."
    });
  }
}
