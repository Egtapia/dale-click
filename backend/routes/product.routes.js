import express from "express";
import {
  getAllCategories,
  getAllProducts,
  getProductById
} from "../controllers/product.controller.js";

const router = express.Router();

router.get("/categories", getAllCategories);
router.get("/", getAllProducts);
router.get("/:id", getProductById);

export default router;
