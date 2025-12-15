import express from "express";
import { createProducts } from "../controllers/productController.js";
import {
  authorizedRoles,
  isAuthenticated,
} from "../middlewares/authMiddleware.js";

const router = express.Router();

router.post("/create-product", isAuthenticated, createProducts);

export default router;
