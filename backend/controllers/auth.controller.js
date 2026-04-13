import pool from "../config/db.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import {
  cleanText,
  cleanEmail,
  cleanUsername,
  cleanPhone,
  isValidEmail,
  isValidPhone,
  isValidPassword
} from "../utils/sanitize.js";

export const register = async (req, res) => {
  try {
    const username = cleanUsername(req.body.username);
    const firstName = cleanText(req.body.firstName, 50);
    const lastName = cleanText(req.body.lastName, 50);
    const email = cleanEmail(req.body.email);
    const password = String(req.body.password ?? "");
    const phone = cleanPhone(req.body.phone);

    if (!username || !firstName || !lastName || !email || !password || !phone) {
      return res.status(400).json({
        ok: false,
        message: "Completa todos los campos obligatorios."
      });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({
        ok: false,
        message: "Correo electrónico inválido."
      });
    }

    if (!isValidPhone(phone)) {
      return res.status(400).json({
        ok: false,
        message: "Número de teléfono inválido."
      });
    }

    if (!isValidPassword(password)) {
      return res.status(400).json({
        ok: false,
        message: "La contraseña debe tener entre 6 y 100 caracteres."
      });
    }

    const [existingUsers] = await pool.query(
      `
      SELECT userID
      FROM Users
      WHERE username = ? OR email = ?
      LIMIT 1
      `,
      [username, email]
    );

    if (existingUsers.length > 0) {
      return res.status(409).json({
        ok: false,
        message: "Ya existe una cuenta con ese usuario o correo."
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const query = `
      INSERT INTO Users (username, firstName, lastName, email, password, phone, status)
      VALUES (?, ?, ?, ?, ?, ?, 'activo')
    `;

    await pool.query(query, [
      username,
      firstName,
      lastName,
      email,
      hashedPassword,
      phone
    ]);

    return res.json({
      ok: true,
      message: "Usuario registrado correctamente"
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error.message
    });
  }
};

export const login = async (req, res) => {
  try {
    const identifierRaw = String(req.body.identifier ?? "").trim();
    const password = String(req.body.password ?? "");

    if (!identifierRaw || !password) {
      return res.status(400).json({
        ok: false,
        message: "Correo o usuario y contraseña son obligatorios."
      });
    }

    const identifierEmail = cleanEmail(identifierRaw);
    const identifierUsername = cleanUsername(identifierRaw);

    const query = `
      SELECT userID, username, firstName, lastName, email, phone, password, status, roleID
      FROM Users
      WHERE email = ? OR username = ?
      LIMIT 1
    `;

    const [rows] = await pool.query(query, [identifierEmail || identifierRaw, identifierUsername]);

    if (rows.length === 0) {
      return res.status(401).json({
        ok: false,
        message: "Credenciales incorrectas."
      });
    }

    const user = rows[0];

    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      return res.status(401).json({
        ok: false,
        message: "Credenciales incorrectas."
      });
    }

    const token = jwt.sign(
      {
        userID: user.userID,
        username: user.username,
        email: user.email,
        roleID: user.roleID
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "2h" }
    );

    return res.json({
      ok: true,
      message: "Login exitoso 🔐",
      token,
      user: {
        userID: user.userID,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        status: user.status,
        roleID: user.roleID
      }
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error.message
    });
  }
};

export const me = async (req, res) => {
  try {
    const userID = req.user.userID;

    const [rows] = await pool.query(
      `
      SELECT userID, username, firstName, lastName, email, phone, status, roleID
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

    const user = rows[0];

    return res.json({
      ok: true,
      user
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error.message
    });
  }
};