import express from "express";
import {
  forgotPassword,
  getloggedInUser,
  loginUser,
  logoutUser,
  registerUser,
} from "../controllers/authController.js";
import { isAuthenticated } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.get("/getUser", isAuthenticated, getloggedInUser);
router.get("/logout", isAuthenticated, logoutUser);
router.post("/forgot-password", forgotPassword);

export default router;
