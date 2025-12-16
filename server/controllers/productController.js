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

export const fetchAllProducts = asyncHandler(async (req, res) => {
  const { availability, price, category, ratings, search } = req.query;
  const page = parseInt(req.query.page) || 1;
  const limit = 10;
  const offset = (page - 1) * limit;

  const conditions = [];
  let values = [];
  let index = 1;

  let paginationPlaceholder = {};

  // Filter products by availability
  if (availability === "in-stock") {
    conditions.push(`stock>5`);
  } else if (availability === "limited") {
    conditions.push(`stock>0 AND stock <=5`);
  } else if (availability === "out-of-stock") {
    conditions.push(`stock = 0`);
  }

  // Filter products by price
  if (price) {
    const [minPrice, maxPrice] = price.split("-");
    if (minPrice && maxPrice) {
      conditions.push(`price BETWEEN $${index} AND $${index + 1}`);
      values.push(minPrice, maxPrice);
      index += 2;
    }
  }

  // Filter products by category
  if (category) {
    conditions.push(`category ILIKE $${index}`);
    values.push(`%${category}%`);
    index++;
  }

  // Filter products by rating
  if (ratings) {
    conditions.push(`ratings >= $${index}`);
    values.push(ratings);
    index++;
  }

  // Filter products by search
  if (search) {
    conditions.push(
      `(p.name ILIKE $${index} OR p.description ILIKE $${index})`
    );
    values.push(`%${search}%`);
    index++;
  }

  const whereClause = conditions.length
    ? `WHERE ${conditions.join(" AND ")}`
    : "";

  //get count of filtered products
  const totalProductsResult = await database.query(
    `SELECT COUNT(*) from products p ${whereClause}`,
    values
  );
  const totalProducts = parseInt(totalProductsResult.rows[0].count);

  paginationPlaceholder.limit = `$${index}`;
  values.push(limit);
  index++;

  paginationPlaceholder.offset = `$${index}`;
  values.push(offset);
  index++;

  //Fetch with reviews
  const query = `SELECT p.*, 
  COUNT(r.id) AS review_count FROM products p 
  LEFT JOIN reviews r ON p.id = r.product_id
  ${whereClause} 
  GROUP BY p.id 
  ORDER BY p.created_at DESC 
  LIMIT ${paginationPlaceholder.limit} 
  OFFSET ${paginationPlaceholder.offset}`;

  const result = await database.query(query, values);

  //query for fetching new products
  const newProductsQuery = `
  SELECT p.*, 
  COUNT(r.id) AS review_count 
  FROM products p 
  LEFT JOIN reviews r ON p.id = r.product_id 
  WHERE p.created_at >= NOW() - INTERVAL '30 DAYS' 
  GROUP BY p.id 
  ORDER BY p.created_at DESC 
  LIMIT 8
  `;
  const newProductsResult = await database.query(newProductsQuery);

  //query for fetching top rated products (rating>=5)
  const topRatedQuery = `
  SELECT p.*, 
  COUNT(r.id) AS review_count 
  FROM products p 
  LEFT JOIN reviews r ON p.id = r.product_id 
  WHERE p.ratings>=4.5 
  GROUP BY p.id
  ORDER BY p.ratings DESC, p.created_at DESC 
  LIMIT 8
  `;
  const topRatedResult = await database.query(topRatedQuery);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        products: result.rows,
        totalProducts,
        newProducts: newProductsResult.rows,
        topRatedProducts: topRatedResult.rows,
      },
      "products fetched successfully"
    )
  );
});
