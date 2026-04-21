import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

import authRoutes from "./routes/auth.routes.js";
import reservationRoutes from "./routes/reservation.routes.js";
import productRoutes from "./routes/product.routes.js";
import businessRoutes from "./routes/business.routes.js";
import chatbotRoutes from "./routes/chatbot.routes.js";
import { getDatabaseRuntimeConfig, verifyDatabaseConnection } from "./config/db.js";

dotenv.config();

const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BUYER_DIR = path.join(__dirname, "../buyer");
const ASSETS_DIR = path.join(__dirname, "../assets");
const databaseRuntimeConfig = getDatabaseRuntimeConfig();

function setNoStoreHeaders(res) {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
}

function setRevalidateHeaders(res) {
  res.setHeader("Cache-Control", "public, max-age=0, must-revalidate");
}

function setStaticHeaders(res, filePath) {
  const extension = path.extname(filePath).toLowerCase();

  if (extension === ".html") {
    setNoStoreHeaders(res);
    return;
  }

  if ([".js", ".css", ".png", ".jpg", ".jpeg", ".gif", ".svg", ".webp", ".ico"].includes(extension)) {
    setRevalidateHeaders(res);
  }
}

app.use(cors());
app.use(express.json());

app.use(express.static(BUYER_DIR, {
  extensions: ["html"],
  setHeaders: setStaticHeaders
}));

app.use("/assets", express.static(ASSETS_DIR, {
  setHeaders: setStaticHeaders
}));
app.use("/assets", (req, res) => {
  res.status(404).send("Asset no encontrado.");
});

app.use("/api/auth", authRoutes);
app.use("/api/reservations", reservationRoutes);
app.use("/api/products", productRoutes);
app.use("/api/businesses", businessRoutes);
app.use("/api/chatbot", chatbotRoutes);

app.get("/", (req, res) => {
  res.sendFile(path.join(BUYER_DIR, "index.html"));
});

app.use("/api", (req, res) => {
  res.status(404).json({
    ok: false,
    message: "Ruta API no encontrada."
  });
});

app.use((req, res) => {
  res.status(404).send("Ruta no encontrada.");
});

const PORT = process.env.PORT || 3001;

function logDatabaseStartupStatus() {
  if (databaseRuntimeConfig.missingEnvVars.length > 0) {
    console.error(
      `[DB CONFIG] Faltan variables de entorno: ${databaseRuntimeConfig.missingEnvVars.join(", ")}`
    );
  }

  console.log("[DB CONFIG]", {
    host: databaseRuntimeConfig.host || "(vacio)",
    port: databaseRuntimeConfig.port,
    user: databaseRuntimeConfig.user || "(vacio)",
    database: databaseRuntimeConfig.database || "(vacio)",
    hasPassword: databaseRuntimeConfig.hasPassword,
    useSsl: databaseRuntimeConfig.useSsl,
    rejectUnauthorized: databaseRuntimeConfig.rejectUnauthorized
  });
}

async function startServer() {
  logDatabaseStartupStatus();

  try {
    const dbInfo = await verifyDatabaseConnection();
    console.log("[DB] Conexion verificada correctamente.", dbInfo);
  } catch (error) {
    console.error("[DB] No se pudo verificar la conexion a MySQL.", {
      name: error?.name || "Error",
      message: error?.message || "Sin mensaje",
      code: error?.code || null,
      errno: error?.errno || null,
      sqlState: error?.sqlState || null,
      sqlMessage: error?.sqlMessage || null
    });
  }

  app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
  });
}

startServer();
