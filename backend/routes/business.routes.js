import express from "express";
import { getAllBusinesses, getBusinessById } from "../controllers/business.controller.js";

const router = express.Router();

router.get("/", getAllBusinesses);
router.get("/:id", getBusinessById);

export default router;