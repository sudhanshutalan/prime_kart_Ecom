import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import database from "../db/db.js";
import { v2 as cloudinary } from "cloudinary";

export const getAllUsers = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;

  const totalUsersResult = await database.query(
    `SELECT COUNT(*) FROM users WHERE role ILIKE $1`,
    ["user"]
  );

  const totalUser = parseInt(totalUsersResult.rows[0].count);

  const offset = (page - 1) * 10;

  const users = await database.query(
    `SELECT * FROM users WHERE role ILIKE $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
    ["user", 10, offset]
  );

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        totalUsers: totalUser,
        currentPage: page,
        users: users.rows,
      },
      "All users fetched successfully"
    )
  );
});

export const deleteUser = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  const user = await database.query(
    `DELETE FROM users WHERE id = $1 RETURNING*`,
    [userId]
  );

  if (user.rows.length === 0) {
    throw new ApiError(400, "Either user not exists Or failed to delete user");
  }

  const avatar = user.rows[0].avatar;
  if (avatar?.public_id) {
    await cloudinary.uploader.destroy(avatar?.public_id);
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { deletedUser: user.rows[0] },
        "user deleted successfully"
      )
    );
});
