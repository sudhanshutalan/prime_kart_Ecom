import express from "express";
import {
  createProducts,
  deleteProducts,
  fetchAllProducts,
  updateProducts,
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
router.put(
  "/update-products/:productId",
  isAuthenticated,
  authorizedRoles("ADMIN"),
  updateProducts
);
router.delete(
  "/deleteProducts/:productId",
  isAuthenticated,
  authorizedRoles("ADMIN"),
  deleteProducts
);
export default router;
