import express from "express";
import { deleteUser, getAllUsers } from "../controllers/adminController.js";
import {
  isAuthenticated,
  authorizedRoles,
} from "../middlewares/authMiddleware.js";

const router = express.Router();

router.use(isAuthenticated, authorizedRoles("ADMIN"));

router.get("/getAllusers", getAllUsers);

router.delete("/deleteUser/:userId", deleteUser);

export default router;
