import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

const REQUIRED_DB_ENV_VARS = [
  "DB_HOST",
  "DB_PORT",
  "DB_USER",
  "DB_PASSWORD",
  "DB_NAME"
];

function parseBoolean(value, defaultValue = false) {
  if (value === undefined || value === null || value === "") {
    return defaultValue;
  }

  return ["1", "true", "yes", "on"].includes(String(value).trim().toLowerCase());
}

function getMissingDbEnvVars() {
  return REQUIRED_DB_ENV_VARS.filter((key) => {
    const value = String(process.env[key] || "").trim();
    return value === "";
  });
}

export function getDatabaseRuntimeConfig() {
  const missingEnvVars = getMissingDbEnvVars();
  const port = Number(process.env.DB_PORT || 3306);
  const useSsl = parseBoolean(process.env.DB_SSL, false);
  const rejectUnauthorized = parseBoolean(process.env.DB_SSL_REJECT_UNAUTHORIZED, true);

  return {
    host: String(process.env.DB_HOST || "").trim(),
    port: Number.isFinite(port) ? port : 3306,
    user: String(process.env.DB_USER || "").trim(),
    database: String(process.env.DB_NAME || "").trim(),
    hasPassword: String(process.env.DB_PASSWORD || "").trim() !== "",
    useSsl,
    rejectUnauthorized,
    missingEnvVars
  };
}

const runtimeConfig = getDatabaseRuntimeConfig();

const poolOptions = {
  host: runtimeConfig.host,
  port: runtimeConfig.port,
  user: runtimeConfig.user,
  password: process.env.DB_PASSWORD,
  database: runtimeConfig.database,
  waitForConnections: true,
  connectionLimit: Number(process.env.DB_CONNECTION_LIMIT || 10),
  queueLimit: 0
};

if (runtimeConfig.useSsl) {
  poolOptions.ssl = {
    rejectUnauthorized: runtimeConfig.rejectUnauthorized
  };
}

const pool = mysql.createPool(poolOptions);

export async function verifyDatabaseConnection() {
  if (runtimeConfig.missingEnvVars.length > 0) {
    throw new Error(
      `Faltan variables de entorno de base de datos: ${runtimeConfig.missingEnvVars.join(", ")}`
    );
  }

  const connection = await pool.getConnection();

  try {
    const [rows] = await connection.query(`
      SELECT
        DATABASE() AS databaseName,
        CURRENT_USER() AS currentUser,
        @@hostname AS dbHost
    `);

    return rows[0] || null;
  } finally {
    connection.release();
  }
}

export default pool;
