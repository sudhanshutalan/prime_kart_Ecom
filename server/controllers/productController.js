import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import database from "../db/db.js";
import { v2 as cloudinary } from "cloudinary";
import { getAIRecommendation } from "../utils/getAIRecommendation.js";

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

export const updateProducts = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const { name, description, price, category, stock } = req.body;
  if (!productId) {
    throw new ApiError(400, "Either invalid or missing product id");
  }

  const product = await database.query(`SELECT * FROM products WHERE id = $1`, [
    productId,
  ]);

  if (product.rows.length === 0) {
    throw new ApiError(400, "product not exists");
  }

  const result = await database.query(
    `UPDATE products SET name = $1, description = $2, price = $3, category = $4, stock =$5 WHERE id = $6 RETURNING*`,
    [name, description, price, category, stock, productId]
  );

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { product: result.rows[0] },
        "product updated successfull"
      )
    );
});

export const deleteProducts = asyncHandler(async (req, res) => {
  const { productId } = req.params;

  const product = await database.query("SELECT * FROM products WHERE id = $1", [
    productId,
  ]);

  if (product.rows.length === 0) {
    throw new ApiError(400, "product does not exists");
  }

  const images = product.rows[0].images;

  const deletedProduct = await database.query(
    "DELETE FROM products where id = $1",
    [productId]
  );

  if (deleteProducts.rows === 0) {
    throw new ApiError(
      400,
      "Either product not exists or failed to delete the product"
    );
  }

  //delete cloudinary images
  try {
    if (images && images.length > 0) {
      for (const image of images) {
        if (image.public_id) {
          await cloudinary.uploader.destroy(image.public_id);
        }
      }
    }
  } catch (error) {
    throw new ApiError(500, "failed to delete cloudinary images");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { deletedProduct: deletedProduct.rows[0] },
        "product deleted successfully"
      )
    );
});

export const fetchSingleProduct = asyncHandler(async (req, res) => {
  const { productId } = req.params;

  const result = await database.query(
    `
    SELECT p.*,
    COALESCE(json_agg(
    json_build_object(
    'review_id',r.id,
    'rating',r.rating,
    'comment',r.comment,
    'reviewer', json_build_object(
    'id',u.id,
    'name',u.name,
    'avatar',u.avatar
    )
    )
    )FILTER (WHERE r.id IS NOT NULL),'[]'
    ) AS reviews FROM products p
     LEFT JOIN reviews r ON p.id = r.product_id
     LEFT JOIN users u ON r.user_id = u.id
     WHERE p.id =$1 GROUP BY p.id
    `,
    [productId]
  );

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { product: result.rows[0] },
        "product fetched successfully"
      )
    );
});

export const postProductReview = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const { rating, comment } = req.body;

  if (!rating || !comment) {
    throw new ApiError(400, "ratings and comment is required ");
  }

  const purchaseCheckQuery = `
  SELECT oi.product_id FROM order_items oi
  JOIN orders o ON o.id = oi.order_id
  JOIN payments p ON p.order_id = o.id
  WHERE o.buyer_id = $1
  AND oi.product_id = $2
  AND p.payment_status = 'Paid'
  LIMIT 1
  `;
  const { rows } = await database.query(purchaseCheckQuery, [
    req.user.id,
    productId,
  ]);

  if (rows.length === 0) {
    throw new ApiError(
      400,
      "You has to purchase the product to post the review"
    );
  }

  const product = await database.query(`SELECT * FROM products WHERE id = $1`, [
    productId,
  ]);
  if (product.rows.length === 0) {
    throw new ApiError(400, "product not found");
  }

  const isAlreadyReviewed = await database.query(
    `SELECT * FROM reviews WHERE product_id = $1 AND user_id = $2`,
    [productId, req.user.id]
  );

  let review;
  if (isAlreadyReviewed.rows.length > 0) {
    review = await database.query(
      `UPDATE reviews SET rating = $1, comment = $2 WHERE product_id = $3 AND user_id = $4 RETURNING * `,
      [rating, comment, productId, req.user.id]
    );
  } else {
    review = await database.query(
      `INSERT INTO reviews (rating,comment,product_id,user_id) VALUES ($1,$2,$3,$4) RETURNING *`,
      [rating, comment, productId, req.user.id]
    );
  }

  const allReviews = await database.query(
    `SELECT AVG(rating) AS avg_rating FROM reviews WHERE product_id = $1`,
    [productId]
  );

  const newAvgRating = allReviews.rows[0].avg_rating;

  const updatedProductRating = await database.query(
    `UPDATE products SET ratings = $1 WHERE id = $2 RETURNING*`,
    [newAvgRating, productId]
  );

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        review: review.rows[0],
        productRating: updatedProductRating.rows[0],
      },
      "Review Posted successfully"
    )
  );
});

