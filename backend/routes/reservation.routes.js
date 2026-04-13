import express from "express";
import { createReservation, getMyReservations } from "../controllers/reservation.controller.js";
import { verifyToken } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/", verifyToken, createReservation);
router.get("/mine", verifyToken, getMyReservations);

export default router;