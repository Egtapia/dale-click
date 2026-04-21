import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

import authRoutes from "./routes/auth.routes.js";
import reservationRoutes from "./routes/reservation.routes.js";
import productRoutes from "./routes/product.routes.js";
import businessRoutes from "./routes/business.routes.js";

dotenv.config();

const app = express();

// Para usar __dirname con ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middlewares
app.use(cors());
app.use(express.json());

// 🔥 SERVIR FRONTEND (IMPORTANTÍSIMO)
app.use(express.static(path.join(__dirname, "../buyer")));

// Si tienes assets fuera (como /assets/js)
app.use("/assets", express.static(path.join(__dirname, "../assets")));

// 🔥 RUTAS API
app.use("/api/auth", authRoutes);
app.use("/api/reservations", reservationRoutes);
app.use("/api/products", productRoutes);
app.use("/api/businesses", businessRoutes);

// 🔥 ROOT → abre index.html
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../buyer/index.html"));
});

// 🔥 CUALQUIER RUTA (SPA fallback opcional pero recomendado)
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../buyer/index.html"));
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});