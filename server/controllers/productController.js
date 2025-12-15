import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import database from "../db/db.js";
import { v2 as cloudinary } from "cloudinary";

export const createProducts = asyncHandler(async (req, res) => {
  const { name, description, price, category, stock } = req.body;
  const created_by = req.user?.id;

  if (!name || !description || !price || !category || !stock) {
    throw new ApiError(400, "please enter details of preoduct");
  }

  let uploadImages = [];
  if (req.files && req.files.images) {
    const images = Array.isArray(req.files.images)
      ? req.files.images
      : [req.files.images];

    for (const image of images) {
      const result = await cloudinary.uploader.upload(image.tempFilePath, {
        folder: "Ecommerce_Product_Images",
        width: 1000,
        crop: "scale",
      });

      uploadImages.push({
        url: result?.secure_url,
        public_id: result?.public_id,
      });
    }
  }

  const product = await database.query(
    `INSERT INTO products (name,description,price,category,stock,images,created_by) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING*`,
    [
      name,
      description,
      price,
      category,
      stock,
      JSON.stringify(uploadImages),
      created_by,
    ]
  );

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { product: product.rows[0] },
        "product created successfully"
      )
    );
});
