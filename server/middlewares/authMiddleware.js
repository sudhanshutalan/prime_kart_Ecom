import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import jwt from "jsonwebtoken";
import database from "../db/db.js";

export const isAuthenticated = asyncHandler(async (req, res, next) => {
  const { token } = req.cookies;

  if (!token) {
    throw new ApiError(400, "Please login to access this resource");
  }

  const decodedToken = jwt.verify(token, process.env.JWT_SECRET_KEY);

  const user = await database.query(
    `SELECT id, name, email, role, avatar, created_at 
     FROM users WHERE id = $1 LIMIT 1`,
    [decodedToken?.id]
  );

  if (user.rows.length === 0) {
    throw new ApiError(401, "User not logged in");
  }
  req.user = user.rows[0];
  next();
});

export const authorizedRoles = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user?.role)) {
      throw new ApiError(
        403,
        `Role:${req.user?.role} is not allowed to access this resource`
      );
    }
    next();
  };
};
