import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import bcrypt from "bcrypt";
import database from "../db/db.js";
import { generateAccessToken, getCookieOptions } from "../utils/jwtToken.js";
import {
  generateEmailTemplate,
  generateResetPasswordToken,
} from "../utils/generateResetPasswordToken.js";
import { sendEmail } from "../utils/sendEmail.js";

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

export const forgotPassword = asyncHandler(async (req, res, next) => {
  const { email } = req.body;
  const { frontendUrl } = req.query;

  let userResult = await database.query(`SELECT*FROM users WHERE email = $1`, [
    email,
  ]);

  if (userResult.rows.length === 0) {
    throw new ApiError(400, "user not exists");
  }

  const user = userResult.rows[0];
  const { resetToken, hashedToken, resetPasswordTokenExpireTime } =
    generateResetPasswordToken();

  await database.query(
    `UPDATE users SET reset_password_token =$1, reset_password_expire= to_timestamp($2) WHERE email =$3`,
    [hashedToken, resetPasswordTokenExpireTime / 1000, email]
  );

  const resetPasswordUrl = `${frontendUrl}/reset-password/${resetToken}`;
  const message = generateEmailTemplate(resetPasswordUrl);

  try {
    await sendEmail({
      email: user.email,
      subject: "PrimeKart Password Recovery",
      message,
    });

    res
      .status(200)
      .json(
        new ApiResponse(200, {}, `Email sent to ${user.email} successfully`)
      );
  } catch (error) {
    await database.query(
      `UPDATE users SET reset_password_token = NULL,reset_password_expire = NULL WHERE email = $1`,
      [email]
    );

    throw new ApiError(400, "Error occured while sending email", error);
  }
});
