import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import bcrypt from "bcrypt";
import database from "../db/db.js";
import { generateAccessToken, getCookieOptions } from "../utils/jwtToken.js";

export const registerUser = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    throw new ApiError(400, "name, email and password is required");
  }

  const isAlreadyRegistered = await database.query(
    `SELECT * FROM users WHERE email = $1`,
    [email]
  );

  if (isAlreadyRegistered.rows.length > 0) {
    throw new ApiError(400, "user already registered ");
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const dbuser = await database.query(
    "INSERT INTO users(name,email,password) VALUES ($1,$2,$3) RETURNING *",
    [name, email, hashedPassword]
  );
  const user = dbuser.rows[0];
  const token = generateAccessToken(user);

  const {
    password: _,
    reset_password_token,
    reset_password_expire,
    ...sanitizedUser
  } = user;
  res
    .status(200)
    .cookie("token", token, getCookieOptions())
    .json(
      new ApiResponse(
        200,
        { user: sanitizedUser, token },
        "user registered successfully"
      )
    );
});

export const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new ApiError(400, "email and password is required");
  }

  const isUserExist = await database.query(
    "SELECT * FROM users WHERE email = $1",
    [email]
  );

  if (isUserExist.rows.length === 0) {
    throw new ApiError(400, "Invalid credentials");
  }

  const isPasswordCorrect = await bcrypt.compare(
    password,
    isUserExist.rows[0].password
  );

  if (!isPasswordCorrect) {
    throw new ApiError(400, "Invalid credentials");
  }
  const user = isUserExist.rows[0];
  const token = generateAccessToken(user);
  const {
    password: _,
    reset_password_token,
    reset_password_expire,
    ...sanitizedUser
  } = user;

  return res
    .status(200)
    .cookie("token", token, getCookieOptions())
    .json(
      new ApiResponse(
        200,
        { user: sanitizedUser, token },
        "user logged in successfully"
      )
    );
});

export const getloggedInUser = asyncHandler(async (req, res) => {
  const { user } = req;
  const {
    password: _,
    reset_password_token,
    reset_password_expire,
    ...sanitizedUser
  } = user;
  return res
    .status(200)
    .json(
      new ApiResponse(200, { user: sanitizedUser }, "user fetched successfully")
    );
});

export const logoutUser = asyncHandler(async (req, res) => {
  res
    .status(200)
    .clearCookie("token", getCookieOptions())
    .json(new ApiResponse(200, null, "user logged out successfully"));
});
