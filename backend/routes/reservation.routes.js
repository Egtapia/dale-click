import express from "express";
import {
  cancelReservation,
  createReservation,
  getMyReservations
} from "../controllers/reservation.controller.js";
import { verifyToken } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/", verifyToken, createReservation);
router.get("/mine", verifyToken, getMyReservations);
router.patch("/:id/cancel", verifyToken, cancelReservation);

export default router;
