import reservationRoutes from "./routes/reservation.routes.js";
import authRoutes from "./routes/auth.routes.js";
import pool from "./config/db.js";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use("/api/auth", authRoutes);
app.use("/api/reservations", reservationRoutes);

// ruta base
app.get("/", (req, res) => {
  res.json({
    ok: true,
    message: "API de DC funcionando",
  });
});

const PORT = process.env.PORT || 3000;
app.get("/test-db", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT 1");
    res.json({ ok: true, message: "conexion a DB exitosa", rows });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});