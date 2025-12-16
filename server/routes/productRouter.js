import express from "express";
import {
  createProducts,
  fetchAllProducts,
} from "../controllers/productController.js";
import {
  isAuthenticated,
  authorizedRoles,
} from "../middlewares/authMiddleware.js";

const router = express.Router();

router.post(
  "/create-product",
  isAuthenticated,
  authorizedRoles("ADMIN"),
  createProducts
);
router.get("/getAllProducts", fetchAllProducts);
export default router;
