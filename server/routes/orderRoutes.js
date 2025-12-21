import express from "express";
import {
  deleteOrder,
  fetchAllOrders,
  fetchSingleOrder,
  placeNewOrder,
  updateOrderStatus,
} from "../controllers/orderController.js";
import {
  authorizedRoles,
  isAuthenticated,
} from "../middlewares/authMiddleware.js";

const router = express.Router();

router.use(isAuthenticated);

router.post("/new", placeNewOrder);
router.get("/singleOrder/:orderId", fetchSingleOrder);
router.get("/getAllOrders", fetchAllOrders);
router.put(
  "/updateOrderStatus/:orderId",
  authorizedRoles("ADMIN"),
  updateOrderStatus
);

router.delete("/deleteOrder/:orderId", authorizedRoles("ADMIN"), deleteOrder);
export default router;
