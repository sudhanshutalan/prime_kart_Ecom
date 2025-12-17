import express from "express";
import {
  createProducts,
  deleteProductReview,
  deleteProducts,
  fetchAllProducts,
  fetchSingleProduct,
  postProductReview,
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

router.get("/fetchSingleProduct/:productId", fetchSingleProduct);

router.put("/postProductReview/:productId", isAuthenticated, postProductReview);

router.delete(
  "/deleteReviews/:productId",
  isAuthenticated,
  deleteProductReview
);

export default router;