export const deleteProductReview = asyncHandler(async (req, res) => {
  const { productId } = req.params;

  const deletedReview = await database.query(
    `DELETE FROM reviews WHERE product_id = $1 AND user_id = $2 RETURNING*`,
    [productId, req.user.id]
  );

  if (deletedReview.rows.length == 0) {
    throw new ApiError(400, "Either review not exists or invalid product id");
  }

  const allReviews = await database.query(
    `SELECT AVG(rating) AS avg_rating FROM reviews WHERE product_id = $1`,
    [productId]
  );

  const newAvgRating = allReviews.rows[0].avg_rating;

  await database.query(
    `UPDATE products SET ratings = $1 WHERE id = $2 RETURNING*`,
    [newAvgRating, productId]
  );

  return res
    .status(200)
    .json(
      new ApiResponse(200, deletedReview.rows[0], "review deleted successfully")
    );
});

export const fetchAIFilteredProducts = asyncHandler(async (req, res) => {
  const { userPrompt } = req.body;
  if (!userPrompt) {
    throw new ApiError(400, "provide user prompts");
  }

  const filterKeywords = (query) => {
    const stopWords = new Set([
      "the",
      "they",
      "them",
      "then",
      "I",
      "we",
      "you",
      "he",
      "she",
      "it",
      "is",
      "a",
      "an",
      "of",
      "and",
      "or",
      "to",
      "for",
      "from",
      "on",
      "who",
      "whom",
      "why",
      "when",
      "which",
      "with",
      "this",
      "that",
      "in",
      "at",
      "by",
      "be",
      "not",
      "was",
      "were",
      "has",
      "have",
      "had",
      "do",
      "does",
      "did",
      "so",
      "some",
      "any",
      "how",
      "can",
      "could",
      "should",
      "would",
      "there",
      "here",
      "just",
      "than",
      "because",
      "but",
      "its",
      "it's",
      "if",
      ".",
      ",",
      "!",
      "?",
      ">",
      "<",
      ";",
      "`",
      "1",
      "2",
      "3",
      "4",
      "5",
      "6",
      "7",
      "8",
      "9",
      "10",
    ]);

    return query
      .toLowerCase()
      .replace(/[^\w\s]/g, "")
      .split(/\s+/)
      .filter((word) => !stopWords.has(word))
      .map((word) => `%${word}%`);
  };

  const keywords = filterKeywords(userPrompt);

  //BASIC SQL FILTER
  const result = await database.query(
    `SELECT * FROM products WHERE name ILIKE ANY($1) OR description ILIKE ANY($1) OR category ILIKE ANY($1) LIMIT 200`,
    [keywords]
  );

  const filteredProducts = result.rows;

  if (filteredProducts.length === 0) {
    throw new ApiError(400, "no products found matching your prompt");
  }

  //STEP 2 : AI FILTERING
  const { success, products } = await getAIRecommendation(
    req,
    res,
    userPrompt,
    filteredProducts
  );

  return res
    .status(200)
    .json({ success: success, message: "AI filtered products", products });
});
