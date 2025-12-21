import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import database from "../db/db.js";
import { generatePaymentIntent } from "../utils/generatePaymentIntent.js";

export const placeNewOrder = asyncHandler(async (req, res) => {
  // 1. Extract and validate shipping details
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

  // Validate required fields
  if (
    !full_name?.trim() ||
    !state?.trim() ||
    !city?.trim() ||
    !country?.trim() ||
    !address?.trim() ||
    !pincode ||
    !phone
  ) {
    throw new ApiError(400, "Please provide complete shipping details.");
  }

  // 2. Validate cart items
  if (!Array.isArray(orderedItems) || orderedItems.length === 0) {
    throw new ApiError(400, "No items in cart.");
  }

  // 3. Fetch products from database
  const productIds = orderedItems.map((item) => item.product.id);
  const { rows: products } = await database.query(
    `SELECT id, price, stock, name FROM products WHERE id = ANY($1::uuid[])`,
    [productIds]
  );

  // 4. Validate and calculate prices
  let subtotal = 0;
  // const orderItemsData = [];
  const values = [];
  const placeholders = [];

  orderedItems.forEach((item, index) => {
    const product = products.find((p) => p.id === item.product.id);

    // Check if product exists
    if (!product) {
      throw new ApiError(404, `Product not found for ID: ${item.product.id}`);
    }

    // Check stock availability
    if (item.quantity > product.stock) {
      throw new ApiError(
        400,
        `Only ${product.stock} units available for ${product.name}`
      );
    }

    // Validate quantity
    if (item.quantity < 1) {
      throw new ApiError(400, "Quantity must be at least 1");
    }

    // Calculate item total
    const itemTotal = product.price * item.quantity;
    subtotal += itemTotal;

    // Prepare data for bulk insert
    values.push(
      null, // order_id - will be set later
      product.id,
      item.quantity,
      product.price,
      item.product.images?.[0]?.url || "",
      product.name
    );

    const offset = index * 6;
    placeholders.push(
      `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${
        offset + 5
      }, $${offset + 6})`
    );
  });

  // 5. Calculate final prices
  const TAX_RATE = 0.18;
  const FREE_SHIPPING_THRESHOLD = 50;
  const SHIPPING_COST = 2;

  const tax_amount = subtotal * TAX_RATE;
  const shipping_amount =
    subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_COST;
  const total_price = Math.round(subtotal + tax_amount + shipping_amount);

  // Insert order
  const orderResult = await database.query(
    `INSERT INTO orders (buyer_id, total_price, tax_price, shipping_price)
       VALUES ($1, $2, $3, $4) RETURNING *`,
    [req.user.id, total_price, tax_amount, shipping_amount]
  );

  const orderId = orderResult.rows[0].id;

  // Update order_id in values
  for (let i = 0; i < values.length; i += 6) {
    values[i] = orderId;
  }

  // Insert order items (bulk)
  await database.query(
    `INSERT INTO order_items (order_id, product_id, quantity, price, image, title)
       VALUES ${placeholders.join(", ")}`,
    values
  );

  // Insert shipping info
  await database.query(
    `INSERT INTO shipping_info (order_id, full_name, state, city, country, address, pin_code, phone)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [orderId, full_name, state, city, country, address, pincode, phone]
  );

  // Update product stock
  for (const item of orderedItems) {
    await database.query(
      `UPDATE products SET stock = stock - $1 WHERE id = $2`,
      [item.quantity, item.product.id]
    );
  }

  // 7. Generate payment intent
  const paymentResponse = await generatePaymentIntent(orderId, total_price);

  if (!paymentResponse.success) {
    throw new ApiError(500, "Payment initialization failed. Try again.");
  }

  // 8. Send response
  res.status(201).json(
    new ApiResponse(
      201,
      {
        orderId,
        paymentIntent: paymentResponse.client_secret,
        total_price,
        subtotal,
        tax: tax_amount,
        shipping: shipping_amount,
      },
      "Order placed successfully. Please proceed to payment."
    )
  );
});

export const fetchSingleOrder = asyncHandler(async (req, res) => {
  const { orderId } = req.params;
  const result = await database.query(
    `
    SELECT 
 o.*, 
 COALESCE(
 json_agg(
json_build_object(
'order_item_id', oi.id,
'order_id', oi.order_id,
'product_id', oi.product_id,
'quantity', oi.quantity,
'price', oi.price
 )
 ) FILTER (WHERE oi.id IS NOT NULL), '[]'
 ) AS order_items,
 json_build_object(
 'full_name', s.full_name,
 'state', s.state,
 'city', s.city,
 'country', s.country,
 'address', s.address,
 'pincode', s.pin_code,
 'phone', s.phone
 ) AS shipping_info
FROM orders o
LEFT JOIN order_items oi ON o.id = oi.order_id
LEFT JOIN shipping_info s ON o.id = s.order_id
WHERE o.id = $1
GROUP BY o.id, s.id;
`,
    [orderId]
  );

  if (result.rows.length === 0) {
    throw new ApiError(400, "Invalid Order or order not found");
  }

  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { orders: result.rows[0] },
        "Order fetched successfully"
      )
    );
});

export const fetchAllOrders = asyncHandler(async (req, res) => {
  const result = await database.query(`
            SELECT o.*,
 COALESCE(json_agg(
 json_build_object(
 'order_item_id', oi.id,
 'order_id', oi.order_id,
 'product_id', oi.product_id,
 'quantity', oi.quantity,
 'price', oi.price,
 'image', oi.image,
 'title', oi.title
)
) FILTER (WHERE oi.id IS NOT NULL), '[]' ) AS order_items, json_build_object(
'full_name', s.full_name,
 'state', s.state,
 'city', s.city,
 'country', s.country,
 'address', s.address,
 'pincode', s.pin_code,
 'phone', s.phone 
) AS shipping_info
FROM orders o
LEFT JOIN order_items oi ON o.id = oi.order_id
LEFT JOIN shipping_info s ON o.id = s.order_id
WHERE o.paid_at IS NOT NULL
GROUP BY o.id, s.id
        `);

  console.log(result);
  if (result.rows.length === 0) {
    return res.status(200).json(new ApiResponse(200, [], "No orders found."));
  }

  res
    .status(200)
    .json(new ApiResponse(200, result.rows, "All orders fetched."));
});

export const updateOrderStatus = asyncHandler(async (req, res, next) => {
  const { status } = req.body;
  if (!status) {
    throw new ApiError(400, "Provide a valid status for order.");
  }
  const { orderId } = req.params;
  const results = await database.query(
    `
    SELECT * FROM orders WHERE id = $1
    `,
    [orderId]
  );

  if (results.rows.length === 0) {
    throw new ApiError(400, "Invalid order ID.");
  }

  const updatedOrder = await database.query(
    `
    UPDATE orders SET order_status = $1 WHERE id = $2 RETURNING *
    `,
    [status, orderId]
  );

  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { updatedOrder: updatedOrder.rows[0] },
        "Order status updated successfully"
      )
    );
});

export const deleteOrder = asyncHandler(async (req, res, next) => {
  const { orderId } = req.params;
  const results = await database.query(
    `
        DELETE FROM orders WHERE id = $1 RETURNING *
        `,
    [orderId]
  );
  if (results.rows.length === 0) {
    throw new ApiError(400, "Invalid order ID.");
  }

  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { orders: results.rows[0] },
        "Order deleted successfully"
      )
    );
});
