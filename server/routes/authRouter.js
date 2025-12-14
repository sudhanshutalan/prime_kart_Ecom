import express from "express";
import {
  forgotPassword,
  getloggedInUser,
  loginUser,
  logoutUser,
  registerUser,
  resetPassword,
} from "../controllers/authController.js";
import { isAuthenticated } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.get("/getUser", isAuthenticated, getloggedInUser);
router.get("/logout", isAuthenticated, logoutUser);
router.post("/forgot-password", forgotPassword);
router.put("/reset-password/:token", resetPassword);

export default router;
