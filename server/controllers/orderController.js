import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import database from "../db/db.js";
import { generatePaymentIntent } from "../utils/generatePaymentIntent.js";

export const placeNewOrder = asyncHandler(async (req, res) => {
  const {
    full_name,
    state,
    city,
    country,
    address,
    pincode,
    phone,
    orderedItems,
  } = req.body;
});

if (
  !full_name ||
  !state ||
  !city ||
  !country ||
  !address ||
  !pincode ||
  !phone
) {
  throw new ApiError(400, "all fields are required");
}

const items = Array.isArray(orderedItems)
  ? orderedItems
  : JSON.parse(orderedItems);

const productIds = items.map((item) => item.product.id);
const { rows: products } = await database.query(
  `SELECT id,price,stock name FROM products WHERE id = ANY($1::uuid[])`,
  [productIds]
);

let totalPrice = 0;
const values = [];
const placeholder = [];

items.forEach((item, index) => {
  const product = products.find((p) => p.id === item.product.id);

  if (!product) {
    throw new ApiError(400, "product not found");
  }

  if (item.quantity > product.stock) {
    throw new ApiError(
      400,
      `Only${product.stock} units are available for ${product.name}`
    );
  }

  const itemTotal = product.price * item.quantity;
  total_price += itemTotal;

  values.push(
    null,
    product.id,
    item.quantity,
    product.price,
    item.product.images[0].url || "",
    product.name
  );

  const offset = index * 6;

  placeholders.push(
    `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${
      offset + 5
    }, $${offset + 6})`
  );
});
